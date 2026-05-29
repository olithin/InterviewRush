"use client";

import dynamic from "next/dynamic";
import { Copy, GitBranch, Pencil, Play, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  createSolution,
  createSolutionVersion,
  deleteSolution,
  listSolutionVersions,
  runPracticeCode,
  updateSolution,
  type PracticeRunResult
} from "@/lib/api";
import type { LocalReflection, PracticeSolution, SolutionVersionListItem } from "@/lib/problem-types";
import { recordProblemRunFinished } from "@/lib/learning-map-progress";
import { toApiSolutionCode, unwrapSolutionClassForEditor } from "@/lib/solution-boilerplate";
import { cn } from "@/lib/utils";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => <div className="min-h-[min(50vh,36rem)] w-full min-h-0 flex-1 animate-pulse rounded-xl bg-muted" />
});

type Props = {
  problemId: number;
  solutionTemplates: PracticeSolution[];
  defaultTestsCode: string;
};

function makeDraftFallback(): PracticeSolution {
  return {
    id: 0,
    label: "Draft",
    code: "",
    nUnitTestsCode: "",
    nUnitSampleTestsCode: "",
    thinkPattern: "",
    thinkIdea: "",
    thinkComplexity: ""
  };
}

function buildCodeMap(templates: PracticeSolution[]) {
  const map: Record<number, string> = {};
  for (const t of templates) {
    map[t.id] = unwrapSolutionClassForEditor(t.code);
  }
  return map;
}

function initialNUnitBufferForTemplate(t: PracticeSolution, defaultTestsCode: string): string {
  if (t.id === 0 && !(t.nUnitTestsCode || "").trim() && (defaultTestsCode || "").trim()) {
    return defaultTestsCode;
  }
  return t.nUnitTestsCode ?? "";
}

function buildFullTestsMap(templates: PracticeSolution[], defaultTestsCode: string) {
  const map: Record<number, string> = {};
  for (const t of templates) {
    map[t.id] = initialNUnitBufferForTemplate(t, defaultTestsCode);
  }
  return map;
}

function reflectStorageKey(problemId: number, solutionId: number) {
  return `qaquest.v1.reflect.${problemId}.${solutionId}`;
}

function readReflection(problemId: number, solutionId: number): LocalReflection {
  if (typeof window === "undefined") {
    return { keyPattern: "", commonTrap: "", memoryHook: "" };
  }
  try {
    const raw = localStorage.getItem(reflectStorageKey(problemId, solutionId));
    if (!raw) {
      return { keyPattern: "", commonTrap: "", memoryHook: "" };
    }
    return { ...{ keyPattern: "", commonTrap: "", memoryHook: "" }, ...JSON.parse(raw) };
  } catch {
    return { keyPattern: "", commonTrap: "", memoryHook: "" };
  }
}

function writeReflection(problemId: number, solutionId: number, r: LocalReflection) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    localStorage.setItem(reflectStorageKey(problemId, solutionId), JSON.stringify(r));
  } catch {
    // ignore
  }
}

type SaveState = "idle" | "unsaved" | "saving" | "saved" | "error";

function persistedCount(templates: PracticeSolution[]) {
  return templates.filter((t) => t.id > 0).length;
}

type EditorBuffer = "solution" | "full";

