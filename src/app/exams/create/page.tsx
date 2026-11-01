"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ShieldCheck,
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  Check,
  X,
  Mail,
  Key,
  HelpCircle,
  Clock,
  Send,
  FileUp,
  Loader2,
  AlertCircle,
} from "lucide-react";

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

const STEPS = ["Basic Details", "Questions", "Access Control", "Proctoring Rules", "Review & Publish"];

// ── Main Component ────────────────────────────────────────────────────────────

export default function CreateExamPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [questions, setQuestions] = useState<DraftQuestion[]>([]);
  const [accessType, setAccessType] = useState<"GMAIL_FILTER" | "PASSWORD">("GMAIL_FILTER");
  const [allowedDomains, setAllowedDomains] = useState("");
  const [allowedEmailPrefixes, setAllowedEmailPrefixes] = useState("");
  const [allowedYear, setAllowedYear] = useState("");
  const [allowedDepartment, setAllowedDepartment] = useState("");
  const [password, setPassword] = useState("");
  const [allowBackNav, setAllowBackNav] = useState(false);
  const [maxFlags, setMaxFlags] = useState(1);
  const [webcamEnabled, setWebcamEnabled] = useState(true);
  const [showScoreAfter, setShowScoreAfter] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // PDF Parsing Modal State
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isParsingPdf, setIsParsingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<Step1Data>({ resolver: zodResolver(step1Schema), defaultValues: { durationMin: 60 } });

  function addQuestion(type: QuestionType) {
    const q: DraftQuestion = {
      id: Math.random().toString(36).slice(2),
      type,
      content: "",
      options: type.startsWith("MCQ") ? ["Option A", "Option B", "Option C", "Option D"] : [],
      correctAnswer:
        type === "MCQ_SINGLE" ? 0 : type === "MCQ_MULTI" ? [0] : type === "TRUE_FALSE" ? true : "",
      marks: 1,
      negMarks: 0,
    };
    setQuestions([...questions, q]);
  }

  function updateQuestion(id: string, updates: Partial<DraftQuestion>) {
    setQuestions(questions.map((q) => (q.id === id ? { ...q, ...updates } : q)));
  }

  function removeQuestion(id: string) {
    setQuestions(questions.filter((q) => q.id !== id));
  }

  const handleParsePdf = async () => {
    if (!pdfFile) return;
    setIsParsingPdf(true);
    setPdfError(null);

    const fd = new FormData();
    fd.append("file", pdfFile);

    try {
      const res = await fetch("/api/exams/parse-pdf", {
        method: "POST",
        body: fd,
      });

      const responseText = await res.text();
      let data: any = null;
      try {
        data = responseText ? JSON.parse(responseText) : null;
      } catch {
        // Fallback for non-JSON response
      }

      if (!res.ok) {
        throw new Error(data?.error || `Server responded with status ${res.status}.`);
      }

      if (!data || !Array.isArray(data.questions)) {
        throw new Error(data?.error || "No questions could be extracted from the document.");
      }

      const importedDrafts: DraftQuestion[] = data.questions.map((q: any) => ({
        id: Math.random().toString(36).slice(2),
        type: q.type,
        content: q.content,
        options:
          q.options ||
          (q.type.startsWith("MCQ") ? ["Option A", "Option B", "Option C", "Option D"] : []),
        correctAnswer:
          q.correctAnswer !== undefined
            ? q.correctAnswer
            : q.type === "MCQ_SINGLE"
            ? 0
            : q.type === "MCQ_MULTI"
            ? [0]
            : q.type === "TRUE_FALSE"
            ? true
            : "",
        marks: q.marks || 1,
        negMarks: 0,
      }));

      setQuestions((prev) => [...prev, ...importedDrafts]);
      setIsPdfModalOpen(false);
      setPdfFile(null);
    } catch (err: unknown) {
      setPdfError(err instanceof Error ? err.message : "Error extracting questions.");
    } finally {
      setIsParsingPdf(false);
    }
  };

  async function handleFinalSubmit() {
    setIsSubmitting(true);
    const step1 = getValues();

    const examRes = await fetch("/api/exams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: step1.title,
        subject: step1.subject,
        description: step1.description,
        durationMin: step1.durationMin,
        accessType,
        allowedDomains: allowedDomains
          ? allowedDomains.split(",").map((d) => d.trim()).filter(Boolean)
          : [],
        allowedEmailPrefixes: allowedEmailPrefixes
          ? allowedEmailPrefixes.split(",").map((p) => p.trim()).filter(Boolean)
          : [],
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
      alert("Failed to create exam. Please check parameters and try again.");
      setIsSubmitting(false);
      return;
    }

    const { exam } = await examRes.json();

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      let formattedCorrect = q.correctAnswer;
      if (q.type === "FILL_BLANK") {
        if (typeof q.correctAnswer === "string") {
          formattedCorrect = q.correctAnswer
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        } else if (Array.isArray(q.correctAnswer)) {
          formattedCorrect = q.correctAnswer
            .map((s) => String(s).trim())
            .filter(Boolean);
        }
      }

      await fetch(`/api/exams/${exam.id}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: q.type,
          content: q.content,
          options: q.options.filter(Boolean),
          correctAnswer: formattedCorrect,
          marks: q.marks,
          negMarks: q.negMarks,
          order: i + 1,
        }),
      });
    }

    router.push(`/exams/${exam.id}`);
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-3.5 sticky top-0 z-20 shadow-2xs">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/dashboard/examiner")}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition flex items-center gap-1 text-xs font-medium"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </button>
            <div className="h-4 w-px bg-slate-200" />
            <h1 className="font-bold text-base text-slate-900 tracking-tight">Create Examination</h1>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>Secure Configuration</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Steps indicator */}
        <div className="flex items-center justify-between mb-8 overflow-x-auto pb-2 border-b border-slate-200/80 pt-1">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-shrink-0">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition ${
                  i === step
                    ? "bg-blue-600 text-white shadow-2xs"
                    : i < step
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-200 text-slate-500"
                }`}
              >
                {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span className={`text-xs ${i === step ? "text-slate-900 font-bold" : "text-slate-500"}`}>
                {s}
              </span>
              {i < STEPS.length - 1 && <div className="w-6 md:w-10 h-px bg-slate-200 mx-2" />}
            </div>
          ))}
        </div>

        {/* ── Step 0: Basic Info ── */}
        {step === 0 && (
          <form
            onSubmit={handleSubmit(() => setStep(1))}
            className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-5 shadow-xs"
          >
            <div>
              <h2 className="text-lg font-bold text-slate-900">Basic Examination Details</h2>
              <p className="text-xs text-slate-500 mt-0.5">Specify examination title, subject, and time allowance.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Examination Title *
              </label>
              <input
                {...register("title")}
                placeholder="e.g. End-Term Assessment in Operating Systems"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm transition"
              />
              {errors.title && <p className="text-rose-600 text-xs mt-1">{errors.title.message}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Subject / Course Code
                </label>
                <input
                  {...register("subject")}
                  placeholder="e.g. CS302 — Algorithms"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Allocated Duration (Minutes) *
                </label>
                <input
                  {...register("durationMin", { valueAsNumber: true })}
                  type="number"
                  min={5}
                  max={360}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm transition"
                />
                {errors.durationMin && <p className="text-rose-600 text-xs mt-1">{errors.durationMin.message}</p>}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Student Instructions / Syllabus Notes
              </label>
              <textarea
                {...register("description")}
                rows={3}
                placeholder="Guidelines or reference material permitted during the assessment..."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm transition resize-none"
              />
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition flex items-center gap-1.5 shadow-xs"
              >
                <span>Continue to Questions</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        )}

        {/* ── Step 1: Questions ── */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
              <h2 className="text-lg font-bold text-slate-900 mb-1">Construct Assessment Items</h2>
              <p className="text-xs text-slate-500 mb-4">
                Add questions manually or upload a PDF question paper to auto-extract items.
              </p>

              <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                <div className="flex flex-wrap gap-2">
                  {(["MCQ_SINGLE", "MCQ_MULTI", "TRUE_FALSE", "FILL_BLANK", "DESCRIPTIVE"] as QuestionType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => addQuestion(type)}
                      className="px-3.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-semibold transition flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{type.replace(/_/g, " ")}</span>
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsPdfModalOpen(true);
                    setPdfError(null);
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition flex items-center gap-1.5"
                >
                  <FileUp className="w-3.5 h-3.5 text-blue-600" />
                  <span>Import from PDF Question Paper</span>
                </button>
              </div>
            </div>

            {questions.length === 0 && (
              <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl shadow-xs">
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <p className="text-sm font-semibold text-slate-800">Roster is empty</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Click any item format above or import from PDF to begin building your roster.
                </p>
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

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep(0)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-medium transition flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={questions.length === 0}
                className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition flex items-center gap-1.5"
              >
                <span>Access Control ({questions.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Access Control ── */}
        {step === 2 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Examinee Access Controls</h2>
              <p className="text-xs text-slate-500 mt-0.5">Define institutional eligibility policies or passkey requirements.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  value: "GMAIL_FILTER",
                  icon: Mail,
                  label: "Institutional Email Verification",
                  desc: "Restricted strictly to specified college email domains or batch years",
                },
                {
                  value: "PASSWORD",
                  icon: Key,
                  label: "Secure Passkey Gate",
                  desc: "Open access protected by a required exam password",
                },
              ].map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setAccessType(opt.value as "GMAIL_FILTER" | "PASSWORD")}
                    className={`p-4 rounded-xl border text-left transition flex flex-col justify-between ${
                      accessType === opt.value
                        ? "bg-blue-50/70 border-blue-600 ring-1 ring-blue-600"
                        : "bg-white border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <Icon className="w-4 h-4 text-blue-600" />
                        <p className="font-semibold text-xs text-slate-900">{opt.label}</p>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">{opt.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {accessType === "GMAIL_FILTER" && (
              <div className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Permitted College Email Domain(s)
                  </label>
                  <input
                    value={allowedDomains}
                    onChange={(e) => setAllowedDomains(e.target.value)}
                    placeholder="e.g. iiitvadodara.ac.in, university.edu (comma separated)"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm transition"
                  />
                  <p className="text-slate-500 text-xs mt-1">
                    Candidates must sign in with this institutional Google email domain.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Batch / Roll Prefix Filter (Optional)
                  </label>
                  <input
                    value={allowedEmailPrefixes}
                    onChange={(e) => setAllowedEmailPrefixes(e.target.value)}
                    placeholder="e.g. 2024 or 2023, 2024"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm transition"
                  />
                  <p className="text-slate-500 text-xs mt-1">
                    Filters candidates by joining year or roll prefix (e.g. entering &quot;2024&quot; allows <span className="font-mono text-slate-700">202451019@iiitvadodara.ac.in</span> while blocking other batches).
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Target Year Filter (Optional)
                    </label>
                    <select
                      value={allowedYear}
                      onChange={(e) => setAllowedYear(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm transition"
                    >
                      <option value="">All Academic Years</option>
                      {[1, 2, 3, 4, 5].map((y) => (
                        <option key={y} value={y}>Year {y}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Target Department (Optional)
                    </label>
                    <input
                      value={allowedDepartment}
                      onChange={(e) => setAllowedDepartment(e.target.value)}
                      placeholder="e.g. Computer Science"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm transition"
                    />
                  </div>
                </div>
              </div>
            )}

            {accessType === "PASSWORD" && (
              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Examination Access Key (Password)
                </label>
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Set an alphanumeric passkey"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm transition"
                />
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-medium transition flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition flex items-center gap-1.5"
              >
                <span>Exam Rules</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Proctoring Rules ── */}
        {step === 3 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Security & Proctoring Policy</h2>
              <p className="text-xs text-slate-500 mt-0.5">Configure integrity enforcement measures during session.</p>
            </div>

            <div className="space-y-4">
              {[
                {
                  label: "Backward Navigation Restriction",
                  desc: "When enabled, candidates cannot revisit previous questions once answered.",
                  value: !allowBackNav,
                  onChange: () => setAllowBackNav(!allowBackNav),
                },
                {
                  label: "Biometric Webcam Auditing",
                  desc: "Take candidate verification photos before admission, mid-exam, and upon submission.",
                  value: webcamEnabled,
                  onChange: () => setWebcamEnabled(!webcamEnabled),
                },
                {
                  label: "Instant Candidate Scoring",
                  desc: "Display computed score and grade immediately upon assessment submission.",
                  value: showScoreAfter,
                  onChange: () => setShowScoreAfter(!showScoreAfter),
                },
              ].map((setting) => (
                <div
                  key={setting.label}
                  className="flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:bg-slate-50 transition"
                >
                  <div className="max-w-md">
                    <p className="text-xs font-semibold text-slate-900">{setting.label}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{setting.desc}</p>
                  </div>
                  <button
                    type="button"
                    onClick={setting.onChange}
                    className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${
                      setting.value ? "bg-blue-600" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full bg-white transition-all absolute top-1 ${
                        setting.value ? "left-6" : "left-1"
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>

            <div className="pt-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Violation Tolerance (Auto-Submission Threshold)
              </label>
              <p className="text-slate-500 text-xs mb-3">
                Number of security flags (tab switch, window blur, fullscreen exit) tolerated before immediate disqualification.
              </p>
              <div className="flex gap-2">
                {[1, 2, 3].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setMaxFlags(n)}
                    className={`flex-1 py-2.5 rounded-xl border text-xs font-semibold transition ${
                      maxFlags === n
                        ? "bg-blue-50 border-blue-600 text-blue-700 ring-1 ring-blue-600"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {n} {n === 1 ? "Warning (Strict)" : "Warnings"}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-medium transition flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={() => setStep(4)}
                className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition flex items-center gap-1.5"
              >
                <span>Review Assessment</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4: Review & Submit ── */}
        {step === 4 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Final Verification</h2>
              <p className="text-xs text-slate-500 mt-0.5">Confirm examination parameters prior to publishing.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 p-5 rounded-xl border border-slate-200">
              <ReviewRow label="Title" value={getValues("title")} />
              <ReviewRow label="Duration" value={`${getValues("durationMin")} minutes`} />
              <ReviewRow label="Question Count" value={`${questions.length} items`} />
              <ReviewRow
                label="Access Policy"
                value={
                  accessType === "PASSWORD"
                    ? "Password Authenticated"
                    : `Domain: ${allowedDomains || "All"} | Batch: ${allowedEmailPrefixes || "All"}`
                }
              />
              <ReviewRow label="Backward Nav" value={allowBackNav ? "Permitted" : "Prohibited (Sequential)"} />
              <ReviewRow label="Webcam Proctor" value={webcamEnabled ? "Enforced" : "Disabled"} />
              <ReviewRow label="Auto-Submit Rule" value={`Disqualify after ${maxFlags} violation(s)`} />
              <ReviewRow label="Immediate Scoring" value={showScoreAfter ? "Enabled" : "Disabled"} />
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-slate-100/70 border-b border-slate-200 font-semibold text-xs text-slate-700 uppercase tracking-wider">
                Roster Preview ({questions.length} items)
              </div>
              <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
                {questions.map((q, i) => (
                  <div key={q.id} className="p-3 flex items-center gap-3 text-xs text-slate-600">
                    <span className="font-mono text-slate-400 font-bold">#{i + 1}</span>
                    <span className="truncate flex-1 font-medium text-slate-800">{q.content || "(No prompt text)"}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                      {q.type.replace(/_/g, " ")}
                    </span>
                    <span className="font-semibold text-slate-700">{q.marks} pt{q.marks !== 1 ? "s" : ""}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-medium transition flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition flex items-center gap-2"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? "Creating Assessment…" : "Finalize & Save Exam"}</span>
              </button>
            </div>
          </div>
        )}

        {/* ── PDF Import Modal ────────────────────────────────────── */}
        {isPdfModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="w-full max-w-xl bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xl space-y-5 my-8">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Parse Questions from PDF Paper
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Upload a text-based PDF. Questions and options will be auto-extracted.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsPdfModalOpen(false);
                    setPdfFile(null);
                    setPdfError(null);
                  }}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl p-6 text-center transition bg-slate-50/50">
                <FileUp className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-900">
                  {pdfFile ? pdfFile.name : "Select Question Paper (.pdf)"}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5 mb-4">
                  Standard selectable text documents supported
                </p>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setPdfFile(f);
                  }}
                  className="hidden"
                  id="wizard-pdf-upload"
                />
                <label
                  htmlFor="wizard-pdf-upload"
                  className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-2xs transition"
                >
                  Browse PDF Document
                </label>
              </div>

              {pdfError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{pdfError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsPdfModalOpen(false);
                    setPdfFile(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleParsePdf}
                  disabled={!pdfFile || isParsingPdf}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-semibold text-xs shadow-xs transition"
                >
                  {isParsingPdf ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Parsing PDF...</span>
                    </>
                  ) : (
                    <>
                      <FileUp className="w-3.5 h-3.5" />
                      <span>Extract & Append to Roster</span>
                    </>
                  )}
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
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
      <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-slate-500 text-xs font-mono font-bold">Item #{index + 1}</span>
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            {question.type.replace(/_/g, " ")}
          </span>
        </div>
        <button
          onClick={onRemove}
          className="text-rose-600 hover:text-rose-700 text-xs font-medium transition flex items-center gap-1"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Remove</span>
        </button>
      </div>

      {/* Question prompt */}
      <textarea
        value={question.content}
        onChange={(e) => onChange({ content: e.target.value })}
        placeholder="Enter question text or statement here..."
        rows={2}
        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm transition resize-none mb-4"
      />

      {/* MCQ options */}
      {(question.type === "MCQ_SINGLE" || question.type === "MCQ_MULTI") && (
        <div className="space-y-2 mb-4">
          <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
            Options (Click letter to toggle correct key)
          </p>
          {question.options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (question.type === "MCQ_SINGLE") {
                    onChange({ correctAnswer: i });
                  } else {
                    const curr = (question.correctAnswer as number[]) ?? [];
                    onChange({ correctAnswer: curr.includes(i) ? curr.filter((x) => x !== i) : [...curr, i] });
                  }
                }}
                className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 transition ${
                  question.type === "MCQ_SINGLE"
                    ? question.correctAnswer === i
                      ? "bg-emerald-600 text-white shadow-2xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    : (question.correctAnswer as number[])?.includes(i)
                    ? "bg-emerald-600 text-white shadow-2xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
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
                placeholder={`Option ${String.fromCharCode(65 + i)} text`}
                className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-900 text-xs placeholder-slate-400 focus:outline-none focus:border-blue-600 transition"
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() => onChange({ options: [...question.options, ""] })}
            className="text-blue-600 text-xs font-medium hover:underline inline-flex items-center gap-1 mt-1"
          >
            <Plus className="w-3 h-3" />
            <span>Add Choice</span>
          </button>
        </div>
      )}

      {/* True/False */}
      {question.type === "TRUE_FALSE" && (
        <div className="flex gap-3 mb-4">
          {([true, false] as const).map((val) => (
            <button
              key={String(val)}
              type="button"
              onClick={() => onChange({ correctAnswer: val })}
              className={`flex-1 py-2 px-3 rounded-xl border text-xs font-semibold transition flex items-center justify-center gap-2 ${
                question.correctAnswer === val
                  ? "bg-emerald-50 border-emerald-500 text-emerald-700 ring-1 ring-emerald-500"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              {val ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <X className="w-3.5 h-3.5 text-rose-600" />}
              <span>{val ? "True" : "False"} (Correct Answer)</span>
            </button>
          ))}
        </div>
      )}

      {/* Fill blank */}
      {question.type === "FILL_BLANK" && (
        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Acceptable Answers (Comma-separated keys)
          </label>
          <input
            value={
              Array.isArray(question.correctAnswer)
                ? (question.correctAnswer as string[]).join(", ")
                : (question.correctAnswer as string) || ""
            }
            onChange={(e) => onChange({ correctAnswer: e.target.value })}
            placeholder="e.g. 10, 20, 30 or sun, moon, earth"
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-900 text-xs placeholder-slate-400 focus:outline-none focus:border-blue-600 transition"
          />
          <p className="text-[11px] text-slate-500 mt-1">
            Separate multiple acceptable answers with commas. Evaluation accepts any match regardless of letter case (uppercase/lowercase).
          </p>
        </div>
      )}

      {/* Marks & Negative marking */}
      <div className="flex items-center gap-6 pt-3 border-t border-slate-100 text-xs">
        <div className="flex items-center gap-2">
          <label className="font-semibold text-slate-600">Points Awarded:</label>
          <input
            type="number"
            min={1}
            value={question.marks}
            onChange={(e) => onChange({ marks: parseInt(e.target.value) || 1 })}
            className="w-16 px-2 py-1 rounded-lg border border-slate-200 text-slate-900 text-center font-semibold focus:outline-none focus:border-blue-600 transition"
          />
        </div>
        {question.type !== "DESCRIPTIVE" && (
          <div className="flex items-center gap-2">
            <label className="font-semibold text-slate-600">Penalty (Negative Marks):</label>
            <input
              type="number"
              min={0}
              value={question.negMarks}
              onChange={(e) => onChange({ negMarks: parseInt(e.target.value) || 0 })}
              className="w-16 px-2 py-1 rounded-lg border border-slate-200 text-slate-900 text-center font-semibold focus:outline-none focus:border-blue-600 transition"
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
      <span className="text-slate-500 font-medium">{label}:</span>{" "}
      <span className="text-slate-900 font-semibold">{value}</span>
    </div>
  );
}
