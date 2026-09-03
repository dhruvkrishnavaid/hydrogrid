import { IconBuildingFactory2, IconLoader2 } from "@tabler/icons-react";
import type React from "react";

import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useAuth } from "../lib/auth-context";

export const SiteSelector: React.FC = () => {
  const { sites, activeSiteId, setActiveSiteId, isLoading, isAuthenticating } =
    useAuth();

  if (isLoading || isAuthenticating) {
    return (
      <Badge
        variant="outline"
        className="text-muted-foreground gap-1.5 px-2.5 py-1 text-xs"
      >
        <IconLoader2 className="size-3 animate-spin text-[var(--brand-secondary)]" />
        Syncing station...
      </Badge>
    );
  }

  if (sites.length === 0) {
    return (
      <Badge variant="outline" className="text-muted-foreground text-xs">
        No Stations Found
      </Badge>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Select
        value={activeSiteId ?? undefined}
        onValueChange={(val) => {
          if (val) setActiveSiteId(val);
        }}
      >
        <SelectTrigger
          size="sm"
          className="border-border/80 bg-background/80 hover:bg-muted/60 h-8 gap-2 border px-3 text-xs font-semibold shadow-xs"
        >
          <IconBuildingFactory2 className="size-3.5 text-[var(--brand-secondary)]" />
          <SelectValue placeholder="Select Station" />
        </SelectTrigger>
        <SelectContent align="start" className="min-w-[220px]">
          {sites.map((site) => (
            <SelectItem
              key={site.id}
              value={site.id}
              className="text-xs font-medium"
            >
              <div className="flex flex-col text-left">
                <span className="text-foreground font-semibold">
                  {site.name}
                </span>
                {site.location && (
                  <span className="text-muted-foreground text-[10px]">
                    {site.location}
                  </span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
