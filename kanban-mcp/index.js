#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { readFile, writeFile, readdir, mkdir, unlink, access } from "node:fs/promises";
import { join, basename } from "node:path";

// ── Constants ──────────────────────────────────────────────────────────────────

const KANBAN_DIR = ".kanbn";
const TASKS_DIR = "tasks";
const INDEX_FILE = "index.md";
const DEFAULT_COLUMNS = ["Backlog", "Todo", "In Progress", "Done"];

// ── Helpers ────────────────────────────────────────────────────────────────────

const cwd = () => process.cwd();
const kanbanPath = (...parts) => join(cwd(), KANBAN_DIR, ...parts);
const generateId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const now = () => new Date().toISOString();

// ── Frontmatter Parser (replaces yaml dependency) ──────────────────────────────

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) throw new Error("Invalid markdown frontmatter");

  const lines = match[1].split("\n");
  const fm = {};
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trimEnd();
    if (!line) { i++; continue; }

    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) { i++; continue; }

    const key = line.slice(0, colonIdx).trim();
    const rest = line.slice(colonIdx + 1).trim();

    if (rest === "" && i + 1 < lines.length && /^\s+-/.test(lines[i + 1])) {
      const arr = [];
      i++;
      while (i < lines.length && /^\s+-/.test(lines[i])) {
        arr.push(lines[i].replace(/^\s+-\s*/, "").trim());
        i++;
      }
      fm[key] = arr;
      continue;
    }

    const arrMatch = rest.match(/^\[(.*)\]$/);
    if (arrMatch) {
      fm[key] = arrMatch[1] ? arrMatch[1].split(",").map((s) => s.trim()).filter(Boolean) : [];
    } else if (/^-?\d+$/.test(rest)) {
      fm[key] = parseInt(rest, 10);
    } else if (/^-?\d+\.\d+$/.test(rest)) {
      fm[key] = parseFloat(rest);
    } else {
      fm[key] = rest;
    }
    i++;
  }

  return { frontmatter: fm, body: match[2].trim() };
}

function toMarkdown(fm, body) {
  let yaml = "";
  for (const [key, value] of Object.entries(fm)) {
    if (Array.isArray(value)) {
      if (value.length === 0) {
        yaml += `${key}: []\n`;
      } else {
        yaml += `${key}:\n`;
        for (const item of value) yaml += `  - ${item}\n`;
      }
    } else {
      yaml += `${key}: ${value}\n`;
    }
  }
  return `---\n${yaml}---\n${body ? "\n" + body + "\n" : ""}`;
}

// ── Board Storage ──────────────────────────────────────────────────────────────

async function boardExists() {
  try { await access(kanbanPath(INDEX_FILE)); return true; } catch { return false; }
}

async function ensureBoard() {
  if (await boardExists()) return;
  await mkdir(kanbanPath(TASKS_DIR), { recursive: true });
  await writeFile(kanbanPath(INDEX_FILE), toMarkdown({
    name: basename(cwd()),
    columns: [...DEFAULT_COLUMNS],
    created: now(),
    updated: now(),
  }, ""));
}

async function readIndex() {
  const content = await readFile(kanbanPath(INDEX_FILE), "utf-8");
  return parseFrontmatter(content).frontmatter;
}

// ── Subtask Parsing ─────────────────────────────────────────────────────────

