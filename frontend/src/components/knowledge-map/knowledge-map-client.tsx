"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Crosshair, Download, Maximize2, Minimize2, Minus, Plus } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CustomNodeElementProps, RawNodeDatum, TreeNodeDatum } from "react-d3-tree";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  createKnowledgeMapNode,
  deleteKnowledgeMapNode,
  getInterviewQuestionsList,
  getKnowledgeMapTree,
  moveKnowledgeMapNode,
  seedKnowledgeMapCsharp2026,
  seedKnowledgeMapDemoQuestions,
  updateKnowledgeMapNode
} from "@/lib/api";
import type { InterviewQuestionListItem } from "@/lib/interview-question-types";
import type { KnowledgeMapNode, KnowledgeMapTree } from "@/lib/knowledge-map-types";
import {
  getSeenInterviewQuestionIds,
  INTERVIEW_PROGRESS_UPDATE_EVENT
} from "@/lib/interview-question-progress";
import { cn } from "@/lib/utils";

// Tree relies on browser-only d3 internals; load it client-side only.
const Tree = dynamic(() => import("react-d3-tree").then((m) => m.Tree), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      Loading map…
    </div>
  )
});

const field =
  "input-clay w-full rounded-xl border border-border/60 bg-white px-3 py-2 text-sm text-foreground shadow-clay-sm";

type Props = {
  mapKey: string;
  initialTree: KnowledgeMapTree;
  questions: InterviewQuestionListItem[];
};

type FlatNode = {
  id: number;
  parentId: number | null;
  title: string;
  description: string;
  interviewQuestionId: number | null;
  sortOrder: number;
  depth: number;
};

type DraftFields = {
  title: string;
  description: string;
  interviewQuestionId: number | null;
};

function flattenTree(roots: KnowledgeMapNode[]): FlatNode[] {
  const out: FlatNode[] = [];
  const walk = (n: KnowledgeMapNode, depth: number) => {
    out.push({
      id: n.id,
      parentId: n.parentId,
      title: n.title,
      description: n.description,
      interviewQuestionId: n.interviewQuestionId,
      sortOrder: n.sortOrder,
      depth
    });
    n.children.forEach((c) => walk(c, depth + 1));
  };
  roots.forEach((r) => walk(r, 0));
  return out;
}

function findNode(roots: KnowledgeMapNode[], id: number): KnowledgeMapNode | null {
  for (const root of roots) {
    if (root.id === id) {
      return root;
    }

    const sub = findNode(root.children, id);
    if (sub) {
      return sub;
    }
  }

  return null;
}

function findParentId(roots: KnowledgeMapNode[], id: number): number | null {
  const parents = new Map<number, number | null>();
  const walk = (n: KnowledgeMapNode) => {
    for (const c of n.children) {
      parents.set(c.id, n.id);
      walk(c);
    }
  };
  roots.forEach((r) => {
    parents.set(r.id, null);
    walk(r);
  });
  return parents.get(id) ?? null;
}

function getDescendantIds(roots: KnowledgeMapNode[], id: number): Set<number> {
  const node = findNode(roots, id);
  const ids = new Set<number>();
  if (!node) {
    return ids;
  }

  const walk = (n: KnowledgeMapNode) => {
    ids.add(n.id);
    n.children.forEach(walk);
  };
  walk(node);
  return ids;
}

function buildD3Data(roots: KnowledgeMapNode[]): RawNodeDatum {
  const toNode = (n: KnowledgeMapNode, depth: number): RawNodeDatum => ({
    name: n.title || "(no title)",
    attributes: {
      id: n.id,
      interviewQuestionId: n.interviewQuestionId ?? 0,
      isLeaf: n.children.length === 0,
      hasLink: n.interviewQuestionId != null,
      description: n.description ?? "",
      depth
    },
    children: n.children.map((c) => toNode(c, depth + 1))
  });

  if (roots.length === 0) {
    return { name: "(empty)", children: [] };
  }

  if (roots.length === 1) {
    return toNode(roots[0], 0);
  }

  // Multiple roots are not allowed by API, but be defensive.
  return { name: "Knowledge maps", children: roots.map((r) => toNode(r, 0)) };
}

