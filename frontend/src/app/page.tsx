import { PageTitle } from "@/components/layout/page-title";
import { StatsGrid } from "@/components/dashboard/stats-grid";
import { WeakTopicsCard } from "@/components/dashboard/weak-topics-card";

export default function DashboardPage() {
  return (
    <div className="space-y-5">
      <PageTitle title="Dashboard" subtitle="Track your learning energy and focus your next quest." badge="MVP" />
      <StatsGrid />
      <WeakTopicsCard />
    </div>
  );
}
