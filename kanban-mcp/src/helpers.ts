import { join } from "node:path";
import { createHash } from "node:crypto";
import { homedir } from "node:os";
import { KANBAN_DIR } from "./constants.js";

export const cwd = (): string => process.cwd();

const cwdHash = (): string => createHash("sha256").update(cwd()).digest("hex").slice(0, 12);
const boardsRoot = (): string => join(homedir(), ".boards");

export const kanbanPath = (...parts: string[]): string => join(boardsRoot(), cwdHash(), KANBAN_DIR, ...parts);
export const localKanbanPath = (...parts: string[]): string => join(cwd(), KANBAN_DIR, ...parts);
export const now = (): string => new Date().toISOString();

export function slugify(text: string): string {
  return text.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
