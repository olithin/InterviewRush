"use client";

import { useMemo, useState } from "react";

type LearnMode = "coach" | "practice" | "interview";
type GuidedStep = 1 | 2 | 3 | 4 | 5 | 6;

type PrototypeProblem = {
  id: number;
  title: string;
  pattern: string;
  statement: string;
  signals: string[];
  mnemonic: string;
  think: string[];
  algorithm: string[];
  visualExplanation: string;
  mistakes: {
    critical: string[];
    important: string[];
    niceToHave: string[];
  };
  gaps: string[];
  edgeCases: string[];
  interview: string;
  code: string;
  ru: string;
};

const prototypeProblems: PrototypeProblem[] = [
  {
    id: 1,
    title: "Contains Duplicate",
    pattern: "HashSet",
    statement: "Given an integer array nums, return true if any value appears at least twice in the array.",
    signals: ["duplicate", "seen before", "at least twice"],
    mnemonic: "Seen before -> duplicate",
    think: ["Track seen values while scanning once.", "Stop early when duplicate is found."],
    algorithm: ["Create HashSet<int> seen.", "Loop values; if seen contains value return true.", "Otherwise add value.", "Return false."],
    visualExplanation: "nums=[1,4,2,4]\nseen:{} -> {1}->{1,4}->{1,4,2}\n4 already seen => true",
    mistakes: {
      critical: ["Using List.Contains causes O(n^2)."],
      important: ["Forgetting early return after detecting duplicate."],
      niceToHave: ["Not explaining complexity tradeoff clearly."]
    },
    gaps: ["Differentiate HashSet vs Dictionary by required output."],
    edgeCases: ["[] => false", "[7] => false"],
    interview: "I use a HashSet to track seen values and return true as soon as I find a repeat.",
    code: "public bool ContainsDuplicate(int[] nums) { var seen = new HashSet<int>(); foreach (var n in nums) if (!seen.Add(n)) return true; return false; }",
    ru: "Используем HashSet и сразу возвращаем true при первом повторе."
  },
  {
    id: 6,
    title: "Move Zeroes",
    pattern: "Two Pointers",
    statement: "Move all 0s to the end while preserving non-zero order, in-place.",
    signals: ["in-place", "preserve order", "move zeroes"],
    mnemonic: "fast reads, slow collects / fast читает, slow собирает",
    think: ["Treat zeroes as gaps.", "Use read pointer to scan and write pointer to compact non-zeroes."],
    algorithm: ["Set slow=0.", "Move fast over array.", "When nums[fast] != 0, write to nums[slow] and increment slow.", "Fill remaining positions with 0."],
    visualExplanation: "[0,1,0,3,12]\nfast scans all items\nslow writes: 1,3,12\nfill tail => [1,3,12,0,0]",
    mistakes: {
      critical: ["Using swaps that break stable order."],
      important: ["Forgetting to zero-fill the tail."],
      niceToHave: ["Not naming pointer roles (fast/slow)."]
    },
    gaps: ["Practice stable in-place compaction with read/write pointers."],
    edgeCases: ["All zeros", "No zeros", "Single element"],
    interview: "I use fast as the reader and slow as the collector to keep non-zero order and then fill the rest with zeroes.",
    code: "public void MoveZeroes(int[] nums) { int slow = 0; for (int fast = 0; fast < nums.Length; fast++) if (nums[fast] != 0) nums[slow++] = nums[fast]; while (slow < nums.Length) nums[slow++] = 0; }",
    ru: "fast читает массив, slow собирает ненули в начало, затем хвост заполняется нулями."
  }
];

const modeLabels: Record<LearnMode, string> = {
  coach: "Coach mode",
  practice: "Practice mode",
  interview: "Interview mode"
};

