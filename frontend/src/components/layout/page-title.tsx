import { Badge } from "@/components/ui/badge";

export function PageTitle({ title, subtitle, badge }: { title: string; subtitle: string; badge?: string }) {
  return (
    <div className="mb-5 flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <h2 className="text-2xl font-black md:text-3xl">{title}</h2>
        {badge ? <Badge variant="accent">{badge}</Badge> : null}
      </div>
      <p className="text-sm text-muted-foreground md:text-base">{subtitle}</p>
    </div>
  );
}
