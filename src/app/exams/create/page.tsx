"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// ── Types ─────────────────────────────────────────────────────────────────────

type QuestionType = "MCQ_SINGLE" | "MCQ_MULTI" | "FILL_BLANK" | "DESCRIPTIVE" | "TRUE_FALSE";

interface DraftQuestion {
  id: string;
  type: QuestionType;
  content: string;
  options: string[];
  correctAnswer: unknown;
  marks: number;
  negMarks: number;
}

const step1Schema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  subject: z.string().optional(),
  description: z.string().optional(),
  durationMin: z.number().min(5).max(360),
});

type Step1Data = z.infer<typeof step1Schema>;

const STEPS = ["Basic Info", "Questions", "Access Control", "Exam Settings", "Review"];

// ── Main Component ────────────────────────────────────────────────────────────

export default function CreateExamPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [questions, setQuestions] = useState<DraftQuestion[]>([]);
  const [accessType, setAccessType] = useState<"GMAIL_FILTER" | "PASSWORD">("GMAIL_FILTER");
  const [allowedDomains, setAllowedDomains] = useState("");
  const [allowedYear, setAllowedYear] = useState("");
  const [allowedDepartment, setAllowedDepartment] = useState("");
  const [password, setPassword] = useState("");
  const [allowBackNav, setAllowBackNav] = useState(false);
  const [maxFlags, setMaxFlags] = useState(1);
  const [webcamEnabled, setWebcamEnabled] = useState(true);
  const [showScoreAfter, setShowScoreAfter] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<Step1Data>({ resolver: zodResolver(step1Schema), defaultValues: { durationMin: 60 } });

  // ── Question management ───────────────────────────────────────────────────

  function addQuestion(type: QuestionType) {
    setQuestions((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type,
        content: "",
        options: type === "MCQ_SINGLE" || type === "MCQ_MULTI" ? ["", "", "", ""] : [],
        correctAnswer: type === "TRUE_FALSE" ? true : type === "MCQ_SINGLE" ? 0 : type === "MCQ_MULTI" ? [] : "",
        marks: 1,
        negMarks: 0,
      },
    ]);
  }

  function updateQuestion(id: string, updates: Partial<DraftQuestion>) {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...updates } : q)));
  }

  function removeQuestion(id: string) {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleFinalSubmit() {
    setIsSubmitting(true);
    const basicInfo = getValues();

    const domains = allowedDomains
      .split(",")
      .map((d) => d.trim())
      .filter(Boolean);

    // Create exam
    const examRes = await fetch("/api/exams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...basicInfo,
        accessType,
        allowedDomains: domains,
        allowedEmails: [],
        allowedYear: allowedYear ? parseInt(allowedYear) : null,
        allowedDepartment: allowedDepartment || null,
        password: accessType === "PASSWORD" ? password : null,
        allowBackNav,
        maxFlags,
        webcamEnabled,
        showScoreAfter,
      }),
    });

    if (!examRes.ok) {
      alert("Failed to create exam. Please try again.");
      setIsSubmitting(false);
      return;
    }

    const { exam } = await examRes.json();

    // Add questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      await fetch(`/api/exams/${exam.id}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: q.type,
          content: q.content,
          options: q.options.filter(Boolean),
          correctAnswer: q.correctAnswer,
          marks: q.marks,
          negMarks: q.negMarks,
          order: i + 1,
        }),
      });
    }

    router.push(`/exams/${exam.id}`);
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <button onClick={() => router.push("/dashboard/examiner")} className="text-slate-400 hover:text-white transition">
            ← Back
          </button>
          <h1 className="font-bold text-lg">Create New Exam</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Steps indicator */}
        <div className="flex items-center gap-2 mb-10 overflow-x-auto pb-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-shrink-0">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  i === step
                    ? "bg-blue-500 text-white"
                    : i < step
                    ? "bg-green-600 text-white"
                    : "bg-slate-700 text-slate-400"
                }`}
              >
                {i < step ? "✓" : i + 1}
              </div>
              <span className={`text-sm ${i === step ? "text-white font-medium" : "text-slate-400"}`}>{s}</span>
              {i < STEPS.length - 1 && <div className="w-8 h-px bg-slate-700 mx-1" />}
            </div>
          ))}
        </div>

        {/* ── Step 0: Basic Info ── */}
        {step === 0 && (
          <form
            onSubmit={handleSubmit(() => setStep(1))}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-5"
          >
            <h2 className="text-xl font-semibold mb-6">Basic Information</h2>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Exam Title *</label>
              <input
                {...register("title")}
                placeholder="e.g. Mid-Term Examination 2025"
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
              />
              {errors.title && <p className="text-red-400 text-sm mt-1">{errors.title.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Subject</label>
                <input
                  {...register("subject")}
                  placeholder="e.g. Data Structures"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Duration (minutes) *</label>
                <input
                  {...register("durationMin", { valueAsNumber: true })}
                  type="number"
                  min={5}
                  max={360}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-blue-500 transition"
                />
                {errors.durationMin && <p className="text-red-400 text-sm mt-1">{errors.durationMin.message}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Description (optional)</label>
              <textarea
                {...register("description")}
                rows={3}
                placeholder="Brief description of this exam..."
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition resize-none"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button type="submit" className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition">
                Next →
              </button>
            </div>
          </form>
        )}

        {/* ── Step 1: Questions ── */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-xl font-semibold mb-4">Add Questions</h2>
              <div className="flex flex-wrap gap-2">
                {(["MCQ_SINGLE", "MCQ_MULTI", "TRUE_FALSE", "FILL_BLANK", "DESCRIPTIVE"] as QuestionType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => addQuestion(type)}
                    className="px-3 py-1.5 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-300 text-sm hover:bg-blue-600/30 transition"
                  >
                    + {type.replace(/_/g, " ")}
                  </button>
                ))}
              </div>
            </div>

            {questions.length === 0 && (
              <div className="text-center py-12 text-slate-500 bg-slate-900 border border-slate-800 rounded-2xl">
                <p className="text-3xl mb-2">❓</p>
                <p>No questions yet. Add your first question above.</p>
              </div>
            )}

            {questions.map((q, idx) => (
              <QuestionEditor
                key={q.id}
                question={q}
                index={idx}
                onChange={(updates) => updateQuestion(q.id, updates)}
                onRemove={() => removeQuestion(q.id)}
              />
            ))}

            <div className="flex justify-between pt-2">
              <button onClick={() => setStep(0)} className="px-5 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:border-slate-500 transition">
                ← Back
              </button>
              <button
                onClick={() => setStep(2)}
                disabled={questions.length === 0}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold transition"
              >
                Next → ({questions.length} question{questions.length !== 1 ? "s" : ""})
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Access Control ── */}
        {step === 2 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-6">
            <h2 className="text-xl font-semibold mb-2">Access Control</h2>
            <p className="text-slate-400 text-sm -mt-4">Who can take this exam?</p>

            <div className="grid grid-cols-2 gap-3">
              {([
                { value: "GMAIL_FILTER", label: "🎓 Gmail Filter", desc: "Only specific Google accounts" },
                { value: "PASSWORD", label: "🔑 Password", desc: "Anyone with the password" },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setAccessType(opt.value)}
                  className={`p-4 rounded-xl border text-left transition ${
                    accessType === opt.value
                      ? "bg-blue-500/20 border-blue-500 text-white"
                      : "bg-white/5 border-white/10 text-slate-300 hover:border-white/30"
                  }`}
                >
                  <p className="font-medium">{opt.label}</p>
                  <p className="text-xs text-slate-400 mt-1">{opt.desc}</p>
                </button>
              ))}
            </div>

            {accessType === "GMAIL_FILTER" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Allowed Email Domains</label>
                  <input
                    value={allowedDomains}
                    onChange={(e) => setAllowedDomains(e.target.value)}
                    placeholder="@cs.college.edu, @it.college.edu (comma separated)"
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                  />
                  <p className="text-slate-500 text-xs mt-1">Leave empty to allow all Google accounts</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Filter by Year (optional)</label>
                    <select
                      value={allowedYear}
                      onChange={(e) => setAllowedYear(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-white/10 text-white focus:outline-none focus:border-blue-500 transition"
                    >
                      <option value="">Any year</option>
                      {[1, 2, 3, 4, 5].map((y) => (
                        <option key={y} value={y}>Year {y}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Filter by Department (optional)</label>
                    <input
                      value={allowedDepartment}
                      onChange={(e) => setAllowedDepartment(e.target.value)}
                      placeholder="e.g. Computer Science"
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                    />
                  </div>
                </div>
              </div>
            )}

            {accessType === "PASSWORD" && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Exam Password</label>
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Set a password for students"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                />
              </div>
            )}

            <div className="flex justify-between pt-2">
              <button onClick={() => setStep(1)} className="px-5 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:border-slate-500 transition">← Back</button>
              <button onClick={() => setStep(3)} className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition">Next →</button>
            </div>
          </div>
        )}

        {/* ── Step 3: Exam Settings ── */}
        {step === 3 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-6">
            <h2 className="text-xl font-semibold mb-2">Exam Behavior Settings</h2>

            {[
              { label: "Allow backward navigation", desc: "Students can go back to previous questions", value: allowBackNav, onChange: setAllowBackNav },
              { label: "Webcam proctoring", desc: "Take before/during/after photos of the student", value: webcamEnabled, onChange: setWebcamEnabled },
              { label: "Show score after submission", desc: "Students see their score immediately after submitting", value: showScoreAfter, onChange: setShowScoreAfter },
            ].map((setting) => (
              <div key={setting.label} className="flex items-center justify-between py-3 border-b border-slate-800 last:border-0">
                <div>
                  <p className="font-medium text-sm">{setting.label}</p>
                  <p className="text-slate-400 text-xs mt-0.5">{setting.desc}</p>
                </div>
                <button
                  onClick={() => setting.onChange(!setting.value)}
                  className={`w-12 h-6 rounded-full transition-all relative ${setting.value ? "bg-blue-500" : "bg-slate-700"}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${setting.value ? "left-7" : "left-1"}`} />
                </button>
              </div>
            ))}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Violations before auto-submit
              </label>
              <p className="text-slate-500 text-xs mb-3">
                After this many violations (tab switch, fullscreen exit, etc.), the exam is auto-submitted.
              </p>
              <div className="flex gap-2">
                {[1, 2, 3].map((n) => (
                  <button
                    key={n}
                    onClick={() => setMaxFlags(n)}
                    className={`flex-1 py-2.5 rounded-lg border font-medium transition ${
                      maxFlags === n ? "bg-blue-500 border-blue-400 text-white" : "bg-white/5 border-white/10 text-slate-300 hover:border-white/30"
                    }`}
                  >
                    {n} {n === 1 ? "warning" : "warnings"}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <button onClick={() => setStep(2)} className="px-5 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:border-slate-500 transition">← Back</button>
              <button onClick={() => setStep(4)} className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition">Review →</button>
            </div>
          </div>
        )}

        {/* ── Step 4: Review & Submit ── */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
              <h2 className="text-xl font-semibold mb-6">Review & Create</h2>

              <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm mb-6">
                <ReviewRow label="Title" value={getValues("title")} />
                <ReviewRow label="Duration" value={`${getValues("durationMin")} minutes`} />
                <ReviewRow label="Questions" value={`${questions.length} questions`} />
                <ReviewRow label="Access" value={accessType === "PASSWORD" ? "Password protected" : `Gmail filter (${allowedDomains || "all"})`} />
                <ReviewRow label="Backward nav" value={allowBackNav ? "Allowed" : "Not allowed"} />
                <ReviewRow label="Webcam" value={webcamEnabled ? "Enabled" : "Disabled"} />
                <ReviewRow label="Max violations" value={`${maxFlags} warning${maxFlags !== 1 ? "s" : ""} before auto-submit`} />
                <ReviewRow label="Show score" value={showScoreAfter ? "Yes" : "No"} />
              </div>

              <div className="bg-slate-800 rounded-xl p-4 mb-6">
                <p className="text-sm font-medium text-slate-300 mb-2">Questions ({questions.length})</p>
                <div className="space-y-1">
                  {questions.map((q, i) => (
                    <div key={q.id} className="flex items-center gap-3 text-xs text-slate-400">
                      <span className="font-mono text-slate-500">Q{i + 1}.</span>
                      <span className="truncate">{q.content || "(empty)"}</span>
                      <span className="flex-shrink-0 px-1.5 py-0.5 rounded bg-slate-700 text-slate-400">{q.type.replace(/_/g, " ")}</span>
                      <span className="flex-shrink-0">{q.marks}pts</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between">
                <button onClick={() => setStep(3)} className="px-5 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:border-slate-500 transition">← Back</button>
                <button
                  onClick={handleFinalSubmit}
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold transition"
                >
                  {isSubmitting ? "Creating..." : "🚀 Create Exam"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ── Question Editor ────────────────────────────────────────────────────────────

function QuestionEditor({
  question,
  index,
  onChange,
  onRemove,
}: {
  question: DraftQuestion;
  index: number;
  onChange: (updates: Partial<DraftQuestion>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-sm font-mono">Q{index + 1}</span>
          <span className="px-2 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs">
            {question.type.replace(/_/g, " ")}
          </span>
        </div>
        <button onClick={onRemove} className="text-red-400 hover:text-red-300 text-sm transition">Remove</button>
      </div>

      {/* Question text */}
      <textarea
        value={question.content}
        onChange={(e) => onChange({ content: e.target.value })}
        placeholder="Enter your question here..."
        rows={2}
        className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition resize-none mb-4"
      />

      {/* MCQ options */}
      {(question.type === "MCQ_SINGLE" || question.type === "MCQ_MULTI") && (
        <div className="space-y-2 mb-4">
          <p className="text-xs text-slate-400 mb-2">Options (click ✓ to mark correct)</p>
          {question.options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (question.type === "MCQ_SINGLE") {
                    onChange({ correctAnswer: i });
                  } else {
                    const curr = (question.correctAnswer as number[]) ?? [];
                    onChange({ correctAnswer: curr.includes(i) ? curr.filter((x) => x !== i) : [...curr, i] });
                  }
                }}
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition ${
                  question.type === "MCQ_SINGLE"
                    ? question.correctAnswer === i
                      ? "bg-green-500 text-white"
                      : "bg-slate-700 text-slate-400 hover:bg-slate-600"
                    : (question.correctAnswer as number[])?.includes(i)
                    ? "bg-green-500 text-white"
                    : "bg-slate-700 text-slate-400 hover:bg-slate-600"
                }`}
              >
                {String.fromCharCode(65 + i)}
              </button>
              <input
                value={opt}
                onChange={(e) => {
                  const newOptions = [...question.options];
                  newOptions[i] = e.target.value;
                  onChange({ options: newOptions });
                }}
                placeholder={`Option ${String.fromCharCode(65 + i)}`}
                className="flex-1 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
              />
            </div>
          ))}
          <button
            onClick={() => onChange({ options: [...question.options, ""] })}
            className="text-blue-400 text-xs hover:text-blue-300 transition mt-1"
          >
            + Add option
          </button>
        </div>
      )}

      {/* True/False */}
      {question.type === "TRUE_FALSE" && (
        <div className="flex gap-3 mb-4">
          {([true, false] as const).map((val) => (
            <button
              key={String(val)}
              onClick={() => onChange({ correctAnswer: val })}
              className={`flex-1 py-2 rounded-lg border font-medium text-sm transition ${
                question.correctAnswer === val
                  ? "bg-green-500/20 border-green-500 text-green-300"
                  : "bg-white/5 border-white/10 text-slate-300 hover:border-white/30"
              }`}
            >
              {val ? "✅ True" : "❌ False"} (correct)
            </button>
          ))}
        </div>
      )}

      {/* Fill blank */}
      {question.type === "FILL_BLANK" && (
        <div className="mb-4">
          <label className="block text-xs text-slate-400 mb-1">Correct Answer</label>
          <input
            value={question.correctAnswer as string}
            onChange={(e) => onChange({ correctAnswer: e.target.value })}
            placeholder="The expected answer"
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
          />
        </div>
      )}

      {/* Marks */}
      <div className="flex items-center gap-4 pt-2 border-t border-slate-800">
        <div className="flex items-center gap-2 text-sm">
          <label className="text-slate-400">Marks:</label>
          <input
            type="number"
            min={1}
            value={question.marks}
            onChange={(e) => onChange({ marks: parseInt(e.target.value) || 1 })}
            className="w-16 px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-white text-center focus:outline-none focus:border-blue-500 transition"
          />
        </div>
        {question.type !== "DESCRIPTIVE" && (
          <div className="flex items-center gap-2 text-sm">
            <label className="text-slate-400">Negative marks:</label>
            <input
              type="number"
              min={0}
              value={question.negMarks}
              onChange={(e) => onChange({ negMarks: parseInt(e.target.value) || 0 })}
              className="w-16 px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-white text-center focus:outline-none focus:border-blue-500 transition"
            />
          </div>
        )}
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-slate-400">{label}:</span>{" "}
      <span className="text-white font-medium">{value}</span>
    </div>
  );
}