export default function QaQuestLearningUxPrototype() {
  const [mode, setMode] = useState<LearnMode>("coach");
  const [currentId, setCurrentId] = useState<number>(1);
  const [coachRevealStep, setCoachRevealStep] = useState<GuidedStep>(1);
  const [selfRevealStep, setSelfRevealStep] = useState<GuidedStep>(1);

  const currentProblem = useMemo(
    () => prototypeProblems.find((problem) => problem.id === currentId) ?? prototypeProblems[0],
    [currentId]
  );

  const grouped = useMemo(() => {
    const groups = new Map<string, PrototypeProblem[]>();
    for (const problem of prototypeProblems) {
      const list = groups.get(problem.pattern) ?? [];
      list.push(problem);
      groups.set(problem.pattern, list);
    }
    return Array.from(groups.entries()).map(([pattern, items]) => ({ pattern, items }));
  }, []);

  const activeStep = mode === "coach" ? coachRevealStep : selfRevealStep;
  const showRightRail = activeStep >= 4;

  return (
    <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
      <aside className="h-[calc(100vh-7rem)] overflow-y-auto rounded-2xl border bg-card/90 p-3 shadow-soft">
        <p className="mb-3 text-sm font-black text-primary">All Tasks by Pattern</p>
        <div className="space-y-4">
          {grouped.map((group) => (
            <div key={group.pattern} className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group.pattern}</p>
              <div className="space-y-1">
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCurrentId(item.id)}
                    className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
                      item.id === currentProblem.id
                        ? "border-primary bg-primary/10 font-semibold text-primary"
                        : "border-transparent bg-muted/60 text-foreground hover:bg-muted"
                    }`}
                  >
                    {item.title}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </aside>

      <main className="space-y-4">
        <div className="rounded-2xl border bg-white/90 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-2xl font-bold">{currentProblem.title}</h2>
            <div className="flex gap-2">
              {(["coach", "practice", "interview"] as LearnMode[]).map((nextMode) => (
                <button
                  key={nextMode}
                  type="button"
                  className={`rounded-lg px-3 py-2 text-sm ${mode === nextMode ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                  onClick={() => {
                    setMode(nextMode);
                    if (nextMode === "coach") {
                      setCoachRevealStep(1);
                    } else {
                      setSelfRevealStep(nextMode === "practice" ? 4 : 2);
                    }
                  }}
                >
                  {modeLabels[nextMode]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <Section title="1. Understand the task">{currentProblem.statement}</Section>

        <Reveal visible={isVisible(mode, 2, coachRevealStep, selfRevealStep)}>
          <Section title="2. Keywords signals">{currentProblem.signals.join(", ")}</Section>
        </Reveal>

        <Reveal visible={isVisible(mode, 3, coachRevealStep, selfRevealStep)}>
          <Section title="3. Choose the pattern">{currentProblem.pattern}</Section>
        </Reveal>

        <Reveal visible={isVisible(mode, 4, coachRevealStep, selfRevealStep)}>
          <Section title="4. How to think">{currentProblem.think.join(" ")}</Section>
        </Reveal>

        <Reveal visible={isVisible(mode, 5, coachRevealStep, selfRevealStep)}>
          <Section title="5. Step-by-step algorithm">{currentProblem.algorithm.join(" ")}</Section>
        </Reveal>

        <Reveal visible={isVisible(mode, 6, coachRevealStep, selfRevealStep)}>
          <Section title="6. Code + interview answer">{currentProblem.interview}</Section>
        </Reveal>

        {mode === "coach" && coachRevealStep < 6 ? (
          <div className="flex justify-end">
            <button
              type="button"
              className="rounded-lg bg-primary px-4 py-2 text-primary-foreground"
              onClick={() => setCoachRevealStep((step) => nextStep(step))}
            >
              Reveal Next Step
            </button>
          </div>
        ) : null}

        {mode !== "coach" && selfRevealStep < 6 ? (
          <div className="flex justify-end">
            <button
              type="button"
              className="rounded-lg bg-muted px-4 py-2"
              onClick={() => setSelfRevealStep((step) => nextStep(step))}
            >
              Reveal More Help
            </button>
          </div>
        ) : null}
      </main>

      <aside className="space-y-4">
        <Reveal visible={isVisible(mode, 3, coachRevealStep, selfRevealStep)}>
          <Section title="Mnemonic">{currentProblem.mnemonic}</Section>
        </Reveal>

        <Reveal visible={showRightRail}>
          <Section title="Common mistakes">
            <p>critical: {currentProblem.mistakes.critical.join(" ")}</p>
            <p>important: {currentProblem.mistakes.important.join(" ")}</p>
            <p>nice to have: {currentProblem.mistakes.niceToHave.join(" ")}</p>
          </Section>
        </Reveal>

        <Reveal visible={isVisible(mode, 5, coachRevealStep, selfRevealStep)}>
          <Section title="Visual explanation">
            <pre className="whitespace-pre-wrap">{currentProblem.visualExplanation}</pre>
          </Section>
        </Reveal>

        <Reveal visible={showRightRail}>
          <Section title="Possible learning gaps">{currentProblem.gaps.join(" ")}</Section>
        </Reveal>

        <Reveal visible={showRightRail}>
          <Section title="Edge cases">{currentProblem.edgeCases.join(" ")}</Section>
        </Reveal>
      </aside>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-white/90 p-4">
      <p className="mb-2 font-semibold">{title}</p>
      <div className="text-sm">{children}</div>
    </div>
  );
}

function Reveal({ visible, children }: { visible: boolean; children: React.ReactNode }) {
  if (!visible) return null;
  return <>{children}</>;
}

function nextStep(step: GuidedStep): GuidedStep {
  return step >= 6 ? 6 : ((step + 1) as GuidedStep);
}

function isVisible(mode: LearnMode, step: GuidedStep, coachStep: GuidedStep, selfStep: GuidedStep): boolean {
  if (mode === "coach") return coachStep >= step;
  return selfStep >= step;
}
