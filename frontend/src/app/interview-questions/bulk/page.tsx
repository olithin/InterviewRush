import Link from "next/link";
import { PageTitle } from "@/components/layout/page-title";
import { BulkInterviewQuestionsClient } from "@/components/interview-questions/bulk-interview-questions-client";
import { Button } from "@/components/ui/button";

export default function BulkInterviewQuestionsPage() {
  return (
    <div>
      <PageTitle
        title="Bulk add interview questions"
        subtitle="Paste blocks separated by ---, use Title: and Question: lines, or a JSON array. Preview and import."
      />
      <div className="mb-4">
        <Button variant="secondary" asChild>
          <Link href="/interview-questions">Back to list</Link>
        </Button>
      </div>
      <BulkInterviewQuestionsClient />
    </div>
  );
}
