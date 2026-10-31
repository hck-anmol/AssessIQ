import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { formatDuration } from "@/lib/utils";

export default async function StudentDashboard() {
  const session = await auth();
  if (!session || session.user.role !== "EXAMINEE") redirect("/dashboard/examiner");

  // Find exams this student is eligible for via email/domain
  const userEmail = session.user.email!;
  const userDomain = "@" + userEmail.split("@")[1];

  const [enrolledExams, availableExams, attempts] = await Promise.all([
    // Already enrolled
    prisma.examEnrollment.findMany({
      where: { userId: session.user.id },
      include: {
        exam: {
          include: { _count: { select: { questions: true } } },
        },
      },
    }),
    // Available but not yet enrolled (by domain or email)
    prisma.exam.findMany({
      where: {
        status: { in: ["SCHEDULED", "LIVE"] },
        OR: [
          { allowedDomains: { has: userDomain } },
          { allowedEmails: { has: userEmail } },
          { accessType: "PASSWORD" }, // password exams visible to all
        ],
        enrollments: { none: { userId: session.user.id } },
      },
      include: { _count: { select: { questions: true } } },
    }),
    // Student's attempts
    prisma.attempt.findMany({
      where: { userId: session.user.id },
      select: { examId: true, status: true, score: true, totalMarks: true, submittedAt: true },
    }),
  ]);

  const attemptByExam = Object.fromEntries(attempts.map((a) => [a.examId, a]));

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-500 flex items-center justify-center font-bold">A</div>
            <div>
              <h1 className="font-bold text-lg">
                Assess<span className="text-blue-400">IQ</span>
              </h1>
              <p className="text-xs text-slate-400">Student Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400">{session.user.name}</span>
            <Link href="/api/auth/signout" className="text-xs text-slate-500 hover:text-slate-300 transition">
              Sign out
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* My exams */}
        {enrolledExams.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-4">📋 My Exams</h2>
            <div className="space-y-3">
              {enrolledExams.map(({ exam }) => {
                const attempt = attemptByExam[exam.id];
                const isSubmitted = attempt && attempt.status !== "IN_PROGRESS";
                const isLive = exam.status === "LIVE";

                return (
                  <div
                    key={exam.id}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center justify-between"
                  >
                    <div>
                      <h3 className="font-semibold mb-1">{exam.title}</h3>
                      <div className="flex items-center gap-4 text-xs text-slate-400">
                        <span>⏱ {formatDuration(exam.durationMin)}</span>
                        <span>❓ {exam._count.questions} questions</span>
                        {isSubmitted && attempt.score != null && (
                          <span className="text-green-400">
                            Score: {attempt.score}/{attempt.totalMarks}
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      {isSubmitted ? (
                        <span className="px-3 py-1.5 rounded-lg bg-green-600/20 text-green-400 text-xs border border-green-600/30">
                          ✅ Submitted
                        </span>
                      ) : isLive ? (
                        <Link
                          href={`/exam/${exam.id}/gate`}
                          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition"
                        >
                          Start Exam →
                        </Link>
                      ) : (
                        <span className="px-3 py-1.5 rounded-lg bg-slate-700 text-slate-400 text-xs">
                          {exam.status === "SCHEDULED" ? "⏳ Upcoming" : exam.status}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Available exams */}
        {availableExams.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-4">🔓 Available Exams</h2>
            <div className="space-y-3">
              {availableExams.map((exam) => (
                <div
                  key={exam.id}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center justify-between"
                >
                  <div>
                    <h3 className="font-semibold mb-1">{exam.title}</h3>
                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      <span>⏱ {formatDuration(exam.durationMin)}</span>
                      <span>❓ {exam._count.questions} questions</span>
                      {exam.accessType === "PASSWORD" && <span>🔑 Password required</span>}
                    </div>
                  </div>
                  <Link
                    href={`/exam/${exam.id}/gate`}
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition"
                  >
                    Join →
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )}

        {enrolledExams.length === 0 && availableExams.length === 0 && (
          <div className="text-center py-20 text-slate-500">
            <p className="text-4xl mb-3">🎓</p>
            <p className="text-lg font-medium">No exams available</p>
            <p className="text-sm mt-1">Your examiner hasn't scheduled any exams yet.</p>
          </div>
        )}
      </main>
    </div>
  );
}
