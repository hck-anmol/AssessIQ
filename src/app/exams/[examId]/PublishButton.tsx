"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PublishButton({ examId }: { examId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handlePublish() {
    setLoading(true);
    try {
      const res = await fetch(`/api/exams/${examId}/publish`, { method: "POST" });
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Failed to publish exam");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handlePublish}
      disabled={loading}
      className="block w-full text-center px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition"
    >
      {loading ? "Publishing…" : "📤 Publish Exam"}
    </button>
  );
}

