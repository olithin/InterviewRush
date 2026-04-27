import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Unescapes API/content strings where newlines were stored as literal "\\n" / "\\r\\n" (e.g. over-escaped JSON)
 * so editors and compilers receive real line breaks.
 */
export function normalizeMultiline(value: string): string {
  return value
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .trim();
}

const visualImageToken = /^IMAGE:\s*(\/[^\s|]+)(?:\|([\s\S]*))?$/i;
/** `MEDIA:` / `YOUTUBE:` / `LINK:` — stored as an https link (no video embed in the app). */
const visualMediaToken = /^(MEDIA|LINK|YOUTUBE):\s*(\S+)/i;

function safeHttpUrl(raw: string): string | null {
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      return null;
    }
    return u.toString();
  } catch {
    return null;
  }
}

export type ParsedVisualExplanation =
  | { kind: "image"; src: string; alt: string }
  | { kind: "link"; href: string }
  | { kind: "text"; text: string };

/**
 * When coach content uses:
 * - `IMAGE:/path...|alt` — static file from `public/`.
 * - `MEDIA:https://...`, `LINK:https://...`, `YOUTUBE:https://...` — external link (same handling; no embedded players).
 */
export function parseVisualExplanation(value: string): ParsedVisualExplanation {
  const t = value.trim();
  const m = t.match(visualImageToken);
  if (m) {
    const path = m[1]?.trim() ?? "";
    const alt = (m[2] ?? "Visual explanation").trim() || "Visual explanation";
    if (path.startsWith("/") && !path.startsWith("//") && /\.(png|jpe?g|gif|webp|svg)$/i.test(path)) {
      return { kind: "image", src: path, alt };
    }
  }
  const m2 = t.match(visualMediaToken);
  if (m2) {
    const rawUrl = m2[2] ?? "";
    const href = safeHttpUrl(rawUrl);
    if (href) {
      return { kind: "link", href };
    }
    return { kind: "text", text: t };
  }
  return { kind: "text", text: t };
}
