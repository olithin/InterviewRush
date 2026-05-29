import { notFound } from "next/navigation";
import { getInterviewTrackBySegment, hasInterviewTrackTag } from "@/lib/interview-language-tracks";
import { getInterviewQuestionById, getInterviewQuestionsList } from "@/lib/api";
import {
  interviewListItemToNavItem,
  interviewQuestionToTeachingDetails
} from "@/lib/interview-question-to-teaching";
import { InterviewLanguageCoachMount } from "@/components/problems/interview-language-coach-mount";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ lang: string; id: string }> };

export default async function InterviewLanguageDetailPage({ params }: PageProps) {
  const { lang: rawLang, id: raw } = await params;
  const routeTrack = getInterviewTrackBySegment(rawLang);
  if (!routeTrack) {
    notFound();
  }
  const tabTag = routeTrack.tabTag;
  const trackId = routeTrack.id;

  const id = Number.parseInt(raw, 10);
  if (Number.isNaN(id) || id < 1) {
    notFound();
  }

  const [q, list] = await Promise.all([
    getInterviewQuestionById(id).catch(() => null),
    getInterviewQuestionsList({ tag: tabTag, limit: 500, sort: "order", dir: "asc" }).catch(() => [])
  ]);

  if (!q || !hasInterviewTrackTag(q.tags, tabTag)) {
    notFound();
  }

  const details = interviewQuestionToTeachingDetails(q);
  const problems = list.map((row) => interviewListItemToNavItem(row));

  return (
    <InterviewLanguageCoachMount track={trackId} details={details} problems={problems} />
  );
}
