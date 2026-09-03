import { Badge } from "@/components/ui/badge";

export default function Footer() {
  return (
    <footer className="border-border/70 bg-card/60 mt-auto border-t px-4 py-3.5 sm:px-6">
      <div className="text-muted-foreground mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-foreground font-bold">HydroGrid</span>
          <span>•</span>
          <span>Smart Water Purification & Quality Monitoring System</span>
        </div>
        <div className="flex items-center gap-2.5 text-xs">
          <span>React 19 & TanStack Start</span>
          <span>•</span>
          <span>PostgreSQL + InfluxDB Cloud Sync</span>
          <Badge
            variant="outline"
            className="gap-1.5 border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
          >
            <span className="size-1.5 rounded-full bg-emerald-500" />
            Autonomous Decision Nodes
          </Badge>
        </div>
      </div>
    </footer>
  );
}
