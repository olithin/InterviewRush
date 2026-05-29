import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export type PatternProgress = {
  name: string;
  status: "Mastered" | "Strong" | "Learning" | "Weak";
  progress: number;
};

export type PatternGuide = {
  name: string;
  definition: string;
  whenToUse: string;
  wordingSignals: string[];
  mnemonic: string;
  decisionRule: string;
};

export function PatternsGrid({
  progress,
  guides,
  helper
}: {
  progress: PatternProgress[];
  guides: PatternGuide[];
  helper: string[];
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {progress.map((pattern) => (
          <Card key={pattern.name}>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>{pattern.name}</CardTitle>
              <Badge variant={pattern.status === "Weak" ? "accent" : "default"}>{pattern.status}</Badge>
            </CardHeader>
            <CardContent>
              <div className="h-3 rounded-full bg-muted">
                <div className="h-3 rounded-full bg-primary" style={{ width: `${pattern.progress}%` }} />
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{pattern.progress}% confidence</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {guides.map((guide) => (
          <Card key={guide.name} className="bg-card/95">
            <CardHeader>
              <CardTitle>{guide.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>
                <strong>Definition:</strong> {guide.definition}
              </p>
              <p>
                <strong>When to use:</strong> {guide.whenToUse}
              </p>
              <p>
                <strong>Mnemonic:</strong> {guide.mnemonic}
              </p>
              <p>
                <strong>Mini decision rule:</strong> {guide.decisionRule}
              </p>
              <div className="flex flex-wrap gap-2">
                {guide.wordingSignals.map((signal) => (
                  <Badge key={signal} variant="secondary">
                    {signal}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pattern Choice Helper</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-2 pl-5">
            {helper.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
