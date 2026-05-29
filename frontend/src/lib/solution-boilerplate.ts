/**
 * Practice editor shows the body of `public class Solution { ... }` only.
 * The API and `dotnet test` need a full class file — use `toApiSolutionCode` when persisting or running.
 *
 * Unwrap is brace-count based; `{` or `}` inside C# string/comment literals is not modelled
 * (same limitation as the previous regex-only version for typical Leetcode-style solutions).
 */
export function unwrapSolutionClassForEditor(source: string): string {
  if (!source) {
    return "";
  }
  const t = source.replace(/\r\n/g, "\n");
  const m = t.match(/public\s+class\s+Solution\s*\{/);
  if (m == null || m.index === undefined) {
    return source;
  }
  const openIdx = m.index + m[0].length - 1;
  if (t[openIdx] !== "{") {
    return source;
  }
  const bodyStart = openIdx + 1;
  let depth = 1;
  for (let i = bodyStart; i < t.length; i++) {
    if (t[i] === "{") {
      depth++;
    } else if (t[i] === "}") {
      depth--;
      if (depth === 0) {
        return t.slice(bodyStart, i);
      }
    }
  }
  return source;
}

export function toApiSolutionCode(editorContent: string): string {
  const t = (editorContent ?? "").replace(/\r\n/g, "\n");
  if (/^\s*public\s+class\s+Solution\b/m.test(t) || /^\s*class\s+Solution\b/m.test(t)) {
    return t;
  }
  if (t.trim() === "") {
    return "public class Solution\n{\n}\n";
  }
  return `public class Solution\n{\n${t}\n}\n`;
}
