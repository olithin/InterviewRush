export type PatternGuide = {
  name: string;
  definition: string;
  whenToUse: string;
  wordingSignals: string[];
  mnemonic: string;
  decisionRule: string;
};

export const patternGuides: PatternGuide[] = [
  {
    name: "HashSet",
    definition: "Store unique values for fast membership checks.",
    whenToUse: "Duplicate, unique, or presence-based problems.",
    wordingSignals: ["duplicate", "unique", "seen before", "contains"],
    mnemonic: "Seen before -> HashSet",
    decisionRule: "If multiplicity does not matter and only presence counts, use HashSet."
  },
  {
    name: "Dictionary",
    definition: "Map keys to counts or states for each entity.",
    whenToUse: "Counting, grouping, or frequency-based requirements.",
    wordingSignals: ["count", "frequency", "first unique", "group"],
    mnemonic: "Need count -> Dictionary",
    decisionRule: "If you need multiplicity or per-key totals, reach for Dictionary."
  },
  {
    name: "Two Pointers",
    definition: "Coordinate two indices (ends or read/write) to enforce invariants.",
    whenToUse: "Mirrored comparisons, selective swaps, stable in-place moves.",
    wordingSignals: ["both ends", "palindrome", "reverse selected", "in-place"],
    mnemonic: "Two ends -> Two pointers",
    decisionRule: "If two moving positions keep the state valid, start with two pointers."
  },
  {
    name: "Sliding Window",
    definition: "Grow/shrink a contiguous segment under constraints.",
    whenToUse: "Subarray or substring ranges with dynamic validity.",
    wordingSignals: ["window", "subarray", "substring", "longest/shortest"],
    mnemonic: "Moving segment -> Sliding Window",
    decisionRule: "When the problem tracks a contiguous range with variable bounds, choose Sliding Window."
  }
];

export const patternChoiceHelper = [
  "Seen before? -> HashSet",
  "Need count? -> Dictionary",
  "Two ends? -> Two pointers",
  "Moving segment? -> Sliding Window"
];
