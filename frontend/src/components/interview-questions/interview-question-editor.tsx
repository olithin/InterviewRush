"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createInterviewQuestion, deleteInterviewQuestion, updateInterviewQuestion } from "@/lib/api";
import type {
  CreateInterviewQuestionBody,
  InterviewQuestion,
  UpdateInterviewQuestionBody
} from "@/lib/interview-question-types";
import { cn } from "@/lib/utils";
import { INTERVIEW_LANGUAGE_TRACKS, type InterviewLanguageTrackId } from "@/lib/interview-language-tracks";

const field =
  "input-clay w-full rounded-xl border border-border/60 bg-white px-3 py-2 text-sm text-foreground shadow-clay-sm";

type Props = {
  mode: "create" | "edit";
  initial: InterviewQuestion | null;
  /** In create mode: prefill the Tags field (e.g. from /new?tag=csharp-interview-tab). */
  prefillTag?: string;
  /**
   * After a successful create: full interview-Q page, or a language coach tab (C# / Java / Python).
   */
  afterCreate?: "interview" | InterviewLanguageTrackId;
};

function emptyDraft(): InterviewQuestion {
  return {
    id: 0,
    title: "",
    questionText: "",
    category: "General",
    difficulty: "Easy",
    tags: [],
    answerEnglish: "",
    answerRussian: "",
    memoryCue: "",
    commonTrap: "",
    followUpQuestions: [],
    notes: "",
    sortOrder: 0,
    isPublished: true,
    isActive: true,
    createdAtUtc: new Date(0).toISOString(),
    updatedAtUtc: new Date(0).toISOString()
  };
}

export function InterviewQuestionEditor({ mode, initial, prefillTag, afterCreate = "interview" }: Props) {
  const router = useRouter();
  const [q, setQ] = useState<InterviewQuestion>(initial ?? emptyDraft);
  const [tagInput, setTagInput] = useState(() => {
    if (mode === "create" && prefillTag?.trim()) {
      return prefillTag.trim();
    }
    return (initial?.tags ?? []).join(", ");
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mode === "edit" && initial) {
      setQ(initial);
      setTagInput(initial.tags.join(", "));
    }
  }, [mode, initial?.id, initial?.updatedAtUtc]);

  const patch = (partial: Partial<InterviewQuestion>) => {
    setQ((prev) => ({ ...prev, ...partial }));
  };

  const toBody = (): UpdateInterviewQuestionBody => ({
    title: q.title.trim(),
    questionText: q.questionText.trim(),
    category: q.category,
    difficulty: q.difficulty,
    tags: tagInput
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean),
    answerEnglish: q.answerEnglish,
    answerRussian: q.answerRussian,
    memoryCue: q.memoryCue,
    commonTrap: q.commonTrap,
    followUpQuestions: q.followUpQuestions,
    notes: q.notes,
    sortOrder: q.sortOrder,
    isPublished: q.isPublished,
    isActive: q.isActive
  });

  const save = async () => {
    setMessage(null);
    setError(null);
    if (!q.title.trim() || !q.questionText.trim()) {
      setError("Title and question text are required.");
      return;
    }
    setSaving(true);
    try {
      const body = toBody();
      if (mode === "create") {
        const { id } = await createInterviewQuestion(body as CreateInterviewQuestionBody);
        setMessage("Saved.");
        if (afterCreate !== "interview") {
          const seg = INTERVIEW_LANGUAGE_TRACKS[afterCreate].segment;
          router.push(`/interview/${seg}/${id}`);
        } else {
          router.push(`/interview-questions/${id}`);
        }
        router.refresh();
      } else {
        await updateInterviewQuestion(q.id, body);
        setMessage("Saved.");
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (mode !== "edit" || !q.id) return;
    if (
      !window.confirm(
        "Delete this question permanently? Links from the knowledge map to this question will be cleared. This cannot be undone."
      )
    ) {
      return;
    }
    setMessage(null);
    setError(null);
    setDeleting(true);
    try {
      await deleteInterviewQuestion(q.id);
      router.push("/interview-questions");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      {message ? <p className="text-sm font-medium text-emerald-800">{message}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={save} disabled={saving || deleting}>
          {saving ? "Saving…" : "Save"}
        </Button>
        {mode === "edit" ? (
          <>
            <Button type="button" variant="secondary" asChild disabled={deleting}>
              <Link href={`/interview-questions/${q.id}`}>Open coach</Link>
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push("/interview-questions")}
              disabled={deleting}
            >
              Back to list
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="border border-destructive/35 bg-rose-50/90 text-rose-900 hover:bg-rose-100/90"
              onClick={remove}
              disabled={saving || deleting}
            >
              {deleting ? "Deleting…" : "Delete question"}
            </Button>
          </>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Metadata</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            Title
            <input className={field} value={q.title} onChange={(e) => patch({ title: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            Category / topic
            <input
              className={field}
              value={q.category}
              onChange={(e) => patch({ category: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            Level
            <select
              className={field}
              value={q.difficulty}
              onChange={(e) => patch({ difficulty: e.target.value })}
            >
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            Sort order
            <input
              type="number"
              className={field}
              value={q.sortOrder}
              onChange={(e) => patch({ sortOrder: Number.parseInt(e.target.value, 10) || 0 })}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground sm:col-span-2">
            Tags (English — memorization keywords, comma-separated)
            <input
              className={field}
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="e.g. CLR, BCL, TFM, self-contained, async"
            />
            <span className="text-[11px] font-normal text-muted-foreground/90">
              Shown as chips in Coach → Keywords (with memory cue, split on commas / ; / |).
            </span>
          </label>
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Question</CardTitle>
        </CardHeader>
        <CardContent>
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            Full question
            <textarea
              className={cn(field, "min-h-[120px] resize-y")}
              value={q.questionText}
              onChange={(e) => patch({ questionText: e.target.value })}
            />
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Answers & memory</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            Answer (English)
            <textarea
              className={cn(field, "min-h-[100px] resize-y")}
              value={q.answerEnglish}
              onChange={(e) => patch({ answerEnglish: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            Answer (Russian)
            <textarea
              className={cn(field, "min-h-[100px] resize-y")}
              value={q.answerRussian}
              onChange={(e) => patch({ answerRussian: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            Memory cue (English — one line, or several hooks separated by comma)
            <input
              className={field}
              value={q.memoryCue}
              onChange={(e) => patch({ memoryCue: e.target.value })}
              placeholder="e.g. runtime executes IL; BCL = standard library; TFM = what you build against"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            Common trap
            <textarea
              className={cn(field, "min-h-[72px] resize-y")}
              value={q.commonTrap}
              onChange={(e) => patch({ commonTrap: e.target.value })}
            />
          </label>
        </CardContent>
      </Card>

      {mode === "edit" ? (
        <p className="text-xs text-muted-foreground">
          Updated: {new Date(q.updatedAtUtc).toLocaleString()} · Created:{" "}
          {new Date(q.createdAtUtc).toLocaleString()}
        </p>
      ) : null}
    </div>
  );
}
