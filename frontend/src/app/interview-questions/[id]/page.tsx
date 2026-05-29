import { notFound } from "next/navigation";
import { InterviewQuestionCoachMount } from "@/components/interview-questions/interview-question-coach-mount";
import { getInterviewQuestionById, getInterviewQuestionsList } from "@/lib/api";
import {
  interviewListItemToNavItem,
  interviewQuestionToTeachingDetails
} from "@/lib/interview-question-to-teaching";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function InterviewQuestionCoachPage({ params }: PageProps) {
  const { id: raw } = await params;
  const id = Number.parseInt(raw, 10);
  if (Number.isNaN(id) || id < 1) {
    notFound();
  }

  const [q, list] = await Promise.all([
    getInterviewQuestionById(id).catch(() => null),
    getInterviewQuestionsList({ limit: 500 }).catch(() => [])
  ]);
  if (!q) {
    notFound();
  }

  const details = interviewQuestionToTeachingDetails(q);
  const problems = list.map((row) => interviewListItemToNavItem(row));

  return <InterviewQuestionCoachMount details={details} problems={problems} />;
}