function parseSubtasks(body) {
  const match = body.match(/## Sub-tasks\r?\n([\s\S]*?)(?=\n## |\n*$)/);
  if (!match) return { subtasks: [], description: body.trim() };

  const subtasks = [];
  for (const line of match[1].split("\n")) {
    const m = line.match(/^- \[([ xX])\] (.+)$/);
    if (m) subtasks.push({ text: m[2].trim(), completed: m[1] !== " " });
  }

  const description = body.replace(/\n*## Sub-tasks\r?\n[\s\S]*?(?=\n## |\n*$)/, "").trim();
  return { subtasks, description };
}

function serializeBody(description, subtasks) {
  let body = description || "";
  if (subtasks && subtasks.length > 0) {
    if (body) body += "\n\n";
    body += "## Sub-tasks\n";
    for (const st of subtasks)
      body += `- [${st.completed ? "x" : " "}] ${st.text}\n`;
  }
  return body;
}

// ── Task Storage ───────────────────────────────────────────────────────────────

async function readTask(id) {
  const content = await readFile(kanbanPath(TASKS_DIR, `${id}.md`), "utf-8");
  const { frontmatter, body } = parseFrontmatter(content);
  const { subtasks, description } = parseSubtasks(body);
  return { ...frontmatter, description, subtasks };
}

async function writeTask(task) {
  const { description, subtasks, ...fm } = task;
  fm.updated = now();
  await writeFile(kanbanPath(TASKS_DIR, `${task.id}.md`), toMarkdown(fm, serializeBody(description, subtasks)));
}

async function listTaskIds() {
  try {
    const files = await readdir(kanbanPath(TASKS_DIR));
    return files.filter((f) => f.endsWith(".md")).map((f) => f.replace(".md", ""));
  } catch { return []; }
}

async function getAllTasks() {
  return Promise.all((await listTaskIds()).map(readTask));
}

// ── Task Operations ────────────────────────────────────────────────────────────

async function createTask(params) {
  await ensureBoard();
  const index = await readIndex();
  if (!index.columns.includes(params.column))
    throw new Error(`Column "${params.column}" does not exist. Available: ${index.columns.join(", ")}`);

  const colTasks = (await getAllTasks()).filter((t) => t.column === params.column);
  const task = {
    id: generateId(),
    title: params.title,
    column: params.column,
    position: params.position ?? colTasks.length,
    priority: params.priority ?? "medium",
    assignee: params.assignee ?? "",
    tags: params.tags ?? [],
    created: now(),
    updated: now(),
    description: params.description ?? "",
    subtasks: (params.subtasks ?? []).map((text) => ({ text, completed: false })),
  };
  await writeTask(task);
  return task;
}

async function editTask(id, updates) {
  const task = await readTask(id);
  for (const key of ["title", "description", "priority", "assignee", "tags"])
    if (updates[key] !== undefined) task[key] = updates[key];
  await writeTask(task);
  return task;
}

async function moveTask(id, column, position) {
  await ensureBoard();
  const index = await readIndex();
  if (!index.columns.includes(column))
    throw new Error(`Column "${column}" does not exist. Available: ${index.columns.join(", ")}`);

  const task = await readTask(id);
  task.column = column;
  task.position = position ?? (await getAllTasks()).filter((t) => t.column === column && t.id !== id).length;
  await writeTask(task);
  return task;
}

async function deleteTask(id) {
  await unlink(kanbanPath(TASKS_DIR, `${id}.md`));
}

async function findTasks(params) {
  return (await getAllTasks()).filter((task) => {
    if (params.column && task.column !== params.column) return false;
    if (params.assignee && task.assignee !== params.assignee) return false;
    if (params.tag && !task.tags.includes(params.tag)) return false;
    if (params.priority && task.priority !== params.priority) return false;
    if (params.query) {
      const q = params.query.toLowerCase();
      if (!task.title.toLowerCase().includes(q) &&
          !task.description.toLowerCase().includes(q) &&
          !task.tags.some((t) => t.toLowerCase().includes(q))) return false;
    }
    return true;
  });
}

// ── Board Views ────────────────────────────────────────────────────────────────

async function boardView() {
  if (!(await boardExists())) return "No board found. Create a task to auto-initialize.";
  const index = await readIndex();
  const allTasks = await getAllTasks();

  let out = `# ${index.name}\n\n`;
  for (const col of index.columns) {
    const tasks = allTasks.filter((t) => t.column === col).sort((a, b) => a.position - b.position);
    out += `## ${col} (${tasks.length})\n`;
    if (tasks.length === 0) {
      out += "_No tasks_\n\n";
    } else {
      for (const t of tasks) {
        const tags = t.tags.length ? ` [${t.tags.join(", ")}]` : "";
        const assignee = t.assignee ? ` @${t.assignee}` : "";
        const prio = t.priority !== "medium" ? ` !${t.priority}` : "";
        const subs = t.subtasks?.length ? ` [${t.subtasks.filter((s) => s.completed).length}/${t.subtasks.length}]` : "";
        out += `- **${t.title}** (${t.id})${prio}${subs}${assignee}${tags}\n`;
      }
      out += "\n";
    }
  }
  return out.trim();
}

async function boardStats() {
  if (!(await boardExists())) return "No board found.";
  const index = await readIndex();
  const allTasks = await getAllTasks();
  const total = allTasks.length;
  if (total === 0) return "Board is empty.";

  let out = `# Board Stats: ${index.name}\n\n**Total tasks:** ${total}\n\n`;
  out += "| Column | Count | % |\n|--------|------:|---:|\n";
  for (const col of index.columns) {
    const count = allTasks.filter((t) => t.column === col).length;
    out += `| ${col} | ${count} | ${Math.round((count / total) * 100)}% |\n`;
  }
  const done = allTasks.filter((t) => t.column === "Done").length;
  out += `\n**Completion rate:** ${Math.round((done / total) * 100)}%\n`;

  const prios = {};
  for (const t of allTasks) prios[t.priority] = (prios[t.priority] || 0) + 1;
  out += "\n**By priority:**\n";
  for (const [p, c] of Object.entries(prios).sort()) out += `- ${p}: ${c}\n`;

  const oldest = allTasks.reduce((a, b) => (a.created < b.created ? a : b));
  out += `\n**Oldest task:** ${oldest.title} (created ${oldest.created.split("T")[0]})`;
  return out;
}

async function boardValidate() {
  if (!(await boardExists())) return "No board found.";
  const index = await readIndex();
  const issues = [];
  for (const id of await listTaskIds()) {
    try {
      const task = await readTask(id);
      if (!index.columns.includes(task.column))
        issues.push(`Task "${task.title}" (${id}) references unknown column "${task.column}"`);
      if (!task.title) issues.push(`Task ${id} has no title`);
    } catch (e) {
      issues.push(`Task file ${id}.md is malformed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return issues.length === 0
    ? "Board is valid. No issues found."
    : `Found ${issues.length} issue(s):\n${issues.map((i) => `- ${i}`).join("\n")}`;
}

// ── MCP Server ─────────────────────────────────────────────────────────────────

const server = new McpServer({ name: "kanban-mcp", version: "1.0.0" });

const wrap = (fn) => async (params) => {
  try {
    return { content: [{ type: "text", text: await fn(params) }] };
  } catch (e) {
    return { content: [{ type: "text", text: `Error: ${e instanceof Error ? e.message : String(e)}` }], isError: true };
  }
};

server.tool("board_view", "Show the full kanban board with all columns and tasks", {}, wrap(boardView));
server.tool("board_stats", "Board statistics: task counts, completion rate, priority breakdown", {}, wrap(boardStats));
server.tool("board_validate", "Check board consistency and report issues", {}, wrap(boardValidate));

server.tool("task_create", "Create a new task", {
  title: z.string().describe("Task title"),
  column: z.string().optional().describe("Column (default: Backlog)"),
  description: z.string().optional().describe("Task description (markdown)"),
  priority: z.enum(["low", "medium", "high", "critical"]).optional().describe("Priority (default: medium)"),
  assignee: z.string().optional().describe("Assignee"),
  tags: z.array(z.string()).optional().describe("Tags/labels"),
  position: z.number().optional().describe("Position in column (0-indexed)"),
  subtasks: z.array(z.string()).optional().describe("Initial subtask titles"),
}, wrap(async (p) => {
  const t = await createTask({ title: p.title, column: p.column ?? "Backlog", description: p.description, priority: p.priority, assignee: p.assignee, tags: p.tags, position: p.position, subtasks: p.subtasks });
  const subInfo = t.subtasks.length ? ` with ${t.subtasks.length} subtask(s)` : "";
  return `Created task "${t.title}" (${t.id}) in ${t.column}${subInfo}`;
}));

server.tool("task_edit", "Edit an existing task's fields", {
  id: z.string().describe("Task ID"),
  title: z.string().optional().describe("New title"),
  description: z.string().optional().describe("New description"),
  priority: z.enum(["low", "medium", "high", "critical"]).optional().describe("New priority"),
  assignee: z.string().optional().describe("New assignee"),
  tags: z.array(z.string()).optional().describe("New tags (replaces existing)"),
}, wrap(async (p) => {
  const { id, ...updates } = p;
  const t = await editTask(id, updates);
  return `Updated task "${t.title}" (${t.id})`;
}));

server.tool("task_view", "View a single task's full details including subtasks", {
  id: z.string().describe("Task ID"),
}, wrap(async (p) => {
  const t = await readTask(p.id);
  let out = `# ${t.title}\n\n- **ID:** ${t.id}\n- **Column:** ${t.column}\n- **Priority:** ${t.priority}\n`;
  out += `- **Assignee:** ${t.assignee || "_unassigned_"}\n- **Tags:** ${t.tags.length ? t.tags.join(", ") : "_none_"}\n`;
  out += `- **Created:** ${t.created}\n- **Updated:** ${t.updated}\n`;
  if (t.subtasks?.length) {
    const done = t.subtasks.filter((s) => s.completed).length;
    out += `- **Subtasks:** ${done}/${t.subtasks.length} complete\n`;
  }
  if (t.description) out += `\n---\n\n${t.description}`;
  if (t.subtasks?.length) {
    out += `\n\n## Sub-tasks\n\n`;
    for (let i = 0; i < t.subtasks.length; i++) {
      const s = t.subtasks[i];
      out += `${i}. [${s.completed ? "x" : " "}] ${s.text}\n`;
    }
  }
  return out;
}));

server.tool("task_move", "Move a task to a different column", {
  id: z.string().describe("Task ID"),
  column: z.string().describe("Destination column"),
  position: z.number().optional().describe("Position in destination column"),
}, wrap(async (p) => {
  const t = await moveTask(p.id, p.column, p.position);
  return `Moved "${t.title}" to ${t.column}`;
}));

server.tool("task_delete", "Delete a task from the board", {
  id: z.string().describe("Task ID"),
}, wrap(async (p) => {
  const t = await readTask(p.id);
  await deleteTask(p.id);
  return `Deleted task "${t.title}" (${p.id})`;
}));

server.tool("task_find", "Search and filter tasks", {
  query: z.string().optional().describe("Search text (title, description, tags)"),
  column: z.string().optional().describe("Filter by column"),
  assignee: z.string().optional().describe("Filter by assignee"),
  tag: z.string().optional().describe("Filter by tag"),
  priority: z.enum(["low", "medium", "high", "critical"]).optional().describe("Filter by priority"),
}, wrap(async (p) => {
  await ensureBoard();
  const tasks = await findTasks(p);
  if (tasks.length === 0) return "No tasks found matching the criteria.";
  let out = `Found ${tasks.length} task(s):\n\n`;
  for (const t of tasks) {
    const tags = t.tags.length ? ` [${t.tags.join(", ")}]` : "";
    const assignee = t.assignee ? ` @${t.assignee}` : "";
    out += `- **${t.title}** (${t.id}) — ${t.column} | ${t.priority}${assignee}${tags}\n`;
  }
  return out.trim();
}));

server.tool("task_subtask", "Manage subtasks: add, toggle, or remove", {
  id: z.string().describe("Task ID"),
  action: z.enum(["add", "toggle", "remove"]).describe("Action to perform"),
  text: z.string().optional().describe("Subtask text (required for add)"),
  index: z.number().optional().describe("Subtask index (required for toggle/remove, 0-based)"),
}, wrap(async (p) => {
  const task = await readTask(p.id);
  if (!task.subtasks) task.subtasks = [];

  switch (p.action) {
    case "add": {
      if (!p.text) throw new Error("text is required for add action");
      task.subtasks.push({ text: p.text, completed: false });
      await writeTask(task);
      return `Added subtask "${p.text}" to "${task.title}" (${task.subtasks.length} total)`;
    }
    case "toggle": {
      if (p.index === undefined) throw new Error("index is required for toggle action");
      if (p.index < 0 || p.index >= task.subtasks.length)
        throw new Error(`Index ${p.index} out of range (0-${task.subtasks.length - 1})`);
      task.subtasks[p.index].completed = !task.subtasks[p.index].completed;
      const state = task.subtasks[p.index].completed ? "completed" : "incomplete";
      await writeTask(task);
      return `Toggled subtask "${task.subtasks[p.index].text}" to ${state}`;
    }
    case "remove": {
      if (p.index === undefined) throw new Error("index is required for remove action");
      if (p.index < 0 || p.index >= task.subtasks.length)
        throw new Error(`Index ${p.index} out of range (0-${task.subtasks.length - 1})`);
      const removed = task.subtasks.splice(p.index, 1)[0];
      await writeTask(task);
      return `Removed subtask "${removed.text}" from "${task.title}" (${task.subtasks.length} remaining)`;
    }
  }
}));

// ── Start ──────────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
server.connect(transport).catch((e) => { console.error("Fatal:", e); process.exit(1); });
