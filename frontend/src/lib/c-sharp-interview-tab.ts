/**
 * Tag used on the legacy "C# Interview" routes — same as csharp track in `interview-language-tracks.ts`.
 */
import {
  INTERVIEW_LANGUAGE_TRACKS,
  hasInterviewTrackTag
} from "@/lib/interview-language-tracks";

export const C_SHARP_INTERVIEW_TAB_TAG = INTERVIEW_LANGUAGE_TRACKS.csharp.tabTag;

export function isCSharpInterviewTabQuestion(tags: ReadonlyArray<string> | null | undefined): boolean {
  return hasInterviewTrackTag(tags, INTERVIEW_LANGUAGE_TRACKS.csharp.tabTag);
}
