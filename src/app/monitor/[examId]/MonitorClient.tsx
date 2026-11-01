"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  RefreshCw,
  Download,
  Square,
  AlertTriangle,
  Users,
  ShieldAlert,
  CheckCircle2,
  Clock,
  ArrowRight,
  UserX,
} from "lucide-react";

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
      `Confirm forced disqualification for examinee: ${studentName}? This action cannot be revoked.`
    );
    if (!confirmed) return;

    setTerminatingId(attemptId);
    try {
      const res = await fetch(`/api/attempts/${attemptId}/terminate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Disqualified by proctor during live session" }),
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
      "Are you sure you want to conclude and end this live session? All active examinations will cease."
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
      }
    } catch {
      alert("Failed to end exam.");
    }
  };

  useEffect(() => {
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
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Top Bar */}
      <header className="bg-white border-b border-slate-200 px-6 py-3.5 sticky top-0 z-20 shadow-2xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={`/exams/${exam.id}`}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition flex items-center gap-1 text-xs font-medium"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </Link>
            <div className="h-4 w-px bg-slate-200" />
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <h1 className="font-bold text-base text-slate-900 tracking-tight">{exam.title}</h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 uppercase tracking-wider">
                  Live Proctoring
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Tolerance: {exam.maxFlags} warning(s) • Live sync active
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 text-xs">
            <span className="text-slate-400 hidden md:inline text-[11px]">
              Last synced: {lastUpdated.toLocaleTimeString()}
            </span>
            <a
              href={`/api/exams/${exam.id}/export`}
              className="px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 transition flex items-center gap-1 font-semibold shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </a>
            {exam.status === "LIVE" && (
              <button
                onClick={handleEndExam}
                className="px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 transition flex items-center gap-1 font-semibold shadow-2xs"
              >
                <Square className="w-3.5 h-3.5" />
                <span>End Exam</span>
              </button>
            )}
            <button
              onClick={fetchLatest}
              disabled={isRefreshing}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition disabled:opacity-50"
              title="Refresh status"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-blue-600" : ""}`} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
            <p className="text-slate-500 text-xs font-medium mb-1">Active Examinees</p>
            <p className="text-2xl font-bold text-emerald-600">{inProgressCount}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
            <p className="text-slate-500 text-xs font-medium mb-1">Total Registered</p>
            <p className="text-2xl font-bold text-slate-900">{attempts.length}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
            <p className="text-slate-500 text-xs font-medium mb-1">Violations Logged</p>
            <p className="text-2xl font-bold text-amber-600">{flaggedCount}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
            <p className="text-slate-500 text-xs font-medium mb-1">Disqualified / Auto-Submitted</p>
            <p className="text-2xl font-bold text-rose-600">{autoSubmittedCount}</p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 mb-6">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-1">Roster:</span>
          {(["ALL", "IN_PROGRESS", "FLAGGED", "SUBMITTED"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setFilter(mode)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                filter === mode
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {mode.replace("_", " ")}
            </button>
          ))}
        </div>

        {/* Examinee Live Cards */}
        {filteredAttempts.length === 0 ? (
          <div className="text-center py-20 bg-white border border-slate-200 rounded-2xl shadow-xs">
            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
              <Users className="w-5 h-5" />
            </div>
            <p className="text-sm font-semibold text-slate-800">No examinees in selected segment</p>
            <p className="text-xs text-slate-400 mt-0.5">Adjust filter options to view active or submitted records.</p>
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
                  className={`bg-white border rounded-2xl p-5 transition flex flex-col justify-between shadow-2xs hover:shadow-xs ${
                    isAuto
                      ? "border-rose-300 bg-rose-50/20"
                      : hasFlags
                      ? "border-amber-300 bg-amber-50/20"
                      : "border-slate-200"
                  }`}
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 mb-3 border-b border-slate-100 pb-3">
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-slate-900 truncate">
                          {attempt.user.name || "Student Examinee"}
                        </p>
                        <p className="text-xs text-slate-500 truncate">{attempt.user.email}</p>
                        {attempt.user.college && (
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">
                            {attempt.user.college} • {attempt.user.department || "General"}
                          </p>
                        )}
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border flex-shrink-0 ${
                          isLive
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : isAuto
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-slate-100 text-slate-600 border-slate-200"
                        }`}
                      >
                        {attempt.status.replace("_", " ")}
                      </span>
                    </div>

                    {/* Flags / Alerts */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-medium">Recorded Infractions:</span>
                        <span
                          className={`font-bold ${
                            attempt.flagCount >= exam.maxFlags
                              ? "text-rose-600"
                              : attempt.flagCount > 0
                              ? "text-amber-600"
                              : "text-emerald-700"
                          }`}
                        >
                          {attempt.flagCount} / {exam.maxFlags}
                        </span>
                      </div>

                      {attempt.flags.length > 0 && (
                        <div className="mt-2 space-y-1 bg-rose-50/70 p-2.5 rounded-xl border border-rose-100">
                          <p className="text-[10px] uppercase font-bold text-rose-700 tracking-wider">
                            Latest Security Events:
                          </p>
                          <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                            {attempt.flags.slice(0, 3).map((flag) => (
                              <div
                                key={flag.id}
                                className="text-[11px] text-rose-900 flex items-center justify-between"
                              >
                                <span className="flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3 text-rose-600" />
                                  <span>{flag.type.replace(/_/g, " ")}</span>
                                </span>
                                <span className="text-slate-400 text-[10px] font-mono">
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
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-400">
                      Started: {new Date(attempt.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <div className="flex items-center gap-2">
                      {isLive && (
                        <button
                          onClick={() => handleTerminate(attempt.id, attempt.user.name || attempt.user.email)}
                          disabled={terminatingId === attempt.id}
                          className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-semibold transition disabled:opacity-50 flex items-center gap-1 shadow-2xs"
                        >
                          <UserX className="w-3 h-3 text-rose-600" />
                          <span>{terminatingId === attempt.id ? "Stopping…" : "Disqualify"}</span>
                        </button>
                      )}
                      <Link
                        href={`/exams/${exam.id}/report/${attempt.id}`}
                        className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium transition flex items-center gap-1 shadow-2xs"
                      >
                        <span>Audit</span>
                        <ArrowRight className="w-3 h-3 text-slate-400" />
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
