export type PracticeSolution = {
  id: number;
  label: string;
  code: string;
  nUnitTestsCode: string;
  nUnitSampleTestsCode: string;
  thinkPattern: string;
  thinkIdea: string;
  thinkComplexity: string;
};

/** @deprecated use PracticeSolution */
export type SolutionCodeTemplate = PracticeSolution;

export type ProblemNavItem = {
  id: number;
  title: string;
  pattern: string;
  difficulty: "Easy" | "Medium" | "Hard";
  solved: boolean;
  /** Optional: server-side ordering (currently only set for interview questions). */
  sortOrder?: number;
};

/** Compact per-problem mental model in Coach (trigger/cue/script/trap + narratives). */
export type CoachMentalModel = {
  trigger: string;
  cue: string;
  script: string;
  trap: string;
  personalWords: string;
  interviewPhrase: string;
};

/**
 * Coach payload shaped for **coding problems** (algorithm + NUnit, practice, full explanation DTOs).
 * Interview questions are **adapted** into this type in `interview-question-to-teaching.ts` (`interviewQuestionToTeachingDetails`)
 * so one `ProblemDetailsView` can render both; some fields are repurposed (e.g. `algorithmSteps` from follow-ups).
 * For a fully independent interview field set, introduce a discriminated union or a separate
 * `InterviewCoachDetails` and branch the view — the backend already uses separate models.
 */
export type ProblemTeachingDetails = {
  id: number;
  title: string;
  statement: string;
  pattern: string;
  wordingSignals: string[];
  mnemonic: string;
  /** Not shown in UI; use howToThinkSteps. Kept for API payload shape. */
  howToThink: string;
  howToThinkSteps: string[];
  /** Coach fields from the API; may be empty if not used in JSON. */
  bruteForceIdea: string;
  optimalIdea: string;
  algorithmSteps: string[];
  visualExplanation: string;
  whyThisPattern: string;
  whyNotOtherPatterns: string[];
  complexity: string;
  edgeCaseChecklist: string[];
  commonMistakes: {
    critical: string[];
    important: string[];
    niceToHave: string[];
  };
  gapHints: string[];
  interviewEnglish: string;
  simpleRussian: string;
  mentalModel: CoachMentalModel;
  code: string;
  tests: string;
  /** C# solution variants for Practice. */
  solutionTemplates: PracticeSolution[];
};

export type SolutionVersionListItem = {
  id: number;
  createdAtUtc: string;
  solutionCode: string;
  thinkPattern: string | null;
  thinkIdea: string | null;
  thinkComplexity: string | null;
};

export type LocalReflection = {
  keyPattern: string;
  commonTrap: string;
  memoryHook: string;
};
