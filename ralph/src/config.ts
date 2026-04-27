import type { Config } from "./types.js";

function flag(args: string[], name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1 || idx + 1 >= args.length) return undefined;
  return args[idx + 1];
}

function hasFlag(args: string[], name: string): boolean {
  return args.includes(`--${name}`);
}

const KNOWN_FLAGS = new Set([
  "help", "h", "workers", "iterations-per-worker", "skip-build",
  "cleanup", "merge-only", "local", "base-branch", "project-dir",
  "docker", "docker-image", "task-file", "task-command", "prompt-template",
  "clone-dir", "use-clones",
]);

function printHelp(): never {
  console.log(`ralph — parallel Claude worker orchestrator

Usage: ralph [options]

Modes:
  (default)                    Kanban-driven task loop
  --task-file PATH             Read tasks from file (one per line), bypasses kanban
  --task-command CMD           Run command to get tasks (stdout, one per line)
  --cleanup                    Clean up worktrees/clones and exit
  --merge-only                 Only drain pending PRs, no task work

Workers:
  --workers N                  Number of parallel workers (default: 3)
  --iterations-per-worker N    Max iterations per worker (default: 10)

Isolation:
  --use-clones                 Full repo clones instead of worktrees (no shared git state)
  --clone-dir PATH             Clone directory (default: D:\\worktrees\\<project>)
  --docker                     Run each worker in a Docker container (implies --use-clones)
  --docker-image NAME          Docker image name (default: ralph-worker)

Prompts:
  --prompt-template PATH       Custom prompt template file. Use {{task}} as placeholder.

Build:
  --skip-build                 Skip cmake configure step

Git:
  --local                      Run entirely locally (no pushes, PRs, or gh calls)
  --base-branch NAME           Base branch (default: auto-detect)
  --project-dir PATH           Project directory (default: cwd)`);
  process.exit(0);
}

export function parseArgs(argv: string[]): Config {
  const args = argv.slice(2);

  if (hasFlag(args, "help") || hasFlag(args, "h")) printHelp();

  // Check for unknown flags
  for (const arg of args) {
    if (arg.startsWith("--")) {
      const name = arg.slice(2);
      if (!KNOWN_FLAGS.has(name)) {
        console.error(`Unknown option: ${arg}\n`);
        printHelp();
      }
    }
  }

  const docker = hasFlag(args, "docker");

  return {
    workers: parseInt(flag(args, "workers") ?? "3", 10),
    iterationsPerWorker: parseInt(flag(args, "iterations-per-worker") ?? "10", 10),
    skipBuild: hasFlag(args, "skip-build"),
    cleanup: hasFlag(args, "cleanup"),
    mergeOnly: hasFlag(args, "merge-only"),
    local: hasFlag(args, "local"),
    baseBranch: flag(args, "base-branch") ?? "",
    projectDir: flag(args, "project-dir") ?? process.cwd(),
    docker,
    dockerImage: flag(args, "docker-image") ?? "ralph-worker",
    taskFile: flag(args, "task-file") ?? "",
    taskCommand: flag(args, "task-command") ?? "",
    promptTemplate: flag(args, "prompt-template") ?? "",
    cloneDir: flag(args, "clone-dir") ?? "",
    useClones: hasFlag(args, "use-clones") || docker,
  };
}
