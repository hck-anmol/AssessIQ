"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { WebcamCapture } from "@/components/camera/WebcamCapture";

interface ExamGateClientProps {
  exam: {
    id: string;
    title: string;
    durationMin: number;
    questionCount: number;
    allowBackNav: boolean;
    webcamEnabled: boolean;
    maxFlags: number;
    accessType: string;
  };
  existingAttemptId?: string;
}

export function ExamGateClient({ exam, existingAttemptId }: ExamGateClientProps) {
  const router = useRouter();
  const [step, setStep] = useState<"instructions" | "password" | "camera" | "ready">("instructions");
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [attemptId, setAttemptId] = useState<string | null>(existingAttemptId ?? null);
  const [loading, setLoading] = useState(false);

  // Step 1: Verify password (if required)
  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setPasswordError("");

    const res = await fetch(`/api/exams/${exam.id}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      const data = await res.json();
      setAttemptId(data.attemptId);
      setStep(exam.webcamEnabled ? "camera" : "ready");
    } else {
      const err = await res.json();
      setPasswordError(err.error ?? "Incorrect password");
    }
    setLoading(false);
  }

  // Start without password
  async function handleJoin() {
    setLoading(true);
    const res = await fetch(`/api/exams/${exam.id}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (res.ok) {
      const data = await res.json();
      setAttemptId(data.attemptId);
      setStep(exam.webcamEnabled ? "camera" : "ready");
    }
    setLoading(false);
  }

  // After photo captured
  const handlePhotoCaptured = useCallback(
    async (blob: Blob) => {
      if (!attemptId) return;
      const fd = new FormData();
      fd.append("photo", blob, "before.jpg");
      fd.append("stage", "BEFORE");
      await fetch(`/api/attempts/${attemptId}/photos`, { method: "POST", body: fd });
      setStep("ready");
    },
    [attemptId]
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center font-bold text-sm">A</div>
            <span className="font-bold">Assess<span className="text-blue-400">IQ</span></span>
          </div>

          {/* ── Step: Instructions ── */}
          {step === "instructions" && (
            <div>
              <h1 className="text-xl font-bold mb-1">{exam.title}</h1>
              <p className="text-slate-400 text-sm mb-6">Please read the instructions carefully before proceeding.</p>

              <div className="space-y-3 mb-8">
                {[
                  { icon: "🔒", text: "This exam must be taken in fullscreen mode." },
                  { icon: "🚫", text: "Tab switching and window switching are not allowed." },
                  { icon: "📋", text: "Copying questions or pasting answers is disabled." },
                  { icon: "📷", text: exam.webcamEnabled ? "Your photo will be taken before, during, and after the exam." : "No webcam required for this exam." },
                  { icon: "⚠️", text: `You get ${exam.maxFlags} warning${exam.maxFlags > 1 ? "s" : ""} before your exam is auto-submitted.` },
                  { icon: "↩️", text: exam.allowBackNav ? "You can navigate back to previous questions." : "You cannot go back to previous questions." },
                  { icon: "⏱", text: `Duration: ${exam.durationMin} minutes, ${exam.questionCount} questions.` },
                ].map((item, i) => (
                  <div key={i} className="flex gap-3 text-sm text-slate-300">
                    <span className="text-lg flex-shrink-0">{item.icon}</span>
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => {
                  if (exam.accessType === "PASSWORD") setStep("password");
                  else handleJoin();
                }}
                disabled={loading}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold transition"
              >
                {loading ? "Setting up..." : "I Understand, Continue →"}
              </button>
            </div>
          )}

          {/* ── Step: Password ── */}
          {step === "password" && (
            <div>
              <h2 className="text-xl font-bold mb-1">Enter Exam Password</h2>
              <p className="text-slate-400 text-sm mb-6">This exam is password-protected. Enter the password given by your examiner.</p>
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Exam password"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                />
                {passwordError && <p className="text-red-400 text-sm">{passwordError}</p>}
                <button
                  type="submit"
                  disabled={loading || !password}
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold transition"
                >
                  {loading ? "Verifying..." : "Unlock Exam →"}
                </button>
              </form>
            </div>
          )}

          {/* ── Step: Camera ── */}
          {step === "camera" && (
            <div>
              <h2 className="text-xl font-bold mb-1">Identity Verification</h2>
              <p className="text-slate-400 text-sm mb-6">
                Please look at the camera. Your photo will be taken to verify your identity.
              </p>
              <WebcamCapture onCapture={handlePhotoCaptured} label="Take Photo & Continue" />
            </div>
          )}

          {/* ── Step: Ready ── */}
          {step === "ready" && attemptId && (
            <div className="text-center">
              <div className="text-5xl mb-4">🎯</div>
              <h2 className="text-xl font-bold mb-2">You&apos;re all set!</h2>
              <p className="text-slate-400 text-sm mb-6">
                The exam will begin in fullscreen mode. Make sure you&apos;re in a quiet environment.
              </p>
              <button
                onClick={() => router.push(`/exam/${exam.id}/session?attemptId=${attemptId}`)}
                className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold text-lg transition"
              >
                Start Exam 🚀
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
