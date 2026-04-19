import { PageTitle } from "@/components/layout/page-title";
import { ProblemsTable } from "@/components/problems/problems-table";

export default function ProblemsPage() {
  return (
    <div>
      <PageTitle title="Problems List" subtitle="Pick a challenge and learn with guided structure." />
      <ProblemsTable />
    </div>
  );
}
