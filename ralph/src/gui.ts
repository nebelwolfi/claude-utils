#!/usr/bin/env node

import { mkdirSync } from "node:fs";
import { join, basename } from "node:path";
import { parseArgs } from "./config.js";
import { DashboardState } from "./dashboard/state.js";
import { startDashboard } from "./dashboard/server.js";

const config = parseArgs(process.argv);

const projectDir = config.projectDir;
const projectName = basename(projectDir);
const useClones = config.useClones;
const worktreeRoot = useClones
  ? (config.cloneDir || join("D:\\worktrees", projectName))
  : join(projectDir, ".ralph-worktrees");
const logDir = join(worktreeRoot, "logs");

mkdirSync(logDir, { recursive: true });

const mode = (config.taskFile || config.taskCommand) ? "taskqueue" as const : "kanban" as const;
const ds = new DashboardState(config, logDir, mode);

startDashboard(ds, config.dashboardPort);

console.log(`Ralph GUI — ${mode} mode`);
console.log(`Watching: ${logDir}`);
console.log("Press Ctrl+C to exit");
