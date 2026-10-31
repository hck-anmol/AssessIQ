"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ExamShell } from "@/components/exam-engine/ExamShell";
import { useExamStore } from "@/stores/examStore";

interface ExamSessionClientProps {
  attempt: { id: string; startedAt: Date };
  exam: {
    id: string;
    title: string;
    durationMin: number;
    allowBackNav: boolean;
    maxFlags: number;
    webcamEnabled: boolean;
    questions: {
      id: string;
      type: string;
      content: string;
      options: unknown;
      order: number;
      marks: number;
    }[];
  };
  endTime: string;
  existingAnswers: {
    questionId: string;
    response: unknown;
    timeSpentMs: number;
    visitCount: number;
    timestamps: unknown;
  }[];
}

export function ExamSessionClient({
  attempt,
  exam,
  endTime,
  existingAnswers,
}: ExamSessionClientProps) {
  const router = useRouter();
  const { setResponse, enterQuestion } = useExamStore();

  // Restore existing answers on mount
  useEffect(() => {
    existingAnswers.forEach((ans) => {
      setResponse(ans.questionId, ans.response);
    });
    // Enter first question
    if (exam.questions[0]) enterQuestion(exam.questions[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Schedule mid-exam photo at 50% ±10% of elapsed time
  useEffect(() => {
    if (!exam.webcamEnabled) return;
    const totalMs = exam.durationMin * 60 * 1000;
    const midPercent = 0.4 + Math.random() * 0.2; // 40% to 60%
    const midDelay = totalMs * midPercent;

    const timer = setTimeout(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        const video = document.createElement("video");
        video.srcObject = stream;
        await video.play();

        const canvas = document.createElement("canvas");
        canvas.width = 640;
        canvas.height = 480;
        canvas.getContext("2d")?.drawImage(video, 0, 0);

        stream.getTracks().forEach((t) => t.stop());

        canvas.toBlob(async (blob) => {
          if (!blob) return;
          const fd = new FormData();
          fd.append("photo", blob, "mid.jpg");
          fd.append("stage", "MID");
          await fetch(`/api/attempts/${attempt.id}/photos`, { method: "POST", body: fd });
        }, "image/jpeg", 0.8);
      } catch {
        // Camera not available mid-exam — non-fatal
      }
    }, midDelay);

    return () => clearTimeout(timer);
  }, [attempt.id, exam.durationMin, exam.webcamEnabled]);

  const handleSubmit = useCallback(
    async (answers: Record<string, unknown>, violations: unknown[]) => {
      await fetch(`/api/attempts/${attempt.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers,
          autoSubmitted: violations.length > exam.maxFlags,
        }),
      });

      // Post-exam photo (if webcam enabled)
      if (exam.webcamEnabled) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          const video = document.createElement("video");
          video.srcObject = stream;
          await video.play();
          const canvas = document.createElement("canvas");
          canvas.width = 640;
          canvas.height = 480;
          canvas.getContext("2d")?.drawImage(video, 0, 0);
          stream.getTracks().forEach((t) => t.stop());

          canvas.toBlob(async (blob) => {
            if (!blob) return;
            const fd = new FormData();
            fd.append("photo", blob, "after.jpg");
            fd.append("stage", "AFTER");
            await fetch(`/api/attempts/${attempt.id}/photos`, { method: "POST", body: fd });
          }, "image/jpeg", 0.8);
        } catch {
          // Non-fatal
        }
      }

      router.push(`/exam/${exam.id}/done`);
    },
    [attempt.id, exam.id, exam.maxFlags, exam.webcamEnabled, router]
  );

  const questions = exam.questions.map((q) => ({
    ...q,
    options: q.options as string[] | undefined,
  }));

  return (
    <ExamShell
      attemptId={attempt.id}
      examId={exam.id}
      examTitle={exam.title}
      questions={questions}
      endTime={endTime}
      allowBackNav={exam.allowBackNav}
      maxFlags={exam.maxFlags}
      onSubmit={handleSubmit}
    />
  );
}
