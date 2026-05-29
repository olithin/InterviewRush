export type CorePattern =
  | "HashSet"
  | "Dictionary"
  | "Two Pointers"
  | "Sliding Window"
  | "Queue"
  | "Stack"
  | "Binary Search";

export type TwoPointersSubpattern = "Left/Right" | "Slow/Fast";

export type PatternDrillCard = {
  id: string;
  prompt: string;
  correctPattern: CorePattern;
  signals: string[];
  mnemonic: string;
  explanation: string;
  subpattern?: TwoPointersSubpattern;
  answerOptions?: string[];
  wrongOptionHints?: Partial<Record<string, string>>;
};

export type DrillSource = {
  id: number;
  title: string;
  statement: string;
  pattern: string;
  wordingSignals: string[];
  mnemonic: string;
  explanation: string;
  whyNotOtherPatterns: string[];
};

export type WeakAreas = {
  hashSetVsDictionary: number;
  twoPointersVsSlidingWindow: number;
  leftRightVsSlowFast: number;
};
