"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getProgressMap, type LearningProblemProgress } from "@/lib/learning-map-progress";
import type { LearningMapTree } from "@/lib/api";

const progressStyles: Record<LearningProblemProgress, string> = {
  unseen: "bg-slate-100 text-slate-600 border-slate-200",
  seen: "bg-sky-100 text-sky-800 border-sky-200",
  attempted: "bg-amber-100 text-amber-900 border-amber-200",
  passed: "bg-emerald-100 text-emerald-900 border-emerald-200",
  solid: "border-orange-200 bg-orange-100/90 text-orange-950"
};

const progressLabel: Record<LearningProblemProgress, string> = {
  unseen: "new",
  seen: "seen",
  attempted: "tried",
  passed: "passed",
  solid: "solid"
};

function useProgressMap() {
  const [progress, setProgress] = useState<Record<number, LearningProblemProgress>>({});
  const [, setTick] = useState(0);

  useEffect(() => {
    setProgress(getProgressMap());
    const onUpdate = () => {
      setProgress(getProgressMap());
      setTick((t) => t + 1);
    };
    window.addEventListener("qaquest-learning-map-update", onUpdate);
    window.addEventListener("storage", onUpdate);
    return () => {
      window.removeEventListener("qaquest-learning-map-update", onUpdate);
      window.removeEventListener("storage", onUpdate);
    };
  }, []);

  return progress;
}

export function LearningMapView({ tree }: { tree: LearningMapTree }) {
  const progress = useProgressMap();
  const [open, setOpen] = useState<Record<number, boolean>>({});

  const toggle = (id: number) => {
    setOpen((o) => ({ ...o, [id]: o[id] === false ? true : false }));
  };

  if (!tree.triggers.length) {
    return <p className="text-sm text-muted-foreground">No problems in the catalog yet.</p>;
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Topics act as <strong>signals / areas</strong> (e.g. sorted search, two-pointer setups). Under each,{" "}
        <strong>patterns</strong> group tasks; open a task to mark it seen, a practice run can mark tried / passed.
        Progress is stored in this browser only.
      </p>

      {tree.triggers.map((t) => {
        const isOpen = open[t.id] !== false;
        const totalProblems = t.patterns.reduce((s, p) => s + p.problemCount, 0);
        return (
          <Card key={t.id} className="overflow-hidden">
            <button
              type="button"
              onClick={() => toggle(t.id)}
              className="flex w-full items-start gap-3 border-b border-border/60 bg-gradient-to-r from-primary/5 to-transparent px-4 py-4 text-left"
            >
              {isOpen ? <ChevronDown className="mt-0.5 h-5 w-5 shrink-0" /> : <ChevronRight className="mt-0.5 h-5 w-5 shrink-0" />}
              <div className="min-w-0 flex-1">
                <CardTitle className="text-lg font-bold tracking-tight text-foreground/90">{t.label}</CardTitle>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>
                    {t.patterns.length} pattern{t.patterns.length === 1 ? "" : "s"} · {totalProblems} task
                    {totalProblems === 1 ? "" : "s"}
                  </span>
                  {t.multiplePatterns ? (
                    <Badge variant="secondary" className="text-[10px]">
                      several approaches here — compare branches
                    </Badge>
                  ) : null}
                </div>
              </div>
            </button>

            {isOpen ? (
              <CardContent className="space-y-5 p-4 pt-5 sm:p-6">
                {t.patterns.map((p) => (
                  <div
                    key={t.id + p.label}
                    className="rounded-2xl border border-dashed border-border/80 bg-muted/20 px-4 py-4 sm:px-5"
                  >
                    <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="text-base font-bold text-foreground">{p.label}</h3>
                      <Badge variant="secondary" className="shrink-0 border border-border/60 text-xs font-semibold">
                        {p.problemCount} task{p.problemCount === 1 ? "" : "s"}
                      </Badge>
                    </div>
                    <ul className="space-y-2 border-l-2 border-primary/25 pl-4">
                      {p.problems.map((pr) => {
                        const st = progress[pr.id] ?? "unseen";
                        return (
                          <li key={pr.id} className="flex flex-wrap items-center justify-between gap-2 sm:flex-nowrap">
                            <Link
                              href={`/problems/${pr.id}`}
                              className="min-w-0 flex-1 font-medium text-primary underline-offset-2 hover:underline"
                            >
                              {pr.title}
                            </Link>
                            <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                              <span>{pr.difficulty}</span>
                              <span
                                className={cn(
                                  "rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase",
                                  progressStyles[st]
                                )}
                              >
                                {progressLabel[st]}
                              </span>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </CardContent>
            ) : null}
          </Card>
        );
      })}
    </div>
  );
}
