import { createServer, type IncomingMessage, type ServerResponse, type Server } from "node:http";
import { readFile, open, stat, readdir } from "node:fs/promises";
import { watch } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { DashboardState, type ControlCommandType } from "./state.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function getHtml(): Promise<string> {
  const htmlPath = join(__dirname, "..", "src", "dashboard", "app.html");
  try {
    return await readFile(htmlPath, "utf-8");
  } catch {
    try {
      return await readFile(join(__dirname, "dashboard", "app.html"), "utf-8");
    } catch {
      return await readFile(join(__dirname, "app.html"), "utf-8");
    }
  }
}

function json(res: ServerResponse, data: unknown, status = 200): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

function err(res: ServerResponse, message: string, status = 400): void {
  json(res, { error: message }, status);
}

function parseQuery(url: string): Record<string, string> {
  const idx = url.indexOf("?");
  if (idx < 0) return {};
  const params: Record<string, string> = {};
  for (const pair of url.slice(idx + 1).split("&")) {
    const [k, v] = pair.split("=");
    if (k) params[decodeURIComponent(k)] = decodeURIComponent(v ?? "");
  }
  return params;
}

async function readFromOffset(filePath: string, offset: number): Promise<{ data: string; offset: number }> {
  let fh;
  try {
    const info = await stat(filePath);
    const size = info.size;
    if (offset >= size) return { data: "", offset: size };

    fh = await open(filePath, "r");
    const len = size - offset;
    const buf = Buffer.alloc(len);
    await fh.read(buf, 0, len, offset);
    return { data: buf.toString("utf-8"), offset: size };
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return { data: "", offset: 0 };
    throw e;
  } finally {
    await fh?.close();
  }
}

async function getWorkers(logDir: string): Promise<{ workers: { id: number; file: string; size: number }[]; ralphLogSize: number }> {
  const workers: { id: number; file: string; size: number }[] = [];
  let ralphLogSize = 0;

  try {
    const files = await readdir(logDir);
    for (const f of files) {
      const m = f.match(/^worker-(\d+)\.stream\.jsonl$/);
      if (m) {
        const info = await stat(join(logDir, f));
        workers.push({ id: parseInt(m[1], 10), file: f, size: info.size });
      }
    }
    workers.sort((a, b) => a.id - b.id);
  } catch { /* dir doesn't exist yet */ }

  try {
    const info = await stat(join(logDir, "ralph.log"));
    ralphLogSize = info.size;
  } catch { /* no ralph.log yet */ }

  return { workers, ralphLogSize };
}

