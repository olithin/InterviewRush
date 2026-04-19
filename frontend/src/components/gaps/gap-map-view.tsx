import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { patterns } from "@/data/mock-data";

export function GapMapView() {
  const weak = patterns.filter((p) => p.progress < 45);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {weak.map((item) => (
        <Card key={item.name} className="bg-white/90">
          <CardHeader>
            <CardTitle>{item.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Confidence: {item.progress}%</p>
            <div className="mt-3 h-2 rounded-full bg-muted">
              <div className="h-2 rounded-full bg-orange-400" style={{ width: `${item.progress}%` }} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
