import type { InterviewQuestion } from "@/lib/interview-question-types";
import type { ProblemTeachingDetails } from "@/lib/problem-types";

const defaultHowToSteps = [
  "Restate what the interviewer is really asking (scope + constraints).",
  "Name the 2–3 ideas you will cover, in order — then expand.",
  "Add one example from your experience or a well-known case.",
  "End with how you would verify or what you would ask next if time allows."
];

function toDifficulty(s: string): "Easy" | "Medium" | "Hard" {
  if (s === "Easy" || s === "Medium" || s === "Hard") {
    return s;
  }
  return "Medium";
}

function firstLine(text: string): string {
  const t = text.trim();
  if (!t) {
    return "";
  }
  const line = t.split(/\r?\n/).find((l) => l.trim().length > 0) ?? t;
  return line.trim().slice(0, 400);
}

/**
 * Short English keyword chips for memorization: tags + fragments from memory cue, deduped.
 * Prefer editing tags + memory cue in the interview form to shape this list.
 */
function buildInterviewKeywordSignals(q: InterviewQuestion): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (raw: string) => {
    const t = raw.trim();
    if (t.length < 1 || t.length > 90) {
      return;
    }
    const key = t.toLowerCase();
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    out.push(t);
  };

  for (const tag of q.tags) {
    push(tag);
  }

  const cue = q.memoryCue.trim();
  if (cue) {
    for (const part of cue.split(/[,;|·\n]/)) {
      push(part);
    }
  }

  if (out.length === 0) {
    const cat = q.category?.trim();
    push(cat && cat.length > 0 ? cat : "General");
  }

  return out.slice(0, 18);
}

/**
 * Adapts API `InterviewQuestion` into `ProblemTeachingDetails` for the shared coach layout.
 * **Persistence** stays interview-specific (`/api/interview-questions`); this function only projects fields
 * into the problem-leaning coach shape. Unused/problem-only fields (e.g. `code`, `visualExplanation` — always empty for interviews) stay empty
 * or derived so you can later split a dedicated `InterviewCoachDetails` from `ProblemTeachingDetails` without API changes.
 */
export function interviewQuestionToTeachingDetails(q: InterviewQuestion): ProblemTeachingDetails {
  const keywordSignals = buildInterviewKeywordSignals(q);
  const howFromNotes = q.notes
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .slice(0, 8);
  const howToThinkSteps = howFromNotes.length > 0 ? howFromNotes : defaultHowToSteps;
  const algorithmSteps =
    q.followUpQuestions.length > 0
      ? q.followUpQuestions
      : q.answerEnglish.trim()
        ? ["Walk through the English answer in step 6: structure, then details."]
        : ["Anticipate follow-ups from the list below and prepare short hooks."];

  const enFirst = firstLine(q.answerEnglish);

  return {
    id: q.id,
    title: q.title,
    statement: q.questionText,
    pattern: q.category?.trim() || "General",
    wordingSignals: keywordSignals,
    mnemonic: q.memoryCue.trim() || "Answer hook → 2–3 points → example → check understanding.",
    howToThink: "",
    howToThinkSteps,
    bruteForceIdea: q.notes.trim()
      ? `Extra context: ${firstLine(q.notes) || q.notes.slice(0, 200)}`
      : "",
    optimalIdea: q.answerEnglish.trim()
      ? `Lead with: ${enFirst || "a clear, confident opening line"}.`
      : "Draft a short opening line that frames your structure before details.",
    algorithmSteps,
    visualExplanation: "",
    whyThisPattern: q.notes.trim()
      ? `Why this is grouped under «${q.category}» / topic: your notes and tags reflect this angle. ${firstLine(q.notes)}`
      : `Grouped under category «${q.category}»; use tags to cross-link with other questions.`,
    whyNotOtherPatterns: [],
    complexity: `Level: ${q.difficulty} · Sort: ${q.sortOrder}`,
    edgeCaseChecklist: q.commonTrap
      ? [q.commonTrap, ...q.followUpQuestions.slice(0, 3)]
      : q.followUpQuestions,
    commonMistakes: {
      critical: q.commonTrap ? [q.commonTrap] : [],
      important: [],
      niceToHave: []
    },
    gapHints: q.tags,
    interviewEnglish: q.answerEnglish,
    simpleRussian: q.answerRussian,
    mentalModel: {
      trigger: q.tags.length > 0 ? q.tags.join(", ") : firstLine(q.title) || "interview",
      cue: q.memoryCue.trim() || "Structure → main points → example",
      script: enFirst || q.memoryCue || "Open clearly, then go depth-first on one thread.",
      trap: q.commonTrap,
      personalWords: firstLine(q.notes) || q.notes.slice(0, 300),
      interviewPhrase: enFirst || q.title
    },
    code: "",
    tests: "",
    solutionTemplates: [
      {
        id: 0,
        label: "Interview (no code)",
        code: "",
        nUnitTestsCode: "",
        nUnitSampleTestsCode: "",
        thinkPattern: q.category,
        thinkIdea: firstLine(q.answerEnglish) || firstLine(q.notes),
        thinkComplexity: q.difficulty
      }
    ]
  };
}

/**
 * @param pattern — from list item, same as category in API
 */
export function interviewListItemToNavItem(q: {
  id: number;
  title: string;
  category: string;
  difficulty: string;
  sortOrder?: number;
}): {
  id: number;
  title: string;
  pattern: string;
  difficulty: "Easy" | "Medium" | "Hard";
  solved: boolean;
  sortOrder?: number;
} {
  return {
    id: q.id,
    title: q.title,
    pattern: q.category || "General",
    difficulty: toDifficulty(q.difficulty),
    solved: false,
    sortOrder: q.sortOrder
  };
}
