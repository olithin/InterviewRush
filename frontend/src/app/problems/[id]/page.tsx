import { ProblemDetailsMount } from "@/components/problems/problem-details-mount";
import { getProblemTeachingDetails, getProblems } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function ProblemDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numericId = Number.parseInt(id, 10);
  const selectedId = Number.isNaN(numericId) ? 1 : numericId;
  const [details, problems] = await Promise.all([
    getProblemTeachingDetails(selectedId),
    getProblems()
  ]);

  return <ProblemDetailsMount details={details} problems={problems} />;
}
