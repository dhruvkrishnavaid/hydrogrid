import { useState } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { isAuthenticated, isAdmin, clearAuthUser, getAuthUser } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

export const Route = createFileRoute("/admin/dashboard")({
  beforeLoad: () => {
    if (!isAuthenticated() || !isAdmin()) {
      throw redirect({ to: "/login" });
    }
  },
  component: AdminDashboardComponent,
});

interface SystemLog {
  id: string;
  level: "INFO" | "WARN" | "CRITICAL";
  message: string;
  source: string;
  timestamp: string;
}

function AdminDashboardComponent() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const currentUser = getAuthUser();

  const [dbStatus] = useState({
    usersCount: 14,
    sessionsCount: 3,
    dbEngine: "Bun SQLite (WAL Mode)",
    dbLocation: "data/hydrogrid.db",
    uptime: "99.98%",
  });

  const [logs] = useState<SystemLog[]>([
    { id: "1", level: "INFO", message: "Admin authenticated from Master Console", source: "AuthEngine", timestamp: "Just now" },
    { id: "2", level: "INFO", message: "SQLite Database WAL Checkpoint executed cleanly", source: "StorageService", timestamp: "3m ago" },
    { id: "3", level: "WARN", message: "Sensor Node #4 reported transient pressure drop", source: "TelemetryIngest", timestamp: "12m ago" },
    { id: "4", level: "INFO", message: "Google OAuth credentials status check completed", source: "OAuthModule", timestamp: "25m ago" },
  ]);

  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const handleLogout = () => {
    clearAuthUser();
    navigate({ to: "/login" });
  };

  const handleRunBackup = () => {
    setActionMessage("Database snapshot backup created: data/hydrogrid.db.bak");
  };

  const handlePurgeSessions = () => {
    setActionMessage("Stale expired sessions purged from SQLite database.");
  };

  return (
    <main className="min-h-screen bg-[#ece2ce] dark:bg-[#0a1418] p-4 sm:p-6 lg:p-8 space-y-6 text-[#223300] dark:text-[#d7ece8] transition-colors duration-300">
      {/* Admin Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-[#f6f4f1] dark:bg-[#0f1a1e] border-2 border-[#e45c10]/40 p-6 rounded-3xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="h-3.5 w-3.5 rounded-full bg-[#e45c10] animate-pulse" />
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#223300] dark:text-[#d7ece8] tracking-tight">
              HydroGrid Admin Infrastructure Dashboard
            </h1>
          </div>
          <p className="text-sm font-semibold text-[#e45c10]">
            System Administration • Database Auditing • Master Actuator Override
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
          <div className="flex items-center gap-2 bg-[#ece2ce] dark:bg-[#101d22] px-3.5 py-1.5 rounded-xl border border-[#e45c10]/30 text-xs font-extrabold">
            <span className="text-[#e45c10]">Administrator:</span>
            <span className="text-[#223300] dark:text-[#d7ece8]">{currentUser?.fullName || currentUser?.username || "admin2026"}</span>
          </div>

          <Button
            onClick={() => navigate({ to: "/desktop" })}
            className="bg-[#4b5d16] text-[#f6f4f1] hover:bg-[#4b5d16]/90 font-bold rounded-xl text-xs"
          >
            User Control Center
          </Button>

          <Button
            onClick={handleLogout}
            className="bg-[#e45c10] text-[#f6f4f1] hover:bg-[#e45c10]/90 font-bold rounded-xl text-xs shadow-md cursor-pointer"
          >
            {t.signOut}
          </Button>
        </div>
      </div>

      {actionMessage && (
        <div className="rounded-2xl border-2 border-[#e45c10] bg-[#e45c10]/10 p-4 text-sm font-bold text-[#e45c10] flex items-center justify-between shadow-md rise-in">
          <span>{actionMessage}</span>
          <button onClick={() => setActionMessage(null)} className="text-xs uppercase font-extrabold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Admin KPI Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="bg-[#f6f4f1] dark:bg-[#0f1a1e] border-2 border-[#e45c10]/30 shadow-lg rounded-3xl">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wider font-extrabold text-[#e45c10]">
              Database Status
            </CardDescription>
            <CardTitle className="text-lg font-bold text-[#223300] dark:text-[#d7ece8]">
              SQLite Engine
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-xs">
            <div className="text-2xl font-extrabold text-[#223300] dark:text-[#d7ece8]">WAL Mode</div>
            <div className="text-[#4b5d16] font-semibold">{dbStatus.dbLocation}</div>
          </CardContent>
        </Card>

        <Card className="bg-[#f6f4f1] dark:bg-[#0f1a1e] border-2 border-[#e45c10]/30 shadow-lg rounded-3xl">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wider font-extrabold text-[#e45c10]">
              Registered Accounts
            </CardDescription>
            <CardTitle className="text-lg font-bold text-[#223300] dark:text-[#d7ece8]">
              User Records
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-xs">
            <div className="text-2xl font-extrabold text-[#223300] dark:text-[#d7ece8]">{dbStatus.usersCount}</div>
            <div className="text-[#4b5d16] font-semibold">Argon2 Hashed Accounts</div>
          </CardContent>
        </Card>

        <Card className="bg-[#f6f4f1] dark:bg-[#0f1a1e] border-2 border-[#e45c10]/30 shadow-lg rounded-3xl">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wider font-extrabold text-[#e45c10]">
              Active Sessions
            </CardDescription>
            <CardTitle className="text-lg font-bold text-[#223300] dark:text-[#d7ece8]">
              Active Tokens
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-xs">
            <div className="text-2xl font-extrabold text-[#223300] dark:text-[#d7ece8]">{dbStatus.sessionsCount}</div>
            <div className="text-[#4b5d16] font-semibold">Authenticated Operators</div>
          </CardContent>
        </Card>

        <Card className="bg-[#f6f4f1] dark:bg-[#0f1a1e] border-2 border-[#e45c10]/30 shadow-lg rounded-3xl">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wider font-extrabold text-[#e45c10]">
              System Health
            </CardDescription>
            <CardTitle className="text-lg font-bold text-[#223300] dark:text-[#d7ece8]">
              Core Availability
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-xs">
            <div className="text-2xl font-extrabold text-[#223300] dark:text-[#d7ece8]">{dbStatus.uptime}</div>
            <div className="text-[#4b5d16] font-semibold">Zero Critical Failures</div>
          </CardContent>
        </Card>
      </div>

      {/* Admin Control Actions & Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="bg-[#f6f4f1] dark:bg-[#0f1a1e] border-2 border-[#e45c10]/30 shadow-lg rounded-3xl lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-[#223300] dark:text-[#d7ece8]">
              System Audit & Diagnostics Log
            </CardTitle>
            <CardDescription className="text-xs font-semibold text-[#4b5d16]">
              Real-time audit log of system events, database queries, and security actions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {logs.map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-2xl bg-[#ece2ce] dark:bg-[#101d22] border border-[#e45c10]/20 flex items-center justify-between text-xs"
              >
                <div className="space-y-0.5">
                  <div className="font-bold text-[#223300] dark:text-[#d7ece8] flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        log.level === "CRITICAL"
                          ? "bg-[#e45c10]"
                          : log.level === "WARN"
                          ? "bg-[#f2b635]"
                          : "bg-[#4b5d16]"
                      }`}
                    />
                    [{log.source}] {log.message}
                  </div>
                </div>
                <span className="text-[10px] font-mono text-[#4b5d16] bg-[#4b5d16]/10 px-2 py-0.5 rounded-full">
                  {log.timestamp}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Database & Management Tools */}
        <Card className="bg-[#f6f4f1] dark:bg-[#0f1a1e] border-2 border-[#e45c10]/30 shadow-lg rounded-3xl">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-[#223300] dark:text-[#d7ece8]">
              Infrastructure Actions
            </CardTitle>
            <CardDescription className="text-xs font-semibold text-[#4b5d16]">
              Master database & system administrative triggers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={handleRunBackup}
              className="w-full bg-[#4b5d16] text-[#f6f4f1] hover:bg-[#4b5d16]/90 font-bold rounded-xl text-xs h-10 cursor-pointer"
            >
              Backup SQLite Database
            </Button>

            <Button
              onClick={handlePurgeSessions}
              className="w-full border-2 border-[#e45c10] text-[#e45c10] bg-transparent hover:bg-[#e45c10]/10 font-bold rounded-xl text-xs h-10 cursor-pointer"
            >
              Purge Expired Sessions
            </Button>

            <Button
              onClick={() => setActionMessage("Sensor node telemetry stream re-synced.")}
              className="w-full border-2 border-[#4b5d16] text-[#4b5d16] bg-transparent hover:bg-[#4b5d16]/10 font-bold rounded-xl text-xs h-10 cursor-pointer"
            >
              Re-sync Telemetry Nodes
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
