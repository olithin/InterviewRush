"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  buildUpdateExplanationFromDetails,
  updateProblemExplanation,
  uploadProblemVisualImage,
  type UpdateProblemExplanationBody
} from "@/lib/api";
import type { ProblemTeachingDetails } from "@/lib/problem-types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { resizeImageFileForUpload } from "@/lib/image-resize-for-upload";
import { cn, normalizeMultiline, parseVisualExplanation } from "@/lib/utils";

type LineForm = {
  pattern: string;
  wordingLines: string;
  mnemonic: string;
  thinkStepsLines: string;
  bruteForceIdea: string;
  optimalIdea: string;
  algorithmLines: string;
  visualMode: "text" | "image";
  /** Plain text for coach visual (when not using image) */
  visualText: string;
  /** e.g. /images/problems/uploads/... (no IMAGE: prefix) */
  imagePublicPath: string;
  imageAlt: string;
  whyThisPattern: string;
  whyNotLines: string;
  complexity: string;
  edgeLines: string;
  criticalLines: string;
  importantLines: string;
  niceLines: string;
  gapLines: string;
  interviewEnglish: string;
  simpleRussian: string;
  mentalTrigger: string;
  mentalCue: string;
  mentalScript: string;
  mentalTrap: string;
  mentalPersonalWords: string;
  mentalInterviewPhrase: string;
};

