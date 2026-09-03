import {
  IconAlertTriangle,
  IconCheck,
  IconHistory,
  IconLoader2,
} from "@tabler/icons-react";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { api } from "../lib/api-client";
import { useAuth } from "../lib/auth-context";
import type { AlertRecord, EventRecord } from "../lib/types";

export const Route = createFileRoute("/alerts")({
  component: AlertsPage,
});

function AlertsPage() {
  const { activeSiteId, role } = useAuth();
  const [alerts, setAlerts] = useState<Array<AlertRecord>>([]);
  const [events, setEvents] = useState<Array<EventRecord>>([]);
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);

  const canAcknowledge = role === "ADMIN" || role === "OPERATOR";

  const loadData = useCallback(async () => {
    const siteId = activeSiteId ?? "00000000-0000-0000-0000-000000000001";
    setIsLoading(true);
    try {
      const [alertRes, eventRes] = await Promise.all([
        api.getAlerts(siteId),
        api.getEvents(siteId),
      ]);
      setAlerts(alertRes.alerts);
      setEvents(eventRes.events);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [activeSiteId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAcknowledge = async (alertId: string) => {
    if (!activeSiteId || !canAcknowledge) return;
    setAcknowledgingId(alertId);
    try {
      await api.acknowledgeAlert(activeSiteId, alertId);
      loadData();
    } catch {
      // ignore
    } finally {
      setAcknowledgingId(null);
    }
  };

  const filteredAlerts = alerts.filter(
    (a) => severityFilter === "ALL" || a.severity === severityFilter,
  );
  const filteredEvents = events.filter(
    (e) => severityFilter === "ALL" || e.severity === severityFilter,
  );

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      {/* Title & Filter Bar */}
      <div className="border-border/80 flex flex-wrap items-center justify-between gap-3 border-b pb-3.5">
        <div>
          <h1 className="font-display text-foreground text-lg font-extrabold tracking-tight">
            Operational Incident Queue & Event Stream
          </h1>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Active plant alarms, Quality Gate lockout decisions, and automated
            state transition audit trail
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground text-xs font-semibold">
            Filter:
          </span>
          {["ALL", "CRITICAL", "WARNING", "INFO"].map((sev) => (
            <Button
              key={sev}
              variant={severityFilter === sev ? "default" : "outline"}
              size="xs"
              onClick={() => setSeverityFilter(sev)}
              className="h-7 px-2.5 text-xs font-semibold"
            >
              {sev}
            </Button>
          ))}
        </div>
      </div>

      {/* 1. Active Alarms Queue */}
      <Card className="shadow-2xs">
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IconAlertTriangle className="size-4 text-rose-600" />
              <CardTitle className="text-foreground text-sm font-bold">
                Active Alarms Queue ({filteredAlerts.length})
              </CardTitle>
            </div>
            <span className="text-muted-foreground text-xs">
              Acknowledge to record operator response
            </span>
          </div>
        </CardHeader>

        <CardContent className="p-4 pt-1">
          {isLoading && alerts.length === 0 ? (
            <div className="text-muted-foreground flex items-center justify-center gap-2 py-8 text-xs">
              <IconLoader2 className="size-4 animate-spin text-[var(--brand-secondary)]" />
              <span>Loading system alarms...</span>
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center text-xs">
              <IconCheck className="mx-auto mb-1.5 size-5 text-emerald-600" />
              <span>
                No active alarms matching the selected severity filter.
              </span>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAlerts.map((a) => (
                <Alert
                  key={a.id}
                  variant={
                    a.severity === "CRITICAL" ? "destructive" : "default"
                  }
                  className="p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            a.severity === "CRITICAL"
                              ? "destructive"
                              : "secondary"
                          }
                          className="text-[10px] font-bold uppercase"
                        >
                          {a.severity}
                        </Badge>
                        <span className="text-foreground text-xs font-bold">
                          {a.type}
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          {a.status}
                        </Badge>
                      </div>

                      <AlertDescription className="text-foreground text-xs font-medium">
                        {a.message}
                      </AlertDescription>

                      <span className="text-muted-foreground text-[11px]">
                        Triggered: {new Date(a.created_at).toLocaleString()}
                      </span>
                    </div>

                    {a.status === "UNREAD" && (
                      <Button
                        size="xs"
                        variant="outline"
                        disabled={!canAcknowledge || acknowledgingId === a.id}
                        onClick={() => handleAcknowledge(a.id)}
                        className="shrink-0 text-xs font-bold"
                      >
                        {acknowledgingId === a.id ? "Saving..." : "Acknowledge"}
                      </Button>
                    )}
                  </div>
                </Alert>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. Operational Event Audit Log */}
      <Card className="shadow-2xs">
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IconHistory className="size-4 text-[var(--brand-secondary)]" />
              <CardTitle className="text-foreground text-sm font-bold">
                Operational Event Audit Log ({filteredEvents.length})
              </CardTitle>
            </div>
            <Badge variant="outline" className="text-xs font-semibold">
              Autonomous Event Stream
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filteredEvents.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center text-xs">
              No events found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Timestamp</TableHead>
                  <TableHead className="w-[130px]">Severity</TableHead>
                  <TableHead className="w-[220px]">Classification</TableHead>
                  <TableHead>Operational Message</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvents.map((e) => (
                  <TableRow key={e.id} className="hover:bg-muted/30">
                    <TableCell className="text-muted-foreground text-xs font-medium">
                      {new Date(e.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          e.severity === "CRITICAL" ? "destructive" : "outline"
                        }
                        className={
                          e.severity === "INFO"
                            ? "border-emerald-500/30 bg-emerald-500/10 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400"
                            : e.severity === "WARNING"
                              ? "border-amber-500/30 bg-amber-500/10 text-[10px] font-semibold text-amber-600 dark:text-amber-400"
                              : "text-[10px] font-semibold"
                        }
                      >
                        <span
                          className={`mr-1.5 size-1.5 rounded-full ${
                            e.severity === "CRITICAL"
                              ? "bg-red-500"
                              : e.severity === "WARNING"
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                          }`}
                        />
                        {e.severity}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-foreground text-xs font-bold">
                      {e.type}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs leading-relaxed">
                      {e.message}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
