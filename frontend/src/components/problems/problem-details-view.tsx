"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Code2, Copy, CopyCheck, GripVertical, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  createProblem,
  createInterviewQuestion,
  deleteProblem,
  deleteInterviewQuestion,
  reorderProblems,
  reorderInterviewQuestions
} from "@/lib/api";
import { cn, normalizeMultiline } from "@/lib/utils";
import { CoachMentalModelPanel } from "@/components/problems/coach-mental-model-panel";
import { CoachExplanationEditor } from "@/components/problems/coach-explanation-editor";
import { InterviewQuestionCoachEditor } from "@/components/interview-questions/interview-question-coach-editor";
import { UserContentPanel } from "@/components/interview-questions/user-content-panel";
import { InterviewNotebookBlock } from "@/components/problems/interview-notebook-panel";
import { PracticeCodeWorkbench } from "@/components/problems/practice-code-workbench";
import { ProblemNavItem, ProblemTeachingDetails } from "@/lib/problem-types";

/** Optional: static interview tab reuses the same coach UI with different nav and no API-backed practice. */
export type ProblemDetailsLayout = {
  navHref: (id: number) => string;
  sidebarTitle: string;
  navGroupBy: "pattern" | "none";
  pageSubtitle: string;
  showPracticeMode: boolean;
  showApiCoachEditor: boolean;
  persistMentalToApi: boolean;
  howToThinkStorageKey: (id: number) => string;
  coachStep6: "code" | "interview-only";
  /**
   * `solved` — list shows Done / Todo. `topic` — interview lists: optional ✓ for already-seen items (no category pill).
   */
  navBadge: "solved" | "topic";
  /** Optional link to a separate edit form (e.g. API-backed interview questions). */
  editFormHref?: string;
  editFormLabel?: string;
  /** OneNote-style local notebook instead of (or in addition to) the form link. */
  interviewNotebook?: boolean;
  /** Shown in the notebook header; optional link to the API interview-question form. */
  interviewEditFormHref?: string;
  /** Label for the same link when also shown in the page header (C# + notebook). */
  interviewEditFormLabel?: string;
  /** localStorage key for "My notes" in step 1 (Understand) — must differ if problem and interview id spaces could overlap. */
  understandNotesStorageKey: (id: number) => string;
  /**
   * When provided, Mental model edits are persisted to localStorage (used for interview questions
   * where `persistMentalToApi` is false so the server does not store personal notes).
   */
  mentalModelStorageKey?: (id: number) => string;
  /** Inline API editor for `InterviewQuestion` (same UX as "Edit coach content" on tasks). */
  showInterviewQuestionApiEditor?: boolean;
  /** After deleting a question in the API editor, navigate here (e.g. `/interview/csharp` or `/interview-questions`). */
  interviewDeleteRedirectPath?: string;
  /** Allow drag-and-drop reordering of interview questions in the sidebar (persists `sortOrder`). */
  canReorderInterviewQuestions?: boolean;
  /** Allow creating a new interview question from the sidebar (POST `/api/interview-questions` then navigate). */
  canCreateInterviewQuestion?: boolean;
  /** Default tag attached to questions created from the sidebar (e.g. `csharp-interview-tab`). */
  newQuestionDefaultTag?: string;
  /** Enable sidebar CRUD/reorder for coding tasks (`Problem`). */
  canManageProblemsFromSidebar?: boolean;
  /** Redirect after deleting current problem. */
  problemDeleteRedirectPath?: string;
  /**
   * When true, sidebar rows are not links until the user signs in (coding tasks /problems/* only).
   * Guest still sees the list; interview flows omit this.
   */
  sidebarNavRequiresAuth?: boolean;
};

const defaultProblemLayout: ProblemDetailsLayout = {
  navHref: (id) => `/problems/${id}`,
  sidebarTitle: "All Tasks by Pattern",
  navGroupBy: "pattern",
  pageSubtitle: "Learning-first flow: think first, code second. 🧸",
  showPracticeMode: true,
  showApiCoachEditor: true,
  persistMentalToApi: true,
  howToThinkStorageKey: (id) => `qaquest:coach:howToThinkNotes:${id}`,
  coachStep6: "code",
  navBadge: "solved",
  editFormHref: undefined,
  editFormLabel: undefined,
  interviewNotebook: false,
  interviewEditFormHref: undefined,
  interviewEditFormLabel: undefined,
  understandNotesStorageKey: (id) => `qaquest:coach:understandNotes:${id}`,
  mentalModelStorageKey: undefined,
  showInterviewQuestionApiEditor: false,
  interviewDeleteRedirectPath: undefined,
  canReorderInterviewQuestions: false,
  canCreateInterviewQuestion: false,
  newQuestionDefaultTag: undefined,
  canManageProblemsFromSidebar: false,
  problemDeleteRedirectPath: undefined,
  sidebarNavRequiresAuth: false
};

type LearnMode = "coach" | "practice";
type CoachMainTab = "guided" | "mental";
type GuidedStep = 1 | 2 | 3 | 4 | 5 | 6;

const modeLabels: Record<LearnMode, string> = {
  coach: "Coach mode",
  practice: "Practice mode"
};

const PROBLEM_DETAILS_NAV_WIDTH_KEY = "qaquest:ui:problemDetailsNavWidthPx";
const DEFAULT_NAV_WIDTH_PX = 208; // ~13rem
const MIN_NAV_WIDTH_PX = 180;
const MAX_NAV_WIDTH_PX = 560;

function clampNavWidthPx(n: number) {
  return Math.max(MIN_NAV_WIDTH_PX, Math.min(MAX_NAV_WIDTH_PX, Math.round(n)));
}

/**
 * Titles in seed/import data may contain legacy manual numbering like "23. ...".
 * UI numbering is derived from current sort order, so we remove legacy prefix before rendering.
 */
