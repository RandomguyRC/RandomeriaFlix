"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, Clock, Globe2, Loader2, LogOut, MapPin, MonitorSmartphone, Shield, Users } from "lucide-react";

interface AppSession {
  id: string;
  role: "admin" | "viewer" | string;
  ipAddress: string;
  country?: string | null;
  region?: string | null;
  city?: string | null;
  timezone?: string | null;
  deviceType: string;
  browser: string;
  os: string;
  firstSeenAt: string;
  lastActiveAt: string;
  endedAt?: string | null;
  lastPath?: string | null;
  area: string;
  isActive: boolean;
}

interface SessionsResponse {
  summary: {
    activeTotal: number;
    activeAdmins: number;
    activeViewers: number;
    recentTotal: number;
  };
  sessions: AppSession[];
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function relativeTime(value: string) {
  const diffSeconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (diffSeconds < 10) return "just now";
  if (diffSeconds < 60) return `${diffSeconds}s ago`;
  const minutes = Math.floor(diffSeconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function locationText(session: AppSession) {
  const parts = [session.city, session.region, session.country].filter(Boolean);
  return parts.length ? parts.join(", ") : "Unknown location";
}

function StatCard({ icon: Icon, label, value, color }: { icon: typeof Activity; label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-400">{label}</p>
          <p className="mt-2 text-3xl font-bold text-white">{value}</p>
        </div>
        <div className={`rounded-lg bg-gradient-to-br ${color} p-3 text-white shadow-lg`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

export default function AdminSessionsPage() {
  const [data, setData] = useState<SessionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [endingId, setEndingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());

  async function fetchSessions(showSpinner = false) {
    if (showSpinner) setRefreshing(true);
    try {
      const res = await fetch("/api/admin/sessions", { cache: "no-store" });
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
      setRefreshing(false);
      setNow(Date.now());
    }
  }

  async function endSession(sessionId: string, role: string) {
    if (!window.confirm(`End this ${role} session?`)) return;

    setEndingId(sessionId);
    setError("");
    try {
      const res = await fetch("/api/admin/sessions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const result = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(result.error || "Unable to end the session.");
      }

      await fetchSessions();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to end the session.");
    } finally {
      setEndingId(null);
    }
  }

  useEffect(() => {
    fetchSessions();
    const refreshInterval = window.setInterval(() => fetchSessions(true), 30 * 1000);
    const tickInterval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      window.clearInterval(refreshInterval);
      window.clearInterval(tickInterval);
    };
  }, []);

  const sessions = data?.sessions ?? [];
  const summary = useMemo(
    () =>
      data?.summary ?? {
        activeTotal: 0,
        activeAdmins: 0,
        activeViewers: 0,
        recentTotal: 0,
      },
    [data],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Active Sessions</h1>
          <p className="mt-2 text-gray-400">
            See who is using RandomeriaFlix, from where, and on which device.
          </p>
        </div>
        <button
          onClick={() => fetchSessions(true)}
          disabled={refreshing}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-800 px-4 py-2.5 text-sm font-semibold text-gray-200 transition-colors hover:bg-gray-700 disabled:opacity-50 sm:w-auto"
        >
          {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
          Refresh
        </button>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Activity} label="Active now" value={summary.activeTotal} color="from-emerald-500 to-teal-700" />
        <StatCard icon={Shield} label="Active admins" value={summary.activeAdmins} color="from-red-500 to-red-700" />
        <StatCard icon={Users} label="Active viewers" value={summary.activeViewers} color="from-blue-500 to-blue-700" />
        <StatCard icon={Clock} label="Recent sessions" value={summary.recentTotal} color="from-violet-500 to-purple-700" />
      </div>

      {error && (
        <div role="alert" className="mb-4 rounded-lg border border-red-800/70 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900">
        {sessions.length === 0 ? (
          <div className="py-16 text-center">
            <MonitorSmartphone className="mx-auto h-12 w-12 text-gray-600" />
            <p className="mt-4 text-gray-400">No sessions recorded yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-800">
              <thead className="bg-gray-900/80">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">User</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Location / IP</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Device</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Current area</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Last active</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {sessions.map((session) => (
                  <tr key={session.id} className="align-top transition-colors hover:bg-gray-800/40">
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                            session.role === "admin"
                              ? "bg-red-500/10 text-red-400"
                              : "bg-blue-500/10 text-blue-400"
                          }`}
                        >
                          {session.role}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            session.isActive ? "bg-green-500/10 text-green-400" : "bg-gray-700 text-gray-300"
                          }`}
                        >
                          {session.isActive ? "Active" : session.endedAt ? "Logged out" : "Inactive"}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-gray-500">Started {formatDate(session.firstSeenAt)}</p>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-start gap-2 text-sm text-gray-200">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
                        <span>{locationText(session)}</span>
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                        <Globe2 className="h-3.5 w-3.5" />
                        <span>{session.ipAddress}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-start gap-2 text-sm text-gray-200">
                        <MonitorSmartphone className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
                        <span className="capitalize">{session.deviceType}</span>
                      </div>
                      <p className="mt-2 text-xs text-gray-500">
                        {session.browser} on {session.os}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm font-medium text-white">{session.area}</p>
                      <p className="mt-2 max-w-xs truncate text-xs text-gray-500" title={session.lastPath || undefined}>
                        {session.lastPath || "—"}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm font-medium text-white" suppressHydrationWarning>
                        {relativeTime(session.lastActiveAt)}
                      </p>
                      <p className="mt-2 text-xs text-gray-500">{formatDate(session.lastActiveAt)}</p>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button
                        onClick={() => endSession(session.id, session.role)}
                        disabled={endingId === session.id}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-gray-800 px-3 py-2 text-xs font-medium text-gray-300 transition-colors hover:bg-red-900/50 hover:text-red-400 disabled:opacity-50"
                      >
                        {endingId === session.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <LogOut className="h-3.5 w-3.5" />
                        )}
                        End session
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="mt-4 text-xs text-gray-500" suppressHydrationWarning>
        Active means last heartbeat within 5 minutes. Location is approximate from the local GeoIP database when configured.
        Last refreshed {new Date(now).toLocaleTimeString()}.
      </p>
    </div>
  );
}
