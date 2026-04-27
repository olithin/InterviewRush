import { PageTitle } from "@/components/layout/page-title";
import { LearningMapView } from "@/components/gaps/learning-map-view";
import { getLearningMapTree } from "@/lib/api";

export default async function GapMapPage() {
  const tree = await getLearningMapTree();

  return (
    <div>
      <PageTitle
        title="Gap Map"
        subtitle="Learning map by topic and pattern. Each row shows how many tasks exist; open a task or use the links. Progress (seen / tried / passed) is stored in this browser."
      />
      <LearningMapView tree={tree} />
    </div>
  );
}
