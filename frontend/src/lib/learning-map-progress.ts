/**
 * Per-browser learning map progress. Replace with user-backed storage when auth exists.
 */
const STORAGE_KEY = "qaquest.learningMap.v1";

export type LearningProblemProgress = "unseen" | "seen" | "attempted" | "passed" | "solid";

type Entry = { status: LearningProblemProgress; openCount: number; passedOnce: boolean };

type Store = { byProblem: Record<string, Entry> };

function readStore(): Store {
  if (typeof window === "undefined") {
    return { byProblem: {} };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { byProblem: {} };
    }
    const p = JSON.parse(raw) as Store;
    return p?.byProblem ? p : { byProblem: {} };
  } catch {
    return { byProblem: {} };
  }
}

function writeStore(s: Store) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    window.dispatchEvent(new CustomEvent("qaquest-learning-map-update"));
  } catch {
    // ignore
  }
}

const rank: Record<LearningProblemProgress, number> = {
  unseen: 0,
  seen: 1,
  attempted: 2,
  passed: 3,
  solid: 4
};

function maxStatus(a: LearningProblemProgress, b: LearningProblemProgress): LearningProblemProgress {
  return rank[a] >= rank[b] ? a : b;
}

export function getProgressForProblem(problemId: number): LearningProblemProgress {
  const s = readStore();
  return s.byProblem[String(problemId)]?.status ?? "unseen";
}

export function getProgressMap(): Record<number, LearningProblemProgress> {
  const s = readStore();
  const out: Record<number, LearningProblemProgress> = {};
  for (const [id, v] of Object.entries(s.byProblem)) {
    const n = Number(id);
    if (Number.isFinite(n)) {
      out[n] = v.status;
    }
  }
  return out;
}

export function recordProblemOpened(problemId: number) {
  const s = readStore();
  const k = String(problemId);
  const e = s.byProblem[k] ?? { status: "unseen" as const, openCount: 0, passedOnce: false };
  e.openCount += 1;
  e.status = maxStatus(e.status, "seen");
  if (e.passedOnce && e.openCount >= 2) {
    e.status = "solid";
  }
  s.byProblem[k] = e;
  writeStore(s);
}

export function recordProblemRunFinished(problemId: number, passed: boolean) {
  const s = readStore();
  const k = String(problemId);
  const e = s.byProblem[k] ?? { status: "unseen" as const, openCount: 0, passedOnce: false };
  if (passed) {
    e.passedOnce = true;
    e.status = maxStatus(e.status, "passed");
  } else {
    e.status = maxStatus(e.status, "attempted");
  }
  s.byProblem[k] = e;
  writeStore(s);
}
