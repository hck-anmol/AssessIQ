import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { SignOutButton } from "@clerk/nextjs";
import { formatDuration } from "@/lib/utils";
import {
  ShieldCheck,
  Clock,
  HelpCircle,
  CheckCircle2,
  Lock,
  ArrowRight,
  LogOut,
  UserCheck,
  CalendarCheck,
  Radio,
  FileCheck2,
} from "lucide-react";

export default async function StudentDashboard() {
  const session = await auth();
  if (!session || session.user.role !== "EXAMINEE") redirect("/dashboard/examiner");

  const userEmail = (session.user.email || "").toLowerCase().trim();
  const [userUsername, userDomainRaw] = userEmail.split("@");

  const [enrolledExams, candidateExams, attempts] = await Promise.all([
    // Already enrolled
    prisma.examEnrollment.findMany({
      where: { userId: session.user.id },
      include: {
        exam: {
          include: { _count: { select: { questions: true } } },
        },
      },
    }),
    // Available candidate exams
    prisma.exam.findMany({
      where: {
        status: { in: ["SCHEDULED", "LIVE"] },
        enrollments: { none: { userId: session.user.id } },
      },
      include: { _count: { select: { questions: true } } },
    }),
    // Student's attempts
    prisma.attempt.findMany({
      where: { userId: session.user.id },
      include: {
        exam: {
          select: {
            id: true,
            title: true,
            durationMin: true,
            _count: { select: { questions: true } },
          },
        },
      },
      orderBy: { startedAt: "desc" },
    }),
  ]);

  // Filter candidate exams by domain, batch prefix, or whitelist
  const availableExams = candidateExams.filter((exam) => {
    if (exam.accessType === "PASSWORD") return true;
    if (exam.allowedEmails.some((e) => e.toLowerCase().trim() === userEmail)) return true;

    if (exam.allowedDomains && exam.allowedDomains.length > 0) {
      const domainMatches = exam.allowedDomains.some(
        (d) => d.trim().toLowerCase().replace(/^@/, "") === userDomainRaw
      );
      if (!domainMatches) return false;
    }

    if (exam.allowedEmailPrefixes && exam.allowedEmailPrefixes.length > 0) {
      const prefixMatches = exam.allowedEmailPrefixes.some(
        (p) => p.trim().length > 0 && userUsername.startsWith(p.trim().toLowerCase())
      );
      if (!prefixMatches) return false;
    }

    return true;
  });

  const attemptByExam = Object.fromEntries(attempts.map((a) => [a.examId, a]));

  // 1. Live Exams: enrolled or available, where student has NOT submitted yet
  const liveEnrolled = enrolledExams
    .map((e) => e.exam)
    .filter((exam) => {
      const att = attemptByExam[exam.id];
      const isDone = att && att.status !== "IN_PROGRESS";
      return !isDone;
    });

  // Combine available candidate exams (not enrolled yet) into Live section
  const allLiveAndScheduled = [
    ...liveEnrolled,
    ...availableExams.filter((ae) => !liveEnrolled.some((le) => le.id === ae.id)),
  ];

  // 2. Completed Exams: where attempt is submitted or ended
  const completedAttempts = attempts.filter((a) => a.status !== "IN_PROGRESS");

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-3.5 sticky top-0 z-20 shadow-2xs">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-slate-900 tracking-tight">
                  Assess<span className="text-blue-600">IQ</span>
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 uppercase tracking-wider">
                  Examinee Portal
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-600">
              <UserCheck className="w-4 h-4 text-slate-400" />
              <span>{session.user.name || session.user.email}</span>
            </div>
            <SignOutButton redirectUrl="/sign-in">
              <button
                type="button"
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs transition flex items-center gap-1.5 cursor-pointer"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </SignOutButton>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Candidate Assessment Portal
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Access active proctored examinations and review your completed test results.
          </p>
        </div>

        {/* ── SECTION 1: LIVE EXAM ──────────────────────────────────── */}
        <section className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <h2 className="font-bold text-sm text-slate-900 uppercase tracking-wider">
                Live Exam
              </h2>
            </div>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">
              {allLiveAndScheduled.length} Active / Available
            </span>
          </div>

          {allLiveAndScheduled.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                <Radio className="w-5 h-5 text-slate-400" />
              </div>
              <p className="text-sm font-semibold text-slate-800">No live examinations active right now</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Any examination scheduled for your department, domain, or batch will appear here as soon as it begins.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {allLiveAndScheduled.map((exam) => {
                const isLive = exam.status === "LIVE";
                return (
                  <div
                    key={exam.id}
                    className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition"
                  >
                    <div>
                      <div className="flex items-center gap-2.5 mb-1.5">
                        <h3 className="font-semibold text-slate-900 text-base">
                          {exam.title}
                        </h3>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            isLive
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-blue-50 text-blue-700 border-blue-200"
                          }`}
                        >
                          {isLive ? "LIVE NOW" : "SCHEDULED"}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {formatDuration(exam.durationMin)}
                        </span>
                        <span className="flex items-center gap-1">
                          <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                          {exam._count.questions} questions
                        </span>
                        {exam.accessType === "PASSWORD" && (
                          <span className="flex items-center gap-1 text-amber-700 font-medium">
                            <Lock className="w-3.5 h-3.5 text-amber-600" />
                            Password Protected
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isLive ? (
                        <Link
                          href={`/exam/${exam.id}/gate`}
                          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition flex items-center gap-1.5"
                        >
                          <span>Begin Assessment</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      ) : (
                        <span className="px-3.5 py-1.5 rounded-xl bg-slate-100 text-slate-600 text-xs font-medium border border-slate-200">
                          Starts Soon
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── SECTION 2: COMPLETED EXAM ─────────────────────────────── */}
        <section className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <FileCheck2 className="w-4 h-4 text-slate-500" />
              <h2 className="font-bold text-sm text-slate-900 uppercase tracking-wider">
                Completed Exam
              </h2>
            </div>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600">
              {completedAttempts.length} Submitted
            </span>
          </div>

          {completedAttempts.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                <CalendarCheck className="w-5 h-5 text-slate-400" />
              </div>
              <p className="text-sm font-semibold text-slate-800">No completed examinations yet</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Once you finish an examination under proctored lockdown, your submission record and marks will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {completedAttempts.map((attempt) => (
                <div
                  key={attempt.id}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition"
                >
                  <div>
                    <h3 className="font-semibold text-slate-900 text-base mb-1">
                      {attempt.exam.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {formatDuration(attempt.exam.durationMin)}
                      </span>
                      <span className="flex items-center gap-1">
                        <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                        {attempt.exam._count.questions} questions
                      </span>
                      {attempt.submittedAt && (
                        <span>
                          Submitted {new Date(attempt.submittedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    {attempt.score != null ? (
                      <div className="text-right">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                          Final Score
                        </p>
                        <p className="text-base font-bold text-emerald-700">
                          {attempt.score} / {attempt.totalMarks} pts
                        </p>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Submitted</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
