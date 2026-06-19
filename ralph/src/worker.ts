import { spawn, execFileSync, execFile } from "node:child_process";
import { appendFileSync, writeFileSync, readFileSync, existsSync, createWriteStream, copyFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { ChildProcess } from "node:child_process";
import type { WorkerResult, WorkerStatus, Config, ExitReason } from "./types.js";
import { log } from "./logger.js";
import { gitInDir, isKanbnPath } from "./git.js";

// Resolve claude executable path once at module load.
// shell: false needs the full path on Windows since cmd.exe isn't resolving it.
let resolvedClaudePath = "claude";
try {
  const result = execFileSync("where", ["claude"], { encoding: "utf-8" }).trim();
  resolvedClaudePath = result.split(/\r?\n/)[0];
} catch { /* fallback to bare "claude" */ }

let claudeModel = "claude-opus-4-6";

export function setModel(model: string): void {
  claudeModel = model;
}

let resolvedDockerPath = "docker";
try {
  const result = execFileSync("where", ["docker"], { encoding: "utf-8" }).trim();
  resolvedDockerPath = result.split(/\r?\n/)[0];
} catch { /* fallback to bare "docker" */ }

function spawnClaude(
  args: string[],
  prompt: string,
  cwd: string,
  env?: NodeJS.ProcessEnv,
): ChildProcess {
  // shell: false avoids cmd.exe's 8191-char limit and resolves the exe directly.
  const child = spawn(resolvedClaudePath, args, {
    cwd,
    stdio: ["pipe", "pipe", "pipe"],
    shell: false,
    windowsHide: true,
    env,
  });

  child.stdin!.write(prompt);
  child.stdin!.end();

  return child;
}

function getWorkerPrompt(taskId: string, claimedSubTask: string | null): string {
  let subTaskInstructions = "";
  if (claimedSubTask) {
    subTaskInstructions = `YOUR ASSIGNED SUBTASK: ${claimedSubTask}

- Complete this exact sub-task in this cycle
- If it already was completed then that was your work!

`;
  }

  return `@progress.txt

YOUR ASSIGNED TASK ID: ${taskId}

${subTaskInstructions}
1. Work ONLY on the assigned task above. Do not pick a different task.
Review your task using kanban mcp.

2. Break down what needs to happen.
If the task is too large (more than ~200 lines of changes), break it into
smaller sub-tasks first using kanban mcp edit.

3. Check that the tests pass.

4. Append your progress to the progress.txt file.
Use this to leave a note for the next person working in the codebase.

5. Make a git commit of that feature.

ONLY WORK ON THIS SINGLE TASK. IF THE TASK HAS SUBTASKS, COMPLETE ONLY ONE.

### Rules

- **Never skip tests.** If you can't test it, you can't ship it.
- **Never leave the build broken** between cycles. Every cycle ends with a green build.
- **If a task reveals missing infrastructure**, create a new task with kanban mcp, set it as a blocker relation, and work on it first.
- **Commit atomically.** Each completed task should be one logical unit - all its files work together.`;
}

function getMergeReviewPrompt(prNumber: number, taskBranch: string, targetBranch: string): string {
  return `You are resolving merge conflicts and merging a pull request.

PR #${prNumber} (branch: ${taskBranch} -> ${targetBranch})

IMPORTANT CONSTRAINTS:
- Do NOT run \`gh pr checkout\` (it fails when the branch is checked out in another worktree)
- Do NOT run \`git checkout ${targetBranch}\` (it is checked out in the main repo and will fail)
- Do NOT navigate to any other directory — stay in the current working directory
- Use detached HEAD mode for all operations

Steps:
1. Fetch and check out the PR branch in detached HEAD mode:
\`\`\`bash
git fetch origin ${taskBranch} ${targetBranch}
git checkout origin/${taskBranch} --detach
\`\`\`

2. Rebase onto the target:
\`\`\`bash
git rebase origin/${targetBranch}
\`\`\`

3. Resolve ALL merge conflicts. For each conflicting file:
- Read both sides of the conflict carefully
- Keep the intent of both changes (do not discard either side's work)
- Remove all conflict markers (<<<<<<<, =======, >>>>>>>)
- Stage the resolved file and continue the rebase

4. After resolving, verify NO conflict markers remain:
\`\`\`bash
git grep -n -E '^<{7} |^={7}$|^>{7} ' -- '*.cpp' '*.h' '*.md' '*.txt' '*.cmake'
\`\`\`
If any results appear, you MUST fix them before proceeding.

5. Build and run tests to verify the resolution is correct:
\`\`\`bash
cmake --build cmake-build-debug --target tests && cmake-build-debug/git/tests/tests.exe --unit
\`\`\`

6. Force-push the rebased branch:
\`\`\`bash
git push origin HEAD:${taskBranch} --force
\`\`\`

7. Merge the PR:
\`\`\`bash
gh pr merge ${prNumber} --rebase
\`\`\`

If you cannot resolve the conflicts cleanly, abort:
\`\`\`bash
git rebase --abort
\`\`\`
Then leave a comment explaining the issue:
\`\`\`bash
gh pr comment ${prNumber} --body "Unable to auto-resolve conflicts: [explain what conflicts and why]"
\`\`\`

CRITICAL: Never push files containing conflict markers. Always verify with git grep before pushing.`;
}

function spawnDocker(
  imageName: string,
  prompt: string,
  workerDir: string,
  claudeArgs?: string[],
  extraMounts?: string[],
  projectDir?: string,
): ChildProcess {
  const homeDir = process.env.USERPROFILE ?? process.env.HOME ?? "";
  const claudeDir = join(homeDir, ".claude");
  const containerHome = "C:\\Users\\ContainerAdministrator";

  // Copy credentials into the worker dir so we can mount it as a writable .claude
  // (mounting host .claude as :ro blocks claude from creating session state)
  const workerClaudeDir = join(workerDir, ".claude-config");
  if (!existsSync(workerClaudeDir)) {
    mkdirSync(workerClaudeDir, { recursive: true });
  }
  const credsSrc = join(claudeDir, ".credentials.json");
  if (existsSync(credsSrc)) {
    copyFileSync(credsSrc, join(workerClaudeDir, ".credentials.json"));
  }
  // Copy .claude.json if it exists
  const configSrc = join(homeDir, ".claude.json");
  if (existsSync(configSrc)) {
    copyFileSync(configSrc, join(workerDir, ".claude.json"));
  }

  // Use host's nat gateway IP so containers can reach host services (WPT server etc)
  // Detect host IP for Windows containers (host.docker.internal doesn't work)
  let hostIP = process.env.DOCKER_HOST_IP ?? "";
  if (!hostIP) {
    try {
      const result = execFileSync("powershell", ["-Command",
        "(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike '*Loopback*' -and $_.IPAddress -ne '127.0.0.1' } | Select-Object -First 1).IPAddress"
      ], { encoding: "utf-8" });
      hostIP = result.trim();
    } catch { /* fallback */ }
  }
  if (!hostIP) hostIP = "10.0.0.1";

  const claudeExe = "C:/Users/ContainerAdministrator/AppData/Roaming/npm/claude.cmd";
  const fullClaudeArgs = claudeArgs ?? ["-p", "--dangerously-skip-permissions"];

  const args = [
    "run", "--rm", "-i",
    "--name", `ralph-worker-${Date.now()}`,
    "-v", `${workerDir}:C:\\worker`,
    "-w", "C:\\worker",
    "-v", `${workerClaudeDir}:${containerHome}\\.claude`,
    "-e", `CLAUDE_CONFIG_DIR=${containerHome}\\.claude`,
    ...(extraMounts ?? []).flatMap((m) => ["-v", `${m}:C:${m.replace(/^[A-Za-z]:/, "")}:ro`]),
    "-e", `WPT_ROOT=C:/wpt`,
    "-e", `WPT_IP=${hostIP}`,
    "-e", "RALPH_HEADLESS=1",
    "-v", `C:\\Windows\\Fonts:C:\\Windows\\Fonts:ro`,
    "--isolation", "process",
    "--entrypoint", "powershell",
    imageName,
    "-Command",
    `Add-Content C:\\Windows\\System32\\drivers\\etc\\hosts '${hostIP} web-platform.test'; & '${claudeExe}' ${[...fullClaudeArgs, "--dangerously-skip-permissions"].map(a => `'${a}'`).join(" ")} '${prompt.replace(/'/g, "''")}'`,
  ];

  const child = spawn(resolvedDockerPath, args, {
    stdio: ["pipe", "pipe", "pipe"],
    shell: false,
    windowsHide: true,
  });

  return child;
}

export function getCustomPrompt(templatePath: string, task: string): string {
  if (!existsSync(templatePath)) {
    throw new Error(`Prompt template not found: ${templatePath}`);
  }
  const template = readFileSync(templatePath, "utf-8");
  return template.replace(/\{\{task\}\}/g, task);
}

function timestamp(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

const RATE_LIMIT_PATTERNS = [
  /rate.?limit/i,
  /too many requests/i,
  /\b429\b/,
  /usage.?limit/i,
  /spending.?limit/i,
  /budget.?exceeded/i,
  /over.?capacity/i,
  /you've hit your limit/i,
  /hit your limit/i,
  /resets?\s+\d/i,
];

export function classifyExitReason(exitCode: number | null, stderrText: string, stdoutText?: string): ExitReason {
  if (exitCode === 2) return "usage_limit";
  if (exitCode === 0) return "completed";
  for (const pattern of RATE_LIMIT_PATTERNS) {
    if (pattern.test(stderrText)) return "rate_limit";
  }
  return "error";
}

export function spawnWorker(
  workerId: number,
  worktreePath: string,
  taskId: string,
  claimedSubTask: string | null,
  logFile: string,
  baseBranch: string,
): { promise: Promise<WorkerResult>; process: ChildProcess } {
  const prompt = getWorkerPrompt(taskId, claimedSubTask);

  // Mirror spawnCustomWorker: write a stream-json file in the log dir so the
  // dashboard's /api/workers endpoint can detect this worker and stream output.
  const streamLog = join(logFile, "..", `worker-${workerId}.stream.jsonl`);
  appendFileSync(logFile, `[${timestamp()}] Worker ${workerId} - Running task ${taskId} (stream: ${streamLog})\n`);

  const claudeArgs = [
    "--model", claudeModel,
    "--effort", "high",
    "--permission-mode", "bypassPermissions",
    "--output-format", "stream-json",
    "--include-partial-messages",
    "--verbose",
    "-p",
  ];
  const child = spawnClaude(claudeArgs, prompt, worktreePath, { ...process.env });

  const promise = new Promise<WorkerResult>((resolve) => {
    // Stream stdout to the live log file the dashboard reads.
    const stream = createWriteStream(streamLog, { flags: "w" });
    child.stdout?.pipe(stream);

    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    child.stdout?.on("data", (data) => stdoutChunks.push(data));
    child.stderr?.on("data", (data) => {
      stderrChunks.push(data);
      stream.write(data);
    });

    child.on("close", (exitCode) => {
      stream.end();
      const resultText = Buffer.concat([...stdoutChunks, ...stderrChunks]).toString("utf-8");
      const stderrText = Buffer.concat(stderrChunks).toString("utf-8");

      const iterLog = `${logFile}.iter-${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}.txt`;
      writeFileSync(iterLog, resultText, "utf-8");

      const stdoutText = Buffer.concat(stdoutChunks).toString("utf-8");
      const exitReason = classifyExitReason(exitCode, stderrText, stdoutText);

      if (exitReason === "rate_limit" || exitReason === "usage_limit") {
        appendFileSync(logFile, `[${timestamp()}] Worker ${workerId} - RATE LIMITED (${exitReason}, saved to ${iterLog})\n`);
        resolve({ status: "ERROR", workerId, taskId, error: exitReason, exitReason });
        return;
      }

      if (exitCode !== 0) {
        const lastLines = resultText.split("\n").slice(-5).join(" | ").slice(0, 300);
        const errorSummary = `exit code ${exitCode} - ${lastLines}`;
        appendFileSync(logFile, `[${timestamp()}] Worker ${workerId} - ERROR: ${errorSummary} (saved to ${iterLog})\n`);
        resolve({ status: "ERROR", workerId, taskId, error: errorSummary, exitReason });
        return;
      }

      appendFileSync(logFile, `[${timestamp()}] Worker ${workerId} - Result length: ${resultText.length} (saved to ${iterLog})\n`);

      // Auto-commit uncommitted submodule work
      gitInDir(worktreePath, "submodule", "foreach", "--recursive",
        "git add -A && git diff --cached --quiet || git commit -m \"auto: uncommitted work\"");
      const { stdout: rescueDirty } = gitInDir(worktreePath, "status", "--porcelain");
      if (rescueDirty) {
        gitInDir(worktreePath, "add", "-A");
        gitInDir(worktreePath, "commit", "-m", "auto: save uncommitted submodule and file changes");
      }

      // Check for non-.kanbn changes
      const { stdout: changedFiles } = gitInDir(worktreePath, "diff", "--name-only", `${baseBranch}..HEAD`);
      let hasNonKanbnChanges = false;
      if (changedFiles) {
        hasNonKanbnChanges = changedFiles.split("\n").some((f) => !isKanbnPath(f));
      }

      const status: WorkerStatus = hasNonKanbnChanges ? "TASK_COMPLETE" : "NO_COMMITS";
      resolve({ status, workerId, taskId, exitReason });
    });

    child.on("error", (err) => {
      resolve({ status: "ERROR", workerId, taskId, error: err.message, exitReason: "error" });
    });
  });

  return { promise, process: child };
}

export function spawnMergeReviewWorker(
  workerId: number,
  prNumber: number,
  taskBranch: string,
  targetBranch: string,
  logFile: string,
  worktreePath: string,
): { promise: Promise<WorkerResult>; process: ChildProcess } {
  const prompt = getMergeReviewPrompt(prNumber, taskBranch, targetBranch);

  appendFileSync(logFile, `[${timestamp()}] Worker ${workerId} - Reviewing PR #${prNumber}\n`);

  const child = spawnClaude([
    "--model", claudeModel,
    "--effort", "high",
    "--permission-mode", "bypassPermissions",
    "-p",
  ], prompt, worktreePath);

  const promise = new Promise<WorkerResult>((resolve) => {
    const chunks: Buffer[] = [];
    child.stdout?.on("data", (data) => chunks.push(data));
    child.stderr?.on("data", (data) => chunks.push(data));

    child.on("close", (exitCode) => {
      const resultText = Buffer.concat(chunks).toString("utf-8");

      const iterLog = `${logFile}.merge-review-${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}.txt`;
      writeFileSync(iterLog, resultText, "utf-8");
      appendFileSync(logFile, `[${timestamp()}] Worker ${workerId} - Merge review exit code: ${exitCode} (saved to ${iterLog})\n`);

      // Detach HEAD to release branch lock
      gitInDir(worktreePath, "checkout", "--detach");

      const status: WorkerStatus = exitCode === 0 ? "MERGE_REVIEW_DONE" : "MERGE_REVIEW_ERROR";
      resolve({ status, workerId, taskId: `merge-review-${prNumber}` });
    });

    child.on("error", (err) => {
      resolve({ status: "ERROR", workerId, taskId: `merge-review-${prNumber}`, error: err.message });
    });
  });

  return { promise, process: child };
}

export function spawnCustomWorker(
  workerId: number,
  workerDir: string,
  task: string,
  prompt: string,
  logFile: string,
  baseBranch: string,
  config: Config,
): { promise: Promise<WorkerResult>; process: ChildProcess } {
  const streamLog = join(logFile, "..", `worker-${workerId}.stream.jsonl`);
  appendFileSync(logFile, `[${timestamp()}] Worker ${workerId} - Task: ${task} (stream: ${streamLog})\n`);

  const claudeArgs = [
    "--model", claudeModel,
    "--effort", "high",
    "--permission-mode", "bypassPermissions",
    "--output-format", "stream-json",
    "--include-partial-messages",
    "--verbose",
    "-p",
  ];

  let child: ChildProcess;
  if (config.docker) {
    child = spawnDocker(config.dockerImage, prompt, workerDir, claudeArgs, config.dockerMounts, config.projectDir);
  } else {
    child = spawnClaude(claudeArgs, prompt, workerDir);
  }

  const promise = new Promise<WorkerResult>((resolve) => {
    // Stream stdout to a live log file
    const stream = createWriteStream(streamLog, { flags: "w" });
    child.stdout?.pipe(stream);

    // Buffer tail of stdout for rate limit detection
    const stdoutTail: Buffer[] = [];
    child.stdout?.on("data", (data) => {
      stdoutTail.push(data);
      // Keep only last ~32KB
      while (stdoutTail.length > 10) stdoutTail.shift();
    });

    const stderrChunks: Buffer[] = [];
    child.stderr?.on("data", (data) => {
      stderrChunks.push(data);
      stream.write(data);
    });

    child.on("close", (exitCode) => {
      stream.end();
      const stderrText = Buffer.concat(stderrChunks).toString("utf-8").trim();
      const stdoutText = Buffer.concat(stdoutTail).toString("utf-8");
      const errSuffix = stderrText ? ` | stderr: ${stderrText.split("\n").slice(-3).join(" ")}` : "";

      appendFileSync(logFile, `[${timestamp()}] Worker ${workerId} - exit=${exitCode}${errSuffix} (stream: ${streamLog})\n`);

      const exitReason = classifyExitReason(exitCode, stderrText, stdoutText);

      if (exitReason === "rate_limit" || exitReason === "usage_limit") {
        appendFileSync(logFile, `[${timestamp()}] Worker ${workerId} - RATE LIMITED (${exitReason}, stream: ${streamLog})\n`);
        resolve({ status: "ERROR", workerId, taskId: task, error: exitReason, exitReason });
        return;
      }

      if (exitCode !== 0) {
        resolve({ status: "ERROR", workerId, taskId: task, error: `exit code ${exitCode}`, exitReason });
        return;
      }

      // Auto-commit uncommitted submodule work
      gitInDir(workerDir, "submodule", "foreach", "--recursive",
        "git add -A && git diff --cached --quiet || git commit -m \"auto: uncommitted work\"");
      const { stdout: rescueDirty } = gitInDir(workerDir, "status", "--porcelain");
      if (rescueDirty) {
        gitInDir(workerDir, "add", "-A");
        gitInDir(workerDir, "commit", "-m", "auto: save uncommitted changes");
      }

      resolve({ status: "TASK_COMPLETE", workerId, taskId: task, exitReason });
    });

    child.on("error", (err) => {
      resolve({ status: "ERROR", workerId, taskId: task, error: err.message });
    });
  });

  return { promise, process: child };
}

export function spawnContinuationWorker(
  workerId: number,
  workerDir: string,
  task: string,
  originalPrompt: string,
  logFile: string,
  baseBranch: string,
  config: Config,
): { promise: Promise<WorkerResult>; process: ChildProcess } {
  const continuationPrompt = `Continue the task you were working on. You were interrupted mid-task.

Check your progress:
- Run \`git log --oneline -10\` to see what you've already committed
- Run \`git diff\` and \`git status\` to see uncommitted work
- Review the task requirements and determine what remains

Then continue from where you left off. Do NOT redo work that's already done.

Original task:
${originalPrompt}`;

  return spawnCustomWorker(workerId, workerDir, task, continuationPrompt, logFile, baseBranch, config);
}
