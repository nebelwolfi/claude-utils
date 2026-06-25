import { existsSync, readFileSync, mkdirSync, rmSync } from "node:fs";
import { join, basename } from "node:path";
import { execFileSync } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import type { Server } from "node:http";
import type { Config, WorkerResult, OrchestratorState } from "./types.js";
import { log } from "./logger.js";
import { execSync as gitExecSync, gitInDir, gitSync, discoverSubmodules } from "./git.js";
import { spawnCustomWorker, spawnContinuationWorker, getCustomPrompt, classifyExitReason } from "./worker.js";
import { DashboardState } from "./dashboard/state.js";
import { startDashboard } from "./dashboard/server.js";
import { setDashboardState } from "./logger.js";
import { publishWorkerResults, createTaskPR, drainPendingPRs } from "./merge.js";
import {
  newRalphWorktree, initializeSubmodules, patchClaudeMD,
  configureWorktreeBuild, removeAllWorktrees,
  newMergeWorktree, removeMergeWorktree,
} from "./worktree.js";
import treeKill from "tree-kill";

interface ActiveJob {
  promise: Promise<WorkerResult>;
  process: ChildProcess;
  task: string;
}

function loadTasks(config: Config): string[] {
  if (config.taskFile) {
    if (!existsSync(config.taskFile)) {
      throw new Error(`Task file not found: ${config.taskFile}`);
    }
    return readFileSync(config.taskFile, "utf-8")
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith("#"));
  }

  if (config.taskCommand) {
    const result = execFileSync("cmd", ["/c", config.taskCommand], { encoding: "utf-8" });
    return result.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
  }

  throw new Error("No task source: pass --task-file or --task-command");
}

function getPrompt(config: Config, task: string): string {
  if (config.promptTemplate) {
    return getCustomPrompt(config.promptTemplate, task);
  }
  return `You are fixing exactly ONE task. When done, commit and exit.

## Your task
${task}

## Workflow
1. FIRST: check if the task is already done. If so, exit immediately.
2. Understand the problem.
3. Implement the fix.
4. Build and verify.
5. Commit with a descriptive message.`;
}

