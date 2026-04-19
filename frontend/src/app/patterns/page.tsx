import { PageTitle } from "@/components/layout/page-title";
import { PatternsGrid } from "@/components/patterns/patterns-grid";

export default function PatternsPage() {
  return (
    <div>
      <PageTitle title="Patterns Map" subtitle="See which algorithm patterns are strong and which need practice." />
      <PatternsGrid />
    </div>
  );
}
