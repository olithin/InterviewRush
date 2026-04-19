"use client";

import { motion } from "framer-motion";
import { PageTitle } from "@/components/layout/page-title";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { problemDetails } from "@/data/mock-data";

export function ProblemDetailsView() {
  return (
    <div>
      <PageTitle title={problemDetails.title} subtitle="Master the pattern, then explain it confidently." badge="Mock Mode" />

      <Tabs defaultValue="learn">
        <TabsList>
          <TabsTrigger value="learn">Learn</TabsTrigger>
          <TabsTrigger value="practice">Practice</TabsTrigger>
          <TabsTrigger value="interview">Interview</TabsTrigger>
        </TabsList>

        <TabsContent value="learn" className="space-y-4">
          <Card className="bg-white/90">
            <CardHeader><CardTitle>Problem Statement</CardTitle></CardHeader>
            <CardContent>{problemDetails.statement}</CardContent>
          </Card>
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="bg-white/90"><CardHeader><CardTitle>Pattern</CardTitle></CardHeader><CardContent><Badge>{problemDetails.pattern}</Badge></CardContent></Card>
            <Card className="bg-white/90"><CardHeader><CardTitle>Wording Signals</CardTitle></CardHeader><CardContent>{problemDetails.wordingSignals}</CardContent></Card>
          </div>
          <Card className="bg-white/90">
            <CardHeader><CardTitle>How to Think</CardTitle></CardHeader>
            <CardContent>{problemDetails.howToThink}</CardContent>
          </Card>
          <Card className="bg-white/90">
            <CardHeader><CardTitle>Step-by-Step Algorithm</CardTitle></CardHeader>
            <CardContent>
              <ol className="list-decimal space-y-2 pl-5">
                {problemDetails.algorithmSteps.map((step) => <li key={step}>{step}</li>)}
              </ol>
            </CardContent>
          </Card>
          <Card className="bg-white/90">
            <CardHeader><CardTitle>Common Mistakes</CardTitle></CardHeader>
            <CardContent>
              <ul className="list-disc space-y-2 pl-5">
                {problemDetails.mistakes.map((m) => <li key={m}>{m}</li>)}
              </ul>
            </CardContent>
          </Card>
          <div className="grid gap-4 md:grid-cols-2">
            <CodeCard title="Clean C# Code" content={problemDetails.code} />
            <CodeCard title="NUnit Tests" content={problemDetails.tests} />
          </div>
        </TabsContent>

        <TabsContent value="practice">
          <Card className="bg-white/90">
            <CardHeader><CardTitle>Practice Arena</CardTitle></CardHeader>
            <CardContent>Timer, hints, and checker will be connected after API integration.</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="interview">
          <Card className="bg-white/90">
            <CardHeader><CardTitle>Interview Simulation</CardTitle></CardHeader>
            <CardContent>Use this mode to verbally explain complexity, trade-offs, and edge cases.</CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CodeCard({ title, content }: { title: string; content: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <Card className="h-full bg-slate-950 text-slate-100">
        <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
        <CardContent>
          <pre className="overflow-x-auto whitespace-pre-wrap text-xs leading-6">{content}</pre>
        </CardContent>
      </Card>
    </motion.div>
  );
}