function taskToBranchId(task: string): string {
  return task
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

// ── Clone-based worker setup (--use-clones / --clone-dir) ───────────────

function setupWorkerClone(
  config: Config,
  workerId: number,
  cloneRoot: string,
  projectDir: string,
  submodules: string[],
): string {
  const wDir = join(cloneRoot, `worker-${workerId}`);

  if (existsSync(join(wDir, ".git"))) {
    return wDir;
  }

  log(`  Worker ${workerId}: cloning...`);
  mkdirSync(wDir, { recursive: true });

  gitExecSync("git", ["clone", "--no-checkout", projectDir, wDir]);
  gitExecSync("git", ["-C", wDir, "sparse-checkout", "init", "--cone"]);
  gitExecSync("git", ["-C", wDir, "sparse-checkout", "set", "apps", "CMakeLists.txt", "cmake"]);
  gitExecSync("git", ["-C", wDir, "checkout"]);

  // Copy real remote URL so pushes go to GitHub, not the local clone source
  const { stdout: realRemote } = gitExecSync("git", ["-C", projectDir, "remote", "get-url", "origin"]);
  if (realRemote) {
    gitExecSync("git", ["-C", wDir, "remote", "set-url", "origin", realRemote.trim()]);
  }

  // Reuse kanban's initializeSubmodules — clones locally but sets real GitHub remotes
  const cloneState: OrchestratorState = {
    mainRepo: projectDir, baseBranch: "", worktreeRoot: "", logDir: "",
    submodules, local: false,
    claimedTasks: new Map(), claimedSubTasks: new Map(), completedTasks: new Set(),
  };
  initializeSubmodules(cloneState, wDir);
  patchClaudeMD(cloneState, wDir);

  if (!config.skipBuild) {
    if (config.docker) {
      // Configure + build inside a container so paths match the worker's view
      log(`  Worker ${workerId}: building in container...`);
      const buildCmd = "cmake -DCMAKE_BUILD_TYPE=Debug -DCMAKE_MAKE_PROGRAM=ninja -DCMAKE_C_COMPILER=clang -DCMAKE_CXX_COMPILER=clang++ -G Ninja -S . -B cmake-build-debug && cmake --build cmake-build-debug --target html_tests";
      const { exitCode, stdout } = gitExecSync("docker", [
        "run", "--rm",
        "-v", `${wDir}:C:\\worker`,
        "-w", "C:\\worker",
        "--isolation", "process",
        "--entrypoint", "cmd",
        config.dockerImage,
        "/c", buildCmd,
      ]);
      if (exitCode !== 0) {
        log(`  Worker ${workerId}: Docker build failed: ${stdout.split("\n").slice(-3).join(" ")}`, "ERROR");
      }
    } else {
      configureWorktreeBuild(cloneState, wDir);
    }
  }

  log(`  Worker ${workerId}: ready`, "OK");
  return wDir;
}

function cleanupClones(cloneRoot: string, numWorkers: number): void {
  for (let i = 1; i <= numWorkers; i++) {
    const wDir = join(cloneRoot, `worker-${i}`);
    if (existsSync(wDir)) {
      try {
        rmSync(wDir, { recursive: true, force: true });
        log(`  Worker ${i}: removed`);
      } catch {
        log(`  Worker ${i}: locked, skipping`, "WARN");
      }
    }
  }
}

// ── Worktree-based worker setup (default) ───────────────────────────────

function setupWorkerWorktree(
  config: Config,
  state: OrchestratorState,
  workerId: number,
): string | null {
  const worktreePath = newRalphWorktree(state, workerId);
  if (!worktreePath) return null;

  initializeSubmodules(state, worktreePath);
  patchClaudeMD(state, worktreePath);

  if (!config.skipBuild) {
    configureWorktreeBuild(state, worktreePath);
  }

  return worktreePath;
}

// ── Branch switching ────────────────────────────────────────────────────

function switchWorkerToTaskBranch(workerDir: string, task: string, baseBranch: string, local: boolean): string {
  const branchId = taskToBranchId(task);
  const taskBranch = `ralph/${branchId}`;

  const { stdout: dirty } = gitInDir(workerDir, "status", "--porcelain");
  if (dirty) {
    gitInDir(workerDir, "add", "-A");
    gitInDir(workerDir, "commit", "-m", "WIP: auto-save before task switch");
  }

  gitInDir(workerDir, "submodule", "foreach", "--recursive",
    "git add -A && git diff --cached --quiet || git commit -m \"WIP: auto-save\"");
  gitInDir(workerDir, "add", "-A");
  const { exitCode: cachedExit } = gitInDir(workerDir, "diff", "--cached", "--quiet");
  if (cachedExit !== 0) {
    gitInDir(workerDir, "commit", "-m", "WIP: auto-save submodule refs");
  }

  if (!local) {
    gitInDir(workerDir, "fetch", "origin", baseBranch, taskBranch);
  }

  const { exitCode: localExists } = gitInDir(workerDir, "rev-parse", "--verify", taskBranch);
  if (localExists === 0) {
    gitInDir(workerDir, "checkout", taskBranch);
  } else if (!local) {
    const { exitCode: remoteExists } = gitInDir(workerDir, "rev-parse", "--verify", `origin/${taskBranch}`);
    if (remoteExists === 0) {
      gitInDir(workerDir, "checkout", "-b", taskBranch, `origin/${taskBranch}`);
    } else {
      gitInDir(workerDir, "checkout", "-b", taskBranch, `origin/${baseBranch}`);
    }
  } else {
    gitInDir(workerDir, "checkout", "-b", taskBranch, baseBranch);
  }

  return branchId;
}

// ── Main entry ──────────────────────────────────────────────────────────

export async function runTaskQueue(config: Config): Promise<void> {
  const projectDir = config.projectDir;
  const projectName = basename(projectDir);
  const useClones = config.useClones;
  const worktreeRoot = useClones
    ? (config.cloneDir || join("D:\\worktrees", projectName))
    : join(projectDir, ".ralph-worktrees");
  const logDir = join(worktreeRoot, "logs");
  const logFile = join(logDir, "ralph.log");

  mkdirSync(logDir, { recursive: true });

  // Dashboard
  let dashState: DashboardState | null = null;
  let dashServer: Server | null = null;
  if (!config.noDashboard) {
    dashState = new DashboardState(config, logDir, "taskqueue");
    setDashboardState(dashState);
    dashServer = startDashboard(dashState, config.dashboardPort);
  }

  const allTasks = loadTasks(config);
  const maxTasks = config.iterationsPerWorker * config.workers;
  const tasks = maxTasks > 0 && maxTasks < allTasks.length ? allTasks.slice(0, maxTasks) : allTasks;

  if (dashState) {
    for (const t of tasks) dashState.taskQueue.push({ task: t, status: "queued", assignedSlot: null });
  }

  log(`Loaded ${allTasks.length} tasks, processing ${tasks.length}`);
  log(`Isolation: ${useClones ? "full clones" : "worktrees"}`);

  const submodules = discoverSubmodules(projectDir);
  log(`Submodules: ${submodules.join(", ") || "(none)"}`);

  const baseBranch = config.baseBranch ||
    gitExecSync("git", ["-C", projectDir, "rev-parse", "--abbrev-ref", "HEAD"]).stdout.trim() ||
    "main";

  const state: OrchestratorState = {
    mainRepo: projectDir,
    baseBranch,
    worktreeRoot,
    logDir,
    submodules,
    local: config.local,
    claimedTasks: new Map(),
    claimedSubTasks: new Map(),
    completedTasks: new Set(),
  };

  // Set up workers
  log(`Setting up ${config.workers} workers in ${worktreeRoot}`);
  const workerDirs: Map<number, string> = new Map();
  for (let i = 1; i <= config.workers; i++) {
    const wDir = useClones
      ? setupWorkerClone(config, i, worktreeRoot, projectDir, submodules)
      : setupWorkerWorktree(config, state, i);
    if (wDir) workerDirs.set(i, wDir);
  }

  let mergeWorktreePath: string | null = null;
  if (!config.local) {
    mergeWorktreePath = newMergeWorktree(state);
  }

  const queue = [...tasks];
  const activeJobs: Map<number, ActiveJob> = new Map();
  const slotBranchIds: Map<number, string> = new Map();
  let tasksDone = 0;
  let tasksLaunched = 0;
  let shuttingDown = false;

  let sigintCount = 0;
  process.on("SIGINT", () => {
    sigintCount++;
    if (sigintCount === 1) {
      log("Shutting down gracefully (Ctrl+C again to force)...", "WARN");
      shuttingDown = true;
    } else {
      log("Force killing all workers...", "ERROR");
      for (const [, job] of activeJobs) {
        try { treeKill(job.process.pid!); } catch { /* best effort */ }
      }
      process.exit(1);
    }
  });

  function launchWorker(slot: number, task: string, continuation = false): ActiveJob {
    const wDir = workerDirs.get(slot)!;
    const branchId = switchWorkerToTaskBranch(wDir, task, baseBranch, config.local);
    slotBranchIds.set(slot, branchId);
    state.claimedTasks.set(branchId, slot);

    const prompt = getPrompt(config, task);
    const { promise, process: proc } = continuation
      ? spawnContinuationWorker(slot, wDir, task, prompt, logFile, baseBranch, config)
      : spawnCustomWorker(slot, wDir, task, prompt, logFile, baseBranch, config);

    dashState?.updateSlot(slot, {
      status: "active",
      task,
      pid: proc.pid ?? null,
      startedAt: Date.now(),
      workerDir: wDir,
    });

    // Mark in dashboard queue
    if (dashState) {
      const qi = dashState.taskQueue.find(q => q.task === task && q.status === "queued");
      if (qi) { qi.status = "active"; qi.assignedSlot = slot; }
    }

    return { promise, process: proc, task };
  }

  // Initial fill
  for (let slot = 1; slot <= config.workers; slot++) {
    if (queue.length === 0 || shuttingDown) break;
    if (!workerDirs.has(slot)) continue;
    const task = queue.shift()!;
    tasksLaunched++;
    activeJobs.set(slot, launchWorker(slot, task));
    log(`[${tasksLaunched}] Slot ${slot} -> ${task.slice(0, 80)}`);
  }

  // Poll loop
  while (activeJobs.size > 0 || queue.length > 0) {
    await new Promise((r) => setTimeout(r, 5000));

    // Process dashboard control commands
    if (dashState) {
      for (const cmd of dashState.drainCommands()) {
        try {
          switch (cmd.type) {
            case "kill_worker": {
              const s = cmd.payload.slot as number;
              const job = activeJobs.get(s);
              if (job?.process.pid) { try { treeKill(job.process.pid); } catch { /* */ } }
              dashState.markCommand(cmd.id, "applied");
              break;
            }
            case "pause_slot": {
              const s = cmd.payload.slot as number;
              dashState.updateSlot(s, { paused: true });
              dashState.markCommand(cmd.id, "applied");
              break;
            }
            case "unpause_slot": {
              const s = cmd.payload.slot as number;
              dashState.updateSlot(s, { paused: false });
              dashState.markCommand(cmd.id, "applied");
              break;
            }
            case "resume_task": {
              const s = cmd.payload.slot as number;
              const slotInfo = dashState.getSlot(s);
              if (slotInfo.task && !activeJobs.has(s) && slotInfo.continuations < config.maxContinuations) {
                tasksLaunched++;
                dashState.updateSlot(s, { continuations: slotInfo.continuations + 1 });
                activeJobs.set(s, launchWorker(s, slotInfo.task, true));
                log(`[resume #${slotInfo.continuations + 1}] Slot ${s} -> ${slotInfo.task.slice(0, 80)}`);
              }
              dashState.markCommand(cmd.id, "applied");
              break;
            }
            case "add_task": {
              const task = cmd.payload.task as string;
              queue.push(task);
              dashState.taskQueue.push({ task, status: "queued", assignedSlot: null });
              dashState.markCommand(cmd.id, "applied");
              break;
            }
            case "remove_task": {
              const idx = cmd.payload.index as number;
              const qi = dashState.taskQueue[idx];
              if (qi && qi.status === "queued") {
                const queueIdx = queue.indexOf(qi.task);
                if (queueIdx >= 0) queue.splice(queueIdx, 1);
                dashState.taskQueue.splice(idx, 1);
              }
              dashState.markCommand(cmd.id, "applied");
              break;
            }
            case "skip_task": {
              const s = cmd.payload.slot as number;
              const job = activeJobs.get(s);
              if (job?.process.pid) { try { treeKill(job.process.pid); } catch { /* */ } }
              dashState.markCommand(cmd.id, "applied");
              break;
            }
            default:
              dashState.markCommand(cmd.id, "failed", "unsupported command");
          }
        } catch (e) {
          dashState.markCommand(cmd.id, "failed", e instanceof Error ? e.message : String(e));
        }
      }
    }

    for (const [slot, job] of activeJobs) {
      const result = await Promise.race([
        job.promise.then((r) => r),
        new Promise<null>((r) => setTimeout(() => r(null), 0)),
      ]);

      if (result === null) continue;

      tasksDone++;
      const branchId = slotBranchIds.get(slot) ?? taskToBranchId(job.task);
      const wDir = workerDirs.get(slot)!;
      const exitReason = result.exitReason ?? "error";

      const color = result.status === "TASK_COMPLETE" ? "OK" :
                    result.status === "NO_COMMITS" ? "WARN" : "ERROR";
      log(`[done ${tasksDone}/${tasksLaunched}] Slot ${slot}: ${result.taskId.slice(0, 60)} (${result.status}${exitReason !== "completed" && exitReason !== "error" ? " " + exitReason : ""})`, color);

      // Update dashboard state
      const slotStatus = exitReason === "rate_limit" || exitReason === "usage_limit" ? "rate_limited" as const
        : result.status === "TASK_COMPLETE" ? "idle" as const : "error" as const;
      dashState?.updateSlot(slot, {
        status: slotStatus,
        lastExitCode: null,
        lastExitReason: exitReason,
      });

      // Update dashboard queue
      if (dashState) {
        const qi = dashState.taskQueue.find(q => q.task === job.task && q.status === "active");
        if (qi) qi.status = result.status === "TASK_COMPLETE" ? "completed" : "failed";
      }

      if (result.status === "TASK_COMPLETE") {
        const published = publishWorkerResults(state, wDir, slot, branchId);
        if (published) {
          state.completedTasks.add(branchId);
          createTaskPR(state, branchId);
        }
      }

      // Rate limit: pause the slot, don't move to next task
      if (exitReason === "rate_limit" || exitReason === "usage_limit") {
        log(`Slot ${slot} hit ${exitReason} — paused, waiting for manual resume`, "WARN");
        activeJobs.delete(slot);
        // Don't delete claimedTasks — keep the branch claimed so resume works
        continue;
      }

      state.claimedTasks.delete(branchId);
      activeJobs.delete(slot);

      // Check if slot is paused
      const isPaused = dashState?.getSlot(slot).paused;
      if (queue.length > 0 && !shuttingDown && !isPaused) {
        const task = queue.shift()!;
        tasksLaunched++;
        dashState?.updateSlot(slot, { continuations: 0 });
        activeJobs.set(slot, launchWorker(slot, task));
        log(`[${tasksLaunched}] Slot ${slot} -> ${task.slice(0, 80)}`);
      }
    }

    // Break if nothing left
    const hasRateLimited = dashState ? [...dashState.workers.values()].some(w => w.status === 'rate_limited') : false;
    if (activeJobs.size === 0 && queue.length === 0 && !hasRateLimited) break;
  }

  log(`Done: ${tasksDone} tasks completed`, "OK");

  if (!config.local) {
    log("Draining pending PRs...");
    await drainPendingPRs(state, mergeWorktreePath, workerDirs);
  }

  // Shut down the dashboard so the process can exit
  if (dashServer) {
    for (const client of dashState!.sseClients) {
      try { client.end(); } catch {}
    }
    dashState!.sseClients.clear();
    dashServer.close();
  }

  // Cleanup
  if (mergeWorktreePath) {
    removeMergeWorktree(state);
  }

  log("Cleaning up workers...");
  if (useClones) {
    cleanupClones(worktreeRoot, config.workers);
  } else {
    removeAllWorktrees(state);
  }
}
