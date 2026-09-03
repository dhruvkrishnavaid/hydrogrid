import {
  IconAlertTriangle,
  IconCheck,
  IconCpu,
  IconHistory,
  IconLoader2,
  IconTool,
} from "@tabler/icons-react";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import type React from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { NoStationSelected } from "../components/NoStationSelected";
import { api } from "../lib/api-client";
import { useAuth } from "../lib/auth-context";
import type { DeviceRecord, SensorCalibrationRecord } from "../lib/types";

export const Route = createFileRoute("/devices")({
  component: DevicesPage,
});

function DevicesPage() {
  const {
    activeSiteId,
    isStationEntered,
    role,
    isLoading: isAuthLoading,
  } = useAuth();
  const [devices, setDevices] = useState<Array<DeviceRecord>>([]);
  const [calibrations, setCalibrations] = useState<
    Array<SensorCalibrationRecord>
  >([]);
  const [calSensor, setCalSensor] = useState<string>("ph");
  const [calOffset, setCalOffset] = useState<string>("0.00");
  const [isSubmittingCal, setIsSubmittingCal] = useState<boolean>(false);
  const [calMessage, setCalMessage] = useState<string | null>(null);
  const [isCalError, setIsCalError] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const canCalibrate = role === "ADMIN" || role === "OPERATOR";

  const loadData = useCallback(async () => {
    if (!activeSiteId || !isStationEntered) {
      if (!isAuthLoading) {
        setIsLoading(false);
      }
      return;
    }

    setIsLoading(true);
    try {
      const [devRes, calRes] = await Promise.all([
        api.getDashboardOverview(activeSiteId).then((o) => o.devices),
        api.getCalibrations(activeSiteId).then((c) => c.calibrations),
      ]);
      setDevices(devRes);
      setCalibrations(calRes);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [activeSiteId, isAuthLoading, isStationEntered]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (!isStationEntered || !activeSiteId) {
    return <NoStationSelected title="Hardware Diagnostics & Calibration" />;
  }

  const handleRecordCalibration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSiteId || !canCalibrate) return;
    setIsSubmittingCal(true);
    setCalMessage(null);
    setIsCalError(false);

    try {
      const offsetNum = Number.parseFloat(calOffset);
      await api.recordCalibration(activeSiteId, {
        sensor: calSensor,
        offset: Number.isNaN(offsetNum) ? 0 : offsetNum,
        status: "HEALTHY",
      });
      setCalMessage(
        "Calibration offset recorded successfully. Sensor drift cleared.",
      );
      setIsCalError(false);
      setCalOffset("0.00");
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Calibration failed";
      setCalMessage(msg);
      setIsCalError(true);
    } finally {
      setIsSubmittingCal(false);
    }
  };

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      {/* Title Bar */}
      <div className="border-border/80 flex flex-wrap items-center justify-between gap-3 border-b pb-3.5">
        <div>
          <h1 className="font-display text-foreground text-lg font-extrabold tracking-tight">
            Hardware Fleet Diagnostics & Sensor Calibration
          </h1>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Microcontroller telemetry fleet connectivity, probe health, and
            standard calibration adjustments
          </p>
        </div>
      </div>

      {isLoading && devices.length === 0 ? (
        <div className="text-muted-foreground flex h-56 items-center justify-center gap-2 text-xs">
          <IconLoader2 className="size-5 animate-spin text-[var(--brand-secondary)]" />
          <span>Querying hardware nodes and probe telemetry...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 1. Node Fleet Health Summary */}
          <Card className="shadow-2xs">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <IconCpu className="size-4 text-[var(--brand-secondary)]" />
                  <CardTitle className="text-foreground text-sm font-bold">
                    Node Fleet Health (
                    {devices.filter((d) => d.status === "ONLINE").length}/
                    {devices.length} Online)
                  </CardTitle>
                </div>
                <Badge variant="outline" className="text-xs font-semibold">
                  Heartbeat Telemetry
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[260px]">Device Node</TableHead>
                    <TableHead className="w-[200px]">
                      Architecture Type
                    </TableHead>
                    <TableHead className="w-[160px]">Operating State</TableHead>
                    <TableHead className="text-right">
                      Last Heartbeat Sync
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {devices.map((d) => (
                    <TableRow key={d.id} className="hover:bg-muted/30">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span
                            className={`size-2 rounded-full ${
                              d.status === "ONLINE"
                                ? "animate-pulse bg-emerald-500"
                                : "bg-red-500"
                            }`}
                          />
                          <span className="text-foreground font-bold">
                            {d.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">
                        {d.type}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            d.status === "ONLINE" ? "outline" : "destructive"
                          }
                          className={
                            d.status === "ONLINE"
                              ? "border-emerald-500/30 bg-emerald-500/10 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400"
                              : "text-[10px] font-semibold"
                          }
                        >
                          {d.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-right text-xs">
                        {new Date(d.updated_at).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* 2. Sensor Calibration Workspace */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Calibration Form */}
            <Card className="shadow-2xs">
              <CardHeader className="p-6 pb-3">
                <div className="flex items-center gap-2">
                  <IconTool className="size-4 text-[var(--brand-secondary)]" />
                  <CardTitle className="text-foreground text-sm font-bold">
                    Record Sensor Calibration Offset
                  </CardTitle>
                </div>
                <CardDescription className="text-xs">
                  Submit standardization buffer offset readings to clear
                  electrode drift and restore confidence ratings.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-6 pt-0">
                <form
                  onSubmit={handleRecordCalibration}
                  className="space-y-4 text-xs"
                >
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="sensor-select"
                      className="text-xs font-semibold"
                    >
                      Target Sensing Probe:
                    </Label>
                    <Select
                      value={calSensor}
                      onValueChange={(val) => val && setCalSensor(val)}
                    >
                      <SelectTrigger id="sensor-select" className="h-9 text-xs">
                        <SelectValue placeholder="Select Probe" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ph">
                          pH Probe (pH 7.00 Buffer Solution)
                        </SelectItem>
                        <SelectItem value="tds">
                          TDS Electrode (1413 µS/cm Standard)
                        </SelectItem>
                        <SelectItem value="turbidity">
                          Turbidity Nephelometer (20.0 NTU Standard)
                        </SelectItem>
                        <SelectItem value="heavyMetals">
                          Heavy Metals Sensor (0.10 ppm Reference)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="offset-input"
                      className="text-xs font-semibold"
                    >
                      Calibration Offset Adjustment (+/-):
                    </Label>
                    <Input
                      id="offset-input"
                      type="number"
                      step="0.01"
                      value={calOffset}
                      onChange={(e) => setCalOffset(e.target.value)}
                      className="telemetry-val h-9 text-xs font-bold"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={!canCalibrate || isSubmittingCal}
                    className="w-full gap-2 font-semibold"
                  >
                    {isSubmittingCal && (
                      <IconLoader2 className="size-4 animate-spin" />
                    )}
                    <span>
                      {isSubmittingCal
                        ? "Recording..."
                        : "Save Calibration & Clear Drift"}
                    </span>
                  </Button>

                  {!canCalibrate && (
                    <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                      🔒 Switch demo persona to OPERATOR or ADMIN to record
                      calibration offsets.
                    </p>
                  )}

                  {calMessage && (
                    <Alert
                      variant={isCalError ? "destructive" : "default"}
                      className={
                        !isCalError
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                          : ""
                      }
                    >
                      {isCalError ? (
                        <IconAlertTriangle className="size-4" />
                      ) : (
                        <IconCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
                      )}
                      <AlertDescription className="text-xs font-medium">
                        {calMessage}
                      </AlertDescription>
                    </Alert>
                  )}
                </form>
              </CardContent>
            </Card>

            {/* Calibration Audit Log */}
            <Card className="shadow-2xs">
              <CardHeader className="p-6 pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <IconHistory className="size-4 text-[var(--brand-secondary)]" />
                    <CardTitle className="text-foreground text-sm font-bold">
                      Calibration Audit Log
                    </CardTitle>
                  </div>
                  <Badge variant="outline" className="text-xs font-semibold">
                    {calibrations.length} Records
                  </Badge>
                </div>
                <CardDescription className="text-xs">
                  Historical log of probe zeroing and standard calibration
                  offsets.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-6 pt-0">
                {calibrations.length === 0 ? (
                  <div className="text-muted-foreground py-12 text-center text-xs">
                    No previous calibration records found.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {calibrations.map((c) => (
                      <div
                        key={c.id}
                        className="border-border/70 bg-muted/30 flex items-center justify-between rounded-xl border p-3 text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-foreground font-bold uppercase">
                              {c.sensor}
                            </span>
                            <span className="telemetry-val text-muted-foreground">
                              Offset: {c.offset > 0 ? `+${c.offset}` : c.offset}
                            </span>
                          </div>
                          <span className="text-muted-foreground text-[11px]">
                            Calibrated:{" "}
                            {new Date(c.calibrated_at).toLocaleDateString()}
                          </span>
                        </div>
                        <Badge
                          variant="default"
                          className="border-emerald-500/30 bg-emerald-500/15 text-[10px] text-emerald-800 dark:text-emerald-300"
                        >
                          {c.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </main>
  );
}
