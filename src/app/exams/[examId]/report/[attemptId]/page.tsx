import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { formatMs } from "@/lib/utils";
import { PrintReportButton } from "./PrintReportButton";
import {
  ArrowLeft,
  ShieldCheck,
  Camera,
  AlertTriangle,
  Clock,
  Calendar,
  CheckCircle2,
  XCircle,
  Award,
  Building,
  GraduationCap,
  Eye,
} from "lucide-react";

interface PageProps {
  params: Promise<{ examId: string; attemptId: string }>;
}

export default async function AttemptReportPage({ params }: PageProps) {
  const { examId, attemptId } = await params;
  const session = await auth();
  if (!session || session.user.role !== "EXAMINER") redirect("/sign-in");

  const attempt = await prisma.attempt.findFirst({
    where: {
      id: attemptId,
      examId,
      exam: { createdById: session.user.id },
    },
    include: {
      user: { select: { name: true, email: true, college: true, department: true, year: true } },
      exam: { select: { title: true, maxFlags: true } },
      answers: {
        include: {
          question: { select: { id: true, content: true, type: true, order: true, marks: true } },
        },
        orderBy: { question: { order: "asc" } },
      },
      flags: { orderBy: { createdAt: "asc" } },
      photos: { orderBy: { takenAt: "asc" } },
    },
  });

  if (!attempt) notFound();

  const isAutoSubmitted = attempt.status === "AUTO_SUBMITTED";
  const totalMarks = attempt.answers.reduce((s, a) => s + a.question.marks, 0);
  const totalTimeSpent = attempt.answers.reduce((s, a) => s + a.timeSpentMs, 0);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Top Navigation */}
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 py-4 print:relative print:border-b-2 print:border-slate-300">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/exams/${examId}`}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition print:hidden"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Assessment</span>
            </Link>
            <div className="h-4 w-px bg-slate-200 hidden sm:block print:hidden" />
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              <h1 className="font-semibold text-slate-900 text-sm sm:text-base">Proctoring Audit Dossier</h1>
            </div>
          </div>
          <PrintReportButton />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Candidate & Audit Summary Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-bold text-slate-900">{attempt.user.name ?? attempt.user.email}</h2>
                {isAutoSubmitted ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 border border-rose-200 text-rose-700">
                    <AlertTriangle className="w-3 h-3 text-rose-600" />
                    Auto-Submitted / Disqualified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 border border-emerald-200 text-emerald-700">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Verified Submission
                  </span>
                )}
              </div>
              <p className="text-slate-500 text-sm mt-1">{attempt.user.email}</p>
              
              {(attempt.user.college || attempt.user.department) && (
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
                  {attempt.user.college && (
                    <span className="inline-flex items-center gap-1">
                      <Building className="w-3.5 h-3.5 text-slate-400" />
                      {attempt.user.college}
                    </span>
                  )}
                  {attempt.user.department && (
                    <span className="inline-flex items-center gap-1">
                      <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                      {attempt.user.department} {attempt.user.year ? `· Year ${attempt.user.year}` : ""}
                    </span>
                  )}
                  <span className="text-slate-400">·</span>
                  <span className="text-slate-600 font-medium">Exam: {attempt.exam.title}</span>
                </div>
              )}
            </div>

            {attempt.score != null && (
              <div className="sm:text-right bg-slate-50 border border-slate-200/80 rounded-xl px-5 py-3">
                <div className="flex items-center sm:justify-end gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  <Award className="w-3.5 h-3.5 text-blue-600" />
                  Final Score
                </div>
                <div className="text-2xl font-bold text-slate-900">
                  {attempt.score} <span className="text-sm font-medium text-slate-500">/ {totalMarks}</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Percentage: {totalMarks > 0 ? Math.round((attempt.score / totalMarks) * 100) : 0}%
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-5 border-t border-slate-200 text-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Session Started</p>
                <p className="text-sm font-semibold text-slate-900 mt-0.5">
                  {new Date(attempt.startedAt).toLocaleString([], {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Session Concluded</p>
                <p className="text-sm font-semibold text-slate-900 mt-0.5">
                  {attempt.submittedAt
                    ? new Date(attempt.submittedAt).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "Active / Interrupted"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Duration Elapsed</p>
                <p className="text-sm font-semibold text-slate-900 mt-0.5">
                  {attempt.submittedAt
                    ? formatMs(new Date(attempt.submittedAt).getTime() - new Date(attempt.startedAt).getTime())
                    : "—"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Proctoring Verification Photographs */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-slate-600" />
              <h3 className="font-semibold text-slate-900 text-sm sm:text-base">Identity Verification Captures</h3>
            </div>
            <span className="text-xs font-medium text-slate-500">
              {attempt.photos.length} captured / 3 required stages
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {(["BEFORE", "MID", "AFTER"] as const).map((stage) => {
              const photo = attempt.photos.find((p) => p.stage === stage);
              const stageLabels = {
                BEFORE: "Entry Verification",
                MID: "Mid-Exam Checkpoint",
                AFTER: "Submission Snapshot",
              };

              return (
                <div key={stage} className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-700">{stageLabels[stage]}</span>
                    <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-500">
                      {stage}
                    </span>
                  </div>

                  {photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photo.url}
                      alt={`${stage} verification capture`}
                      className="w-full aspect-video object-cover rounded-md border border-slate-200 shadow-xs"
                    />
                  ) : (
                    <div className="w-full aspect-video bg-white rounded-md border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
                      <Camera className="w-6 h-6 stroke-1 text-slate-300 mb-1" />
                      <span className="text-xs">No image logged</span>
                    </div>
                  )}

                  <div className="mt-2 text-center">
                    {photo ? (
                      <p className="text-[11px] font-mono text-slate-500">
                        {new Date(photo.takenAt).toLocaleTimeString()}
                      </p>
                    ) : (
                      <p className="text-[11px] text-slate-400">Stage bypassed</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Security & Integrity Flag Audit */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className={`w-4 h-4 ${attempt.flags.length > 0 ? "text-rose-600" : "text-emerald-600"}`} />
              <h3 className="font-semibold text-slate-900 text-sm sm:text-base">
                Proctoring Flags ({attempt.flags.length})
              </h3>
            </div>
            <span className="text-xs text-slate-500">Threshold: {attempt.exam.maxFlags} warnings</span>
          </div>

          {attempt.flags.length === 0 ? (
            <div className="py-8 text-center border border-dashed border-slate-200 rounded-lg">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-900">Zero Integrity Violations Recorded</p>
              <p className="text-xs text-slate-500 mt-0.5">The candidate maintained strict focus throughout the session.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
              {attempt.flags.map((flag, i) => {
                const isExceeded = i + 1 > attempt.exam.maxFlags;
                return (
                  <div key={flag.id} className="flex items-center justify-between p-3.5 bg-white hover:bg-slate-50 transition">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono font-medium text-slate-400 w-6">#{i + 1}</span>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${
                          isExceeded
                            ? "bg-rose-50 border-rose-200 text-rose-700"
                            : "bg-amber-50 border-amber-200 text-amber-700"
                        }`}
                      >
                        <AlertTriangle className="w-3 h-3" />
                        {flag.type.replace(/_/g, " ")}
                      </span>
                      {flag.details && <span className="text-xs text-slate-500 hidden sm:inline">{flag.details}</span>}
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-mono text-slate-500">
                        {new Date(flag.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Per-Question Response Diagnostics */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <h3 className="font-semibold text-slate-900 text-sm sm:text-base">Per-Question Time & Accuracy Breakdown</h3>
            </div>
            <span className="text-xs text-slate-500">
              Total active engagement: {formatMs(totalTimeSpent)}
            </span>
          </div>

          <div className="space-y-4">
            {attempt.answers.map((answer) => {
              const pct = totalTimeSpent > 0 ? Math.min(100, (answer.timeSpentMs / totalTimeSpent) * 100) : 0;

              return (
                <div key={answer.id} className="border border-slate-200 rounded-lg p-4 bg-slate-50/60">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-sm">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs font-bold text-slate-500 px-1.5 py-0.5 rounded bg-white border border-slate-200">
                          Q{answer.question.order}
                        </span>
                        <span className="text-[11px] uppercase tracking-wider text-slate-500">
                          {answer.question.type.replace(/_/g, " ")}
                        </span>
                      </div>
                      <p className="text-slate-900 font-medium leading-relaxed">{answer.question.content}</p>
                    </div>

                    <div className="flex-shrink-0 flex items-center gap-3 text-xs">
                      <span className="text-slate-600 bg-white border border-slate-200 px-2 py-1 rounded font-mono">
                        {formatMs(answer.timeSpentMs)}
                      </span>
                      <span className="text-slate-500 inline-flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5 text-slate-400" />
                        {answer.visitCount} visit{answer.visitCount !== 1 ? "s" : ""}
                      </span>
                      {answer.isCorrect != null && (
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded font-semibold border ${
                            answer.isCorrect
                              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                              : "bg-rose-50 border-rose-200 text-rose-700"
                          }`}
                        >
                          {answer.isCorrect ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {answer.isCorrect ? `+${answer.marksAwarded}` : `${answer.marksAwarded}`} / {answer.question.marks} pts
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Relative engagement time bar */}
                  <div className="mt-3">
                    <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          answer.isCorrect === true
                            ? "bg-emerald-500"
                            : answer.isCorrect === false
                            ? "bg-rose-500"
                            : "bg-blue-600"
                        }`}
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      />
                    </div>
                  </div>

                  {/* Candidate Recorded Response */}
                  {answer.response != null && (
                    <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-baseline gap-2 text-xs">
                      <span className="font-semibold text-slate-600 uppercase tracking-wider text-[10px]">
                        Recorded Response:
                      </span>
                      <span className="font-mono text-slate-800 bg-white border border-slate-200 px-2 py-0.5 rounded">
                        {typeof answer.response === "object"
                          ? JSON.stringify(answer.response)
                          : String(answer.response)}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
