import { existsSync, readFileSync, mkdirSync, rmSync } from "node:fs";
import { join, basename } from "node:path";
import { execFileSync } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import type { Config, WorkerResult, OrchestratorState } from "./types.js";
import { log } from "./logger.js";
import { execSync as gitExecSync, gitInDir, gitSync } from "./git.js";
import { spawnCustomWorker, getCustomPrompt } from "./worker.js";
import { publishWorkerResults, createTaskPR, drainPendingPRs } from "./merge.js";
import { newMergeWorktree, removeMergeWorktree } from "./worktree.js";
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

// Sanitize a task string into a valid git branch name component
function taskToBranchId(task: string): string {
  return task
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

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

  gitExecSync("git", ["clone", "--depth", "1", "--no-checkout", projectDir, wDir]);
  gitExecSync("git", ["-C", wDir, "sparse-checkout", "init", "--cone"]);
  gitExecSync("git", ["-C", wDir, "sparse-checkout", "set", "apps", "CMakeLists.txt", "cmake"]);
  gitExecSync("git", ["-C", wDir, "checkout"]);

  for (const sub of submodules) {
    const src = join(projectDir, sub);
    const dest = join(wDir, sub);
    if (existsSync(src)) {
      mkdirSync(join(dest, ".."), { recursive: true });
      if (existsSync(dest)) rmSync(dest, { recursive: true, force: true });
      gitExecSync("git", ["clone", "--local", src, dest]);
    }
  }

  if (!config.skipBuild && existsSync(join(wDir, "CMakeLists.txt"))) {
    log(`  Worker ${workerId}: configuring build...`);
    gitExecSync("cmake", [
      "-DCMAKE_BUILD_TYPE=Debug",
      "-DCMAKE_MAKE_PROGRAM=ninja",
      "-DCMAKE_C_COMPILER=clang",
      "-DCMAKE_CXX_COMPILER=clang++",
      "-G", "Ninja",
      "-S", wDir,
      "-B", join(wDir, "cmake-build-debug"),
    ]);
  }

  log(`  Worker ${workerId}: ready`, "OK");
  return wDir;
}

function discoverSubmodules(projectDir: string): string[] {
  const gitmodulesPath = join(projectDir, ".gitmodules");
  if (!existsSync(gitmodulesPath)) return [];
  const content = readFileSync(gitmodulesPath, "utf-8");
  const subs: string[] = [];
  for (const match of content.matchAll(/path\s*=\s*(.+)/g)) {
    subs.push(match[1].trim());
  }
  return subs;
}

function switchWorkerToTaskBranch(workerDir: string, task: string, baseBranch: string, local: boolean): string {
  const branchId = taskToBranchId(task);
  const taskBranch = `ralph/${branchId}`;

  // Save any uncommitted work
  const { stdout: dirty } = gitInDir(workerDir, "status", "--porcelain");
  if (dirty) {
    gitInDir(workerDir, "add", "-A");
    gitInDir(workerDir, "commit", "-m", "WIP: auto-save before task switch");
  }

  // Also commit submodule changes
  gitInDir(workerDir, "submodule", "foreach", "--recursive",
    "git add -A && git diff --cached --quiet || git commit -m \"WIP: auto-save\"");
  gitInDir(workerDir, "add", "-A");
  const { exitCode: cachedExit } = gitInDir(workerDir, "diff", "--cached", "--quiet");
  if (cachedExit !== 0) {
    gitInDir(workerDir, "commit", "-m", "WIP: auto-save submodule refs");
  }

  // Try checking out existing branch, or create new one
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
      gitInDir(workerDir, "checkout", "-b", taskBranch, local ? baseBranch : `origin/${baseBranch}`);
    }
  } else {
    gitInDir(workerDir, "checkout", "-b", taskBranch, baseBranch);
  }

  return branchId;
}

