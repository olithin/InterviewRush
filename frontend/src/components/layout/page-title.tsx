import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";

export function PageTitle({ title, subtitle, badge }: { title: string; subtitle: ReactNode; badge?: string }) {
  return (
    <div className="mb-5 flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <h2 className="text-2xl font-semibold leading-tight tracking-tight text-foreground/90 md:text-3xl">{title}</h2>
        {badge ? <Badge variant="accent">{badge}</Badge> : null}
      </div>
      <div className="text-sm text-muted-foreground md:text-base">{subtitle}</div>
    </div>
  );
}
