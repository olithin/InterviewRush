"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { buildUpdateExplanationFromDetails, updateProblemExplanation } from "@/lib/api";
import type { ProblemTeachingDetails } from "@/lib/problem-types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Field = "trigger" | "cue" | "script" | "trap" | "personalWords" | "interviewPhrase";

const cardHints: Record<"trigger" | "cue" | "script" | "trap", { label: string; help: string }> = {
  trigger: { label: "TRIGGER", help: "What in the statement triggered the pattern?" },
  cue: { label: "CUE", help: "Tiny action phrase that helps you recall." },
  script: { label: "SCRIPT", help: "Your compact mental flow." },
  trap: { label: "TRAP", help: "Most likely mistake points." }
};

const areaClass =
  "input-clay w-full min-h-[88px] resize-y px-3 py-2 text-sm font-medium leading-snug text-foreground";
const textAreaNarrativeClass =
  "input-clay w-full min-h-[120px] resize-y px-3 py-2 text-sm leading-relaxed text-foreground";

type Props = {
  details: ProblemTeachingDetails;
  /** When false, edits are not saved to the problem API (e.g. interview topics). */
  persistToApi?: boolean;
  /**
   * When provided, edits are persisted to localStorage under this key so they survive
   * page reloads. Used for interview questions where `persistToApi` is false.
   */
  localStorageKey?: string;
};

function readStoredModel(key: string): Partial<Record<Field, string>> | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    return parsed as Partial<Record<Field, string>>;
  } catch {
    return null;
  }
}

export function CoachMentalModelPanel({ details, persistToApi = true, localStorageKey }: Props) {
  const router = useRouter();
  const [m, setM] = useState(() => details.mentalModel);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mentalKey = useMemo(
    () =>
      [
        details.mentalModel.trigger,
        details.mentalModel.cue,
        details.mentalModel.script,
        details.mentalModel.trap,
        details.mentalModel.personalWords,
        details.mentalModel.interviewPhrase
      ].join("\x1e"),
    [details.mentalModel]
  );

  useEffect(() => {
    if (localStorageKey) {
      const saved = readStoredModel(localStorageKey);
      // Saved fields win over server-derived defaults; missing fields fall back to details.mentalModel.
      setM(saved ? { ...details.mentalModel, ...saved } : details.mentalModel);
    } else {
      setM(details.mentalModel);
    }
  }, [details.id, mentalKey, localStorageKey]);

  const patch = (key: Field, value: string) => {
    setM((prev) => {
      const next = { ...prev, [key]: value };
      if (localStorageKey) {
        try {
          localStorage.setItem(localStorageKey, JSON.stringify(next));
        } catch {
          // ignore quota / private mode
        }
      }
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await updateProblemExplanation(
        details.id,
        buildUpdateExplanationFromDetails({ ...details, mentalModel: m })
      );
      setMessage("Saved.");
      await router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        {persistToApi ? (
          <>
            Short mental snapshot for <strong>this</strong> task. Edits are stored with the task explanation in the
            API.
          </>
        ) : localStorageKey ? (
          <>Short mental snapshot for <strong>this</strong> topic. Edits are saved in <strong>this browser</strong> — not sent to the server.</>
        ) : (
          <>Short mental snapshot for <strong>this</strong> topic. Nothing is sent to the server — your notes stay in
            this session only.</>
        )}
      </p>
      {persistToApi && message ? <p className="text-sm font-medium text-emerald-700">{message}</p> : null}
      {persistToApi && error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {(["trigger", "cue", "script", "trap"] as const).map((key) => {
          const { label, help } = cardHints[key];
          return (
            <div
              key={key}
              className="rounded-2xl border border-border/80 bg-white p-4 shadow-clay-sm ring-1 ring-inset ring-amber-50/35"
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
              <input
                className={cn(areaClass, "mt-2 min-h-10 text-base font-semibold")}
                value={m[key]}
                onChange={(e) => patch(key, e.target.value)}
                placeholder={key === "trigger" ? "e.g. sorted + search" : ""}
                aria-label={label}
              />
              <p className="mt-2 text-xs text-muted-foreground">{help}</p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl border border-border/80 bg-white p-4 shadow-clay-sm ring-1 ring-inset ring-amber-50/35">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">In my words</p>
          <p className="mb-2 text-xs text-muted-foreground">Personal explanation</p>
          <textarea
            className={textAreaNarrativeClass}
            value={m.personalWords}
            onChange={(e) => patch("personalWords", e.target.value)}
            placeholder="Свой разбор своими словами…"
          />
        </div>
        <div className="rounded-2xl border border-border/80 bg-white p-4 shadow-clay-sm ring-1 ring-inset ring-amber-50/35">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Interview phrase</p>
          <p className="mb-2 text-xs text-muted-foreground">Spoken version</p>
          <textarea
            className={textAreaNarrativeClass}
            value={m.interviewPhrase}
            onChange={(e) => patch("interviewPhrase", e.target.value)}
            placeholder="How you would say it in English in an interview…"
          />
        </div>
      </div>

      {persistToApi ? (
        <div className="flex justify-end">
          <Button type="button" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save mental model"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
