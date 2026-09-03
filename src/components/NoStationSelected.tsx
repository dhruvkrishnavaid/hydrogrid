import { IconBuildingFactory2, IconChevronRight } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import type React from "react";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface NoStationSelectedProps {
  title?: string;
}

export const NoStationSelected: React.FC<NoStationSelectedProps> = ({
  title = "No Station Selected",
}) => {
  return (
    <main className="mx-auto max-w-7xl p-4 sm:p-6">
      <Card className="border-border/80 mx-auto max-w-md text-center shadow-md">
        <CardHeader className="pb-2">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-2xl bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] dark:bg-[var(--brand-secondary)]/20 dark:text-[var(--brand-secondary)]">
            <IconBuildingFactory2 className="size-6" />
          </div>
          <span className="text-[11px] font-bold tracking-wider text-[var(--brand-secondary)] uppercase">
            HydroGrid Operations Console
          </span>
          <CardTitle className="font-display text-foreground text-lg font-bold">
            {title}
          </CardTitle>
          <CardDescription className="text-muted-foreground text-xs leading-relaxed">
            Select an active municipal or regional water station to view
            real-time diagnostics, treatment stages, and safety gate telemetry.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <Link
            to="/"
            className={cn(
              buttonVariants({ variant: "default" }),
              "gap-1.5 font-semibold",
            )}
          >
            <span>Select Water Station</span>
            <IconChevronRight className="size-4" />
          </Link>
        </CardContent>
      </Card>
    </main>
  );
};
