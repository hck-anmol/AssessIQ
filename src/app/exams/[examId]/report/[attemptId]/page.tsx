import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { formatMs } from "@/lib/utils";
import { PrintReportButton } from "./PrintReportButton";

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

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 print:border-b-2 print:border-slate-300">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/exams/${examId}`} className="text-slate-400 hover:text-white transition print:hidden">← Back to Exam</Link>
            <h1 className="font-bold">Attempt Report</h1>
          </div>
          <PrintReportButton />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Student info */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold">{attempt.user.name ?? attempt.user.email}</h2>
              <p className="text-slate-400 text-sm mt-0.5">{attempt.user.email}</p>
              {attempt.user.college && (
                <p className="text-slate-500 text-xs mt-1">
                  {attempt.user.college} · {attempt.user.department} · Year {attempt.user.year}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className={`font-semibold text-lg ${isAutoSubmitted ? "text-red-400" : "text-green-400"}`}>
                {isAutoSubmitted ? "⚠️ Auto-Submitted" : "✅ Submitted"}
              </p>
              {attempt.score != null && (
                <p className="text-slate-300 text-sm mt-1">
                  Score: <span className="font-bold text-white">{attempt.score}</span>/{totalMarks}
                  {" "}({totalMarks > 0 ? Math.round((attempt.score / totalMarks) * 100) : 0}%)
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-800 text-sm">
            <div>
              <p className="text-slate-400">Started</p>
              <p>{new Date(attempt.startedAt).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-slate-400">Submitted</p>
              <p>{attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleString() : "—"}</p>
            </div>
            <div>
              <p className="text-slate-400">Duration</p>
              <p>
                {attempt.submittedAt
                  ? formatMs(new Date(attempt.submittedAt).getTime() - new Date(attempt.startedAt).getTime())
                  : "—"}
              </p>
            </div>
          </div>
        </div>

        {/* Proctoring photos */}
        {attempt.photos.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h3 className="font-semibold mb-4">📷 Proctoring Photos</h3>
            <div className="grid grid-cols-3 gap-4">
              {(["BEFORE", "MID", "AFTER"] as const).map((stage) => {
                const photo = attempt.photos.find((p) => p.stage === stage);
                return (
                  <div key={stage} className="text-center">
                    <p className="text-xs text-slate-400 mb-2 uppercase tracking-wide">{stage}</p>
                    {photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photo.url}
                        alt={`${stage} photo`}
                        className="w-full aspect-video object-cover rounded-lg border border-slate-700"
                      />
                    ) : (
                      <div className="w-full aspect-video bg-slate-800 rounded-lg border border-slate-700 flex items-center justify-center">
                        <span className="text-slate-500 text-xs">Not captured</span>
                      </div>
                    )}
                    {photo && (
                      <p className="text-xs text-slate-500 mt-1">
                        {new Date(photo.takenAt).toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Violation flags */}
        {attempt.flags.length > 0 && (
          <div className="bg-slate-900 border border-red-500/20 rounded-2xl p-6">
            <h3 className="font-semibold mb-4 text-red-400">
              ⚠️ Violations ({attempt.flags.length})
            </h3>
            <div className="space-y-2">
              {attempt.flags.map((flag, i) => (
                <div key={flag.id} className="flex items-center gap-4 text-sm">
                  <span className="text-slate-500 font-mono">#{i + 1}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs border ${
                    i + 1 > attempt.exam.maxFlags
                      ? "bg-red-500/20 border-red-500/40 text-red-400"
                      : "bg-amber-500/20 border-amber-500/40 text-amber-400"
                  }`}>
                    {flag.type.replace(/_/g, " ")}
                  </span>
                  <span className="text-slate-400">{new Date(flag.createdAt).toLocaleTimeString()}</span>
                  {flag.details && <span className="text-slate-500">{flag.details}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Per-question breakdown */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h3 className="font-semibold mb-4">⏱ Time per Question</h3>
          <div className="space-y-3">
            {attempt.answers.map((answer) => {
              const pct = answer.timeSpentMs
                ? Math.min(100, (answer.timeSpentMs / (attempt.answers.reduce((s, a) => s + a.timeSpentMs, 0) || 1)) * 100)
                : 0;

              return (
                <div key={answer.id} className="space-y-1">
                  <div className="flex items-start justify-between gap-4 text-sm">
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-300 truncate">
                        <span className="font-mono text-slate-500 mr-2">Q{answer.question.order}.</span>
                        {answer.question.content}
                      </p>
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-4 text-xs text-slate-400">
                      <span>{formatMs(answer.timeSpentMs)} spent</span>
                      <span>{answer.visitCount} visit{answer.visitCount !== 1 ? "s" : ""}</span>
                      {answer.isCorrect != null && (
                        <span className={answer.isCorrect ? "text-green-400" : "text-red-400"}>
                          {answer.isCorrect ? `+${answer.marksAwarded}` : `${answer.marksAwarded}`} pts
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Time bar */}
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        answer.isCorrect === true
                          ? "bg-green-500"
                          : answer.isCorrect === false
                          ? "bg-red-500"
                          : "bg-blue-500"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {/* Student's answer */}
                  {answer.response != null && (
                    <p className="text-xs text-slate-500">
                      Answer: <span className="text-slate-400">{JSON.stringify(answer.response)}</span>
                    </p>
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

