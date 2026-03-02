import { join } from "node:path";
import { KANBAN_DIR } from "./constants.js";

export const cwd = (): string => process.cwd();
export const kanbanPath = (...parts: string[]): string => join(cwd(), KANBAN_DIR, ...parts);
export const now = (): string => new Date().toISOString();

export function slugify(text: string): string {
  return text.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
