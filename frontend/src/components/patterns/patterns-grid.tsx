import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { patterns } from "@/data/mock-data";
import { Badge } from "@/components/ui/badge";

export function PatternsGrid() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {patterns.map((pattern) => (
        <Card key={pattern.name} className="bg-white/90">
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
  );
}