async function body(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const raw = Buffer.concat(chunks).toString();
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

function route(method: string, url: string): [string, Record<string, string>] {
  const path = url.split("?")[0];
  // POST routes with worker ID
  const workerAction = path.match(/^\/api\/worker\/(\d+)\/(kill|pause|unpause|resume-task|skip)$/);
  if (workerAction) return [`${method} /api/worker/:id/${workerAction[2]}`, { id: workerAction[1] }];
  // GET worker by ID
  const m = path.match(/^\/api\/worker\/(\d+)$/);
  if (m) return [`${method} /api/worker/:id`, { id: m[1] }];
  return [`${method} ${path}`, {}];
}

async function handle(req: IncomingMessage, res: ServerResponse, ds: DashboardState): Promise<void> {
  const url = (req.url ?? "/").split("?")[0];
  const fullUrl = req.url ?? "/";
  const method = req.method ?? "GET";

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  if (url === "/" || url === "/index.html") {
    const html = await getHtml();
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(html);
    return;
  }

  if (url === "/api/events") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    });
    res.write("data: connected\n\n");
    ds.sseClients.add(res);
    req.on("close", () => ds.sseClients.delete(res));
    return;
  }

  if (!url.startsWith("/api/")) { res.writeHead(404); res.end("Not found"); return; }

  const [key, params] = route(method, fullUrl);
  const query = parseQuery(fullUrl);

  try {
    switch (key) {
      // ─── Read-only endpoints ───
      case "GET /api/workers": {
        const data = await getWorkers(ds.logDir);
        json(res, data);
        return;
      }
      case "GET /api/worker/:id": {
        const offset = parseInt(query.offset ?? "0", 10);
        const filePath = join(ds.logDir, `worker-${params.id}.stream.jsonl`);
        const result = await readFromOffset(filePath, offset);
        json(res, result);
        return;
      }
      case "GET /api/ralph-log": {
        const offset = parseInt(query.offset ?? "0", 10);
        const filePath = join(ds.logDir, "ralph.log");
        const result = await readFromOffset(filePath, offset);
        json(res, result);
        return;
      }
      case "GET /api/state": {
        json(res, ds.getSnapshot());
        return;
      }
      case "GET /api/queue": {
        json(res, { queue: ds.taskQueue });
        return;
      }

      // ─── Control endpoints ───
      case "POST /api/workers/scale": {
        const data = await body(req);
        const count = typeof data.count === "number" ? data.count : 0;
        if (count < 1) return err(res, "count must be >= 1");
        const currentMax = Math.max(0, ...Array.from(ds.workers.keys()));
        if (count > currentMax) {
          const id = ds.enqueueCommand("scale_up", { count: count - currentMax });
          json(res, { id, status: "pending" });
        } else if (count < currentMax) {
          const id = ds.enqueueCommand("scale_down", { count: currentMax - count });
          json(res, { id, status: "pending" });
        } else {
          json(res, { status: "no_change" });
        }
        return;
      }
      case "POST /api/worker/:id/kill": {
        const id = ds.enqueueCommand("kill_worker", { slot: parseInt(params.id, 10) });
        json(res, { id, status: "pending" });
        return;
      }
      case "POST /api/worker/:id/pause": {
        const id = ds.enqueueCommand("pause_slot", { slot: parseInt(params.id, 10) });
        json(res, { id, status: "pending" });
        return;
      }
      case "POST /api/worker/:id/unpause": {
        const id = ds.enqueueCommand("unpause_slot", { slot: parseInt(params.id, 10) });
        json(res, { id, status: "pending" });
        return;
      }
      case "POST /api/worker/:id/resume-task": {
        const id = ds.enqueueCommand("resume_task", { slot: parseInt(params.id, 10) });
        json(res, { id, status: "pending" });
        return;
      }
      case "POST /api/worker/:id/skip": {
        const id = ds.enqueueCommand("skip_task", { slot: parseInt(params.id, 10) });
        json(res, { id, status: "pending" });
        return;
      }
      case "POST /api/queue/add": {
        const data = await body(req);
        if (typeof data.task !== "string" || !data.task) return err(res, "task is required");
        const id = ds.enqueueCommand("add_task", { task: data.task });
        json(res, { id, status: "pending" });
        return;
      }
      case "POST /api/queue/remove": {
        const data = await body(req);
        if (typeof data.index !== "number") return err(res, "index is required");
        const id = ds.enqueueCommand("remove_task", { index: data.index });
        json(res, { id, status: "pending" });
        return;
      }
      case "POST /api/queue/reorder": {
        const data = await body(req);
        if (typeof data.from !== "number" || typeof data.to !== "number") return err(res, "from and to are required");
        const id = ds.enqueueCommand("reorder_task", { from: data.from, to: data.to });
        json(res, { id, status: "pending" });
        return;
      }

      default:
        err(res, "Not found", 404);
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    err(res, message, 500);
  }
}

function tryListen(server: Server, port: number, logDir: string): void {
  server.removeAllListeners("error");
  server.removeAllListeners("listening");
  server.once("error", (e: NodeJS.ErrnoException) => {
    if (e.code === "EADDRINUSE") {
      tryListen(server, port + 1, logDir);
    } else {
      console.error(`Dashboard server error: ${e.message}`);
    }
  });
  server.once("listening", () => {
    const url = `http://localhost:${port}`;
    console.log(`Dashboard: ${url}`);
    import("node:child_process").then(({ exec }) => {
      const cmd = process.platform === "win32" ? "start" : process.platform === "darwin" ? "open" : "xdg-open";
      exec(`${cmd} ${url}`);
    }).catch(() => {});
  });
  server.listen(port);
}

export function startDashboard(ds: DashboardState, port: number): Server {
  // Watch log directory for file changes
  try {
    let debounce: ReturnType<typeof setTimeout> | null = null;
    watch(ds.logDir, { persistent: false }, () => {
      if (debounce) return;
      debounce = setTimeout(() => {
        debounce = null;
        ds.pushSse("change");
      }, 200);
    });
  } catch { /* dir may not exist yet */ }

  const server = createServer((req, res) => handle(req, res, ds));
  tryListen(server, port, ds.logDir);
  return server;
}
