import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { formatDuration, formatMs } from "@/lib/utils";
import { PublishButton } from "./PublishButton";

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

  const statusColor: Record<string, string> = {
    DRAFT: "bg-slate-500/20 text-slate-400 border-slate-500/30",
    SCHEDULED: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    LIVE: "bg-green-500/20 text-green-400 border-green-500/30",
    ENDED: "bg-slate-600/20 text-slate-500 border-slate-600/30",
  };

  const totalMarks = exam.questions.reduce((s, q) => s + q.marks, 0);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/examiner" className="text-slate-400 hover:text-white transition">← Dashboard</Link>
            <h1 className="font-bold text-lg">{exam.title}</h1>
            <span className={`px-2 py-0.5 rounded-full text-xs border font-medium ${statusColor[exam.status] ?? ""}`}>
              {exam.status}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {exam.status === "DRAFT" && (
              <PublishButton examId={exam.id} />
            )}
            {exam.status === "LIVE" && (
              <Link href={`/monitor/${exam.id}`} className="px-3 py-1.5 rounded-lg bg-green-600/20 border border-green-600/30 text-green-400 text-sm hover:bg-green-600/30 transition">
                🔴 Monitor Live
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-3 gap-6">
        {/* Left: details + questions */}
        <div className="col-span-2 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Duration", value: formatDuration(exam.durationMin) },
              { label: "Questions", value: exam.questions.length },
              { label: "Total Marks", value: totalMarks },
              { label: "Attempts", value: exam._count.attempts },
            ].map((s) => (
              <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl p-3">
                <p className="text-slate-400 text-xs mb-0.5">{s.label}</p>
                <p className="text-xl font-bold">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Questions list */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h2 className="font-semibold mb-4">Questions ({exam.questions.length})</h2>
            <div className="space-y-2">
              {exam.questions.map((q, i) => (
                <div key={q.id} className="flex items-start gap-3 py-2 border-b border-slate-800 last:border-0">
                  <span className="text-slate-500 font-mono text-sm flex-shrink-0 mt-0.5">Q{i + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200 truncate">{q.content}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{q.type.replace(/_/g, " ")} · {q.marks} mark{q.marks !== 1 ? "s" : ""}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Attempts */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h2 className="font-semibold mb-4">Student Attempts ({exam.attempts.length})</h2>
            {exam.attempts.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-6">No attempts yet.</p>
            ) : (
              <div className="space-y-2">
                {exam.attempts.map((attempt) => (
                  <div key={attempt.id} className="flex items-center justify-between py-2.5 border-b border-slate-800 last:border-0">
                    <div>
                      <p className="text-sm font-medium">{attempt.user.name ?? attempt.user.email}</p>
                      <p className="text-xs text-slate-400">
                        {attempt.flags.length > 0 && (
                          <span className="text-red-400 mr-2">⚠️ {attempt.flags.length} violation{attempt.flags.length !== 1 ? "s" : ""}</span>
                        )}
                        <span className={attempt.status === "AUTO_SUBMITTED" ? "text-red-400" : "text-green-400"}>
                          {attempt.status.replace(/_/g, " ")}
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {attempt.score != null && (
                        <span className="text-sm text-slate-300">{attempt.score}/{totalMarks}</span>
                      )}
                      <Link
                        href={`/exams/${exam.id}/report/${attempt.id}`}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-xs hover:border-slate-600 transition"
                      >
                        Report →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: settings sidebar */}
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h3 className="font-semibold text-sm mb-4">Settings</h3>
            <div className="space-y-2.5 text-sm">
              <SettingRow label="Access" value={exam.accessType === "PASSWORD" ? "Password" : "Gmail Filter"} />
              {exam.allowedDomains.length > 0 && (
                <SettingRow label="Domains" value={exam.allowedDomains.join(", ")} />
              )}
              <SettingRow label="Back nav" value={exam.allowBackNav ? "Allowed" : "Disabled"} />
              <SettingRow label="Webcam" value={exam.webcamEnabled ? "Enabled" : "Disabled"} />
              <SettingRow label="Max flags" value={`${exam.maxFlags} warning${exam.maxFlags !== 1 ? "s" : ""}`} />
              <SettingRow label="Show score" value={exam.showScoreAfter ? "Yes" : "No"} />
            </div>
          </div>

          {exam.status === "DRAFT" && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h3 className="font-semibold text-sm mb-3">Actions</h3>
              <PublishButton examId={exam.id} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-400">{label}</span>
      <span className="text-slate-200 text-right max-w-[60%] truncate">{value}</span>
    </div>
  );
}