export function PracticeCodeWorkbench({ problemId, solutionTemplates, defaultTestsCode }: Props) {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const canPersistPersonal = sessionStatus === "authenticated" && session?.user != null;
  const templates = solutionTemplates.length > 0 ? solutionTemplates : [makeDraftFallback()];
  const hasPersisted = persistedCount(templates) > 0;

  const [activeId, setActiveId] = useState(() => templates[0]!.id);
  const [editorBuffer, setEditorBuffer] = useState<EditorBuffer>("solution");
  const [codeById, setCodeById] = useState<Record<number, string>>(() => buildCodeMap(templates));
  const [fullTestsById, setFullTestsById] = useState<Record<number, string>>(() =>
    buildFullTestsMap(
      solutionTemplates.length > 0 ? solutionTemplates : [makeDraftFallback()],
      defaultTestsCode
    )
  );
  const [output, setOutput] = useState("");
  const [lastRun, setLastRun] = useState<PracticeRunResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mutating, setMutating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [subTab, setSubTab] = useState<"output" | "tests" | "reflect" | "versions" | "compare">("output");
  const [versions, setVersions] = useState<SolutionVersionListItem[] | null>(null);
  const [versionsLoad, setVersionsLoad] = useState(false);
  const [reflect, setReflect] = useState<LocalReflection>({ keyPattern: "", commonTrap: "", memoryHook: "" });
  const [compareOtherId, setCompareOtherId] = useState<number | "">("");

  const [showAdd, setShowAdd] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newTests, setNewTests] = useState("");

  const initialRef = useRef<Record<number, PracticeSolution>>({});
  const dirtyRef = useRef(false);
  const runAutosave = useRef(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    for (const t of solutionTemplates.length > 0 ? solutionTemplates : [makeDraftFallback()]) {
      initialRef.current[t.id] = { ...t };
    }
  }, [problemId, solutionTemplates]);

  // `key={details.id}` on the parent remounts this component when switching tasks.
  // Here we only merge server template changes for the *same* task (e.g. new solution row after create, or RSC refresh)
  // without overwriting in-editor Solution / NUnit buffers.
  useEffect(() => {
    const list = solutionTemplates.length > 0 ? solutionTemplates : [makeDraftFallback()];
    const listIdSet = new Set(list.map((t) => t.id));

    setActiveId((prev) => (list.some((t) => t.id === prev) ? prev : list[0]!.id));
    setCodeById((prev) => {
      const next = { ...prev };
      for (const t of list) {
        if (next[t.id] === undefined) {
          next[t.id] = unwrapSolutionClassForEditor(t.code);
        }
      }
      for (const k of Object.keys(next)) {
        if (!listIdSet.has(Number(k))) {
          delete next[Number(k)];
        }
      }
      return next;
    });
    setFullTestsById((prev) => {
      const next = { ...prev };
      for (const t of list) {
        if (next[t.id] === undefined) {
          next[t.id] = initialNUnitBufferForTemplate(t, defaultTestsCode);
        }
      }
      for (const k of Object.keys(next)) {
        if (!listIdSet.has(Number(k))) {
          delete next[Number(k)];
        }
      }
      return next;
    });
  }, [problemId, solutionTemplates, defaultTestsCode]);

  useEffect(() => {
    if (!canPersistPersonal) {
      setReflect({ keyPattern: "", commonTrap: "", memoryHook: "" });
      return;
    }
    setReflect(readReflection(problemId, activeId));
  }, [problemId, activeId, canPersistPersonal]);

  const code = codeById[activeId] ?? "";
  const fullTests = fullTestsById[activeId] ?? "";
  const current = templates.find((t) => t.id === activeId) ?? makeDraftFallback();
  const canPersist = activeId > 0;
  const canDelete = canPersist && templates.filter((t) => t.id > 0).length > 1;
  const needsTestsForNew = !hasPersisted;

  const markDirty = useCallback(() => {
    dirtyRef.current = true;
    setSaveState("unsaved");
  }, []);

  const persistDraft = useCallback(async () => {
    if (!canPersist || !dirtyRef.current) {
      return;
    }
    setSaveState("saving");
    try {
      await updateSolution(problemId, activeId, {
        solutionCode: toApiSolutionCode(code),
        nUnitTestsCode: fullTests
      });
      dirtyRef.current = false;
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }, [activeId, canPersist, code, fullTests, problemId]);

  useEffect(() => {
    if (!canPersist) {
      return;
    }
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
    }
    if (!runAutosave.current) {
      return;
    }
    if (!dirtyRef.current) {
      return;
    }
    saveTimer.current = setTimeout(() => {
      void persistDraft();
    }, 1000);
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
      }
    };
  }, [code, fullTests, activeId, canPersist, persistDraft]);

  const onTabChange = (value: string) => {
    setActiveId(Number(value));
    setEditorBuffer("solution");
  };

  const handleEditorChange = (v: string | undefined) => {
    const val = v ?? "";
    markDirty();
    if (editorBuffer === "solution") {
      setCodeById((prev) => ({ ...prev, [activeId]: val }));
    } else {
      setFullTestsById((prev) => ({ ...prev, [activeId]: val }));
    }
  };

  const editorValue = editorBuffer === "solution" ? code : fullTests;

  const refresh = () => {
    router.refresh();
  };

  const run = async () => {
    if (canPersist) {
      if (dirtyRef.current) {
        setSaveState("saving");
        try {
          await updateSolution(problemId, activeId, {
            solutionCode: toApiSolutionCode(code),
            nUnitTestsCode: fullTests
          });
          dirtyRef.current = false;
          setSaveState("saved");
        } catch (e) {
          setSaveState("error");
          setError(e instanceof Error ? e.message : "Save before run failed");
          return;
        }
      }
    }
    setLoading(true);
    setError(null);
    setLastRun(null);
    setOutput("");
    try {
      const r = await runPracticeCode(problemId, toApiSolutionCode(code), {
        solutionId: canPersist ? activeId : undefined,
        testScope: "full",
        nUnitTestsCode: fullTests.trim() || undefined
      });
      setLastRun(r);
      setOutput(r.output);
      if (canPersistPersonal) {
        recordProblemRunFinished(problemId, r.passed);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Run failed");
    } finally {
      setLoading(false);
    }
  };

  const saveNow = async () => {
    if (!canPersist) {
      return;
    }
    setMutating(true);
    setActionError(null);
    try {
      await updateSolution(problemId, activeId, {
        solutionCode: toApiSolutionCode(code),
        nUnitTestsCode: fullTests
      });
      dirtyRef.current = false;
      setSaveState("saved");
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Save failed");
      setSaveState("error");
    } finally {
      setMutating(false);
    }
  };

  const duplicateSolution = async () => {
    if (!canPersist) {
      return;
    }
    setMutating(true);
    setActionError(null);
    try {
      await createSolution(problemId, {
        label: `${current.label} (copy)`,
        solutionCode: toApiSolutionCode(code),
        nUnitTestsCode: fullTests,
        nUnitSampleTestsCode: current.nUnitSampleTestsCode?.trim()
          ? current.nUnitSampleTestsCode
          : undefined,
        thinkPattern: current.thinkPattern || undefined,
        thinkIdea: current.thinkIdea || undefined,
        thinkComplexity: current.thinkComplexity || undefined
      });
      refresh();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Duplicate failed");
    } finally {
      setMutating(false);
    }
  };

  const saveVersion = async () => {
    if (!canPersist) {
      return;
    }
    setMutating(true);
    setActionError(null);
    try {
      await createSolutionVersion(problemId, activeId);
      setVersions(null);
      if (subTab === "versions") {
        const list = await listSolutionVersions(problemId, activeId);
        setVersions(list);
      }
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Version save failed");
    } finally {
      setMutating(false);
    }
  };

  const resetToStarter = () => {
    const init = initialRef.current[activeId];
    if (!init) {
      return;
    }
    if (!window.confirm("Reset this solution to the last loaded version from the server?")) {
      return;
    }
    markDirty();
    setCodeById((prev) => ({ ...prev, [activeId]: unwrapSolutionClassForEditor(init.code) }));
    setFullTestsById((prev) => ({ ...prev, [activeId]: init.nUnitTestsCode ?? "" }));
  };

  const removeCurrent = async () => {
    if (!canDelete) {
      return;
    }
    if (!window.confirm("Delete this solution? This cannot be undone.")) {
      return;
    }
    setMutating(true);
    setActionError(null);
    try {
      await deleteSolution(problemId, activeId);
      refresh();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setMutating(false);
    }
  };

  const openAdd = () => {
    const list = solutionTemplates.length > 0 ? solutionTemplates : [makeDraftFallback()];
    const n = list.filter((t) => t.id > 0).length;
    setNewLabel(`Solution ${n + 1}`);
    setNewCode(code);
    setNewTests(defaultTestsCode);
    setShowAdd(true);
    setActionError(null);
  };

  const submitAdd = async () => {
    setMutating(true);
    setActionError(null);
    try {
      const payload: Parameters<typeof createSolution>[1] = {
        label: newLabel.trim() || undefined,
        solutionCode: toApiSolutionCode(newCode)
      };
      if (needsTestsForNew) {
        const tests = newTests.trim() || defaultTestsCode.trim();
        if (!tests) {
          setActionError("NUnit tests are required for the first solution in the database for this task.");
          return;
        }
        payload.nUnitTestsCode = tests;
      }
      await createSolution(problemId, payload);
      setShowAdd(false);
      refresh();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setMutating(false);
    }
  };

  const openRename = () => {
    if (!canPersist) {
      return;
    }
    const name = window.prompt("Solution name (tab label)", current.label);
    if (name === null) {
      return;
    }
    setMutating(true);
    setActionError(null);
    void (async () => {
      try {
        await updateSolution(problemId, activeId, { label: name.trim() || undefined });
        refresh();
      } catch (e) {
        setActionError(e instanceof Error ? e.message : "Rename failed");
      } finally {
        setMutating(false);
      }
    })();
  };

  useEffect(() => {
    if (subTab !== "versions" || !canPersist) {
      return;
    }
    setVersionsLoad(true);
    setActionError(null);
    void (async () => {
      try {
        const list = await listSolutionVersions(problemId, activeId);
        setVersions(list);
      } catch (e) {
        setActionError(e instanceof Error ? e.message : "Failed to load versions");
      } finally {
        setVersionsLoad(false);
      }
    })();
  }, [subTab, canPersist, problemId, activeId]);

  const saveReflect = useCallback(() => {
    if (!canPersistPersonal) {
      return;
    }
    writeReflection(problemId, activeId, reflect);
  }, [activeId, problemId, reflect, canPersistPersonal]);

  useEffect(() => {
    if (activeId > 0 && canPersistPersonal) {
      const t = setTimeout(() => saveReflect(), 500);
      return () => clearTimeout(t);
    }
  }, [reflect, activeId, problemId, saveReflect, canPersistPersonal]);

  const otherLabel = useMemo(() => {
    if (compareOtherId === "" || !compareOtherId) {
      return null;
    }
    return templates.find((x) => x.id === compareOtherId)?.label ?? `#${compareOtherId}`;
  }, [compareOtherId, templates]);

  return (
    <Card className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
      <CardHeader className="shrink-0 space-y-1 pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-lg">Practice</CardTitle>
          {canPersist && saveState !== "idle" && (
            <span
              className={cn(
                "text-xs font-medium",
                saveState === "saving" && "text-amber-700",
                saveState === "saved" && "text-emerald-700",
                saveState === "unsaved" && "text-rose-600",
                saveState === "error" && "text-destructive"
              )}
            >
              {saveState === "saving" && "Saving…"}
              {saveState === "saved" && "Saved"}
              {saveState === "unsaved" && "Unsaved changes"}
              {saveState === "error" && "Save error"}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          In <span className="font-medium">Solution</span>, only your method(s) are shown:{" "}
          <code className="rounded bg-muted px-1">public class Solution</code> is added on save and run. NUnit
          is unchanged. Needs <code className="rounded bg-muted px-1">dotnet</code> on the API host.
        </p>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <Tabs value={String(activeId)} onValueChange={onTabChange} className="min-w-0 min-h-0 w-full sm:flex-1 sm:overflow-x-auto">
            <TabsList className="h-auto w-full min-w-0 flex-wrap justify-start gap-1 p-1 sm:inline-flex sm:w-auto sm:min-w-0 sm:max-w-full">
              {templates.map((t) => (
                <TabsTrigger key={t.id} className="shrink-0" value={String(t.id)}>
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="flex w-full min-w-0 flex-wrap items-center justify-end gap-1">
            <Button type="button" variant="secondary" size="sm" onClick={openAdd} disabled={mutating} title="New solution">
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => void saveNow()}
              disabled={!canPersist || mutating}
              title="Save draft to server"
            >
              <Save className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={openRename}
              disabled={!canPersist || mutating}
              title="Rename"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => void duplicateSolution()}
              disabled={!canPersist || mutating}
              title="Duplicate solution"
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => void saveVersion()}
              disabled={!canPersist || mutating}
              title="Save version snapshot"
            >
              <GitBranch className="h-4 w-4" />
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={resetToStarter} disabled={!canPersist || mutating} title="Reset to starter">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => void removeCurrent()}
              disabled={!canDelete || mutating}
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              onClick={() => void run()}
              disabled={loading}
              title="Run all NUnit tests"
              className="gap-1.5"
            >
              <Play className="h-4 w-4 shrink-0" />
              <span className="ml-0.5 max-sm:sr-only">{loading ? "…" : "Run"}</span>
            </Button>
            {lastRun ? (
              <span
                className={cn(
                  "ml-1 text-sm font-semibold",
                  lastRun.passed ? "text-emerald-700" : "text-rose-700"
                )}
              >
                {lastRun.resultKind}
              </span>
            ) : null}
          </div>
        </div>

        {showAdd ? (
          <div className="shrink-0 space-y-3 rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4 text-sm">
            <p className="font-semibold text-foreground">New solution</p>
            <div className="space-y-1">
              <label className="text-muted-foreground" htmlFor="new-sol-label">
                Name
              </label>
              <input
                id="new-sol-label"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                className="input-clay w-full max-w-md px-3 py-2"
                placeholder="e.g. Solution A — HashMap"
              />
            </div>
            {needsTestsForNew ? (
              <div className="space-y-1">
                <label className="text-muted-foreground" htmlFor="new-sol-tests">
                  NUnit (required for the first row in the DB for this task)
                </label>
                <textarea
                  id="new-sol-tests"
                  value={newTests}
                  onChange={(e) => setNewTests(e.target.value)}
                  rows={5}
                  className="w-full font-mono text-xs leading-relaxed"
                />
              </div>
            ) : null}
            <div className="space-y-1">
              <label className="text-muted-foreground" htmlFor="new-sol-code">
                Initial C#
              </label>
              <textarea
                id="new-sol-code"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                rows={8}
                className="w-full font-mono text-sm leading-relaxed"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" onClick={() => void submitAdd()} disabled={mutating}>
                Create
              </Button>
              <Button type="button" size="sm" variant="secondary" onClick={() => setShowAdd(false)} disabled={mutating}>
                Cancel
              </Button>
            </div>
          </div>
        ) : null}

        {actionError ? <p className="shrink-0 text-sm text-destructive">{actionError}</p> : null}

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Edit buffer</span>
          <div className="flex flex-wrap gap-1">
            <Button
              type="button"
              variant={editorBuffer === "solution" ? "default" : "secondary"}
              size="sm"
              onClick={() => setEditorBuffer("solution")}
            >
              Solution
            </Button>
            <Button
              type="button"
              variant={editorBuffer === "full" ? "default" : "secondary"}
              size="sm"
              onClick={() => setEditorBuffer("full")}
              disabled={!canPersist}
              title={!canPersist ? "Add a solution so NUnit is stored in the API" : "NUnit test file (Tests.cs on the server)"}
            >
              NUnit
            </Button>
          </div>
        </div>

        <div className="min-h-[min(50vh,32rem)] w-full min-h-0 flex-1 basis-0 overflow-hidden rounded-xl border">
          <MonacoEditor
            key={activeId}
            height="100%"
            className="h-full w-full"
            language="csharp"
            value={editorValue}
            theme="vs"
            onChange={handleEditorChange}
            options={{
              minimap: { enabled: false },
              fontSize: 17,
              lineHeight: 26,
              wordWrap: "on",
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 4,
              padding: { top: 12, bottom: 12 },
              renderLineHighlight: "all"
            }}
          />
        </div>

        <Tabs value={subTab} onValueChange={(v) => setSubTab(v as typeof subTab)} className="flex min-h-0 shrink-0 flex-col">
          <TabsList className="h-auto w-full flex-wrap justify-start gap-1">
            <TabsTrigger value="output">Output</TabsTrigger>
            <TabsTrigger value="tests">Tests</TabsTrigger>
            <TabsTrigger value="reflect">Reflection</TabsTrigger>
            <TabsTrigger value="versions" disabled={!canPersist}>
              Versions
            </TabsTrigger>
            <TabsTrigger value="compare">Compare</TabsTrigger>
          </TabsList>
          <TabsContent value="output" className="mt-2 min-h-0 max-h-80 overflow-auto text-sm">
            {error ? <p className="text-destructive">{error}</p> : null}
            {lastRun ? (
              <div className="space-y-2 rounded-lg border border-border bg-card p-3">
                <p>
                  <span className="font-semibold">Kind:</span> {lastRun.resultKind}
                  {lastRun.summaryMessage ? ` — ${lastRun.summaryMessage}` : null}
                </p>
                <p>
                  {lastRun.passedTestCount != null && lastRun.failedTestCount != null ? (
                    <span>
                      Passed {lastRun.passedTestCount} / failed {lastRun.failedTestCount}
                    </span>
                  ) : null}
                </p>
                {lastRun.failedTestName ? <p className="break-all">Failed test: {lastRun.failedTestName}</p> : null}
                {lastRun.expected && lastRun.actual ? (
                  <div className="grid gap-1 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Expected</p>
                      <pre className="whitespace-pre-wrap break-all rounded bg-muted/50 p-2 text-xs">{lastRun.expected}</pre>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Actual</p>
                      <pre className="whitespace-pre-wrap break-all rounded bg-muted/50 p-2 text-xs">{lastRun.actual}</pre>
                    </div>
                  </div>
                ) : null}
                {output ? (
                  <div>
                    <p className="text-xs text-muted-foreground">Raw</p>
                    <pre
                      className={cn(
                        "mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-all rounded border p-2 text-xs",
                        lastRun.passed ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"
                      )}
                    >
                      {output}
                    </pre>
                  </div>
                ) : null}
              </div>
            ) : !error ? (
              <p className="text-muted-foreground">Run to see structured output here.</p>
            ) : null}
          </TabsContent>
          <TabsContent value="tests" className="mt-2 max-h-80 space-y-2 overflow-auto text-sm">
            <p className="text-xs text-muted-foreground">
              Edit <span className="font-medium">NUnit</span> in the bar above. Run saves unsaved code and tests first.
            </p>
            <div>
              <p className="text-xs font-medium text-muted-foreground">NUnit (from buffer / server)</p>
              <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap rounded border bg-slate-950/5 p-2 text-xs">
                {fullTests.trim() || (canPersist ? "(empty)" : defaultTestsCode || "(empty) — server has another row’s tests for runs until you add a solution")}
              </pre>
            </div>
          </TabsContent>
          <TabsContent value="reflect" className="mt-2 space-y-2 text-sm">
            <p className="text-xs text-muted-foreground">Saved only in this browser (local), per solution.</p>
            <div>
              <label className="text-xs">Key pattern</label>
              <input
                className="mt-0.5 w-full rounded border px-2 py-1.5"
                value={reflect.keyPattern}
                onChange={(e) => setReflect((r) => ({ ...r, keyPattern: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs">Common trap</label>
              <input
                className="mt-0.5 w-full rounded border px-2 py-1.5"
                value={reflect.commonTrap}
                onChange={(e) => setReflect((r) => ({ ...r, commonTrap: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs">Memory hook</label>
              <input
                className="mt-0.5 w-full rounded border px-2 py-1.5"
                value={reflect.memoryHook}
                onChange={(e) => setReflect((r) => ({ ...r, memoryHook: e.target.value }))}
              />
            </div>
          </TabsContent>
          <TabsContent value="versions" className="mt-2 max-h-80 overflow-auto text-sm">
            {versionsLoad ? <p>Loading…</p> : null}
            {versions && versions.length === 0 ? <p className="text-muted-foreground">No saved versions yet.</p> : null}
            {versions && versions.length > 0 ? (
              <ul className="space-y-2">
                {versions.map((v) => (
                  <li key={v.id} className="rounded border p-2 text-xs">
                    <p className="font-mono">#{v.id} — {new Date(v.createdAtUtc).toLocaleString()}</p>
                    <p className="line-clamp-2 text-muted-foreground">{v.solutionCode.slice(0, 200)}</p>
                  </li>
                ))}
              </ul>
            ) : null}
          </TabsContent>
          <TabsContent value="compare" className="mt-2 text-sm">
            <p className="mb-2 text-xs text-muted-foreground">Compare current code with another solution (basic).</p>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="text-xs">With:</span>
              <select
                className="rounded border bg-background px-2 py-1.5 text-sm"
                value={compareOtherId === "" ? "" : String(compareOtherId)}
                onChange={(e) => {
                  const v = e.target.value;
                  setCompareOtherId(v === "" ? "" : Number(v));
                }}
              >
                <option value="">—</option>
                {templates
                  .filter((t) => t.id > 0 && t.id !== activeId)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
              </select>
            </div>
            {otherLabel && compareOtherId && (
              <div className="grid gap-2 md:grid-cols-2">
                <div>
                  <p className="text-xs font-medium">{current.label}</p>
                  <pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap rounded border p-2 text-xs">{code}</pre>
                </div>
                <div>
                  <p className="text-xs font-medium">{otherLabel}</p>
                  <pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap rounded border p-2 text-xs">
                    {codeById[Number(compareOtherId)] ?? ""}
                  </pre>
                </div>
              </div>
            )}
            {!compareOtherId ? <p className="text-xs text-muted-foreground">Pick another solution to compare.</p> : null}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
