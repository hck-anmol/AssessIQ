"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
        className="w-full text-center px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium transition"
      >
        {loading ? "Updating…" : "📤 Publish (Schedule Exam)"}
      </button>
    );
  }

  if (status === "SCHEDULED") {
    return (
      <button
        onClick={() => updateStatus("LIVE")}
        disabled={loading}
        className="w-full text-center px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium transition flex items-center justify-center gap-1.5"
      >
        {loading ? "Starting…" : "🟢 Start Exam (Go Live)"}
      </button>
    );
  }

  if (status === "LIVE") {
    return (
      <button
        onClick={() => {
          if (confirm("Are you sure you want to conclude and end this live exam?")) {
            updateStatus("ENDED");
          }
        }}
        disabled={loading}
        className="w-full text-center px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-sm font-medium transition flex items-center justify-center gap-1.5"
      >
        {loading ? "Ending…" : "⏹️ End Exam"}
      </button>
    );
  }

  return (
    <div className="w-full text-center px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 text-sm font-medium">
      🔒 Exam Ended
    </div>
  );
}

// Backward-compatible alias
export function PublishButton({ examId }: { examId: string }) {
  return <ExamStatusActions examId={examId} status="DRAFT" />;
}
