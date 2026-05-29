"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Flame, Target, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PatternDrillCard, WeakAreas } from "@/lib/pattern-drill-types";

export function PatternDrillBoard({ cards }: { cards: PatternDrillCard[] }) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [answers, setAnswers] = useState(0);
  const [weakAreas, setWeakAreas] = useState<WeakAreas>({
    hashSetVsDictionary: 0,
    twoPointersVsSlidingWindow: 0,
    leftRightVsSlowFast: 0
  });

  const card = cards[index];
  const options = card.answerOptions ?? [
    "HashSet",
    "Dictionary",
    "Two Pointers",
    "Sliding Window",
    "Queue",
    "Stack",
    "Binary Search"
  ];
  const correctAnswer = card.subpattern ?? card.correctPattern;
  const answered = selected !== null;
  const isCorrect = answered && selected === correctAnswer;

  const progress = useMemo(() => Math.round((answers / cards.length) * 100), [answers, cards.length]);

  const handleAnswer = (option: string) => {
    if (answered) return;
    setSelected(option);
    setAnswers((v) => v + 1);

    if (option === correctAnswer) {
      setScore((v) => v + 1);
      setStreak((v) => {
        const next = v + 1;
        setBestStreak((b) => Math.max(b, next));
        return next;
      });
      return;
    }

    setStreak(0);
    setWeakAreas((prev) => ({
      hashSetVsDictionary: prev.hashSetVsDictionary + Number(isPair([option, correctAnswer], ["HashSet", "Dictionary"])),
      twoPointersVsSlidingWindow:
        prev.twoPointersVsSlidingWindow + Number(isPair([option, correctAnswer], ["Two Pointers", "Sliding Window"])),
      leftRightVsSlowFast:
        prev.leftRightVsSlowFast + Number(isPair([option, correctAnswer], ["Left/Right", "Slow/Fast"]))
    }));
  };

  const nextCard = () => {
    setSelected(null);
    setIndex((i) => (i + 1) % cards.length);
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Pattern Drill</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <Badge><Target className="mr-1 h-4 w-4" /> Score: {score}/{answers}</Badge>
              <Badge variant="secondary"><Flame className="mr-1 h-4 w-4" /> Streak: {streak}</Badge>
              <Badge variant="accent">Best: {bestStreak}</Badge>
              <Badge variant="secondary">Progress: {progress}%</Badge>
            </div>

            <Card className="border-primary/30 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-base">Prompt {index + 1} / {cards.length}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-base leading-7">{card.prompt}</p>
                {card.subpattern ? (
                  <p className="text-sm text-muted-foreground">Subpattern drill: choose the correct Two Pointers variant.</p>
                ) : null}
              </CardContent>
            </Card>

            <div className="grid gap-2 sm:grid-cols-2">
              {options.map((option) => (
                <Button
                  key={option}
                  variant={pickButtonVariant(option, selected, correctAnswer)}
                  className="justify-start"
                  onClick={() => handleAnswer(option)}
                >
                  {option}
                </Button>
              ))}
            </div>

            {answered ? (
              <Card className={isCorrect ? "border-emerald-300 bg-emerald-50" : "border-rose-300 bg-rose-50"}>
                <CardHeader>
                  <CardTitle className="text-base">
                    {isCorrect ? (
                      <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-600" /> Correct</span>
                    ) : (
                      <span className="inline-flex items-center gap-2"><XCircle className="h-5 w-5 text-rose-600" /> Incorrect</span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm leading-7">
                  <p><strong>Correct answer:</strong> {correctAnswer}</p>
                  <p><strong>Why:</strong> {card.explanation}</p>
                  <div>
                    <p className="font-semibold">Keywords signals</p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {card.signals.map((s) => <Badge key={s} variant="secondary">{s}</Badge>)}
                    </div>
                  </div>
                  <p><strong>Mnemonic:</strong> {card.mnemonic}</p>
                  {!isCorrect && card.wrongOptionHints?.[selected ?? ""] ? (
                    <p><strong>Why not "{selected}":</strong> {card.wrongOptionHints[selected ?? ""]}</p>
                  ) : null}
                  <Button onClick={nextCard}>Next Drill Card</Button>
                </CardContent>
              </Card>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <aside className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Weak Areas Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <SummaryItem title="HashSet vs Dictionary confusion" value={weakAreas.hashSetVsDictionary} />
            <SummaryItem title="Two Pointers vs Sliding Window confusion" value={weakAreas.twoPointersVsSlidingWindow} />
            <SummaryItem title="Left/Right vs Slow/Fast confusion" value={weakAreas.leftRightVsSlowFast} />
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

function pickButtonVariant(option: string, selected: string | null, correct: string): "default" | "secondary" | "ghost" {
  if (!selected) return "secondary";
  if (option === correct) return "default";
  if (option === selected) return "ghost";
  return "secondary";
}

function isPair(pair: [string, string], expected: [string, string]): boolean {
  const [a, b] = pair;
  return (a === expected[0] && b === expected[1]) || (a === expected[1] && b === expected[0]);
}

function SummaryItem({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-xl border bg-muted/50 p-3">
      <p>{title}</p>
      <p className="mt-1 text-lg font-bold text-foreground/90">{value}</p>
    </div>
  );
}
