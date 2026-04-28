#!/usr/bin/env node

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile, open, stat, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const logDir = process.argv.find((_, i, a) => a[i - 1] === "--dir") ?? process.cwd();
const startPort = parseInt(process.argv.find((_, i, a) => a[i - 1] === "--port") ?? "3100", 10);

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

async function getWorkers(): Promise<{ workers: { id: number; file: string; size: number }[]; ralphLogSize: number }> {
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

function route(method: string, url: string): [string, Record<string, string>] {
  const path = url.split("?")[0];
  const m = path.match(/^\/api\/worker\/(\d+)$/);
  if (m) return [`${method} /api/worker/:id`, { id: m[1] }];
  return [`${method} ${path}`, {}];
}

async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = (req.url ?? "/").split("?")[0];
  const fullUrl = req.url ?? "/";
  const method = req.method ?? "GET";

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  if (url === "/" || url === "/index.html") {
    const html = await getHtml();
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(html);
    return;
  }

  if (!url.startsWith("/api/")) { res.writeHead(404); res.end("Not found"); return; }

  const [key, params] = route(method, fullUrl);
  const query = parseQuery(fullUrl);

  try {
    switch (key) {
      case "GET /api/workers": {
        const data = await getWorkers();
        json(res, data);
        return;
      }

      case "GET /api/worker/:id": {
        const offset = parseInt(query.offset ?? "0", 10);
        const filePath = join(logDir, `worker-${params.id}.stream.jsonl`);
        const result = await readFromOffset(filePath, offset);
        json(res, result);
        return;
      }

      case "GET /api/ralph-log": {
        const offset = parseInt(query.offset ?? "0", 10);
        const filePath = join(logDir, "ralph.log");
        const result = await readFromOffset(filePath, offset);
        json(res, result);
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
    console.log(`Log viewer running at ${url}`);
    console.log(`Watching: ${logDir}`);
    import("node:child_process").then(({ exec }) => {
      const cmd = process.platform === "win32" ? "start" : process.platform === "darwin" ? "open" : "xdg-open";
      exec(`${cmd} ${url}`);
    }).catch(() => {});
  });
  server.listen(port);
}

tryListen(startPort);
