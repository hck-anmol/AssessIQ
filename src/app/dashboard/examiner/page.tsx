import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { formatDuration } from "@/lib/utils";

export default async function ExaminerDashboard() {
  const session = await auth();
  if (!session || session.user.role !== "EXAMINER") redirect("/dashboard/student");

  const exams = await prisma.exam.findMany({
    where: { createdById: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      _count: { select: { enrollments: true, attempts: true, questions: true } },
    },
  });

  const statusColor = {
    DRAFT: "bg-slate-500/20 text-slate-400 border-slate-500/30",
    SCHEDULED: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    LIVE: "bg-green-500/20 text-green-400 border-green-500/30 animate-pulse",
    ENDED: "bg-slate-600/20 text-slate-500 border-slate-600/30",
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-500 flex items-center justify-center font-bold">A</div>
            <div>
              <h1 className="font-bold text-lg">
                Assess<span className="text-blue-400">IQ</span>
              </h1>
              <p className="text-xs text-slate-400">Examiner Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400">{session.user.email}</span>
            <Link href="/api/auth/signout" className="text-xs text-slate-500 hover:text-slate-300 transition">
              Sign out
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Quick stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Exams", value: exams.length },
            { label: "Live Now", value: exams.filter((e) => e.status === "LIVE").length },
            {
              label: "Total Students",
              value: exams.reduce((s, e) => s + e._count.enrollments, 0),
            },
            {
              label: "Total Attempts",
              value: exams.reduce((s, e) => s + e._count.attempts, 0),
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-slate-900 border border-slate-800 rounded-xl p-4"
            >
              <p className="text-slate-400 text-xs mb-1">{stat.label}</p>
              <p className="text-2xl font-bold">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Create exam button */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Your Exams</h2>
          <Link
            href="/exams/create"
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition"
          >
            + Create Exam
          </Link>
        </div>

        {/* Exam list */}
        {exams.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <p className="text-4xl mb-3">📝</p>
            <p className="text-lg font-medium">No exams yet</p>
            <p className="text-sm mt-1">Create your first exam to get started.</p>
            <Link
              href="/exams/create"
              className="inline-block mt-4 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition"
            >
              Create Exam
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {exams.map((exam) => (
              <div
                key={exam.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center justify-between hover:border-slate-700 transition"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold truncate">{exam.title}</h3>
                    <span
                      className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs border font-medium ${statusColor[exam.status]}`}
                    >
                      {exam.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span>⏱ {formatDuration(exam.durationMin)}</span>
                    <span>❓ {exam._count.questions} questions</span>
                    <span>👥 {exam._count.enrollments} enrolled</span>
                    <span>📋 {exam._count.attempts} attempts</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  {exam.status === "LIVE" && (
                    <Link
                      href={`/monitor/${exam.id}`}
                      className="px-3 py-1.5 rounded-lg bg-green-600/20 border border-green-600/30 text-green-400 text-xs hover:bg-green-600/30 transition"
                    >
                      🔴 Monitor
                    </Link>
                  )}
                  <Link
                    href={`/exams/${exam.id}`}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-xs hover:border-slate-600 transition"
                  >
                    Manage →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
