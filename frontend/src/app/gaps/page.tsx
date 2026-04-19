import { PageTitle } from "@/components/layout/page-title";
import { GapMapView } from "@/components/gaps/gap-map-view";

export default function GapMapPage() {
  return (
    <div>
      <PageTitle title="Gap Map" subtitle="Target weak areas before your interview round." />
      <GapMapView />
    </div>
  );
}