export async function runTaskQueue(config: Config): Promise<void> {
  const projectDir = config.projectDir;
  const projectName = basename(projectDir);
  const cloneRoot = config.cloneDir || join("D:\\worktrees", projectName);
  const logDir = join(cloneRoot, "logs");
  const logFile = join(logDir, "ralph.log");

  mkdirSync(logDir, { recursive: true });

  const allTasks = loadTasks(config);
  const maxTasks = config.iterationsPerWorker * config.workers;
  const tasks = maxTasks > 0 && maxTasks < allTasks.length ? allTasks.slice(0, maxTasks) : allTasks;

  log(`Loaded ${allTasks.length} tasks, processing ${tasks.length}`);

  const submodules = discoverSubmodules(projectDir);
  log(`Submodules: ${submodules.join(", ") || "(none)"}`);

  const baseBranch = config.baseBranch ||
    gitExecSync("git", ["-C", projectDir, "rev-parse", "--abbrev-ref", "HEAD"]).stdout.trim() ||
    "main";

  // Build OrchestratorState for reuse with merge.ts functions
  const state: OrchestratorState = {
    mainRepo: projectDir,
    baseBranch,
    worktreeRoot: cloneRoot,
    logDir,
    submodules,
    local: config.local,
    claimedTasks: new Map(),
    claimedSubTasks: new Map(),
    completedTasks: new Set(),
  };

  // Set up worker clones
  log(`Setting up ${config.workers} worker clones in ${cloneRoot}`);
  const workerDirs: Map<number, string> = new Map();
  for (let i = 1; i <= config.workers; i++) {
    const wDir = setupWorkerClone(config, i, cloneRoot, projectDir, submodules);
    workerDirs.set(i, wDir);
  }

  // Set up merge worktree (for PR conflict resolution)
  let mergeWorktreePath: string | null = null;
  if (!config.local) {
    mergeWorktreePath = newMergeWorktree(state);
  }

  const queue = [...tasks];
  const activeJobs: Map<number, ActiveJob> = new Map();
  // Track which branchId each slot is working on
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

  function launchWorker(slot: number, task: string): ActiveJob {
    const wDir = workerDirs.get(slot)!;
    const branchId = switchWorkerToTaskBranch(wDir, task, baseBranch, config.local);
    slotBranchIds.set(slot, branchId);
    state.claimedTasks.set(branchId, slot);

    const prompt = getPrompt(config, task);
    const { promise, process: proc } = spawnCustomWorker(
      slot, wDir, task, prompt, logFile, baseBranch, config,
    );
    return { promise, process: proc, task };
  }

  // Initial fill
  for (let slot = 1; slot <= config.workers; slot++) {
    if (queue.length === 0 || shuttingDown) break;
    const task = queue.shift()!;
    tasksLaunched++;
    activeJobs.set(slot, launchWorker(slot, task));
    log(`[${tasksLaunched}] Slot ${slot} -> ${task.slice(0, 80)}`);
  }

  // Poll loop
  while (activeJobs.size > 0) {
    await new Promise((r) => setTimeout(r, 5000));

    for (const [slot, job] of activeJobs) {
      const result = await Promise.race([
        job.promise.then((r) => r),
        new Promise<null>((r) => setTimeout(() => r(null), 0)),
      ]);

      if (result === null) continue;

      tasksDone++;
      const branchId = slotBranchIds.get(slot) ?? taskToBranchId(job.task);
      const wDir = workerDirs.get(slot)!;

      const color = result.status === "TASK_COMPLETE" ? "OK" :
                    result.status === "NO_COMMITS" ? "WARN" : "ERROR";
      log(`[done ${tasksDone}/${tasksLaunched}] Slot ${slot}: ${result.taskId.slice(0, 60)} (${result.status})`, color);

      // Publish + PR on success
      if (result.status === "TASK_COMPLETE") {
        const published = publishWorkerResults(state, wDir, slot, branchId);
        if (published) {
          state.completedTasks.add(branchId);
          createTaskPR(state, branchId);
        }
      }

      state.claimedTasks.delete(branchId);
      activeJobs.delete(slot);

      if (queue.length > 0 && !shuttingDown) {
        const task = queue.shift()!;
        tasksLaunched++;
        activeJobs.set(slot, launchWorker(slot, task));
        log(`[${tasksLaunched}] Slot ${slot} -> ${task.slice(0, 80)}`);
      }
    }
  }

  log(`Done: ${tasksDone} tasks completed`, "OK");

  // Drain pending PRs
  if (!config.local) {
    log("Draining pending PRs...");
    await drainPendingPRs(state, mergeWorktreePath, workerDirs);
  }

  // Cleanup
  if (mergeWorktreePath) {
    removeMergeWorktree(state);
  }

  log("Cleaning up worker clones...");
  for (let i = 1; i <= config.workers; i++) {
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