export function KnowledgeMapClient({ mapKey, initialTree, questions }: Props) {
  const { data: session, status: sessionStatus } = useSession();
  const canTrackSeen = sessionStatus === "authenticated" && session?.user != null;
  const [tree, setTree] = useState<KnowledgeMapTree>(initialTree);
  const [questionOptions, setQuestionOptions] = useState(questions);
  const [selectedId, setSelectedId] = useState<number | null>(initialTree.roots[0]?.id ?? null);
  const [draft, setDraft] = useState<DraftFields>({ title: "", description: "", interviewQuestionId: null });
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapStageRef = useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  /** Remount + zoom, Notebook-style zoom bar (d3 state resets on remount). */
  const [mapView, setMapView] = useState({ zoom: 0.72, n: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [seenIds, setSeenIds] = useState<Set<number>>(() => new Set());

  const flat = useMemo(() => flattenTree(tree.roots), [tree.roots]);
  const selected = selectedId == null ? null : flat.find((n) => n.id === selectedId) ?? null;

  useEffect(() => {
    if (!selected) {
      setDraft({ title: "", description: "", interviewQuestionId: null });
      return;
    }

    setDraft({
      title: selected.title,
      description: selected.description,
      interviewQuestionId: selected.interviewQuestionId
    });
  }, [selected?.id, selected?.title, selected?.description, selected?.interviewQuestionId]);

  useEffect(() => {
    setQuestionOptions(questions);
  }, [questions]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      return;
    }

    const update = () => {
      const rect = el.getBoundingClientRect();
      setDimensions({ width: Math.max(320, rect.width), height: Math.max(360, rect.height) });
    };
    update();

    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // Sync seen interview question ids so the map shows ✓ on visited nodes (signed-in only).
  useEffect(() => {
    if (!canTrackSeen) {
      setSeenIds(new Set());
      return;
    }
    setSeenIds(getSeenInterviewQuestionIds());
    const refresh = () => setSeenIds(getSeenInterviewQuestionIds());
    window.addEventListener(INTERVIEW_PROGRESS_UPDATE_EVENT, refresh);
    return () => window.removeEventListener(INTERVIEW_PROGRESS_UPDATE_EVENT, refresh);
  }, [canTrackSeen]);

  const refresh = async (keepSelected: number | null = selectedId) => {
    const [next, qs] = await Promise.all([
      getKnowledgeMapTree(mapKey),
      getInterviewQuestionsList({ limit: 1000 }).catch(() => questionOptions)
    ]);
    setTree(next);
    setQuestionOptions(qs);
    if (keepSelected != null && findNode(next.roots, keepSelected)) {
      setSelectedId(keepSelected);
    } else {
      setSelectedId(next.roots[0]?.id ?? null);
    }
  };

  const runWith = async (action: () => Promise<unknown>, okMsg?: string) => {
    setWorking(true);
    setError(null);
    setInfo(null);
    try {
      await action();
      if (okMsg) {
        setInfo(okMsg);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setWorking(false);
    }
  };

  const createRoot = () =>
    runWith(async () => {
      await createKnowledgeMapNode({ mapKey, parentId: null, title: "Root topic" });
      await refresh();
    }, "Root created.");

  const seedStarter = () =>
    runWith(async () => {
      const result = await seedKnowledgeMapCsharp2026(mapKey);
      await refresh();
      setInfo(`Seeded ${result.created} nodes (${result.rootTitle}). Then use “Link demo Q&A (leaves)” to attach coach questions.`);
    });

  const linkDemo = () =>
    runWith(async () => {
      const r = await seedKnowledgeMapDemoQuestions(mapKey);
      await refresh();
      setInfo(
        `Demo: +${r.interviewQuestionsCreated} new questions, ${r.nodesLinked} leaves linked, ${r.nodesSkipped} skipped (see API message if map was empty).`
      );
    });

  const addChild = () =>
    runWith(async () => {
      if (selected == null) {
        return;
      }

      const created = await createKnowledgeMapNode({
        mapKey,
        parentId: selected.id,
        title: "New topic"
      });
      await refresh(created.id);
    }, "Child added.");

  const saveSelected = () =>
    runWith(async () => {
      if (selected == null) {
        return;
      }

      const title = draft.title.trim();
      if (!title) {
        throw new Error("Title is required.");
      }

      await updateKnowledgeMapNode(selected.id, {
        title,
        description: draft.description.trim(),
        interviewQuestionId: draft.interviewQuestionId,
        sortOrder: selected.sortOrder
      });
      await refresh(selected.id);
    }, "Saved.");

  const moveSibling = (delta: -1 | 1) =>
    runWith(async () => {
      if (selected == null) {
        return;
      }

      const parentId = findParentId(tree.roots, selected.id);
      const siblingsContainer = parentId == null
        ? tree.roots
        : findNode(tree.roots, parentId)?.children ?? [];
      const idx = siblingsContainer.findIndex((s) => s.id === selected.id);
      if (idx < 0) {
        return;
      }

      const target = idx + delta;
      if (target < 0 || target >= siblingsContainer.length) {
        return;
      }

      await moveKnowledgeMapNode(selected.id, { parentId, position: target });
      await refresh(selected.id);
    });

  const reparent = (newParentId: number | null) =>
    runWith(async () => {
      if (selected == null) {
        return;
      }

      if (newParentId === selected.id) {
        throw new Error("A node cannot be its own parent.");
      }

      await moveKnowledgeMapNode(selected.id, { parentId: newParentId, position: null });
      await refresh(selected.id);
    }, "Moved.");

  const removeSelected = () =>
    runWith(async () => {
      if (selected == null) {
        return;
      }

      const confirmed = window.confirm(
        "Delete this node and ALL its descendants? This cannot be undone."
      );
      if (!confirmed) {
        return;
      }

      await deleteKnowledgeMapNode(selected.id);
      await refresh(null);
    }, "Deleted.");

  const reparentOptions = useMemo(() => {
    if (selected == null) {
      return flat;
    }

    const blocked = getDescendantIds(tree.roots, selected.id);
    return flat.filter((n) => !blocked.has(n.id));
  }, [flat, tree.roots, selected?.id]);

  const treeData = useMemo(() => buildD3Data(tree.roots), [tree.roots]);

  const treeTranslate = useMemo(() => {
    if (!dimensions) {
      return { x: 120, y: 340 };
    }
    return { x: Math.max(72, dimensions.width * 0.1), y: dimensions.height * 0.5 };
  }, [dimensions, mapView.n]);

  const mapTitle = tree.roots[0]?.title ?? "Knowledge map";
  const sourceHint =
    tree.roots.length > 0
      ? `(${flat.length} ${flat.length === 1 ? "node" : "nodes"} · mind map view)`
      : "No topics yet.";

  const downloadMapJson = () => {
    const payload = { mapKey, exportedAt: new Date().toISOString(), roots: tree.roots };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `knowledge-map-${mapKey}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const toggleMapFullscreen = () => {
    const el = mapStageRef.current;
    if (!el) {
      return;
    }
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void el.requestFullscreen();
    }
  };

  const zoomBy = (factor: number) => {
    setMapView((v) => ({
      zoom: Math.max(0.25, Math.min(1.85, v.zoom * factor)),
      n: v.n + 1
    }));
  };

  const resetMapView = () => {
    setMapView((v) => ({ zoom: 0.72, n: v.n + 1 }));
  };

  const renderNode = (props: CustomNodeElementProps) => (
    <CustomNode
      {...props}
      selectedId={selectedId}
      onSelect={(id) => setSelectedId(id)}
      seenIds={seenIds}
    />
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <Card className="overflow-hidden border-slate-200/90 bg-slate-50/80 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-slate-200/70 bg-white/80">
          <div>
            <CardTitle className="text-base font-medium text-slate-800">Knowledge map</CardTitle>
            <p className="mt-0.5 text-xs text-slate-500">
              Map id <span className="font-mono text-slate-600">{mapKey}</span> — Notebook-style canvas
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {tree.roots.length === 0 ? (
              <>
                <Button type="button" onClick={seedStarter} disabled={working}>
                  Seed C# 2026 starter
                </Button>
                <Button type="button" variant="secondary" onClick={createRoot} disabled={working}>
                  Create empty root
                </Button>
              </>
            ) : (
              <>
                <Button type="button" variant="secondary" onClick={addChild} disabled={working || selected == null}>
                  Add child
                </Button>
                <Button type="button" variant="secondary" onClick={linkDemo} disabled={working}>
                  Link demo Q&amp;A (leaves)
                </Button>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div
            ref={mapStageRef}
            className="flex flex-col overflow-hidden rounded-b-[1.1rem] border-t-0 border-slate-200/60 bg-[#eceff1]"
          >
            {tree.roots.length > 0 ? (
              <div className="flex items-center justify-between gap-2 border-b border-slate-200/50 bg-white/85 px-3 py-2 backdrop-blur-sm">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold leading-tight text-slate-800">{mapTitle}</h3>
                  <p className="text-xs text-slate-500">{sourceHint}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={toggleMapFullscreen}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200/90 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50"
                    title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                    aria-label="Toggle fullscreen"
                  >
                    {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={downloadMapJson}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200/90 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50"
                    title="Download map JSON"
                    aria-label="Download"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : null}

            <div className="relative h-[min(70vh,680px)] min-h-[360px] w-full">
              {tree.roots.length > 0 ? (
                <div
                  className="absolute left-2 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-1 rounded-full border border-slate-200/90 bg-white/95 py-1.5 pl-1.5 pr-1.5 shadow-md"
                  aria-label="Map zoom"
                >
                  <button
                    type="button"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100"
                    onClick={() => zoomBy(1.12)}
                    aria-label="Zoom in"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100"
                    onClick={() => zoomBy(1 / 1.12)}
                    aria-label="Zoom out"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100"
                    onClick={resetMapView}
                    title="Recenter (reset zoom)"
                    aria-label="Recenter"
                  >
                    <Crosshair className="h-4 w-4" />
                  </button>
                </div>
              ) : null}

              <div ref={containerRef} className="h-full w-full min-h-0 pl-12 pr-0">
                {tree.roots.length === 0 ? (
                  <div className="flex h-full min-h-[360px] items-center justify-center px-4 text-center text-sm text-slate-500">
                    Empty map. Use the buttons above to seed the C# 2026 tree or create a root.
                  </div>
                ) : dimensions ? (
                  <Tree
                    key={`km-tree-${mapView.n}`}
                    data={treeData}
                    dataKey={`data-${mapKey}-${treeData.name}`}
                    orientation="horizontal"
                    pathFunc="diagonal"
                    collapsible
                    zoomable
                    zoom={mapView.zoom}
                    scaleExtent={{ min: 0.2, max: 2.2 }}
                    draggable
                    hasInteractiveNodes
                    separation={{ siblings: 1.05, nonSiblings: 1.18 }}
                    nodeSize={{ x: 300, y: 88 }}
                    translate={treeTranslate}
                    renderCustomNodeElement={renderNode}
                    dimensions={dimensions}
                    pathClassFunc={() => "km-mindmap-link"}
                    svgClassName="!bg-transparent"
                  />
                ) : null}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Node editor</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {info ? <p className="text-sm font-medium text-emerald-800">{info}</p> : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          {selected == null ? (
            <p className="text-sm text-muted-foreground">
              Select a node in the map to edit it. Add children with the "Add child" button above.
            </p>
          ) : (
            <>
              <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                Title
                <input
                  className={field}
                  value={draft.title}
                  onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                />
              </label>

              <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                Description
                <textarea
                  className={cn(field, "min-h-[80px] resize-y")}
                  value={draft.description}
                  onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                />
              </label>

              <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                Linked interview question (leaf shortcut)
                <select
                  className={field}
                  value={draft.interviewQuestionId ?? 0}
                  onChange={(e) => {
                    const id = Number.parseInt(e.target.value, 10);
                    setDraft((d) => ({ ...d, interviewQuestionId: Number.isFinite(id) && id > 0 ? id : null }));
                  }}
                >
                  <option value={0}>— not linked —</option>
                  {questionOptions.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.title} ({q.category})
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={saveSelected} disabled={working}>
                  Save
                </Button>
                {draft.interviewQuestionId ? (
                  <Button type="button" variant="secondary" asChild>
                    <Link href={`/interview-questions/${draft.interviewQuestionId}`}>Open coach</Link>
                  </Button>
                ) : null}
              </div>

              <div className="rounded-xl border border-border/60 bg-white/70 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Position
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" onClick={() => moveSibling(-1)} disabled={working}>
                    Move up
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => moveSibling(1)} disabled={working}>
                    Move down
                  </Button>
                </div>
                <label className="mt-3 flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                  Reparent (move under)
                  <select
                    className={field}
                    value={findParentId(tree.roots, selected.id) ?? 0}
                    onChange={(e) => {
                      const id = Number.parseInt(e.target.value, 10);
                      reparent(Number.isFinite(id) && id > 0 ? id : null);
                    }}
                    disabled={working}
                  >
                    <option value={0}>— root (no parent) —</option>
                    {reparentOptions
                      .filter((n) => n.id !== selected.id)
                      .map((n) => (
                        <option key={n.id} value={n.id}>
                          {"— ".repeat(n.depth)}
                          {n.title || "(no title)"}
                        </option>
                      ))}
                  </select>
                </label>
              </div>

              <div className="rounded-xl border border-destructive/30 bg-rose-50/60 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-destructive">
                  Danger zone
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  className="border-destructive/40 text-destructive"
                  onClick={removeSelected}
                  disabled={working}
                >
                  Delete subtree
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

type CustomNodeProps = CustomNodeElementProps & {
  selectedId: number | null;
  onSelect: (id: number) => void;
  seenIds: Set<number>;
};

function nodeIdOf(datum: TreeNodeDatum): number | null {
  const v = datum.attributes?.id;
  return typeof v === "number" ? v : null;
}

function nodeDepthOf(datum: TreeNodeDatum): number {
  const d = datum.attributes?.depth;
  return typeof d === "number" ? d : 0;
}

/** NotebookLM-like pastel by depth: root / branch / sub-branch / leaves */
function nodePillClass(depth: number, isSelected: boolean, linked: boolean, isLeaf: boolean): string {
  const base = "box-border min-h-0 flex-1 border shadow-sm transition";
  const byDepth =
    depth === 0
      ? "bg-[#e8e4f3] text-[#3d3a5c] border-[#c9b8e8]"
      : depth === 1
        ? "bg-[#e3f2fd] text-[#0d47a1] border-[#90caf9]"
        : depth === 2
          ? "bg-[#e0f2f1] text-[#004d40] border-[#4dd0e1]"
          : "bg-[#e8f5e9] text-[#1b5e20] border-[#a5d6a7]";

  const ring = isSelected ? "z-10 ring-2 ring-[#5c6bc0] ring-offset-1 ring-offset-[#eceff1]" : "";
  const linkRing = !isSelected && linked ? "ring-1 ring-[#7cb342]/40" : "";
  // Leaf nodes without a linked question get a dashed border to signal "not yet connected".
  const dashed = isLeaf && !linked && !isSelected ? "border-dashed opacity-80" : "";
  return cn(base, byDepth, ring, linkRing, dashed, "hover:brightness-[0.99]");
}

function CustomNode({ nodeDatum, toggleNode, selectedId, onSelect, seenIds }: CustomNodeProps) {
  const id = nodeIdOf(nodeDatum);
  const depth = nodeDepthOf(nodeDatum);
  const linked = Boolean(nodeDatum.attributes?.hasLink);
  const isLeaf = Boolean(nodeDatum.attributes?.isLeaf);
  const isSelected = id != null && id === selectedId;

  const interviewQuestionId =
    typeof nodeDatum.attributes?.interviewQuestionId === "number" &&
    nodeDatum.attributes.interviewQuestionId > 0
      ? (nodeDatum.attributes.interviewQuestionId as number)
      : null;

  const isSeen = interviewQuestionId != null && seenIds.has(interviewQuestionId);
  const rawDesc = typeof nodeDatum.attributes?.description === "string"
    ? (nodeDatum.attributes.description as string).trim()
    : "";
  // Subtitle: prefer node description, fall back to role label.
  const subtitle = rawDesc
    ? rawDesc.slice(0, 52) + (rawDesc.length > 52 ? "…" : "")
    : linked
      ? "Linked"
      : depth === 0
        ? "Guide"
        : "Topic";

  const w = 270;
  const h = 68;

  return (
    <g>
      <foreignObject x={-w / 2} y={-h / 2} width={w} height={h}>
        <div
          className={cn(
            "flex h-full w-full items-center justify-between gap-1.5 rounded-full border px-3 py-2.5 text-left",
            "font-sans text-[13px] leading-snug",
            nodePillClass(depth, isSelected, linked, isLeaf)
          )}
          onClick={(e) => {
            e.stopPropagation();
            if (id != null) {
              onSelect(id);
            }
          }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            toggleNode();
          }}
        >
          <div className="min-w-0 flex-1">
            <div
              className={cn(
                "line-clamp-2 font-medium",
                depth === 0 ? "text-sm" : "text-[12.5px]"
              )}
            >
              {nodeDatum.name}
            </div>
            <div className="mt-0.5 flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide opacity-75">
              {isSeen ? <span className="font-bold text-emerald-600" style={{ textTransform: "none" }}>✓</span> : null}
              <span className="truncate">{subtitle}</span>
            </div>
          </div>

          {/* Action icons: open coach (→) and collapse/expand (›/⌄) */}
          <div className="flex shrink-0 flex-col items-center gap-0.5">
            {interviewQuestionId ? (
              <a
                href={`/interview-questions/${interviewQuestionId}`}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-400/25 bg-white/60 text-[12px] font-bold text-slate-600 hover:bg-white/90"
                title="Open coach page"
                aria-label="Open coach page"
              >
                →
              </a>
            ) : null}
            {nodeDatum.children && nodeDatum.children.length > 0 ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleNode();
                }}
                className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-400/25 bg-white/50 text-[12px] font-semibold text-slate-600 hover:bg-white/80"
                aria-label="Toggle children"
              >
                {nodeDatum.__rd3t.collapsed ? "›" : "⌄"}
              </button>
            ) : null}
          </div>
        </div>
      </foreignObject>
    </g>
  );
}
