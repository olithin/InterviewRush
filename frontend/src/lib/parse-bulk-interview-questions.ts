import type { CreateInterviewQuestionBody } from "@/lib/interview-question-types";

export type ParseBulkResult = {
  items: CreateInterviewQuestionBody[];
  errors: { lineHint: string; message: string }[];
  format: "blocks" | "json" | "empty";
};

function splitBlocks(raw: string): string[] {
  const t = raw.replace(/\r\n/g, "\n").trim();
  if (!t) {
    return [];
  }
  const parts = t.split(/(?:^|\n)---+[^\S\r\n]*(?:\n|$)/);
  const trimmed = parts.map((p) => p.trim()).filter((p) => p.length > 0);
  return trimmed.length > 0 ? trimmed : [t];
}

type KeyMap = Record<string, string>;

function blockToKeyMap(block: string): KeyMap {
  const map: KeyMap = {};
  const lines = block.split("\n");
  let key: string | null = null;
  for (const line of lines) {
    const m = line.match(/^([A-Za-z][A-Za-z0-9_ ]*?)\s*:\s*(.*)$/);
    if (m) {
      const k = m[1]!.trim().toLowerCase().replace(/\s+/g, "");
      key = k;
      map[k] = m[2] ?? "";
    } else if (key) {
      map[key] = (map[key] ? `${map[key]}\n` : "") + line;
    }
  }
  return map;
}

function getFirst(map: KeyMap, keys: string[]): string {
  for (const k of keys) {
    const c = k.toLowerCase().replace(/\s+/g, "");
    if (map[c] != null && String(map[c]).trim() !== "") {
      return String(map[c]).trim();
    }
  }
  return "";
}

function toBody(map: KeyMap, index: number): CreateInterviewQuestionBody | null {
  const title = getFirst(map, ["title", "name"]);
  const questionText = getFirst(map, ["question", "questiontext", "q", "text", "body"]);
  if (title && questionText) {
    const tagsStr = getFirst(map, ["tags", "tag"]);
    const followStr = getFirst(map, ["followup", "followups", "follow-up", "followupquestions"]);
    return {
      title: title.slice(0, 500),
      questionText,
      category: getFirst(map, ["category", "topic"]) || "General",
      difficulty: (getFirst(map, ["difficulty", "level"]) || "Easy") as CreateInterviewQuestionBody["difficulty"],
      tags: tagsStr
        .split(/[,;]/)
        .map((s) => s.trim())
        .filter(Boolean),
      answerEnglish: getFirst(map, ["answerenglish", "en", "answeren"]),
      answerRussian: getFirst(map, ["answerRussian", "ru", "answerru"]),
      memoryCue: getFirst(map, ["memorycue", "mnemonic", "cue"]),
      commonTrap: getFirst(map, ["commontrap", "trap"]),
      followUpQuestions: followStr
        .split("\n")
        .map((s) => s.replace(/^[-*•]\s*/, "").trim())
        .filter(Boolean),
      notes: getFirst(map, ["notes", "extra", "explanation"])
    };
  }
  if (questionText && !title) {
    return {
      title: `Untitled (block ${index + 1})`.slice(0, 500),
      questionText,
      category: getFirst(map, ["category", "topic"]) || "General",
      difficulty: (getFirst(map, ["difficulty", "level"]) || "Easy") as CreateInterviewQuestionBody["difficulty"],
      tags: (getFirst(map, ["tags"]) || "")
        .split(/[,;]/)
        .map((s) => s.trim())
        .filter(Boolean),
      answerEnglish: getFirst(map, ["answerenglish", "en"]),
      answerRussian: getFirst(map, ["answerRussian", "ru"]),
      memoryCue: getFirst(map, ["memorycue", "mnemonic"]),
      commonTrap: getFirst(map, ["commontrap", "trap"]),
      followUpQuestions: (getFirst(map, ["followup", "followups"]) || "")
        .split("\n")
        .map((s) => s.replace(/^[-*•]\s*/, "").trim())
        .filter(Boolean),
      notes: getFirst(map, ["notes"])
    };
  }
  if (title && !questionText) {
    return {
      title: title.slice(0, 500),
      questionText: title,
      category: "General",
      difficulty: "Easy",
      tags: []
    };
  }
  return null;
}

/**
 * Tries JSON array, then `---` blocks with Title:/Question: lines.
 */
export function parseBulkInterviewQuestionsInput(raw: string): ParseBulkResult {
  const errors: ParseBulkResult["errors"] = [];
  const t = raw.replace(/\r\n/g, "\n").trim();
  if (!t) {
    return { items: [], errors, format: "empty" };
  }

  if (t.startsWith("[") && t.endsWith("]")) {
    try {
      const arr = JSON.parse(t) as unknown;
      if (Array.isArray(arr)) {
        const items: CreateInterviewQuestionBody[] = [];
        for (const el of arr) {
          if (!el || typeof el !== "object") {
            errors.push({ lineHint: "json", message: "Skip: not an object" });
            continue;
          }
          const o = el as Record<string, unknown>;
          const title = String(o.title ?? "");
          const questionText = String(o.questionText ?? o.question ?? "");
          if (title.length < 1 || questionText.length < 1) {
            errors.push({ lineHint: "json", message: "Skip: missing title or questionText" });
            continue;
          }
          const tags = o.tags;
          items.push({
            title,
            questionText,
            category: o.category != null ? String(o.category) : "General",
            difficulty: (o.difficulty != null ? String(o.difficulty) : "Easy") as CreateInterviewQuestionBody["difficulty"],
            tags: Array.isArray(tags) ? tags.map((x) => String(x)) : String(o.tags ?? "")
                .split(/[,;]/)
                .map((s) => s.trim())
                .filter(Boolean),
            answerEnglish: o.answerEnglish != null ? String(o.answerEnglish) : "",
            answerRussian: o.answerRussian != null ? String(o.answerRussian) : "",
            memoryCue: o.memoryCue != null ? String(o.memoryCue) : "",
            commonTrap: o.commonTrap != null ? String(o.commonTrap) : "",
            followUpQuestions: Array.isArray(o.followUpQuestions)
              ? o.followUpQuestions.map((x) => String(x))
              : String(o.followUpQuestions ?? "")
                  .split(/[\n;]/)
                  .map((s) => s.trim())
                  .filter(Boolean),
            notes: o.notes != null ? String(o.notes) : ""
          });
        }
        return { items, errors, format: "json" };
      }
    } catch (e) {
      errors.push({ lineHint: "json", message: e instanceof Error ? e.message : "Invalid JSON" });
    }
  }

  const blocks = splitBlocks(t);
  if (blocks.length === 0) {
    return { items: [], errors, format: "empty" };
  }

  const items: CreateInterviewQuestionBody[] = [];
  blocks.forEach((block, i) => {
    const map = blockToKeyMap(block);
    const one = toBody(map, i);
    if (one) {
      if (one.title.length < 1 || one.questionText.length < 1) {
        errors.push({ lineHint: `block ${i + 1}`, message: "Missing title or question text" });
        return;
      }
      items.push(one);
    } else {
      errors.push({
        lineHint: `block ${i + 1}`,
        message: "Could not parse. Use Title: and Question: lines, or a JSON array."
      });
    }
  });

  return { items, errors, format: "blocks" };
}
