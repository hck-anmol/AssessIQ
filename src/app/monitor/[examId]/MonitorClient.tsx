"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { formatMs } from "@/lib/utils";

interface Flag {
  id: string;
  type: string;
  details: string | null;
  createdAt: string;
}

interface Attempt {
  id: string;
  userId: string;
  status: string;
  flagCount: number;
  startedAt: string;
  user: {
    name: string | null;
    email: string;
    college: string | null;
    department: string | null;
    year: number | null;
  };
  flags: Flag[];
}

interface ExamData {
  id: string;
  title: string;
  status: string;
  maxFlags: number;
  durationMin: number;
  attempts: Attempt[];
}

export function MonitorClient({ initialExam }: { initialExam: ExamData }) {
  const [exam, setExam] = useState<ExamData>(initialExam);
  const [filter, setFilter] = useState<"ALL" | "IN_PROGRESS" | "FLAGGED" | "SUBMITTED">("ALL");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [terminatingId, setTerminatingId] = useState<string | null>(null);

  const fetchLatest = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const res = await fetch(`/api/exams/${exam.id}/monitor`);
      if (res.ok) {
        const data = await res.json();
        if (data.exam) {
          setExam(data.exam);
          setLastUpdated(new Date());
        }
      }
    } catch {
      // ignore network errors during polling
    } finally {
      setIsRefreshing(false);
    }
  }, [exam.id]);

  const handleTerminate = async (attemptId: string, studentName: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to force-submit and disqualify ${studentName}? This cannot be undone.`
    );
    if (!confirmed) return;

    setTerminatingId(attemptId);
    try {
      const res = await fetch(`/api/attempts/${attemptId}/terminate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Disqualified by examiner during live proctoring" }),
      });
      if (res.ok) {
        await fetchLatest();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Failed to terminate attempt");
      }
    } finally {
      setTerminatingId(null);
    }
  };

  const handleEndExam = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to conclude and END this exam? No further examinee activity will be accepted."
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/exams/${exam.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ENDED" }),
      });
      if (res.ok) {
        setExam((prev) => ({ ...prev, status: "ENDED" }));
        alert("Exam has been marked as ENDED.");
      }
    } catch {
      alert("Failed to end exam.");
    }
  };

  useEffect(() => {
    // Poll every 5 seconds for live status & violations
    const interval = setInterval(fetchLatest, 5000);
    return () => clearInterval(interval);
  }, [fetchLatest]);

  const attempts = exam.attempts;
  const inProgressCount = attempts.filter((a) => a.status === "IN_PROGRESS").length;
  const autoSubmittedCount = attempts.filter((a) => a.status === "AUTO_SUBMITTED").length;
  const flaggedCount = attempts.filter((a) => a.flags.length > 0).length;

  const filteredAttempts = attempts.filter((a) => {
    if (filter === "IN_PROGRESS") return a.status === "IN_PROGRESS";
    if (filter === "FLAGGED") return a.flags.length > 0;
    if (filter === "SUBMITTED") return a.status === "SUBMITTED" || a.status === "AUTO_SUBMITTED";
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Top Bar */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/exams/${exam.id}`}
              className="text-slate-400 hover:text-white transition text-sm flex items-center gap-1"
            >
              ← Manage Exam
            </Link>
            <div className="h-4 w-px bg-slate-800" />
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <h1 className="font-bold text-lg">{exam.title}</h1>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/30">
                  LIVE MONITOR
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Max violations allowed: {exam.maxFlags} • Auto-refreshes every 5s
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-500 hidden sm:inline">
              Updated: {lastUpdated.toLocaleTimeString()}
            </span>
            <a
              href={`/api/exams/${exam.id}/export`}
              className="px-3 py-1.5 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-300 hover:bg-blue-600/30 transition flex items-center gap-1 font-medium"
            >
              📥 Export CSV
            </a>
            {exam.status === "LIVE" && (
              <button
                onClick={handleEndExam}
                className="px-3 py-1.5 rounded-lg bg-rose-600/20 border border-rose-500/30 text-rose-300 hover:bg-rose-600/30 transition flex items-center gap-1 font-medium"
              >
                ⏹️ End Exam
              </button>
            )}
            <button
              onClick={fetchLatest}
              disabled={isRefreshing}
              className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:border-slate-600 text-slate-200 transition disabled:opacity-50"
            >
              {isRefreshing ? "…" : "🔄 Refresh"}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <p className="text-slate-400 text-xs mb-1">Active Now</p>
            <p className="text-2xl font-bold text-emerald-400">{inProgressCount}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <p className="text-slate-400 text-xs mb-1">Total Attempts</p>
            <p className="text-2xl font-bold">{attempts.length}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <p className="text-slate-400 text-xs mb-1">Violations Detected</p>
            <p className="text-2xl font-bold text-amber-400">{flaggedCount}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <p className="text-slate-400 text-xs mb-1">Auto-Submitted (Disqualified)</p>
            <p className="text-2xl font-bold text-rose-500">{autoSubmittedCount}</p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 mb-6">
          <span className="text-xs text-slate-400 mr-2">Filter:</span>
          {(["ALL", "IN_PROGRESS", "FLAGGED", "SUBMITTED"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setFilter(mode)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                filter === mode
                  ? "bg-blue-600 text-white"
                  : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              {mode.replace("_", " ")}
            </button>
          ))}
        </div>

        {/* Examinee Live Cards */}
        {filteredAttempts.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/40 border border-slate-800/80 rounded-2xl">
            <p className="text-3xl mb-2">👥</p>
            <p className="text-slate-400 text-sm">No examinees matching filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAttempts.map((attempt) => {
              const isAuto = attempt.status === "AUTO_SUBMITTED";
              const isLive = attempt.status === "IN_PROGRESS";
              const hasFlags = attempt.flags.length > 0;

              return (
                <div
                  key={attempt.id}
                  className={`bg-slate-900 border rounded-xl p-5 transition flex flex-col justify-between ${
                    isAuto
                      ? "border-rose-500/40 bg-rose-950/10"
                      : hasFlags
                      ? "border-amber-500/40 bg-amber-950/10"
                      : "border-slate-800"
                  }`}
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">
                          {attempt.user.name || "Student"}
                        </p>
                        <p className="text-xs text-slate-400 truncate">{attempt.user.email}</p>
                        {attempt.user.college && (
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            {attempt.user.college}{attempt.user.department ? ` • ${attempt.user.department}` : ""}{attempt.user.year ? ` • Year ${attempt.user.year}` : ""}
                          </p>
                        )}
                      </div>
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full font-medium border flex-shrink-0 ${
                          isLive
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                            : isAuto
                            ? "bg-rose-500/20 text-rose-400 border-rose-500/30"
                            : "bg-slate-700/30 text-slate-400 border-slate-700"
                        }`}
                      >
                        {attempt.status.replace("_", " ")}
                      </span>
                    </div>

                    {/* Flags / Alerts */}
                    <div className="space-y-1.5 mb-4">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Violation Count:</span>
                        <span
                          className={`font-semibold ${
                            attempt.flagCount >= exam.maxFlags
                              ? "text-rose-400"
                              : attempt.flagCount > 0
                              ? "text-amber-400"
                              : "text-emerald-400"
                          }`}
                        >
                          {attempt.flagCount} / {exam.maxFlags}
                        </span>
                      </div>

                      {attempt.flags.length > 0 && (
                        <div className="mt-2 space-y-1">
                          <p className="text-[11px] text-slate-400 font-medium">Recent Flags:</p>
                          <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                            {attempt.flags.slice(0, 3).map((flag) => (
                              <div
                                key={flag.id}
                                className="text-[11px] bg-slate-800/80 px-2 py-1 rounded text-rose-300 flex items-center justify-between"
                              >
                                <span>⚠️ {flag.type.replace(/_/g, " ")}</span>
                                <span className="text-slate-500 text-[10px]">
                                  {new Date(flag.createdAt).toLocaleTimeString([], {
                                    minute: "2-digit",
                                    second: "2-digit",
                                  })}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">
                      Started: {new Date(attempt.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <div className="flex items-center gap-2">
                      {isLive && (
                        <button
                          onClick={() => handleTerminate(attempt.id, attempt.user.name || attempt.user.email)}
                          disabled={terminatingId === attempt.id}
                          className="px-2.5 py-1 rounded bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800 text-xs text-rose-300 transition disabled:opacity-50"
                        >
                          {terminatingId === attempt.id ? "Stopping…" : "⚠️ Disqualify"}
                        </button>
                      )}
                      <Link
                        href={`/exams/${exam.id}/report/${attempt.id}`}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-300 transition"
                      >
                        View Report →
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