function stripLegacyOrdinalPrefix(title: string): string {
  const t = title.trim();
  if (!t) {
    return t;
  }
  return t.replace(/^\d+\.\s+/, "");
}

export function ProblemDetailsView({
  details,
  problems,
  layout: layoutPartial,
  seenIds
}: {
  details: ProblemTeachingDetails;
  problems: ProblemNavItem[];
  layout?: Partial<ProblemDetailsLayout>;
  /** Optional set of ids already visited — shows ✓ in the sidebar for interview question lists. */
  seenIds?: ReadonlySet<number>;
}) {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  /** Personal notes (localStorage) and notebook persist only for signed-in users (any OAuth profile, not only email). */
  const canPersistPersonal = sessionStatus === "authenticated" && session?.user != null;
  const layout = { ...defaultProblemLayout, ...layoutPartial };
  /** Problems catalog: list is static for guests; interview sidebars keep links (same page, list-only). */
  const problemSidebarNavDisabled = Boolean(layout.sidebarNavRequiresAuth) && !canPersistPersonal;
  const isInterviewSidebarCrud =
    layout.showInterviewQuestionApiEditor && Boolean(layout.interviewDeleteRedirectPath);
  const isProblemSidebarCrud = Boolean(layout.canManageProblemsFromSidebar);
  const canDeleteFromSidebar =
    canPersistPersonal && (isInterviewSidebarCrud || isProblemSidebarCrud);
  const canReorderSidebar =
    canPersistPersonal && (Boolean(layout.canReorderInterviewQuestions) || isProblemSidebarCrud);
  const canCreateSidebar =
    canPersistPersonal && (Boolean(layout.canCreateInterviewQuestion) || isProblemSidebarCrud);
  const [sidebarDeletingId, setSidebarDeletingId] = useState<number | null>(null);
  const [sidebarBusy, setSidebarBusy] = useState(false);
  const [navItems, setNavItems] = useState<ProblemNavItem[]>(problems);
  // Drag state: which id is being dragged + which group it belongs to (we only allow within-group drops for now).
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dragOverId, setDragOverId] = useState<number | null>(null);
  // Reset local state whenever the server list changes (e.g. after navigation between questions).
  useEffect(() => {
    setNavItems(problems);
  }, [problems]);
  const howToThinkNotesStorageKey = layout.howToThinkStorageKey(details.id);
  const understandNotesStorageKey = layout.understandNotesStorageKey(details.id);
  const [mode, setMode] = useState<LearnMode>("coach");
  const [coachRevealStep, setCoachRevealStep] = useState<GuidedStep>(1);
  const [understandDraft, setUnderstandDraft] = useState("");
  const [howToThinkMyNotes, setHowToThinkMyNotes] = useState("");
  const [showCoachEditor, setShowCoachEditor] = useState(false);
  const [showInterviewQuestionEditor, setShowInterviewQuestionEditor] = useState(false);
  const [coachMainTab, setCoachMainTab] = useState<CoachMainTab>("guided");
  /** C# interview: top notebook panel; hides question + video slot when on. */
  const [interviewNotebookOpen, setInterviewNotebookOpen] = useState(false);
  const [isXl, setIsXl] = useState(false);
  const [navWidthPx, setNavWidthPx] = useState(DEFAULT_NAV_WIDTH_PX);
  const [navResizeActive, setNavResizeActive] = useState(false);
  const navWidthRef = useRef(DEFAULT_NAV_WIDTH_PX);
  const navDragStartXRef = useRef(0);
  const navDragStartWRef = useRef(DEFAULT_NAV_WIDTH_PX);
  navWidthRef.current = navWidthPx;

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1280px)");
    const sync = () => setIsXl(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PROBLEM_DETAILS_NAV_WIDTH_KEY);
      if (raw) {
        const n = parseInt(raw, 10);
        if (Number.isFinite(n)) setNavWidthPx(clampNavWidthPx(n));
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!navResizeActive) return;
    const onMove = (e: PointerEvent) => {
      const dx = e.clientX - navDragStartXRef.current;
      setNavWidthPx(clampNavWidthPx(navDragStartWRef.current + dx));
    };
    const onUp = () => {
      setNavResizeActive(false);
      try {
        localStorage.setItem(PROBLEM_DETAILS_NAV_WIDTH_KEY, String(navWidthRef.current));
      } catch {
        // ignore
      }
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [navResizeActive]);

  useEffect(() => {
    if (!canPersistPersonal) {
      setUnderstandDraft("");
      return;
    }
    try {
      setUnderstandDraft(
        typeof window !== "undefined" ? localStorage.getItem(understandNotesStorageKey) ?? "" : ""
      );
    } catch {
      setUnderstandDraft("");
    }
  }, [details.id, understandNotesStorageKey, canPersistPersonal]);

  useEffect(() => {
    if (!canPersistPersonal) {
      setHowToThinkMyNotes("");
      return;
    }
    try {
      setHowToThinkMyNotes(
        typeof window !== "undefined" ? localStorage.getItem(howToThinkNotesStorageKey) ?? "" : ""
      );
    } catch {
      setHowToThinkMyNotes("");
    }
  }, [details.id, howToThinkNotesStorageKey, canPersistPersonal]);

  useEffect(() => {
    setCoachMainTab("guided");
    setInterviewNotebookOpen(false);
    setShowInterviewQuestionEditor(false);
  }, [details.id]);
  const groupedProblems = useMemo(() => {
    if (layout.navGroupBy === "none") {
      // Reorder mode keeps user-defined order (sortOrder); fall back to id when sortOrder is missing.
      const sorted = [...navItems].sort((a, b) => {
        if (canReorderSidebar) {
          const ax = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
          const bx = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
          if (ax !== bx) return ax - bx;
        }
        return a.id - b.id;
      });
      return [{ pattern: "", items: sorted }];
    }
    return groupProblemsByPattern(navItems, canReorderSidebar);
  }, [navItems, layout.navGroupBy, canReorderSidebar]);
  const ordinalById = useMemo(() => {
    const map = new Map<number, number>();
    let n = 1;
    for (const group of groupedProblems) {
      for (const item of group.items) {
        map.set(item.id, n++);
      }
    }
    return map;
  }, [groupedProblems]);
  const currentOrdinal = ordinalById.get(details.id);
  const displayDetailsTitle = `${currentOrdinal ?? 1}. ${stripLegacyOrdinalPrefix(details.title)}`;

  const coachMentalMode = mode === "coach" && coachMainTab === "mental";
  const isInterviewBlock = layout.coachStep6 === "interview-only";
  const canSeeCodeSection = coachRevealStep >= 6;
  const showMnemonicAside =
    mode === "coach" &&
    (coachMentalMode || (isInterviewBlock ? coachRevealStep >= 2 : coachRevealStep >= 3));
  const understandPrimaryTab = isInterviewBlock ? "question" : "statement";
  const understandPrimaryLabel = isInterviewBlock ? "Question" : "Statement";
  const interviewNotebookFocus =
    Boolean(layout.interviewNotebook) &&
    mode === "coach" &&
    interviewNotebookOpen &&
    coachMainTab === "guided";
  const codeText = normalizeMultiline(details.code);
  const testsText = normalizeMultiline(details.tests);
  const interviewText = normalizeMultiline(details.interviewEnglish);
  // Close any inline "API edit" panel when leaving Coach+Guided (Mental / My notebook fullscreen / Practice) — no "Hide" click needed.
  useEffect(() => {
    const leave = mode !== "coach" || coachMainTab === "mental" || interviewNotebookFocus;
    if (!leave) return;
    if (layout.showInterviewQuestionApiEditor) {
      setShowInterviewQuestionEditor(false);
    }
    if (layout.showApiCoachEditor) {
      setShowCoachEditor(false);
    }
  }, [mode, coachMainTab, interviewNotebookFocus, layout.showInterviewQuestionApiEditor, layout.showApiCoachEditor]);

  const onSidebarDeleteItem = async (id: number, title: string) => {
    if (!canDeleteFromSidebar) {
      return;
    }
    const redirectPath = isInterviewSidebarCrud
      ? layout.interviewDeleteRedirectPath
      : isProblemSidebarCrud
        ? layout.problemDeleteRedirectPath ?? "/problems"
        : undefined;
    if (!redirectPath) {
      return;
    }
    const line = title.trim().length > 0 ? `\n\n${title.trim().slice(0, 220)}${title.length > 220 ? "…" : ""}` : "";
    if (
      !window.confirm(
        `Delete this question? (id ${id})${line}\n\nThis cannot be undone.`
      )
    ) {
      return;
    }
    setSidebarDeletingId(id);
    try {
      if (isInterviewSidebarCrud) {
        await deleteInterviewQuestion(id);
      } else {
        await deleteProblem(id);
      }
      if (id === details.id) {
        router.push(redirectPath);
        return;
      }
      // Optimistic local removal; the next navigation will refetch fresh server data.
      setNavItems((items) => items.filter((i) => i.id !== id));
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setSidebarDeletingId(null);
    }
  };

  /**
   * Persist new ordering for the given group (by category/pattern).
   * Strategy: assign sortOrder = idx * 10 within the group only — keeps payload small and stable.
   * Step 10 leaves space for future inserts without forcing global renumbering.
   */
  const persistGroupOrder = async (groupItems: ProblemNavItem[]) => {
    const payload = groupItems.map((it, idx) => ({ id: it.id, sortOrder: idx * 10 }));
    setSidebarBusy(true);
    try {
      if (isInterviewSidebarCrud) {
        await reorderInterviewQuestions(payload);
      } else {
        await reorderProblems(payload);
      }
      // Reflect persisted sortOrder so a re-render keeps the same visual order.
      setNavItems((items) => {
        const map = new Map(payload.map((p) => [p.id, p.sortOrder]));
        return items.map((i) => (map.has(i.id) ? { ...i, sortOrder: map.get(i.id)! } : i));
      });
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Reorder failed");
      // Revert: re-pull from props.
      setNavItems(problems);
    } finally {
      setSidebarBusy(false);
    }
  };

  const onItemDragStart = (e: React.DragEvent<HTMLElement>, id: number) => {
    if (!canReorderSidebar) return;
    setDraggingId(id);
    e.dataTransfer.effectAllowed = "move";
    // Some browsers require setData to actually start a drag.
    try {
      e.dataTransfer.setData("text/plain", String(id));
    } catch {
      // ignore
    }
  };

  const onItemDragOver = (e: React.DragEvent<HTMLDivElement>, id: number) => {
    if (!canReorderSidebar || draggingId === null || draggingId === id) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverId !== id) setDragOverId(id);
  };

  const onItemDrop = async (
    e: React.DragEvent<HTMLDivElement>,
    targetId: number,
    groupItems: ProblemNavItem[]
  ) => {
    if (!canReorderSidebar || draggingId === null) return;
    e.preventDefault();
    const dragged = draggingId;
    setDraggingId(null);
    setDragOverId(null);
    if (dragged === targetId) return;

    const draggedIdx = groupItems.findIndex((i) => i.id === dragged);
    const targetIdx = groupItems.findIndex((i) => i.id === targetId);
    if (draggedIdx === -1 || targetIdx === -1) {
      // Cross-group drops are not supported in this iteration — keep order as-is and exit silently.
      return;
    }

    const reordered = [...groupItems];
    const [moved] = reordered.splice(draggedIdx, 1);
    reordered.splice(targetIdx, 0, moved);

    // Optimistic UI update: replace items of the same group inside navItems, preserve all others.
    const groupIds = new Set(groupItems.map((i) => i.id));
    setNavItems((all) => {
      const others = all.filter((i) => !groupIds.has(i.id));
      const next = [
        ...others,
        ...reordered.map((i, idx) => ({ ...i, sortOrder: idx * 10 }))
      ];
      return next;
    });

    await persistGroupOrder(reordered);
  };

  const onItemDragEnd = (_e?: React.DragEvent<HTMLElement>) => {
    setDraggingId(null);
    setDragOverId(null);
  };

  const onCreateNewItem = async (category?: string) => {
    if (!canCreateSidebar) return;
    const titleRaw = window.prompt(
      isProblemSidebarCrud ? "New task title:" : "New question title:",
      isProblemSidebarCrud ? "New task" : "New question"
    );
    if (titleRaw === null) return;
    const title = titleRaw.trim();
    if (title.length === 0) {
      window.alert("Title cannot be empty.");
      return;
    }
    setSidebarBusy(true);
    try {
      const created = isInterviewSidebarCrud
        ? await createInterviewQuestion({
            title,
            // Backend requires non-empty `questionText`; seed with the title so the row is valid and editable.
            questionText: title,
            category: category && category.length > 0 ? category : "General",
            difficulty: "Easy",
            tags: layout.newQuestionDefaultTag ? [layout.newQuestionDefaultTag] : [],
            // Place after the last item in the same category visually; backend will keep this until user reorders.
            sortOrder: 9999,
            isPublished: true,
            isActive: true
          })
        : await createProblem({
            title,
            slug: title,
            difficulty: "Easy",
            topic: category && category.length > 0 ? category : "General",
            problemStatement: title,
            sortOrder: 9999
          });
      // Navigate to the new question — page is `force-dynamic`, so list will include it after server refetch.
      router.push(layout.navHref(created.id));
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Create failed");
    } finally {
      setSidebarBusy(false);
    }
  };

  return (
    <div
      className={cn(
        "grid items-stretch gap-3",
        canPersistPersonal && isXl && "xl:gap-x-0 xl:gap-y-4",
        (!canPersistPersonal || !isXl) && "grid-cols-1",
        canPersistPersonal && interviewNotebookFocus && "overflow-x-hidden"
      )}
      style={
        canPersistPersonal && isXl
          ? {
              gridTemplateColumns:
                mode === "practice"
                  ? `${navWidthPx}px 4px minmax(0, 1fr)`
                  : interviewNotebookFocus
                    ? `${navWidthPx}px 4px minmax(0, 1fr)`
                    : `${navWidthPx}px 4px minmax(0, 1fr) minmax(0, 15rem)`
            }
          : undefined
      }
    >
      <Card
        className="h-[calc(100vh-7rem)] min-w-0 overflow-y-auto p-3 shadow-clay-sm"
        role="complementary"
        aria-label="All tasks by pattern"
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-primary">{layout.sidebarTitle}</p>
          {canCreateSidebar ? (
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-lg border border-emerald-200/80 bg-emerald-50/80 px-2 py-1 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100/80 disabled:opacity-50"
              onClick={() => void onCreateNewItem()}
              disabled={sidebarBusy}
              aria-label="Add new question"
              title="Add new question"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              <span>New</span>
            </button>
          ) : null}
        </div>
        <div className="space-y-4">
          {groupedProblems.map((group) => (
            <div key={group.pattern || "all"} className="space-y-2">
              {group.pattern ? (
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group.pattern}</p>
                  {canCreateSidebar ? (
                    <button
                      type="button"
                      className="inline-flex shrink-0 items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-emerald-700 transition hover:bg-emerald-100/70 disabled:opacity-50"
                      onClick={() => void onCreateNewItem(group.pattern)}
                      disabled={sidebarBusy}
                      aria-label={`Add question in ${group.pattern}`}
                      title="Add question to this category"
                    >
                      <Plus className="h-3 w-3" aria-hidden />
                      <span>Add</span>
                    </button>
                  ) : null}
                </div>
              ) : null}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isCurrent = item.id === details.id;
                  const isDragging = draggingId === item.id;
                  const isDragOver = canReorderSidebar && dragOverId === item.id && draggingId !== null && draggingId !== item.id;
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "group flex min-w-0 items-stretch gap-0.5 rounded-xl border text-sm transition",
                        isCurrent
                          ? "border-primary bg-primary/10 font-semibold text-primary"
                          : problemSidebarNavDisabled
                            ? "border-transparent bg-muted/60 text-foreground"
                            : "border-transparent bg-muted/60 text-foreground hover:bg-muted",
                        isDragging && "opacity-50",
                        isDragOver && "ring-2 ring-primary/60"
                      )}
                      onDragOver={(e) => onItemDragOver(e, item.id)}
                      onDrop={(e) => void onItemDrop(e, item.id, group.items)}
                      onDragLeave={() => {
                        if (dragOverId === item.id) setDragOverId(null);
                      }}
                    >
                      {canReorderSidebar ? (
                        <button
                          type="button"
                          draggable
                          onDragStart={(e) => onItemDragStart(e, item.id)}
                          onDragEnd={onItemDragEnd}
                          className="flex shrink-0 cursor-grab items-center self-stretch rounded-l-[10px] px-1 text-muted-foreground transition hover:bg-muted/70 active:cursor-grabbing"
                          aria-label="Drag to reorder"
                          title="Drag to reorder"
                          onClick={(e) => e.preventDefault()}
                        >
                          <GripVertical className="h-3.5 w-3.5" aria-hidden />
                        </button>
                      ) : null}
                      {problemSidebarNavDisabled ? (
                        <div
                          className="min-w-0 flex-1 px-3 py-2 outline-offset-2"
                          aria-current={isCurrent ? "page" : undefined}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="line-clamp-2">
                              {`${ordinalById.get(item.id) ?? 0}. ${stripLegacyOrdinalPrefix(item.title)}`}
                            </span>
                            {layout.navBadge === "topic" ? (
                              seenIds?.has(item.id) && item.id !== details.id ? (
                                <span className="shrink-0 text-xs font-semibold text-emerald-600" aria-label="Seen">
                                  ✓
                                </span>
                              ) : null
                            ) : (
                              <Badge variant={item.solved ? "secondary" : "default"}>
                                {item.solved ? "Done" : "Todo"}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ) : (
                        <Link
                          href={layout.navHref(item.id)}
                          className="min-w-0 flex-1 px-3 py-2 outline-offset-2 transition"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="line-clamp-2">
                              {`${ordinalById.get(item.id) ?? 0}. ${stripLegacyOrdinalPrefix(item.title)}`}
                            </span>
                            {layout.navBadge === "topic" ? (
                              seenIds?.has(item.id) && item.id !== details.id ? (
                                <span className="shrink-0 text-xs font-semibold text-emerald-600" aria-label="Seen">
                                  ✓
                                </span>
                              ) : null
                            ) : (
                              <Badge variant={item.solved ? "secondary" : "default"}>
                                {item.solved ? "Done" : "Todo"}
                              </Badge>
                            )}
                          </div>
                        </Link>
                      )}
                      {canDeleteFromSidebar ? (
                        <button
                          type="button"
                          className={cn(
                            "flex shrink-0 items-center self-stretch rounded-r-[10px] border border-transparent px-2 text-rose-800 transition-all hover:border-rose-200/80 hover:bg-rose-100/80",
                            sidebarDeletingId === item.id && "pointer-events-none opacity-60",
                            isCurrent
                              ? "opacity-100"
                              : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 max-sm:opacity-100"
                          )}
                          disabled={sidebarDeletingId === item.id}
                          aria-label="Delete question"
                          title="Delete question"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            void onSidebarDeleteItem(item.id, item.title);
                          }}
                        >
                          {sidebarDeletingId === item.id ? (
                            <span className="text-[10px]">…</span>
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" aria-hidden />
                          )}
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        {!canPersistPersonal ? (
          <p className="mt-4 border-t border-border/50 pt-3 text-xs leading-snug text-muted-foreground">
            <Link href="/login" className="font-semibold text-primary underline-offset-2 hover:underline">
              Sign in
            </Link>{" "}
            {problemSidebarNavDisabled
              ? "to switch between tasks, open the coach and practice, and use your notes."
              : "to use the coach, practice mode, and your notes."}
          </p>
        ) : null}
      </Card>

      {canPersistPersonal ? (
        <>
      <div
        className="hidden w-0 shrink-0 touch-none select-none xl:block xl:min-h-0 xl:w-full xl:cursor-col-resize xl:self-stretch"
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize navigation panel"
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          e.preventDefault();
          navDragStartXRef.current = e.clientX;
          navDragStartWRef.current = navWidthPx;
          setNavResizeActive(true);
        }}
        onPointerCancel={() => {
          setNavResizeActive(false);
          try {
            localStorage.setItem(PROBLEM_DETAILS_NAV_WIDTH_KEY, String(navWidthRef.current));
          } catch {
            // ignore
          }
        }}
      >
        <div
          className={cn(
            "mx-auto h-full min-h-[7rem] w-0.5 max-w-full rounded-full transition-colors",
            navResizeActive ? "bg-primary/50" : "bg-border/60 hover:bg-primary/30"
          )}
        />
      </div>

      <main
        className={cn(
          "min-w-0 min-h-0 w-full max-w-none space-y-4",
          mode === "practice" && "flex h-[calc(100vh-5.5rem)] min-h-0 flex-1 flex-col",
          interviewNotebookFocus &&
            "flex h-[calc(100dvh-3.5rem)] min-h-0 max-h-lvh flex-1 flex-col space-y-3 overflow-x-clip xl:h-[calc(100vh-7rem)]"
        )}
      >
        <Card className="shrink-0">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle className="text-3xl font-semibold leading-tight tracking-tight text-primary">
                  {displayDetailsTitle}
                </CardTitle>
                <p className="mt-1 text-sm font-medium text-muted-foreground">{layout.pageSubtitle}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {(["coach", "practice"] as LearnMode[]).map((m) => {
                  if (m === "practice" && !layout.showPracticeMode) {
                    return null;
                  }
                  return (
                    <Button
                      key={m}
                      variant={mode === m ? "default" : "secondary"}
                      onClick={() => {
                        if (m === "coach" && layout.interviewNotebook && interviewNotebookOpen) {
                          setInterviewNotebookOpen(false);
                          // Stay on coach + guided; switching tab is the next block when also leaving Mental model.
                          setCoachMainTab("guided");
                          return;
                        }
                        setMode(m);
                        if (m === "practice" && layout.interviewNotebook) {
                          setInterviewNotebookOpen(false);
                        }
                        if (m === "coach") {
                          setCoachRevealStep(1);
                          // "Coach mode" is the top-level learn mode; from Mental model tab, bring user back to Guided path.
                          setCoachMainTab("guided");
                        }
                      }}
                    >
                      {modeLabels[m]}
                    </Button>
                  );
                })}
                {layout.showApiCoachEditor ? (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setShowCoachEditor((v) => {
                        if (!v) {
                          setShowInterviewQuestionEditor(false);
                        }
                        return !v;
                      });
                    }}
                  >
                    {showCoachEditor ? "Hide coach editor" : "Edit coach content (API)"}
                  </Button>
                ) : null}
                {layout.showInterviewQuestionApiEditor && mode === "coach" ? (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setShowInterviewQuestionEditor((v) => {
                        if (!v) {
                          setShowCoachEditor(false);
                          setInterviewNotebookOpen(false);
                        }
                        return !v;
                      });
                    }}
                  >
                    {showInterviewQuestionEditor ? "Hide question editor" : "Edit question (API)"}
                  </Button>
                ) : null}
                {!layout.interviewNotebook && layout.editFormHref && !layout.showInterviewQuestionApiEditor ? (
                  <Button type="button" variant="secondary" asChild>
                    <Link href={layout.editFormHref}>
                      {layout.editFormLabel ?? "Edit in form"}
                    </Link>
                  </Button>
                ) : null}
                {layout.interviewNotebook &&
                layout.interviewEditFormHref &&
                mode === "coach" &&
                !layout.showInterviewQuestionApiEditor ? (
                  <Button type="button" variant="secondary" asChild>
                    <Link href={layout.interviewEditFormHref}>
                      {layout.interviewEditFormLabel ?? "Edit question (form)"}
                    </Link>
                  </Button>
                ) : null}
                {layout.interviewNotebook && mode === "coach" ? (
                  <Button
                    type="button"
                    variant={interviewNotebookOpen && coachMainTab === "guided" ? "default" : "secondary"}
                    onClick={() => {
                      if (coachMainTab !== "guided") {
                        setCoachMainTab("guided");
                        setInterviewNotebookOpen(true);
                        return;
                      }
                      setInterviewNotebookOpen((v) => !v);
                    }}
                  >
                    My notebook
                  </Button>
                ) : null}
                {isInterviewBlock && mode === "coach" ? (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      if (layout.interviewNotebook) {
                        setInterviewNotebookOpen(false);
                      }
                      setCoachMainTab((t) => (t === "guided" ? "mental" : "guided"));
                    }}
                  >
                    {coachMainTab === "guided" ? "Mental model" : "Guided path"}
                  </Button>
                ) : null}
              </div>
            </div>
          </CardHeader>
        </Card>

        {showCoachEditor ? (
          <CoachExplanationEditor details={details} onClose={() => setShowCoachEditor(false)} />
        ) : null}

        {showInterviewQuestionEditor &&
        layout.showInterviewQuestionApiEditor &&
        !interviewNotebookFocus ? (
          <InterviewQuestionCoachEditor
            questionId={details.id}
            onClose={() => setShowInterviewQuestionEditor(false)}
            afterDeletePath={layout.interviewDeleteRedirectPath ?? "/interview-questions"}
          />
        ) : null}

        {mode === "practice" ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <PracticeCodeWorkbench
              key={details.id}
              problemId={details.id}
              solutionTemplates={details.solutionTemplates}
              defaultTestsCode={testsText}
            />
          </div>
        ) : null}

        {mode === "coach" ? (
        <Tabs
          value={coachMainTab}
          onValueChange={(v) => {
            const t = v as CoachMainTab;
            setCoachMainTab(t);
            if (t === "mental" && layout.interviewNotebook) {
              setInterviewNotebookOpen(false);
            }
          }}
          className={cn(
            "w-full",
            interviewNotebookFocus && "flex min-h-0 flex-1 flex-col",
            isInterviewBlock && "mt-0"
          )}
        >
          {!isInterviewBlock ? (
            <TabsList
              className={cn("w-full justify-start sm:w-auto", interviewNotebookFocus && "shrink-0")}
            >
              <TabsTrigger value="guided">Guided path</TabsTrigger>
              <TabsTrigger value="mental">Mental model</TabsTrigger>
            </TabsList>
          ) : null}

        <TabsContent
          value="guided"
          className={cn(
            "space-y-4",
            interviewNotebookFocus && "mt-0 flex min-h-0 flex-1 flex-col"
          )}
        >
        {interviewNotebookFocus ? (
          <InterviewNotebookBlock
            questionId={details.id}
            structuredEditHref={layout.interviewEditFormHref}
            fillViewport
            hideHeader={mode === "coach"}
            persistToBrowserStorage={canPersistPersonal}
          />
        ) : null}
        {!interviewNotebookFocus && !isInterviewBlock ? (
        <Card>
          <CardHeader>
            <CardTitle>1. Understand the task</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs key={details.id} defaultValue={understandPrimaryTab} className="w-full">
              <TabsList className="w-full justify-start sm:w-auto">
                <TabsTrigger value={understandPrimaryTab}>{understandPrimaryLabel}</TabsTrigger>
                <TabsTrigger value="notes">My notes</TabsTrigger>
              </TabsList>
              <TabsContent value={understandPrimaryTab} className="mt-3">
                <div
                  className="min-h-[140px] whitespace-pre-wrap rounded-xl bg-[hsl(40,22%,91%)] p-3 text-sm leading-relaxed text-foreground shadow-clay-inset"
                  aria-label={isInterviewBlock ? "Interview question, read only" : "Problem statement, read only"}
                >
                  {details.statement}
                </div>
              </TabsContent>
              <TabsContent value="notes" className="mt-3">
                <p className="mb-2 text-xs text-muted-foreground">
                  {!canPersistPersonal
                    ? "Sign in to save notes in this browser. Public catalog only until then."
                    : isInterviewBlock
                      ? "Свой короткий пересказ или опорные фразы по-русски — только в этом браузере, на сервер не уходят."
                      : "Your paraphrase or anchors — this browser only, not sent to the server."}
                </p>
                <label htmlFor="understand-task" className="sr-only">
                  My notes for this task
                </label>
                <textarea
                  id="understand-task"
                  value={understandDraft}
                  onChange={(e) => {
                    const v = e.target.value;
                    setUnderstandDraft(v);
                    if (!canPersistPersonal) {
                      return;
                    }
                    try {
                      localStorage.setItem(understandNotesStorageKey, v);
                    } catch {
                      // ignore quota / private mode
                    }
                  }}
                  rows={6}
                  placeholder="Напиши по-русски: что спрашивают, твой ответ одной строкой, сомнения, связи с опытом…"
                  className="input-clay w-full min-h-[140px] resize-y px-3 py-2 text-sm leading-relaxed"
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        ) : null}

        {!interviewNotebookFocus ? (
        <>
        <Reveal visible={coachRevealStep >= 2}>
          <Card>
            <CardHeader>
              <CardTitle>
                {isInterviewBlock ? "2. Keywords" : "2. Keywords signals"}
              </CardTitle>
              {isInterviewBlock ? (
                <p className="mt-1.5 text-sm font-normal leading-relaxed text-muted-foreground">
                  Short English words to anchor this question and your answer (from tags and memory cue in the
                  form — a memorization set, not a full sentence).
                </p>
              ) : null}
            </CardHeader>
            <CardContent className="flex flex-col items-start gap-2">
              {details.wordingSignals.map((signal) => (
                <span
                  key={signal}
                  className="box-border inline-block w-fit max-w-full whitespace-normal rounded-lg bg-background px-2.5 py-1.5 text-left text-sm font-normal leading-snug text-orange-950/75 shadow-clay-sm"
                >
                  {signal}
                </span>
              ))}
            </CardContent>
          </Card>
        </Reveal>

        <Reveal visible={!isInterviewBlock && coachRevealStep >= 3}>
          <Card>
            <CardHeader><CardTitle>3. Choose the pattern</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Badge>{details.pattern}</Badge>
              <p>{details.whyThisPattern}</p>
            </CardContent>
          </Card>
        </Reveal>

        <Reveal visible={!isInterviewBlock && coachRevealStep >= 4}>
          <Card>
            <CardHeader>
              <CardTitle>4. How to think</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs key={`how-${details.id}`} defaultValue="steps" className="w-full">
                <TabsList className="w-full justify-start sm:w-auto">
                  <TabsTrigger value="steps">Coach</TabsTrigger>
                  <TabsTrigger value="notes">My notes</TabsTrigger>
                </TabsList>
                <TabsContent value="steps" className="mt-3">
                  <p className="mb-2 text-xs text-muted-foreground">Suggested flow from the training content (read only).</p>
                  <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed">
                    {details.howToThinkSteps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                </TabsContent>
                <TabsContent value="notes" className="mt-3">
                  <p className="mb-2 text-xs text-muted-foreground">
                    {!canPersistPersonal
                      ? "Sign in to save notes in this browser."
                      : "Your thoughts in Russian — kept in this browser only, not sent to the server."}
                  </p>
                  <label htmlFor="how-to-think-notes" className="sr-only">
                    How to think — my notes
                  </label>
                  <textarea
                    id="how-to-think-notes"
                    value={howToThinkMyNotes}
                    onChange={(e) => {
                      const v = e.target.value;
                      setHowToThinkMyNotes(v);
                      if (!canPersistPersonal) {
                        return;
                      }
                      try {
                        localStorage.setItem(howToThinkNotesStorageKey, v);
                      } catch {
                        // ignore quota / private mode
                      }
                    }}
                    rows={8}
                    placeholder="Свои идеи, как думать о задаче, сомнения, связь с прошлым опытом — по-русски, только у тебя в браузере."
                    className="input-clay w-full min-h-[160px] resize-y px-3 py-2 text-sm leading-relaxed"
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </Reveal>

        <Reveal visible={!isInterviewBlock && coachRevealStep >= 5}>
          <Card>
            <CardHeader>
              <CardTitle>5. Step-by-step algorithm</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal space-y-2 pl-5">
                {details.algorithmSteps.map((step) => <li key={step}>{step}</li>)}
              </ol>
            </CardContent>
          </Card>
        </Reveal>

        <Reveal visible={coachRevealStep >= 6}>
          {layout.coachStep6 === "interview-only" ? (
            <Card>
              <CardHeader>
                <CardTitle>3. Interview answer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="min-h-[140px] whitespace-pre-wrap rounded-xl bg-[hsl(40,22%,91%)] p-3 text-sm leading-relaxed text-foreground shadow-clay-inset">
                  {interviewText}
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground">{details.simpleRussian}</p>

                {details.commonMistakes.critical.length > 0 ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 shadow-clay-sm">
                    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700">Common trap</p>
                    <p className="text-sm leading-relaxed text-foreground/90">{details.commonMistakes.critical[0]}</p>
                  </div>
                ) : null}

                {details.algorithmSteps.length > 0 ? (
                  <div>
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Possible follow-up questions</p>
                    <ul className="space-y-1.5 pl-1">
                      {details.algorithmSteps.map((q) => (
                        <li key={q} className="flex items-start gap-2 text-sm leading-relaxed text-foreground/85">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/50" aria-hidden />
                          {q}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <Card className="!border-0 !ring-0 !bg-[#2B2B2B] !text-[#A9B7C6] !shadow-rider">
                <CardHeader>
                  <CardTitle className="text-[#A9B7C6]">6. Code + interview answer</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {canSeeCodeSection ? <StyledCodeBlock code={codeText} language="C#" theme="rider" /> : null}
                  <p className="rounded-2xl bg-[#242424] p-3 text-sm leading-7 text-[#A9B7C6] shadow-rider-inset">
                    {interviewText}
                  </p>
                  <p className="text-xs leading-relaxed text-[#7C8B96]">{details.simpleRussian}</p>
                </CardContent>
              </Card>
              <Card className="!border-0 !ring-0 !bg-[#2B2B2B] !text-[#A9B7C6] !shadow-rider">
                <CardHeader>
                  <CardTitle className="text-[#A9B7C6]">NUnit tests</CardTitle>
                </CardHeader>
                <CardContent>
                  <StyledCodeBlock code={testsText} language="C#" theme="rider" />
                </CardContent>
              </Card>
            </div>
          )}
        </Reveal>

        {coachRevealStep < 6 ? (
          <div className="flex justify-end">
            <Button onClick={() => setCoachRevealStep((s) => nextCoachStep(s, isInterviewBlock))}>
              Reveal Next Step
            </Button>
          </div>
        ) : null}

        {isInterviewBlock ? (
          <UserContentPanel itemType="interview-question" itemId={details.id} />
        ) : null}
        </>
        ) : null}
        </TabsContent>

        <TabsContent value="mental">
          <CoachMentalModelPanel
            details={details}
            persistToApi={layout.persistMentalToApi}
            localStorageKey={
              canPersistPersonal && layout.mentalModelStorageKey
                ? layout.mentalModelStorageKey(details.id)
                : undefined
            }
          />
        </TabsContent>
        </Tabs>
        ) : null}
      </main>

      {mode === "coach" && !interviewNotebookFocus ? (
      <aside className="sticky top-4 z-10 h-[calc(100vh-7rem)] min-h-0 min-w-0 self-start space-y-4 overflow-y-auto xl:top-6">
        <Reveal visible={showMnemonicAside}>
          <Card className="border-primary/40 bg-primary/10">
            <CardHeader><CardTitle>Mnemonic</CardTitle></CardHeader>
            <CardContent className="text-lg font-bold leading-8 text-foreground/95">{details.mnemonic}</CardContent>
          </Card>
        </Reveal>

      </aside>
      ) : null}
        </>
      ) : null}
    </div>
  );
}

// Interview: only question, keywords, answer — advance 2 -> 6 (skip 3–5).
function nextCoachStep(step: GuidedStep, isInterviewBlock: boolean): GuidedStep {
  if (step >= 6) return 6;
  if (isInterviewBlock) {
    if (step === 2) return 6;
    if (step >= 3 && step <= 5) return 6;
  }
  return (step + 1) as GuidedStep;
}

function groupProblemsByPattern(problems: ProblemNavItem[], useSortOrder = false) {
  const groups = new Map<string, ProblemNavItem[]>();
  for (const problem of problems) {
    const list = groups.get(problem.pattern) ?? [];
    list.push(problem);
    groups.set(problem.pattern, list);
  }

  if (useSortOrder) {
    for (const items of groups.values()) {
      items.sort((a, b) => {
        const ax = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
        const bx = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
        if (ax !== bx) return ax - bx;
        return a.id - b.id;
      });
    }
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => {
      if (a === b) return 0;
      return a > b ? 1 : -1;
    })
    .map(([pattern, items]) => ({ pattern, items }));
}

function Reveal({ visible, children }: { visible: boolean; children: React.ReactNode }) {
  if (!visible) return null;
  return <>{children}</>;
}

type CodeBlockTheme = "light" | "rider";

function StyledCodeBlock({ code, language, theme = "light" }: { code: string; language: string; theme?: CodeBlockTheme }) {
  const [copied, setCopied] = useState(false);
  const rider = theme === "rider";

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div
      className={cn(
        "overflow-hidden border-0",
        rider
          ? "rounded-2xl bg-[#2B2B2B] text-[#A9B7C6] shadow-rider"
          : "rounded-3xl bg-background text-foreground shadow-clay"
      )}
    >
      <div
        className={cn("flex items-center justify-between px-4 py-3", rider ? "bg-[#2B2B2B]" : "bg-background")}
      >
        <div
          className={cn(
            "flex items-center gap-2 font-semibold leading-none",
            rider ? "text-sm text-[#A9B7C6]" : "text-base text-foreground"
          )}
        >
          <Code2 className="h-5 w-5" />
          <span className="font-semibold tracking-tight">{language}</span>
        </div>
        <button
          type="button"
          onClick={copyCode}
          className={cn(
            "inline-flex h-9 w-9 items-center justify-center rounded-full transition",
            rider
              ? "text-[#A9B7C6] shadow-rider-sm hover:brightness-110 active:shadow-rider-inset"
              : "text-foreground shadow-clay-sm hover:brightness-105 active:shadow-clay-inset"
          )}
          aria-label="Copy code"
        >
          {copied ? <CopyCheck className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>

      <div
        className={cn(
          "mx-2 mb-2 rounded-xl font-mono text-[15px] leading-[1.75] lg:mb-3 lg:px-1 lg:text-base",
          rider
            ? "bg-[#232323] px-2 py-2 text-[#A9B7C6] shadow-rider-inset lg:px-3 lg:py-3"
            : "bg-[hsl(40,22%,91%)] px-2 py-2 text-foreground shadow-clay-inset lg:px-3 lg:py-3"
        )}
      >
        <pre className="m-0 whitespace-pre-wrap p-0">{renderHighlightedCode(code, theme)}</pre>
      </div>
    </div>
  );
}

function renderHighlightedCode(code: string, theme: CodeBlockTheme = "light") {
  const keyword = /\b(var|foreach|if|else|new|return|for|while|public|class|int|string|bool|void)\b/g;
  const str = /"[^"]*"/g;
  const rider = theme === "rider";
  const clsKw = rider ? "text-[#CC7832]" : "text-[#0f766e]";
  const clsStr = rider ? "text-[#6A8759]" : "text-[#3d8b44]";

  const lines = code.split("\n");
  return lines.map((line, i) => {
    const parts: React.ReactNode[] = [];
    let cursor = 0;

    const tokens: Array<{ start: number; end: number; type: "kw" | "str" }> = [];
    for (const m of line.matchAll(keyword)) {
      tokens.push({ start: m.index ?? 0, end: (m.index ?? 0) + m[0].length, type: "kw" });
    }
    for (const m of line.matchAll(str)) {
      tokens.push({ start: m.index ?? 0, end: (m.index ?? 0) + m[0].length, type: "str" });
    }
    tokens.sort((a, b) => a.start - b.start);

    for (const token of tokens) {
      if (token.start < cursor) continue;
      if (cursor < token.start) {
        parts.push(<span key={`t-${i}-${cursor}`}>{line.slice(cursor, token.start)}</span>);
      }
      const text = line.slice(token.start, token.end);
      parts.push(
        <span key={`tok-${i}-${token.start}`} className={token.type === "kw" ? clsKw : clsStr}>
          {text}
        </span>
      );
      cursor = token.end;
    }

    if (cursor < line.length) {
      parts.push(<span key={`tail-${i}`}>{line.slice(cursor)}</span>);
    }

    return (
      <span key={`line-${i}`} className="block">
        {parts}
      </span>
    );
  });
}
