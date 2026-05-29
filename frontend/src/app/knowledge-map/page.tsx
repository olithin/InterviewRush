import Link from "next/link";
import { PageTitle } from "@/components/layout/page-title";
import { KnowledgeMapClient } from "@/components/knowledge-map/knowledge-map-client";
import { Button } from "@/components/ui/button";
import { getInterviewQuestionsList, getKnowledgeMapTree } from "@/lib/api";
import type { KnowledgeMapTree } from "@/lib/knowledge-map-types";

const DEFAULT_MAP_KEY = "default";

function first(v: string | string[] | undefined): string | undefined {
  if (v == null) {
    return undefined;
  }

  return Array.isArray(v) ? v[0] : v;
}

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function loadTreeSafe(mapKey: string): Promise<KnowledgeMapTree> {
  try {
    return await getKnowledgeMapTree(mapKey);
  } catch {
    return { mapKey, roots: [] };
  }
}

export default async function KnowledgeMapPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const mapKey = (first(sp.key) ?? DEFAULT_MAP_KEY).trim().toLowerCase() || DEFAULT_MAP_KEY;

  const [tree, questions] = await Promise.all([
    loadTreeSafe(mapKey),
    getInterviewQuestionsList({ limit: 1000 }).catch(() => [])
  ]);

  return (
    <div>
      <PageTitle
        title="Knowledge map"
        subtitle="Tip: use “Seed C# 2026 starter” then “Link demo Q&A (leaves)” to get the sample tree with interview questions on each leaf. You can also link any leaf manually in the right panel."
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <Button variant="secondary" asChild>
          <Link href="/interview-questions">All questions</Link>
        </Button>
        <Button variant="secondary" asChild>
          <Link href="/interview-questions/new">New question</Link>
        </Button>
      </div>

      <KnowledgeMapClient mapKey={mapKey} initialTree={tree} questions={questions} />
    </div>
  );
}
