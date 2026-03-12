import { join } from "node:path";
import { KANBAN_DIR } from "./constants.js";

export const cwd = (): string => process.env.KANBAN_ROOT || process.cwd();

export const kanbanPath = (...parts: string[]): string => join(cwd(), KANBAN_DIR, ...parts);
export const now = (): string => new Date().toISOString();

const CP1252_REPLACEMENTS: [RegExp, string][] = [
  [/[\u2018\u2019\u201A\u201B]/g, "'"],
  [/[\u201C\u201D\u201E\u201F]/g, '"'],
  [/\u2013/g, "-"],
  [/\u2014/g, "--"],
  [/\u2026/g, "..."],
  [/\u2022/g, "*"],
  [/\u00A0/g, " "],
  [/\u2002/g, " "],
  [/\u2003/g, " "],
  [/\u200B/g, ""],
  [/\uFEFF/g, ""],
  [/\u2190/g, "<-"],
  [/\u2192/g, "->"],
  [/\u21D0/g, "<="],
  [/\u21D2/g, "=>"],
  [/\u2264/g, "<="],
  [/\u2265/g, ">="],
  [/\u2260/g, "!="],
  [/\u00D7/g, "x"],
  [/\u00F7/g, "/"],
  [/\u2212/g, "-"],
  [/\u2011/g, "-"],
];

export function sanitizeCP1252(text: string): string {
  let result = text;
  for (const [pattern, replacement] of CP1252_REPLACEMENTS) {
    result = result.replace(pattern, replacement);
  }
  result = result.replace(/[\u0100-\uFFFF]/g, (ch) => {
    const code = ch.charCodeAt(0);
    if (code <= 0xFF) return ch;
    return "?";
  });
  return result;
}

export function slugify(text: string): string {
  return sanitizeCP1252(text)
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
