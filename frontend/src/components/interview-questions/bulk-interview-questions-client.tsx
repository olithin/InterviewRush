"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { bulkCreateInterviewQuestions } from "@/lib/api";
import type { CreateInterviewQuestionBody } from "@/lib/interview-question-types";
import { parseBulkInterviewQuestionsInput } from "@/lib/parse-bulk-interview-questions";
import { cn } from "@/lib/utils";

const helpText = `Examples:

--- 
Title: What is the difference between ref and out?
Category: C#
Difficulty: Easy
Tags: CLR, parameters
Question: Interviewer asks about ref, out, in…
AnswerEnglish: I would start with default pass-by-value…
AnswerRussian: По умолчанию копия структуры…
---

Or paste a JSON array:
[
  { "title": "Q1", "questionText": "Text…", "category": "General" }
]`;

function ItemCard({
  item,
  index,
  onChange
}: {
  item: CreateInterviewQuestionBody;
  index: number;
  onChange: (i: number, next: CreateInterviewQuestionBody) => void;
}) {
  return (
    <Card className="border-dashed">
      <CardHeader className="py-2">
        <CardTitle className="text-sm">#{index + 1}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <input
          className={cn("input-clay w-full rounded-lg px-2 py-1 text-sm", "font-semibold")}
          value={item.title}
          onChange={(e) => onChange(index, { ...item, title: e.target.value })}
        />
        <textarea
          className="input-clay w-full min-h-[72px] resize-y rounded-lg px-2 py-1 text-sm"
          value={item.questionText}
          onChange={(e) => onChange(index, { ...item, questionText: e.target.value })}
        />
        <p className="text-xs text-muted-foreground line-clamp-2">{item.category} · {item.difficulty}</p>
      </CardContent>
    </Card>
  );
}

export function BulkInterviewQuestionsClient() {
  const [raw, setRaw] = useState("");
  const [items, setItems] = useState<CreateInterviewQuestionBody[]>([]);
  const [parseErrors, setParseErrors] = useState<{ lineHint: string; message: string }[]>([]);
  const [format, setFormat] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<Awaited<ReturnType<typeof bulkCreateInterviewQuestions>> | null>(null);

  const runParse = () => {
    setMessage(null);
    setError(null);
    setImportResult(null);
    const r = parseBulkInterviewQuestionsInput(raw);
    setItems(r.items);
    setParseErrors(r.errors);
    setFormat(r.format);
  };

  const patch = (i: number, next: CreateInterviewQuestionBody) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[i] = next;
      return copy;
    });
  };

  const importAll = async () => {
    setMessage(null);
    setError(null);
    setImportResult(null);
    if (items.length === 0) {
      setError("Nothing to import. Parse first.");
      return;
    }
    const valid = items.filter((x) => x.title.trim() && x.questionText.trim());
    if (valid.length === 0) {
      setError("No rows with both title and question text.");
      return;
    }
    setSaving(true);
    try {
      const res = await bulkCreateInterviewQuestions(valid);
      setImportResult(res);
      setMessage(`Imported ${res.created.length} question(s). Failed: ${res.failed.length}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {message ? <p className="text-sm font-medium text-emerald-800">{message}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-muted-foreground">Input</label>
          <textarea
            className="input-clay min-h-[320px] w-full resize-y rounded-2xl px-3 py-2 font-mono text-sm"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder={helpText}
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <Button type="button" onClick={runParse} variant="secondary">
              Parse preview
            </Button>
            <Button type="button" onClick={importAll} disabled={saving || items.length === 0}>
              {saving ? "Importing…" : "Save all to database"}
            </Button>
          </div>
        </div>
        <div className="rounded-2xl border border-border/60 bg-muted/15 p-3 text-sm text-muted-foreground">
          <p className="mb-2 font-semibold text-foreground">How to</p>
          <p className="whitespace-pre-wrap text-xs leading-relaxed">{helpText}</p>
        </div>
      </div>

      {parseErrors.length > 0 ? (
        <div className="rounded-xl border border-amber-200/80 bg-amber-50/90 p-3 text-sm text-amber-950">
          <p className="font-semibold">Parser notes</p>
          <ul className="list-disc pl-4">
            {parseErrors.map((e, i) => (
              <li key={i}>
                {e.lineHint}: {e.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="text-xs text-muted-foreground">
        {format ? `Format detected: ${format}. ` : null}
        {items.length} item(s) ready for preview.
      </p>

      {importResult ? (
        <div className="space-y-2 rounded-xl border border-border/60 bg-white p-3 text-sm">
          <p className="font-semibold">Last import</p>
          {importResult.failed.length > 0 ? (
            <ul className="list-disc pl-4 text-destructive">
              {importResult.failed.map((f) => (
                <li key={f.index}>
                  Index {f.index}: {f.message}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        {items.map((it, i) => (
          <ItemCard key={i} item={it} index={i} onChange={patch} />
        ))}
      </div>
    </div>
  );
}
