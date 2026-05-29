"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteInterviewQuestion, getInterviewQuestionById, updateInterviewQuestion } from "@/lib/api";
import type { InterviewQuestion, UpdateInterviewQuestionBody } from "@/lib/interview-question-types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const field =
  "input-clay w-full rounded-xl border border-border/60 bg-white px-3 py-2 text-sm text-foreground shadow-clay-sm";

const label = "text-xs font-semibold text-muted-foreground";
const help = "mb-1 block text-[11px] text-muted-foreground/90";

function linesToArray(text: string): string[] {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function arrayToLines(arr: string[]): string {
  return arr.join("\n");
}

type Props = {
  questionId: number;
  onClose: () => void;
  /** List/index route after successful delete. */
  afterDeletePath: string;
};

function tagsFromInput(tagInput: string): string[] {
  return tagInput
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function toBody(q: InterviewQuestion, followUpLines: string, tagInput: string): UpdateInterviewQuestionBody {
  return {
    title: q.title.trim(),
    questionText: q.questionText.trim(),
    category: q.category,
    difficulty: q.difficulty,
    tags: tagsFromInput(tagInput),
    answerEnglish: q.answerEnglish,
    answerRussian: q.answerRussian,
    memoryCue: q.memoryCue,
    commonTrap: q.commonTrap,
    followUpQuestions: linesToArray(followUpLines),
    notes: q.notes,
    sortOrder: q.sortOrder,
    isPublished: q.isPublished,
    isActive: q.isActive
  };
}

export function InterviewQuestionCoachEditor({ questionId, onClose, afterDeletePath }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState<InterviewQuestion | null>(null);
  const [followUpLines, setFollowUpLines] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getInterviewQuestionById(questionId)
      .then((row) => {
        if (cancelled) return;
        setQ(row);
        setFollowUpLines(arrayToLines(row.followUpQuestions ?? []));
        setTagInput((row.tags ?? []).join(", "));
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Load failed");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [questionId]);

  const patch = (partial: Partial<InterviewQuestion>) => {
    setQ((prev) => (prev ? { ...prev, ...partial } : null));
  };

  const save = async () => {
    if (!q) return;
    setMessage(null);
    setError(null);
    if (!q.title.trim() || !q.questionText.trim()) {
      setError("Title and question text are required.");
      return;
    }
    setSaving(true);
    try {
      const body = toBody(q, followUpLines, tagInput);
      await updateInterviewQuestion(q.id, body);
      setMessage("Saved. Question is updated in the database.");
      await router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!q) return;
    if (
      !window.confirm(
        "Delete this question permanently? Knowledge map links to it are cleared. This cannot be undone."
      )
    ) {
      return;
    }
    setMessage(null);
    setError(null);
    setDeleting(true);
    try {
      await deleteInterviewQuestion(q.id);
      onClose();
      await router.push(afterDeletePath);
      await router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card className="border-amber-200/80 bg-amber-50/50">
      <CardHeader className="space-y-3 pb-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <CardTitle className="text-base leading-snug">Edit interview question (API)</CardTitle>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button type="button" onClick={save} disabled={saving || deleting || loading || !q}>
              {saving ? "Saving…" : "Save to API"}
            </Button>
            <Button type="button" variant="secondary" onClick={onClose} disabled={saving || deleting}>
              Close
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="border border-destructive/35 bg-rose-50/90 text-rose-900 hover:bg-rose-100/90"
              onClick={remove}
              disabled={saving || deleting || loading || !q}
            >
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Same pattern as <strong>tasks</strong> — saves to the API and refreshes the page.
        </p>
        {message ? <p className="text-sm font-medium text-emerald-700">{message}</p> : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </CardHeader>
      <CardContent className="max-h-[min(80vh,48rem)] space-y-4 overflow-y-auto">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !q ? (
          <p className="text-sm text-destructive">Could not load question.</p>
        ) : (
          <>
            <div>
              <span className={label}>Title</span>
              <input className={field} value={q.title} onChange={(e) => patch({ title: e.target.value })} />
            </div>
            <div>
              <span className={label}>Category / topic</span>
              <input
                className={field}
                value={q.category}
                onChange={(e) => patch({ category: e.target.value })}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <span className={label}>Level</span>
                <select
                  className={field}
                  value={q.difficulty}
                  onChange={(e) => patch({ difficulty: e.target.value })}
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>
              <div>
                <span className={label}>Sort order</span>
                <input
                  type="number"
                  className={field}
                  value={q.sortOrder}
                  onChange={(e) => patch({ sortOrder: Number.parseInt(e.target.value, 10) || 0 })}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-4">
              <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded"
                  checked={q.isPublished}
                  onChange={(e) => patch({ isPublished: e.target.checked })}
                />
                Published
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded"
                  checked={q.isActive}
                  onChange={(e) => patch({ isActive: e.target.checked })}
                />
                Active
              </label>
            </div>
            <div>
              <span className={label}>Keywords (English)</span>
              <p className={help}>
                Comma or semicolon separated — memorization chips in Coach (with memory cue).
              </p>
              <input
                className={field}
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="e.g. CLR, BCL, value type, heap"
                autoComplete="off"
              />
            </div>
            <div>
              <span className={label}>Full question</span>
              <textarea
                className={cn(field, "min-h-[120px] resize-y font-mono text-[13px]")}
                value={q.questionText}
                onChange={(e) => patch({ questionText: e.target.value })}
              />
            </div>
            <div>
              <span className={label}>Answer (English)</span>
              <textarea
                className={cn(field, "min-h-[100px] resize-y font-mono text-[13px]")}
                value={q.answerEnglish}
                onChange={(e) => patch({ answerEnglish: e.target.value })}
              />
            </div>
            <div>
              <span className={label}>Answer (Russian)</span>
              <textarea
                className={cn(field, "min-h-[100px] resize-y font-mono text-[13px]")}
                value={q.answerRussian}
                onChange={(e) => patch({ answerRussian: e.target.value })}
              />
            </div>
            <div>
              <span className={label}>Memory cue (English)</span>
              <input
                className={field}
                value={q.memoryCue}
                onChange={(e) => patch({ memoryCue: e.target.value })}
              />
            </div>
            <div>
              <span className={label}>Common trap</span>
              <textarea
                className={cn(field, "min-h-[72px] resize-y font-mono text-[13px]")}
                value={q.commonTrap}
                onChange={(e) => patch({ commonTrap: e.target.value })}
              />
            </div>
            <div>
              <span className={label}>Possible follow-up questions</span>
              <p className={help}>One per line — shown in Coach as follow-ups.</p>
              <textarea
                className={cn(field, "min-h-[88px] resize-y font-mono text-[13px]")}
                value={followUpLines}
                onChange={(e) => setFollowUpLines(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Updated: {new Date(q.updatedAtUtc).toLocaleString()} · ID {q.id}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
