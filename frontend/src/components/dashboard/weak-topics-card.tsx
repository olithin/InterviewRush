import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function WeakTopicsCard({ topics }: { topics: string[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          Weak Topics
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2" style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        {topics.map((topic) => (
          <Badge key={topic} variant="secondary">
            {topic}
          </Badge>
        ))}
      </CardContent>
    </Card>
  );
}
