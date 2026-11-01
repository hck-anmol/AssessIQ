import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { formatDuration } from "@/lib/utils";
import { ExamStatusActions } from "./PublishButton";
import { QuestionManager } from "./QuestionManager";
import {
  ArrowLeft,
  Download,
  Activity,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  FileText,
  Sliders,
  HelpCircle,
} from "lucide-react";

interface PageProps {
  params: Promise<{ examId: string }>;
}

export default async function ExamManagePage({ params }: PageProps) {
  const { examId } = await params;
  const session = await auth();
  if (!session || session.user.role !== "EXAMINER") redirect("/sign-in");

  const exam = await prisma.exam.findUnique({
    where: { id: examId, createdById: session.user.id },
    include: {
      questions: { orderBy: { order: "asc" } },
      attempts: {
        include: {
          user: { select: { name: true, email: true } },
          flags: true,
        },
        orderBy: { startedAt: "desc" },
      },
      _count: { select: { enrollments: true, attempts: true } },
    },
  });

  if (!exam) notFound();

  const statusBadge: Record<string, { bg: string; text: string; border: string }> = {
    DRAFT: { bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-200" },
    SCHEDULED: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
    LIVE: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
    ENDED: { bg: "bg-zinc-100", text: "text-zinc-600", border: "border-zinc-200" },
  };

  const badge = statusBadge[exam.status] || statusBadge.DRAFT;
  const totalMarks = exam.questions.reduce((s, q) => s + q.marks, 0);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-3.5 sticky top-0 z-20 shadow-2xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/examiner"
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition flex items-center gap-1 text-xs font-medium"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </Link>
            <div className="h-4 w-px bg-slate-200" />
            <h1 className="font-bold text-base text-slate-900 tracking-tight truncate max-w-sm sm:max-w-md">
              {exam.title}
            </h1>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${badge.bg} ${badge.text} ${badge.border}`}
            >
              {exam.status}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {exam.attempts.length > 0 && (
              <a
                href={`/api/exams/${exam.id}/export`}
                className="px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold hover:bg-blue-100 transition flex items-center gap-1.5 shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-blue-600" />
                <span>Export CSV</span>
              </a>
            )}
            {exam.status === "LIVE" && (
              <Link
                href={`/monitor/${exam.id}`}
                className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-700 text-xs font-semibold hover:bg-emerald-100 transition flex items-center gap-1.5 shadow-2xs"
              >
                <Activity className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                <span>Live Monitor</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: details + questions + attempts */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Duration", value: formatDuration(exam.durationMin) },
              { label: "Questions", value: exam.questions.length },
              { label: "Total Points", value: totalMarks },
              { label: "Submissions", value: exam._count.attempts },
            ].map((s) => (
              <div key={s.label} className="bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-2xs">
                <p className="text-slate-500 text-xs font-medium mb-0.5">{s.label}</p>
                <p className="text-xl font-bold text-slate-900">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Questions Inventory with Live Editing & PDF Import */}
          <QuestionManager
            examId={exam.id}
            initialQuestions={exam.questions}
            examStatus={exam.status}
          />

          {/* Student Attempts */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h2 className="font-bold text-sm text-slate-900 uppercase tracking-wider">
                Examinee Submissions ({exam.attempts.length})
              </h2>
            </div>
            {exam.attempts.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs">
                <p>No student submissions recorded for this assessment yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {exam.attempts.map((attempt) => (
                  <div key={attempt.id} className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {attempt.user.name ?? attempt.user.email}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 text-xs">
                        {attempt.flags.length > 0 && (
                          <span className="inline-flex items-center gap-1 text-rose-600 font-medium">
                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                            {attempt.flags.length} flag{attempt.flags.length !== 1 ? "s" : ""}
                          </span>
                        )}
                        <span
                          className={
                            attempt.status === "AUTO_SUBMITTED"
                              ? "text-rose-600 font-medium"
                              : "text-emerald-700 font-medium"
                          }
                        >
                          {attempt.status.replace(/_/g, " ")}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {attempt.score != null && (
                        <span className="text-xs font-semibold text-slate-700">
                          {attempt.score} / {totalMarks}
                        </span>
                      )}
                      <Link
                        href={`/exams/${exam.id}/report/${attempt.id}`}
                        className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-100 transition flex items-center gap-1 shadow-2xs"
                      >
                        <span>Audit Report</span>
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Settings & actions sidebar */}
        <div className="space-y-5">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
              <Sliders className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900">
                Security & Rules
              </h3>
            </div>
            <div className="space-y-3 text-xs">
              <SettingRow label="Access Protocol" value={exam.accessType === "PASSWORD" ? "Passkey Required" : "Domain Verified"} />
              {exam.allowedDomains.length > 0 && (
                <SettingRow label="Allowed Domains" value={exam.allowedDomains.join(", ")} />
              )}
              <SettingRow label="Backward Nav" value={exam.allowBackNav ? "Permitted" : "Strict Sequential"} />
              <SettingRow label="Camera Proctoring" value={exam.webcamEnabled ? "Enforced" : "Disabled"} />
              <SettingRow label="Violation Tolerance" value={`${exam.maxFlags} warning(s)`} />
              <SettingRow label="Instant Score Display" value={exam.showScoreAfter ? "Yes" : "No"} />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-xs">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900 mb-2">
              Lifecycle Controls
            </h3>
            <ExamStatusActions examId={exam.id} status={exam.status} />

            {exam.status === "LIVE" && (
              <Link
                href={`/monitor/${exam.id}`}
                className="w-full text-center px-4 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-semibold transition flex items-center justify-center gap-2 shadow-2xs"
              >
                <Activity className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                <span>Launch Live Proctoring Monitor</span>
              </Link>
            )}

            {exam.attempts.length > 0 && (
              <a
                href={`/api/exams/${exam.id}/export`}
                className="w-full text-center px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold transition flex items-center justify-center gap-2 shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Download All Results (.CSV)</span>
              </a>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start gap-2">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-900 font-semibold text-right max-w-[60%] truncate">{value}</span>
    </div>
  );
}
