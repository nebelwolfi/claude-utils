import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
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
  "clone-dir", "use-clones", "model",
]);

function printHelp(): never {
  console.log(`ralph — parallel Claude worker orchestrator

Usage:
  ralph [options]               Kanban-driven task loop
  ralph config.json [options]   Load config from JSON, CLI flags override

Config file example:
  {
    "task-file": "failures.txt",
    "prompt-template": "prompt.md",
    "workers": 10,
    "use-clones": true,
    "project-dir": "D:\\\\shared"
  }

Options:
  --task-file PATH             Read tasks from file (one per line), bypasses kanban
  --task-command CMD           Run command to get tasks (stdout, one per line)
  --cleanup                    Clean up worktrees/clones and exit
  --merge-only                 Only drain pending PRs, no task work
  --workers N                  Number of parallel workers (default: 3)
  --iterations-per-worker N    Max iterations per worker (default: 10)
  --use-clones                 Full repo clones instead of worktrees (no shared git state)
  --clone-dir PATH             Clone directory (default: D:\\worktrees\\<project>)
  --docker                     Run each worker in a Docker container (implies --use-clones)
  --docker-image NAME          Docker image name (default: ralph-worker)
  --prompt-template PATH       Custom prompt template file. Use {{task}} as placeholder.
  --model NAME                 Claude model (default: claude-opus-4-6)
  --skip-build                 Skip cmake configure step
  --local                      Run entirely locally (no pushes, PRs, or gh calls)
  --base-branch NAME           Base branch (default: auto-detect)
  --project-dir PATH           Project directory (default: cwd)`);
  process.exit(0);
}

// kebab-case key to camelCase config field
const KEY_MAP: Record<string, keyof Config> = {
  "workers": "workers",
  "iterations-per-worker": "iterationsPerWorker",
  "skip-build": "skipBuild",
  "cleanup": "cleanup",
  "merge-only": "mergeOnly",
  "local": "local",
  "base-branch": "baseBranch",
  "project-dir": "projectDir",
  "docker": "docker",
  "docker-image": "dockerImage",
  "task-file": "taskFile",
  "task-command": "taskCommand",
  "prompt-template": "promptTemplate",
  "clone-dir": "cloneDir",
  "use-clones": "useClones",
};

function loadConfigFile(filePath: string): Partial<Record<string, unknown>> {
  if (!existsSync(filePath)) {
    console.error(`Config file not found: ${filePath}`);
    process.exit(1);
  }
  const raw = readFileSync(filePath, "utf-8");
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error(`Invalid JSON in config file: ${filePath}`);
    process.exit(1);
  }
}

export function parseArgs(argv: string[]): Config {
  const args = argv.slice(2);

  if (hasFlag(args, "help") || hasFlag(args, "h")) printHelp();

  // Check if first positional arg is a config file
  let fileDefaults: Partial<Record<string, unknown>> = {};
  let filteredArgs = args;

  if (args.length > 0 && !args[0].startsWith("--") && args[0].endsWith(".json")) {
    const configPath = resolve(args[0]);
    fileDefaults = loadConfigFile(configPath);
    filteredArgs = args.slice(1);
  }

  // Check for unknown flags
  for (const arg of filteredArgs) {
    if (arg.startsWith("--")) {
      const name = arg.slice(2);
      if (!KNOWN_FLAGS.has(name)) {
        console.error(`Unknown option: ${arg}\n`);
        printHelp();
      }
    }
  }

  // Helper: CLI flag > config file > default
  function str(name: string, def: string): string {
    return flag(filteredArgs, name) ?? strFromFile(name) ?? def;
  }
  function num(name: string, def: number): number {
    const cli = flag(filteredArgs, name);
    if (cli) return parseInt(cli, 10);
    const file = fileDefaults[name];
    if (file !== undefined) return typeof file === "number" ? file : parseInt(String(file), 10);
    return def;
  }
  function bool(name: string): boolean {
    if (hasFlag(filteredArgs, name)) return true;
    const file = fileDefaults[name];
    if (file !== undefined) return !!file;
    return false;
  }
  function strFromFile(name: string): string | undefined {
    const v = fileDefaults[name];
    return v !== undefined ? String(v) : undefined;
  }

  const docker = bool("docker");

  return {
    workers: num("workers", 3),
    iterationsPerWorker: num("iterations-per-worker", 10),
    skipBuild: bool("skip-build"),
    cleanup: bool("cleanup"),
    mergeOnly: bool("merge-only"),
    local: bool("local"),
    baseBranch: str("base-branch", ""),
    projectDir: str("project-dir", process.cwd()),
    docker,
    dockerImage: str("docker-image", "ralph-worker"),
    taskFile: str("task-file", ""),
    taskCommand: str("task-command", ""),
    promptTemplate: str("prompt-template", ""),
    cloneDir: str("clone-dir", ""),
    useClones: bool("use-clones") || docker,
    model: str("model", "claude-opus-4-6"),
  };
}
