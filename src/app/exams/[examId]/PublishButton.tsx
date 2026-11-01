"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Play, Square, Lock } from "lucide-react";

interface ExamStatusActionsProps {
  examId: string;
  status: "DRAFT" | "SCHEDULED" | "LIVE" | "ENDED";
}

export function ExamStatusActions({ examId, status }: ExamStatusActionsProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function updateStatus(nextStatus: "SCHEDULED" | "LIVE" | "ENDED") {
    setLoading(true);
    try {
      const res = await fetch(`/api/exams/${examId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? `Failed to change status to ${nextStatus}`);
      }
    } finally {
      setLoading(false);
    }
  }

  if (status === "DRAFT") {
    return (
      <button
        onClick={() => updateStatus("SCHEDULED")}
        disabled={loading}
        className="w-full text-center px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold transition flex items-center justify-center gap-2 shadow-2xs"
      >
        <Send className="w-3.5 h-3.5" />
        <span>{loading ? "Updating…" : "Publish & Schedule Assessment"}</span>
      </button>
    );
  }

  if (status === "SCHEDULED") {
    return (
      <button
        onClick={() => updateStatus("LIVE")}
        disabled={loading}
        className="w-full text-center px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold transition flex items-center justify-center gap-2 shadow-2xs"
      >
        <Play className="w-3.5 h-3.5" />
        <span>{loading ? "Activating Session…" : "Start Session (Go Live)"}</span>
      </button>
    );
  }

  if (status === "LIVE") {
    return (
      <button
        onClick={() => {
          if (confirm("Are you sure you want to conclude and end this live exam session?")) {
            updateStatus("ENDED");
          }
        }}
        disabled={loading}
        className="w-full text-center px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-semibold transition flex items-center justify-center gap-2 shadow-2xs"
      >
        <Square className="w-3.5 h-3.5" />
        <span>{loading ? "Closing Session…" : "Conclude & End Session"}</span>
      </button>
    );
  }

  return (
    <div className="w-full text-center px-4 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 text-xs font-medium flex items-center justify-center gap-2">
      <Lock className="w-3.5 h-3.5 text-slate-400" />
      <span>Session Concluded</span>
    </div>
  );
}

// Backward-compatible alias
export function PublishButton({ examId }: { examId: string }) {
  return <ExamStatusActions examId={examId} status="DRAFT" />;
}