function linesToArray(text: string): string[] {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function arrayToLines(arr: string[]): string {
  return arr.join("\n");
}

function detailsToForm(d: ProblemTeachingDetails): LineForm {
  const b = buildUpdateExplanationFromDetails(d);
  const v = parseVisualExplanation(normalizeMultiline(d.visualExplanation));
  const visual: Pick<LineForm, "visualMode" | "visualText" | "imagePublicPath" | "imageAlt"> =
    v.kind === "image"
      ? { visualMode: "image", visualText: "", imagePublicPath: v.src, imageAlt: v.alt }
      : {
          visualMode: "text",
          /** Non-image: keep `IMAGE:` / `MEDIA:` / `LINK:` / free text as stored. */
          visualText: v.kind === "text" ? v.text : d.visualExplanation,
          imagePublicPath: "",
          imageAlt: ""
        };
  return {
    pattern: b.pattern,
    wordingLines: arrayToLines(b.wordingSignals),
    mnemonic: b.mnemonic,
    thinkStepsLines: arrayToLines(b.howToThinkSteps),
    bruteForceIdea: b.bruteForceIdea,
    optimalIdea: b.optimalIdea,
    algorithmLines: arrayToLines(b.stepByStepAlgorithm),
    ...visual,
    whyThisPattern: b.whyThisPattern,
    whyNotLines: arrayToLines(b.whyNotOtherPatterns),
    complexity: b.complexity,
    edgeLines: arrayToLines(b.edgeCaseChecklist),
    criticalLines: arrayToLines(b.commonMistakes.critical),
    importantLines: arrayToLines(b.commonMistakes.important),
    niceLines: arrayToLines(b.commonMistakes.niceToHave),
    gapLines: arrayToLines(b.gapLearningHints),
    interviewEnglish: b.interviewExplanationEnglish,
    simpleRussian: b.simpleExplanationRussian,
    mentalTrigger: d.mentalModel.trigger,
    mentalCue: d.mentalModel.cue,
    mentalScript: d.mentalModel.script,
    mentalTrap: d.mentalModel.trap,
    mentalPersonalWords: d.mentalModel.personalWords,
    mentalInterviewPhrase: d.mentalModel.interviewPhrase
  };
}

function formToBody(f: LineForm): UpdateProblemExplanationBody {
  const path = f.imagePublicPath.trim();
  const visualExplanation =
    f.visualMode === "image"
      ? path.length > 0
        ? `IMAGE:${path}|${(f.imageAlt || "Visual").trim()}`
        : ""
      : f.visualText.trim();
  return {
    pattern: f.pattern.trim(),
    wordingSignals: linesToArray(f.wordingLines),
    mnemonic: f.mnemonic.trim(),
    howToThink: "",
    howToThinkSteps: linesToArray(f.thinkStepsLines),
    bruteForceIdea: f.bruteForceIdea.trim(),
    optimalIdea: f.optimalIdea.trim(),
    stepByStepAlgorithm: linesToArray(f.algorithmLines),
    visualExplanation,
    whyThisPattern: f.whyThisPattern.trim(),
    whyNotOtherPatterns: linesToArray(f.whyNotLines),
    complexity: f.complexity.trim(),
    edgeCaseChecklist: linesToArray(f.edgeLines),
    commonMistakes: {
      critical: linesToArray(f.criticalLines),
      important: linesToArray(f.importantLines),
      niceToHave: linesToArray(f.niceLines)
    },
    gapLearningHints: linesToArray(f.gapLines),
    interviewExplanationEnglish: f.interviewEnglish.trim(),
    simpleExplanationRussian: f.simpleRussian.trim(),
    mentalModelTrigger: f.mentalTrigger.trim(),
    mentalModelCue: f.mentalCue.trim(),
    mentalModelScript: f.mentalScript.trim(),
    mentalModelTrap: f.mentalTrap.trim(),
    mentalModelPersonalWords: f.mentalPersonalWords.trim(),
    mentalModelInterviewPhrase: f.mentalInterviewPhrase.trim()
  };
}

const label = "text-xs font-semibold text-muted-foreground";
const help = "mb-1 block text-[11px] text-muted-foreground/90";
const area = "input-clay w-full min-h-[72px] resize-y px-3 py-2 text-sm leading-relaxed";
const input = "input-clay w-full min-h-9 h-9 px-3 py-2 text-sm";

type Props = {
  details: ProblemTeachingDetails;
  onClose: () => void;
};

export function CoachExplanationEditor({ details, onClose }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<LineForm>(() => detailsToForm(details));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const uploadBusyRef = useRef(false);
  uploadBusyRef.current = uploadBusy;

  useEffect(() => {
    setForm(detailsToForm(details));
  }, [details]);

  const patch = (partial: Partial<LineForm>) => {
    setForm((prev) => ({ ...prev, ...partial }));
  };

  const uploadVisualFile = async (file: File) => {
    if (uploadBusy) return;
    if (!file.type.startsWith("image/")) {
      setError("Item is not a supported image type");
      return;
    }
    setUploadBusy(true);
    setError(null);
    try {
      const normalized =
        file.name && file.name.length > 0
          ? file
          : new File([file], "pasted-image.png", { type: file.type || "image/png" });
      const toSend = await resizeImageFileForUpload(normalized);
      const publicPath = await uploadProblemVisualImage(details.id, toSend);
      patch({
        visualMode: "image",
        imagePublicPath: publicPath
      });
      setFileToUpload(null);
      setMessage("Image saved to public folder. Use Save to API to store the reference in the database.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploadBusy(false);
    }
  };

  const uploadVisualFileRef = useRef(uploadVisualFile);
  uploadVisualFileRef.current = uploadVisualFile;

  /** In Image mode, Ctrl+V pastes a screenshot from anywhere in this editor (Snipping Tool, PrtSc, browser copy). */
  useEffect(() => {
    if (form.visualMode !== "image") {
      return;
    }
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items?.length) {
        return;
      }
      let file: File | null = null;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === "file" && item.type.startsWith("image/")) {
          file = item.getAsFile();
          break;
        }
      }
      if (!file) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      if (uploadBusyRef.current) {
        return;
      }
      void uploadVisualFileRef.current(file);
    };
    document.addEventListener("paste", onPaste, true);
    return () => document.removeEventListener("paste", onPaste, true);
  }, [form.visualMode]);

  const save = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const body = formToBody(form);
      await updateProblemExplanation(details.id, body);
      setMessage("Saved. Coach content is updated in the database.");
      await router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-amber-200/80 bg-amber-50/50">
      <CardHeader className="space-y-3 pb-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <CardTitle className="text-base leading-snug">Edit coach / training content</CardTitle>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button type="button" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save to API"}
            </Button>
            <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
              Close
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Saves to the API for this task only. List fields: <strong>one line per item</strong> (e.g. each
          line is one list entry, including for Keywords signals). Problem <strong>statement</strong> is not
          edited here — change it in content
          import or a future problem editor.
        </p>
        {message ? <p className="text-sm font-medium text-emerald-700">{message}</p> : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </CardHeader>
      <CardContent className="max-h-[min(80vh,48rem)] space-y-4 overflow-y-auto">
        <div>
          <span className={label}>Pattern name</span>
          <input className={input} value={form.pattern} onChange={(e) => patch({ pattern: e.target.value })} />
        </div>

        <div>
          <span className={label}>Keywords signals</span>
          <p className={help}>Phrases in the task that hint at the pattern. One per line.</p>
          <textarea
            className={cn(area, "min-h-[100px] font-mono text-[13px]")}
            value={form.wordingLines}
            onChange={(e) => patch({ wordingLines: e.target.value })}
          />
        </div>

        <div>
          <span className={label}>Mnemonic</span>
          <input className={input} value={form.mnemonic} onChange={(e) => patch({ mnemonic: e.target.value })} />
        </div>

        <div>
          <span className={label}>How to think (steps)</span>
          <p className={help}>One per line, shown as a numbered list.</p>
          <textarea
            className={cn(area, "min-h-[120px] font-mono text-[13px]")}
            value={form.thinkStepsLines}
            onChange={(e) => patch({ thinkStepsLines: e.target.value })}
          />
        </div>

        <div>
          <span className={label}>Brute force idea</span>
          <textarea
            className={area}
            value={form.bruteForceIdea}
            onChange={(e) => patch({ bruteForceIdea: e.target.value })}
          />
        </div>

        <div>
          <span className={label}>Optimal idea</span>
          <textarea
            className={area}
            value={form.optimalIdea}
            onChange={(e) => patch({ optimalIdea: e.target.value })}
          />
        </div>

        <div>
          <span className={label}>Step-by-step algorithm</span>
          <p className={help}>One per line.</p>
          <textarea
            className={cn(area, "min-h-[100px] font-mono text-[13px]")}
            value={form.algorithmLines}
            onChange={(e) => patch({ algorithmLines: e.target.value })}
          />
        </div>

        <div>
          <span className={label}>Visual explanation</span>
          <p className={help}>
            <strong>Text</strong> — shown in the sidebar / steps. <strong>Image</strong> — large dashed “poster”
            in coach (same format as <code className="rounded bg-muted px-1">IMAGE:/…|…</code> in JSON).
          </p>
          <div className="mb-2 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={form.visualMode === "text" ? "default" : "secondary"}
              onClick={() => patch({ visualMode: "text" })}
            >
              Text
            </Button>
            <Button
              type="button"
              size="sm"
              variant={form.visualMode === "image" ? "default" : "secondary"}
              onClick={() => patch({ visualMode: "image" })}
            >
              Image
            </Button>
          </div>
          {form.visualMode === "text" ? (
            <textarea
              className={cn(area, "min-h-[100px]")}
              value={form.visualText}
              onChange={(e) => patch({ visualText: e.target.value })}
            />
          ) : (
            <div className="space-y-3 rounded-2xl border border-dashed border-orange-200/80 bg-amber-50/40 p-3">
              <div>
                <span className={label}>Short description (alt text)</span>
                <input
                  className={input}
                  value={form.imageAlt}
                  onChange={(e) => patch({ imageAlt: e.target.value })}
                  placeholder="e.g. Binary search reference diagram"
                />
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1">
                  <span className={label}>File from this computer</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                    className="mt-1 block w-full text-sm file:mr-2 file:rounded-lg file:border-0 file:bg-primary file:px-2 file:py-1 file:text-xs file:font-medium file:text-primary-foreground"
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      setFileToUpload(f);
                      e.target.value = "";
                    }}
                  />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!fileToUpload || uploadBusy}
                  onClick={() => {
                    if (fileToUpload) {
                      void uploadVisualFile(fileToUpload);
                    }
                  }}
                >
                  {uploadBusy ? "Uploading…" : "Upload to site folder"}
                </Button>
              </div>
              <div
                className="rounded-2xl border border-dashed border-primary/30 bg-gradient-to-b from-amber-50/90 to-amber-100/30 px-3 py-3 text-sm text-foreground/90"
                role="status"
              >
                <p className="m-0 font-medium">Screenshot — Ctrl+V</p>
                <p className="mb-0 mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  With <strong>Image</strong> selected, press <kbd className="rounded bg-white/80 px-1.5 py-0.5 text-[11px]">Ctrl</kbd>+
                  <kbd className="rounded bg-white/80 px-1.5 py-0.5 text-[11px]">V</kbd> anywhere in this form (for example
                  after <strong>Win+Shift+S</strong> in Windows). Pasting <strong>text</strong> in a field is unchanged; only
                  clipboard <strong>images</strong> are uploaded.
                </p>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Saves under <code className="rounded bg-background px-1">public/images/problems/uploads/</code> (max
                2.5 MB). Large photos and screenshots are <strong>automatically resized</strong> to fit within{" "}
                1280×1280 px (JPEG) before upload; SVG and GIF are unchanged. Then click <strong>Save to API</strong> so
                the DB stores the <code>IMAGE:…</code> line.
              </p>
              <div>
                <span className={label}>Public URL path (or edit after upload)</span>
                <input
                  className={input}
                  value={form.imagePublicPath}
                  onChange={(e) => patch({ imagePublicPath: e.target.value })}
                  placeholder="/images/problems/uploads/…"
                />
              </div>
              {form.imagePublicPath ? (
                <div className="mt-1 overflow-hidden rounded-xl border border-border/50 bg-background/80 p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={form.imagePublicPath}
                    alt={form.imageAlt || "Preview"}
                    className="max-h-40 w-auto object-contain"
                  />
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div>
          <span className={label}>Why this pattern</span>
          <textarea
            className={area}
            value={form.whyThisPattern}
            onChange={(e) => patch({ whyThisPattern: e.target.value })}
          />
        </div>

        <div>
          <span className={label}>Why not other patterns</span>
          <p className={help}>One per line.</p>
          <textarea
            className={cn(area, "min-h-[80px] font-mono text-[13px]")}
            value={form.whyNotLines}
            onChange={(e) => patch({ whyNotLines: e.target.value })}
          />
        </div>

        <div>
          <span className={label}>Complexity</span>
          <textarea className={area} value={form.complexity} onChange={(e) => patch({ complexity: e.target.value })} />
        </div>

        <div>
          <span className={label}>Edge case checklist</span>
          <p className={help}>One per line.</p>
          <textarea
            className={cn(area, "min-h-[80px] font-mono text-[13px]")}
            value={form.edgeLines}
            onChange={(e) => patch({ edgeLines: e.target.value })}
          />
        </div>

        <div>
          <span className={label}>Common mistakes — critical</span>
          <p className={help}>One per line.</p>
          <textarea
            className={cn(area, "min-h-[72px] font-mono text-[13px]")}
            value={form.criticalLines}
            onChange={(e) => patch({ criticalLines: e.target.value })}
          />
        </div>

        <div>
          <span className={label}>Common mistakes — important</span>
          <textarea
            className={cn(area, "min-h-[72px] font-mono text-[13px]")}
            value={form.importantLines}
            onChange={(e) => patch({ importantLines: e.target.value })}
          />
        </div>

        <div>
          <span className={label}>Common mistakes — nice to have</span>
          <textarea
            className={cn(area, "min-h-[72px] font-mono text-[13px]")}
            value={form.niceLines}
            onChange={(e) => patch({ niceLines: e.target.value })}
          />
        </div>

        <div>
          <span className={label}>Gap learning hints</span>
          <p className={help}>One per line.</p>
          <textarea
            className={cn(area, "min-h-[80px] font-mono text-[13px]")}
            value={form.gapLines}
            onChange={(e) => patch({ gapLines: e.target.value })}
          />
        </div>

        <div>
          <span className={label}>Interview answer (English)</span>
          <textarea
            className={cn(area, "min-h-[100px]")}
            value={form.interviewEnglish}
            onChange={(e) => patch({ interviewEnglish: e.target.value })}
          />
        </div>

        <div>
          <span className={label}>Short explanation (Russian)</span>
          <textarea
            className={cn(area, "min-h-[80px]")}
            value={form.simpleRussian}
            onChange={(e) => patch({ simpleRussian: e.target.value })}
          />
        </div>

        <div className="space-y-3 border-t border-dashed pt-4">
          <p className="text-sm font-semibold">Mental model (compact)</p>
          <p className={help}>
            Same fields as the Coach &quot;Mental model&quot; tab: short snapshot for the task.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <span className={label}>Trigger</span>
              <input className={input} value={form.mentalTrigger} onChange={(e) => patch({ mentalTrigger: e.target.value })} />
            </div>
            <div>
              <span className={label}>Cue</span>
              <input className={input} value={form.mentalCue} onChange={(e) => patch({ mentalCue: e.target.value })} />
            </div>
            <div>
              <span className={label}>Script</span>
              <input className={input} value={form.mentalScript} onChange={(e) => patch({ mentalScript: e.target.value })} />
            </div>
            <div>
              <span className={label}>Trap</span>
              <input className={input} value={form.mentalTrap} onChange={(e) => patch({ mentalTrap: e.target.value })} />
            </div>
          </div>
          <div>
            <span className={label}>In my words (personal)</span>
            <textarea
              className={area}
              value={form.mentalPersonalWords}
              onChange={(e) => patch({ mentalPersonalWords: e.target.value })}
            />
          </div>
          <div>
            <span className={label}>Interview phrase (spoken)</span>
            <textarea
              className={area}
              value={form.mentalInterviewPhrase}
              onChange={(e) => patch({ mentalInterviewPhrase: e.target.value })}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-t pt-3">
          <Button type="button" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save to API"}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Close
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
