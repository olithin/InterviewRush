import { PageTitle } from "@/components/layout/page-title";
import { PatternDrillBoard } from "@/components/drill/pattern-drill-board";
import { getPatternDrillSources } from "@/lib/api";
import { buildPatternDrillCards } from "@/lib/pattern-drill";

export const dynamic = "force-dynamic";

export default async function PatternDrillPage() {
  const sources = await getPatternDrillSources();
  const cards = buildPatternDrillCards(sources);

  return (
    <div className="space-y-4">
      <PageTitle
        title="Pattern Drill"
        subtitle="Fast pattern recognition first. Explain later, code after."
        badge="Speed Round"
      />
      <PatternDrillBoard cards={cards} />
    </div>
  );
}
