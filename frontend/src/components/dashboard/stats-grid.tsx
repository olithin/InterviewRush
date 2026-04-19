import { Sparkles, Flame, Star, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { dashboardStats } from "@/data/mock-data";

const items = [
  { label: "XP", value: dashboardStats.xp, icon: Sparkles, color: "text-violet-500" },
  { label: "Streak", value: `${dashboardStats.streak} days`, icon: Flame, color: "text-orange-500" },
  { label: "Level", value: dashboardStats.level, icon: Star, color: "text-sky-500" },
  { label: "Completed", value: dashboardStats.completedTasks, icon: CheckCircle2, color: "text-emerald-500" }
];

export function StatsGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map(({ label, value, icon: Icon, color }) => (
        <Card key={label} className="bg-white/90">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-sm text-muted-foreground">
              {label}
              <Icon className={`h-5 w-5 ${color}`} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black">{value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
