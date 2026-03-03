import { join } from "node:path";
import { KANBAN_DIR } from "./constants.js";

export const cwd = (): string => process.env.KANBAN_ROOT || process.cwd();

export const kanbanPath = (...parts: string[]): string => join(cwd(), KANBAN_DIR, ...parts);
export const now = (): string => new Date().toISOString();

export function slugify(text: string): string {
  return text
    .replace(
      /([A-Z]+(.))/g,
      (_, separator: string, _letter: string, offset: number) =>
        (offset ? "-" + separator : separator).toLowerCase()
    )
    .split(/[\s!?.,@:;|\\/"'`£$%^&*{}[\]()<>~#+\-=_¬]+/)
    .filter(Boolean)
    .join("-")
    .replace(/(^-|-$)/g, "");
}
