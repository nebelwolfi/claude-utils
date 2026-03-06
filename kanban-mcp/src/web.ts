#!/usr/bin/env node

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createTask, editTask, moveTask, deleteTask, findTasks } from "./operations.js";
import {
  ensureBoard, readIndex, readTask, getAllTasksWithColumns, writeTask, withLock,
} from "./storage.js";
import type { Task } from "./types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
let cachedHtml: string | null = null;

async function getHtml(): Promise<string> {
  if (cachedHtml) return cachedHtml;
  const htmlPath = join(__dirname, "..", "src", "app.html");
  try {
    cachedHtml = await readFile(htmlPath, "utf-8");
  } catch {
    cachedHtml = await readFile(join(__dirname, "app.html"), "utf-8");
  }
  return cachedHtml;
}

function json(res: ServerResponse, data: unknown, status = 200): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

function err(res: ServerResponse, message: string, status = 400): void {
  json(res, { error: message }, status);
}

async function body(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const raw = Buffer.concat(chunks).toString();
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

function route(method: string, url: string): [string, Record<string, string>] {
  const m = url.match(/^\/api\/tasks\/([^/]+)\/move$/);
  if (m) return [`${method} /api/tasks/:id/move`, { id: m[1] }];
  const s = url.match(/^\/api\/tasks\/([^/]+)\/subtask$/);
  if (s) return [`${method} /api/tasks/:id/subtask`, { id: s[1] }];
  const t = url.match(/^\/api\/tasks\/([^/]+)$/);
  if (t) return [`${method} /api/tasks/:id`, { id: t[1] }];
  return [`${method} ${url}`, {}];
}

async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = (req.url ?? "/").split("?")[0];
  const method = req.method ?? "GET";

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  if (url === "/" || url === "/index.html") {
    const html = await getHtml();
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(html);
    return;
  }

  if (!url.startsWith("/api/")) { res.writeHead(404); res.end("Not found"); return; }

  await ensureBoard();
  const [key, params] = route(method, url);

  try {
    switch (key) {
      case "GET /api/board": {
        const { tasks, index } = await getAllTasksWithColumns();
        json(res, { name: index.name, columns: index.columns, tasks });
        return;
      }

      case "GET /api/tasks/:id": {
        const index = await readIndex();
        const task = await readTask(params.id);
        let column = "";
        for (const col of index.columns) {
          if ((index.tasksByColumn[col] ?? []).includes(params.id)) { column = col; break; }
        }
        json(res, { ...task, column });
        return;
      }

      case "POST /api/tasks": {
        const data = await body(req);
        if (!data.title || typeof data.title !== "string")
          return err(res, "title is required");
        const task = await createTask({
          title: data.title,
          column: data.column as string | undefined,
          description: data.description as string | undefined,
          priority: data.priority as Task["priority"] | undefined,
          assignee: data.assignee as string | undefined,
          tags: data.tags as string[] | undefined,
          position: data.position as number | undefined,
          subtasks: data.subtasks as string[] | undefined,
        });
        json(res, task, 201);
        return;
      }

      case "PUT /api/tasks/:id": {
        const data = await body(req);
        const task = await editTask(params.id, {
          title: data.title as string | undefined,
          description: data.description as string | undefined,
          priority: data.priority as Task["priority"] | undefined,
          assignee: data.assignee as string | undefined,
          tags: data.tags as string[] | undefined,
        });
        json(res, task);
        return;
      }

      case "POST /api/tasks/:id/move": {
        const data = await body(req);
        if (!data.column || typeof data.column !== "string")
          return err(res, "column is required");
        const task = await moveTask(params.id, data.column, data.position as number | undefined);
        json(res, task);
        return;
      }

      case "DELETE /api/tasks/:id": {
        await deleteTask(params.id);
        res.writeHead(204);
        res.end();
        return;
      }

      case "POST /api/tasks/:id/subtask": {
        const data = await body(req);
        const action = data.action as string;
        const task = await withLock(async () => {
          const t = await readTask(params.id);
          if (action === "add" && typeof data.text === "string") {
            t.subtasks.push({ text: data.text, completed: false });
          } else if (action === "toggle" && typeof data.index === "number") {
            if (t.subtasks[data.index]) t.subtasks[data.index].completed = !t.subtasks[data.index].completed;
          } else if (action === "remove" && typeof data.index === "number") {
            t.subtasks.splice(data.index, 1);
          } else {
            throw new Error("Invalid subtask action");
          }
          await writeTask(t);
          return t;
        });
        const index = await readIndex();
        let column = "";
        for (const col of index.columns) {
          if ((index.tasksByColumn[col] ?? []).includes(params.id)) { column = col; break; }
        }
        json(res, { ...task, column });
        return;
      }

      default:
        err(res, "Not found", 404);
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    err(res, message, message.includes("ENOENT") ? 404 : 500);
  }
}

const startPort = parseInt(process.argv.find((_, i, a) => a[i - 1] === "--port") ?? "3000", 10);
const server = createServer(handle);

function tryListen(port: number): void {
  server.removeAllListeners("error");
  server.removeAllListeners("listening");
  server.once("error", (e: NodeJS.ErrnoException) => {
    if (e.code === "EADDRINUSE") {
      console.log(`Port ${port} in use, trying ${port + 1}...`);
      tryListen(port + 1);
    } else {
      throw e;
    }
  });
  server.once("listening", () => {
    const url = `http://localhost:${port}`;
    console.log(`Kanban board running at ${url}`);
    import("node:child_process").then(({ exec }) => {
      const cmd = process.platform === "win32" ? "start" : process.platform === "darwin" ? "open" : "xdg-open";
      exec(`${cmd} ${url}`);
    }).catch(() => {});
  });
  server.listen(port);
}

tryListen(startPort);
