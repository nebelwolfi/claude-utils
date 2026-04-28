import type { ServerResponse } from "node:http";
import type { Config } from "../types.js";

export interface WorkerSlotInfo {
  slot: number;
  status: "idle" | "active" | "paused" | "error" | "rate_limited";
  task: string | null;
  pid: number | null;
  startedAt: number | null;
  continuations: number;
  lastExitCode: number | null;
  lastExitReason: string | null;
  paused: boolean;
  workerDir: string | null;
}

export type ControlCommandType =
  | "scale_up" | "scale_down"
  | "kill_worker" | "pause_slot" | "unpause_slot"
  | "resume_task" | "skip_task"
  | "add_task" | "remove_task" | "reorder_task";

export interface ControlCommand {
  id: string;
  type: ControlCommandType;
  payload: Record<string, unknown>;
  status: "pending" | "applied" | "failed";
  error?: string;
}

export interface QueuedTask {
  task: string;
  status: "queued" | "active" | "completed" | "failed" | "skipped";
  assignedSlot: number | null;
}

let _cmdCounter = 0;

export class DashboardState {
  mode: "kanban" | "taskqueue";
  config: Config;
  workers = new Map<number, WorkerSlotInfo>();
  taskQueue: QueuedTask[] = [];
  controlQueue: ControlCommand[] = [];
  sseClients = new Set<ServerResponse>();
  logDir: string;
  logLines: string[] = [];
  startedAt = Date.now();

  constructor(config: Config, logDir: string, mode: "kanban" | "taskqueue") {
    this.config = config;
    this.logDir = logDir;
    this.mode = mode;
  }

  getSlot(slot: number): WorkerSlotInfo {
    if (!this.workers.has(slot)) {
      this.workers.set(slot, {
        slot,
        status: "idle",
        task: null,
        pid: null,
        startedAt: null,
        continuations: 0,
        lastExitCode: null,
        lastExitReason: null,
        paused: false,
        workerDir: null,
      });
    }
    return this.workers.get(slot)!;
  }

  updateSlot(slot: number, update: Partial<WorkerSlotInfo>): void {
    const info = this.getSlot(slot);
    Object.assign(info, update);
    this.pushSse("slot_update");
  }

  enqueueCommand(type: ControlCommandType, payload: Record<string, unknown> = {}): string {
    const id = `cmd-${++_cmdCounter}`;
    this.controlQueue.push({ id, type, payload, status: "pending" });
    return id;
  }

  drainCommands(): ControlCommand[] {
    const cmds = this.controlQueue.filter(c => c.status === "pending");
    return cmds;
  }

  markCommand(id: string, status: "applied" | "failed", error?: string): void {
    const cmd = this.controlQueue.find(c => c.id === id);
    if (cmd) {
      cmd.status = status;
      cmd.error = error;
    }
  }

  pushSse(event: string): void {
    for (const client of this.sseClients) {
      try { client.write(`data: ${event}\n\n`); } catch { this.sseClients.delete(client); }
    }
  }

  addLogLine(line: string): void {
    this.logLines.push(line);
    if (this.logLines.length > 2000) this.logLines.splice(0, this.logLines.length - 2000);
  }

  getSnapshot(): object {
    const slots: WorkerSlotInfo[] = [];
    for (const [, info] of this.workers) slots.push(info);
    slots.sort((a, b) => a.slot - b.slot);

    return {
      mode: this.mode,
      uptime: Date.now() - this.startedAt,
      workers: slots,
      taskQueue: this.taskQueue,
      config: {
        workers: this.config.workers,
        model: this.config.model,
        autoResume: this.config.autoResume,
        maxContinuations: this.config.maxContinuations,
        local: this.config.local,
      },
    };
  }
}
