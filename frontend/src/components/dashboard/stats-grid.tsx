import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type StatsGridItem = {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
};

export function StatsGrid({ items }: { items: StatsGridItem[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map(({ label, value, icon: Icon, color }) => (
        <Card key={label}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-sm text-muted-foreground">
              {label}
              <Icon className={`h-5 w-5 ${color}`} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-foreground/90">{value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
