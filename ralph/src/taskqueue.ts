import { existsSync, readFileSync, mkdirSync, rmSync } from "node:fs";
import { join, basename } from "node:path";
import { execFileSync } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import type { Config, WorkerResult } from "./types.js";
import { log } from "./logger.js";
import { execSync as gitExecSync } from "./git.js";
import { spawnCustomWorker, getCustomPrompt } from "./worker.js";
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
  // Default prompt for task-queue mode
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

  // Clone top-level repo
  gitExecSync("git", ["clone", "--depth", "1", "--no-checkout", projectDir, wDir]);
  gitExecSync("git", ["-C", wDir, "sparse-checkout", "init", "--cone"]);
  // Detect top-level dirs to include (everything except submodule parents)
  gitExecSync("git", ["-C", wDir, "sparse-checkout", "set", "apps", "CMakeLists.txt", "cmake"]);
  gitExecSync("git", ["-C", wDir, "checkout"]);

  // Clone submodules from local repo
  for (const sub of submodules) {
    const src = join(projectDir, sub);
    const dest = join(wDir, sub);
    if (existsSync(src)) {
      mkdirSync(join(dest, ".."), { recursive: true });
      if (existsSync(dest)) rmSync(dest, { recursive: true, force: true });
      gitExecSync("git", ["clone", "--local", src, dest]);
    }
  }

  // Configure cmake build
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

function collectCommits(
  config: Config,
  cloneRoot: string,
  projectDir: string,
  submodules: string[],
): number {
  let cherryPicked = 0;

  for (let i = 1; i <= config.workers; i++) {
    const wDir = join(cloneRoot, `worker-${i}`);
    if (!existsSync(wDir)) continue;

    for (const sub of submodules) {
      const mainSub = join(projectDir, sub);
      const workerSub = join(wDir, sub);
      if (!existsSync(join(workerSub, ".git"))) continue;

      const mainHead = gitExecSync("git", ["-C", mainSub, "rev-parse", "HEAD"]).stdout.trim();
      const workerHead = gitExecSync("git", ["-C", workerSub, "rev-parse", "HEAD"]).stdout.trim();
      if (!workerHead || workerHead === mainHead) continue;

      // Fetch worker's commits into main submodule
      gitExecSync("git", ["-C", mainSub, "fetch", workerSub, "main"]);

      const hashResult = gitExecSync("git", ["-C", mainSub, "log", "--format=%H", "--reverse", `${mainHead}..${workerHead}`]);
      if (!hashResult.stdout) continue;

      for (const hash of hashResult.stdout.trim().split("\n")) {
        if (!hash) continue;
        const { exitCode } = gitExecSync("git", ["-C", mainSub, "cherry-pick", hash]);
        if (exitCode === 0) {
          const msg = gitExecSync("git", ["-C", mainSub, "log", "--format=%s", "-1"]).stdout.trim();
          log(`  Worker ${i}: ${msg}`, "OK");
          cherryPicked++;
        } else {
          log(`  Worker ${i}: conflict on ${hash.slice(0, 8)}, skipping`, "WARN");
          gitExecSync("git", ["-C", mainSub, "cherry-pick", "--abort"]);
        }
      }
    }
  }

  return cherryPicked;
}

export async function runTaskQueue(config: Config): Promise<void> {
  const projectDir = config.projectDir;
  const projectName = basename(projectDir);
  const cloneRoot = config.cloneDir || join("C:\\worktrees", projectName);
  const logDir = join(cloneRoot, "logs");
  const logFile = join(logDir, "ralph.log");

  mkdirSync(logDir, { recursive: true });

  // Load tasks
  const allTasks = loadTasks(config);
  const maxTasks = config.iterationsPerWorker * config.workers;
  const tasks = maxTasks > 0 && maxTasks < allTasks.length ? allTasks.slice(0, maxTasks) : allTasks;

  log(`Loaded ${allTasks.length} tasks, processing ${tasks.length}`);

  // Discover submodules
  const submodules = discoverSubmodules(projectDir);
  log(`Submodules: ${submodules.join(", ") || "(none)"}`);

  // Determine base branch
  const baseBranch = config.baseBranch ||
    gitExecSync("git", ["-C", projectDir, "rev-parse", "--abbrev-ref", "HEAD"]).stdout.trim() ||
    "main";

  // Set up worker clones
  log(`Setting up ${config.workers} worker clones in ${cloneRoot}`);
  const workerDirs: Map<number, string> = new Map();
  for (let i = 1; i <= config.workers; i++) {
    const wDir = setupWorkerClone(config, i, cloneRoot, projectDir, submodules);
    workerDirs.set(i, wDir);
  }

  // Work queue
  const queue = [...tasks];
  const activeJobs: Map<number, ActiveJob> = new Map();
  let tasksDone = 0;
  let tasksLaunched = 0;
  let shuttingDown = false;

  // Graceful shutdown
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

  // Initial fill
  for (let slot = 1; slot <= config.workers; slot++) {
    if (queue.length === 0 || shuttingDown) break;
    const task = queue.shift()!;
    tasksLaunched++;
    const prompt = getPrompt(config, task);
    const wDir = workerDirs.get(slot)!;
    const { promise, process: proc } = spawnCustomWorker(
      slot, wDir, task, prompt, logFile, baseBranch, config,
    );
    activeJobs.set(slot, { promise, process: proc, task });
    log(`[${tasksLaunched}] Slot ${slot} -> ${task.slice(0, 80)}`);
  }

  // Poll loop
  while (activeJobs.size > 0) {
    await new Promise((r) => setTimeout(r, 5000));

    for (const [slot, job] of activeJobs) {
      // Check if promise resolved by racing with a zero timeout
      const result = await Promise.race([
        job.promise.then((r) => r),
        new Promise<null>((r) => setTimeout(() => r(null), 0)),
      ]);

      if (result === null) continue; // still running

      tasksDone++;
      const color = result.status === "TASK_COMPLETE" ? "OK" :
                    result.status === "NO_COMMITS" ? "WARN" : "ERROR";
      log(`[done ${tasksDone}/${tasksLaunched}] Slot ${slot}: ${result.taskId.slice(0, 60)} (${result.status})`, color);

      activeJobs.delete(slot);

      if (queue.length > 0 && !shuttingDown) {
        const task = queue.shift()!;
        tasksLaunched++;
        const prompt = getPrompt(config, task);
        const wDir = workerDirs.get(slot)!;
        const { promise, process: proc } = spawnCustomWorker(
          slot, wDir, task, prompt, logFile, baseBranch, config,
        );
        activeJobs.set(slot, { promise, process: proc, task });
        log(`[${tasksLaunched}] Slot ${slot} -> ${task.slice(0, 80)}`);
      }
    }
  }

  log(`Done: ${tasksDone} tasks completed`, "OK");

  // Collect commits
  log("Collecting worker commits...");
  const cherryPicked = collectCommits(config, cloneRoot, projectDir, submodules);

  if (cherryPicked > 0) {
    log(`Cherry-picked ${cherryPicked} commit(s) into main repo`, "OK");
    // Stage updated submodule pointers
    for (const sub of submodules) {
      gitExecSync("git", ["-C", projectDir, "add", sub]);
    }
    gitExecSync("git", ["-C", projectDir, "commit", "-m",
      `Task queue: ${cherryPicked} fix(es) from ${config.workers} worker(s)`]);
  } else {
    log("No commits to collect.", "WARN");
  }

  // Cleanup clones
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
