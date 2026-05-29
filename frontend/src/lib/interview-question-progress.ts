/**
 * Per-browser progress tracking for interview questions.
 * Kept separate from `learning-map-progress.ts` (coding problems) to avoid numeric id collisions.
 */
const STORAGE_KEY = "qaquest.interviewProgress.v1";
const UPDATE_EVENT = "qaquest-interview-progress-update";

type Store = { seenIds: number[] };

function readStore(): Store {
  if (typeof window === "undefined") {
    return { seenIds: [] };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { seenIds: [] };
    const parsed = JSON.parse(raw) as Store;
    return Array.isArray(parsed?.seenIds) ? parsed : { seenIds: [] };
  } catch {
    return { seenIds: [] };
  }
}

function writeStore(s: Store) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
  } catch {
    // ignore quota / private mode
  }
}

export function recordInterviewQuestionSeen(id: number) {
  const s = readStore();
  if (!s.seenIds.includes(id)) {
    s.seenIds.push(id);
    writeStore(s);
  }
}

export function getSeenInterviewQuestionIds(): Set<number> {
  const s = readStore();
  return new Set(s.seenIds);
}

export { UPDATE_EVENT as INTERVIEW_PROGRESS_UPDATE_EVENT };
