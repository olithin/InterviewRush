/**
 * Interview coach tracks: three language paths + one language-agnostic OOP track.
 * Each track uses a dedicated API tag on interview questions.
 */

export const INTERVIEW_LANGUAGE_TRACK_IDS = ["csharp", "java", "python", "oop"] as const;
export type InterviewLanguageTrackId = (typeof INTERVIEW_LANGUAGE_TRACK_IDS)[number];

export type InterviewLanguageTrackDef = {
  id: InterviewLanguageTrackId;
  /** API tag for list + coach filter (set in form or bulk import). */
  tabTag: string;
  /** URL segment after /interview/ */
  segment: string;
  shortLabel: string;
  sidebarTitle: string;
  emptyIndexTitle: string;
  emptyIndexHintTrackName: string;
  /** Hub card blurb */
  hubDescription: string;
};

export const INTERVIEW_LANGUAGE_TRACKS: Record<InterviewLanguageTrackId, InterviewLanguageTrackDef> = {
  csharp: {
    id: "csharp",
    tabTag: "csharp-interview-tab",
    segment: "csharp",
    shortLabel: "C#",
    sidebarTitle: "C# interview questions",
    emptyIndexTitle: "C# Interview",
    emptyIndexHintTrackName: "C# Interview",
    hubDescription: "Value types, async, collections — same coach flow as tasks, without the code practice panel."
  },
  java: {
    id: "java",
    tabTag: "java-interview-tab",
    segment: "java",
    shortLabel: "Java",
    sidebarTitle: "Java interview questions",
    emptyIndexTitle: "Java Interview",
    emptyIndexHintTrackName: "Java Interview",
    hubDescription: "JVM, concurrency, collections, frameworks — structured answers and mental model prompts."
  },
  python: {
    id: "python",
    tabTag: "python-interview-tab",
    segment: "python",
    shortLabel: "Python",
    sidebarTitle: "Python interview questions",
    emptyIndexTitle: "Python Interview",
    emptyIndexHintTrackName: "Python Interview",
    hubDescription: "Typing, idioms, data structures — learn and rehearse interview-style explanations."
  },
  oop: {
    id: "oop",
    tabTag: "oop-interview-tab",
    segment: "oop",
    shortLabel: "ООП · OOP",
    sidebarTitle: "OOP — language-agnostic",
    emptyIndexTitle: "OOP Interview",
    emptyIndexHintTrackName: "OOP",
    hubDescription:
      "Общие идеи объектно-ориентированного дизайна: принципы, контракты, композиция. Примеры на C#/Java/Python держи прямо в ответе каждого вопроса."
  }
};

export function isInterviewLanguageSegment(s: string): s is InterviewLanguageTrackId {
  return (INTERVIEW_LANGUAGE_TRACK_IDS as readonly string[]).includes(s);
}

export function getInterviewTrackBySegment(segment: string): InterviewLanguageTrackDef | undefined {
  if (!isInterviewLanguageSegment(segment)) return undefined;
  return INTERVIEW_LANGUAGE_TRACKS[segment];
}

/** Question belongs to this track if its tags include the track tab tag. */
export function hasInterviewTrackTag(tags: ReadonlyArray<string> | null | undefined, tabTag: string): boolean {
  if (!tags?.length) return false;
  return tags.some((t) => t === tabTag);
}
