import { CorePattern, DrillSource, PatternDrillCard } from "@/lib/pattern-drill-types";

const corePatterns: CorePattern[] = [
  "HashSet",
  "Dictionary",
  "Two Pointers",
  "Sliding Window",
  "Queue",
  "Stack",
  "Binary Search"
];

export function buildPatternDrillCards(sources: DrillSource[]): PatternDrillCard[] {
  const fromProblems = sources
    .filter((s) => corePatterns.includes(s.pattern as CorePattern))
    .map<PatternDrillCard>((s) => ({
      id: `problem-${s.id}`,
      prompt: s.statement,
      correctPattern: s.pattern as CorePattern,
      signals: s.wordingSignals.slice(0, 4),
      mnemonic: s.mnemonic,
      explanation: s.explanation,
      wrongOptionHints: inferWrongHints(s.whyNotOtherPatterns)
    }));

  const twoPointersSubpatternCards = [
    createSubpatternCard(
      "tp-left-right",
      "String is palindrome after skipping punctuation. Which Two Pointers subpattern fits best?",
      "Left/Right",
      ["compare both ends", "mirror check", "move inward"],
      "outside -> compare -> inside",
      "We compare symmetric positions from the left and right edges."
    ),
    createSubpatternCard(
      "tp-slow-fast",
      "Detect cycle in linked list quickly. Which Two Pointers subpattern fits best?",
      "Slow/Fast",
      ["cycle", "linked list", "two speeds"],
      "slow + fast meet => cycle",
      "Different pointer speeds let us detect cycles without extra memory."
    )
  ];

  const withFallbacks = ensurePatternCoverage([...fromProblems], corePatterns);
  return [...withFallbacks, ...twoPointersSubpatternCards];
}

function ensurePatternCoverage(cards: PatternDrillCard[], patterns: CorePattern[]): PatternDrillCard[] {
  const present = new Set(cards.map((c) => c.correctPattern));
  const missing = patterns.filter((p) => !present.has(p));
  return [...cards, ...missing.map((p) => fallbackCard(p))];
}

function fallbackCard(pattern: CorePattern): PatternDrillCard {
  switch (pattern) {
    case "Sliding Window":
      return {
        id: "fallback-sliding-window",
        prompt: "Find the longest substring with at most K distinct characters.",
        correctPattern: "Sliding Window",
        signals: ["longest substring", "at most K", "contiguous segment"],
        mnemonic: "moving segment -> Sliding Window",
        explanation: "Contiguous range plus dynamic constraint is classic sliding window."
      };
    case "Queue":
      return {
        id: "fallback-queue",
        prompt: "Process tasks in arrival order where oldest request must execute first.",
        correctPattern: "Queue",
        signals: ["FIFO", "arrival order", "oldest first"],
        mnemonic: "first in -> first out",
        explanation: "Queue preserves first-in-first-out processing."
      };
    case "Stack":
      return {
        id: "fallback-stack",
        prompt: "Validate balanced parentheses in an expression.",
        correctPattern: "Stack",
        signals: ["matching pairs", "nested structure", "last opened"],
        mnemonic: "last opened -> first closed",
        explanation: "Stack naturally handles nested closing of most recent opener."
      };
    case "Binary Search":
      return {
        id: "fallback-binary-search",
        prompt: "Find first position where value becomes >= target in a sorted array.",
        correctPattern: "Binary Search",
        signals: ["sorted", "first/last position", "halve search space"],
        mnemonic: "sorted + boundary -> Binary Search",
        explanation: "Monotonic condition on sorted data enables halving the range."
      };
    case "HashSet":
      return {
        id: "fallback-hashset",
        prompt: "Check if any element appears more than once.",
        correctPattern: "HashSet",
        signals: ["duplicate", "seen before", "membership"],
        mnemonic: "seen before -> HashSet",
        explanation: "Need fast seen/not-seen checks, not counting."
      };
    case "Dictionary":
      return {
        id: "fallback-dictionary",
        prompt: "Find first non-repeating character in a string.",
        correctPattern: "Dictionary",
        signals: ["frequency", "count", "first unique"],
        mnemonic: "need count -> Dictionary",
        explanation: "This needs frequency map, not only membership."
      };
    case "Two Pointers":
      return {
        id: "fallback-two-pointers",
        prompt: "Compare characters from both ends to validate palindrome.",
        correctPattern: "Two Pointers",
        signals: ["both ends", "compare inward", "mirror check"],
        mnemonic: "two ends -> Two Pointers",
        explanation: "Two pointers maintain symmetry invariant while moving inward."
      };
  }
}

function createSubpatternCard(
  id: string,
  prompt: string,
  subpattern: "Left/Right" | "Slow/Fast",
  signals: string[],
  mnemonic: string,
  explanation: string
): PatternDrillCard {
  return {
    id,
    prompt,
    correctPattern: "Two Pointers",
    subpattern,
    answerOptions: ["Left/Right", "Slow/Fast"],
    signals,
    mnemonic,
    explanation,
    wrongOptionHints: {
      "Left/Right": "Left/Right is for edge-to-edge comparisons, not speed differentials.",
      "Slow/Fast": "Slow/Fast is for cycle/middle detection, not mirror comparisons."
    }
  };
}

function inferWrongHints(lines: string[]): Partial<Record<string, string>> {
  const hints: Partial<Record<string, string>> = {};
  for (const line of lines) {
    if (line.includes("HashSet")) hints.HashSet = line;
    if (line.includes("Dictionary")) hints.Dictionary = line;
    if (line.includes("Two Pointers")) hints["Two Pointers"] = line;
    if (line.includes("Sliding Window")) hints["Sliding Window"] = line;
    if (line.includes("Queue")) hints.Queue = line;
    if (line.includes("Stack")) hints.Stack = line;
    if (line.includes("Binary Search")) hints["Binary Search"] = line;
  }
  return hints;
}
