"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { WebcamCapture } from "@/components/camera/WebcamCapture";
import {
  ShieldCheck,
  Maximize2,
  EyeOff,
  CopyX,
  Camera,
  AlertTriangle,
  ArrowLeftRight,
  Clock,
  KeyRound,
  CheckCircle2,
  ArrowRight,
  HelpCircle,
  FileText,
  Lock,
} from "lucide-react";

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
      setPasswordError(err.error ?? "Incorrect exam passcode");
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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-xl">
        {/* Header Institution Brand */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-xs">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-slate-900 tracking-tight text-base">AssessIQ</span>
              <p className="text-[11px] uppercase tracking-wider text-slate-600 font-semibold">
                Candidate Admission Gate
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 border border-blue-200 text-blue-700">
            <Lock className="w-3 h-3" /> Secure Proctoring Active
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
          {/* ── Step: Instructions ── */}
          {step === "instructions" && (
            <div>
              <div className="border-b border-slate-100 pb-5 mb-5">
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                  Pre-Examination Protocol
                </span>
                <h1 className="text-xl font-bold text-slate-900 mt-1">{exam.title}</h1>
                <p className="text-slate-500 text-sm mt-1">
                  Read and acknowledge the test administration rules before proceeding.
                </p>
              </div>

              {/* Protocol Grid */}
              <div className="space-y-3 mb-8">
                {[
                  {
                    icon: Maximize2,
                    title: "Mandatory Fullscreen Mode",
                    desc: "The exam window will lock into fullscreen. Exiting counts as an integrity violation.",
                  },
                  {
                    icon: EyeOff,
                    title: "Focus & Tab Isolation",
                    desc: "Switching browser tabs or minimizing the window is recorded and flagged automatically.",
                  },
                  {
                    icon: CopyX,
                    title: "Clipboard & Action Lockout",
                    desc: "Copy, paste, inspect element, right-click, and screenshot keys are disabled.",
                  },
                  {
                    icon: Camera,
                    title: "Biometric Identity Verification",
                    desc: exam.webcamEnabled
                      ? "Your photo will be recorded before admission, mid-exam, and upon submission."
                      : "No biometric webcam checkpoint required for this examination.",
                  },
                  {
                    icon: AlertTriangle,
                    title: "Disqualification Threshold",
                    desc: `Maximum ${exam.maxFlags} warning${exam.maxFlags > 1 ? "s" : ""} permitted before instant automatic submission.`,
                  },
                  {
                    icon: ArrowLeftRight,
                    title: "Question Navigation",
                    desc: exam.allowBackNav
                      ? "Free navigation enabled. You may review and update previous responses."
                      : "Strict forward progression. You cannot revisit previous questions once answered.",
                  },
                  {
                    icon: Clock,
                    title: "Time Allocation",
                    desc: `${exam.durationMin} minutes total duration for ${exam.questionCount} questions.`,
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80 hover:bg-slate-50/80 transition"
                  >
                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0 text-blue-600 shadow-2xs mt-0.5">
                      <item.icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-900">{item.title}</p>
                      <p className="text-xs text-slate-500 leading-relaxed mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => {
                  if (exam.accessType === "PASSWORD") setStep("password");
                  else handleJoin();
                }}
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-semibold text-sm transition shadow-sm flex items-center justify-center gap-2"
              >
                <span>{loading ? "Preparing Session..." : "I Acknowledge, Proceed to Check-In"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ── Step: Password ── */}
          {step === "password" && (
            <div>
              <div className="border-b border-slate-100 pb-5 mb-5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mb-3">
                  <KeyRound className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">Enter Exam Passcode</h2>
                <p className="text-slate-500 text-sm mt-1">
                  This examination requires an access key provided by your proctor or department coordinator.
                </p>
              </div>

              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Security Passcode
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter confidential passcode"
                    className="w-full px-4 py-3 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-mono transition text-sm"
                  />
                </div>

                {passwordError && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>{passwordError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !password}
                  className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-semibold text-sm transition shadow-sm flex items-center justify-center gap-2"
                >
                  <span>{loading ? "Verifying Authorization..." : "Validate Passcode & Proceed"}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

          {/* ── Step: Camera Checkpoint ── */}
          {step === "camera" && (
            <div>
              <div className="border-b border-slate-100 pb-5 mb-5">
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                  Step 2 of 2: Biometrics
                </span>
                <h2 className="text-xl font-bold text-slate-900 mt-1">Candidate Photo Verification</h2>
                <p className="text-slate-500 text-sm mt-1">
                  Center your face within the frame in good lighting. Your baseline image will be stored for audit.
                </p>
              </div>

              <WebcamCapture onCapture={handlePhotoCaptured} label="Verify Biometrics & Continue" />
            </div>
          )}

          {/* ── Step: Ready for Launch ── */}
          {step === "ready" && attemptId && (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-4 text-emerald-600 shadow-2xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-1">Check-in Complete</h2>
              <p className="text-slate-500 text-sm max-w-sm mx-auto mb-6 leading-relaxed">
                All pre-flight checks and proctoring parameters have been verified. Launching will immediately engage fullscreen mode.
              </p>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-left text-xs text-slate-600 mb-6 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Candidate Session ID:</span>
                  <span className="font-mono text-slate-800">{attemptId.slice(0, 12)}...</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Duration:</span>
                  <span className="font-semibold text-slate-800">{exam.durationMin} Minutes</span>
                </div>
              </div>

              <button
                onClick={() => router.push(`/exam/${exam.id}/session?attemptId=${attemptId}`)}
                className="w-full py-3.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base transition shadow-sm flex items-center justify-center gap-2"
              >
                <span>Launch Assessment Session</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
