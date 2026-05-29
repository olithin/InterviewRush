"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

export function Tabs({ className, ...props }: React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root className={cn("w-full", className)} {...props} />;
}

export function TabsList({ className, ...props }: React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn(
        "inline-flex h-12 min-h-12 items-center rounded-full border border-white/30 bg-card/80 p-1.5 shadow-clay-inset",
        className
      )}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "inline-flex h-9 min-h-9 items-center justify-center rounded-full px-4 text-sm font-semibold text-muted-foreground transition-all data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-clay",
        className
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={cn("mt-4", className)} {...props} />;
}
