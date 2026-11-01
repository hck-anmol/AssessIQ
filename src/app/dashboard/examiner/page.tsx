import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { SignOutButton } from "@clerk/nextjs";
import { formatDuration } from "@/lib/utils";
import {
  ShieldCheck,
  Plus,
  Clock,
  HelpCircle,
  Users,
  FileText,
  Activity,
  ArrowRight,
  LogOut,
  GraduationCap,
  CheckCircle2,
  AlertCircle,
  CalendarCheck,
  Radio,
} from "lucide-react";

export default async function ExaminerDashboard() {
  const session = await auth();
  if (!session || session.user.role !== "EXAMINER") redirect("/dashboard/student");

  const exams = await prisma.exam.findMany({
    where: { createdById: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { enrollments: true, attempts: true, questions: true } },
      attempts: {
        select: {
          id: true,
          status: true,
          score: true,
          totalMarks: true,
        },
      },
    },
  });

  const liveExams = exams.filter((e) => e.status === "LIVE" || e.status === "SCHEDULED");
  const completedExams = exams.filter((e) => e.status === "ENDED" || e.status === "DRAFT");

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-3.5 sticky top-0 z-20 shadow-2xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
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
                  Examiner Console
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-600">
              <GraduationCap className="w-4 h-4 text-slate-400" />
              <span>{session.user.email}</span>
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

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Title Bar & Create Exam Button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/60">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Assessment Management
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Oversee live invigilation, proctoring feeds, and audit completed examination rosters.
            </p>
          </div>
          <Link
            href="/exams/create"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-xs hover:shadow transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create Exam</span>
          </Link>
        </div>

        {/* Top Summary Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
            <p className="text-slate-500 text-xs font-medium mb-1">Live & Scheduled</p>
            <p className="text-2xl font-bold text-blue-600">{liveExams.length}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
            <p className="text-slate-500 text-xs font-medium mb-1">Completed Exams</p>
            <p className="text-2xl font-bold text-slate-900">{completedExams.length}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
            <p className="text-slate-500 text-xs font-medium mb-1">Total Enrolled</p>
            <p className="text-2xl font-bold text-slate-900">
              {exams.reduce((s, e) => s + e._count.enrollments, 0)}
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
            <p className="text-slate-500 text-xs font-medium mb-1">Total Submissions</p>
            <p className="text-2xl font-bold text-emerald-600">
              {exams.reduce((s, e) => s + e._count.attempts, 0)}
            </p>
          </div>
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
              {liveExams.length} Active Session{liveExams.length !== 1 ? "s" : ""}
            </span>
          </div>

          {liveExams.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                <Radio className="w-5 h-5 text-slate-400" />
              </div>
              <p className="text-sm font-semibold text-slate-800">No live examinations in session</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto mb-4">
                Launch an examination or publish a scheduled assessment to activate live proctoring.
              </p>
              <Link
                href="/exams/create"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Exam</span>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {liveExams.map((exam) => (
                <div
                  key={exam.id}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-slate-900 text-base truncate">
                        {exam.title}
                      </h3>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                          exam.status === "LIVE"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-blue-50 text-blue-700 border-blue-200"
                        }`}
                      >
                        {exam.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {formatDuration(exam.durationMin)}
                      </span>
                      <span className="flex items-center gap-1">
                        <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                        {exam._count.questions} questions
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        {exam._count.enrollments} enrolled
                      </span>
                      <span className="flex items-center gap-1 text-emerald-700 font-medium">
                        <Activity className="w-3.5 h-3.5 text-emerald-600" />
                        {exam._count.attempts} active/submitted
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link
                      href={`/monitor/${exam.id}`}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition flex items-center gap-1.5 shadow-xs"
                    >
                      <Activity className="w-3.5 h-3.5" />
                      <span>Monitor Live</span>
                    </Link>
                    <Link
                      href={`/exams/${exam.id}`}
                      className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-50 transition flex items-center gap-1 shadow-2xs"
                    >
                      <span>Manage</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── SECTION 2: COMPLETED EXAM ─────────────────────────────── */}
        <section className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-slate-500" />
              <h2 className="font-bold text-sm text-slate-900 uppercase tracking-wider">
                Completed Exam
              </h2>
            </div>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600">
              {completedExams.length} Concluded
            </span>
          </div>

          {completedExams.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                <CalendarCheck className="w-5 h-5 text-slate-400" />
              </div>
              <p className="text-sm font-semibold text-slate-800">No completed examinations yet</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Concluded assessment sessions and archives will appear here with forensic logs and candidate report cards.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {completedExams.map((exam) => (
                <div
                  key={exam.id}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-slate-900 text-base truncate">
                        {exam.title}
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold border bg-slate-100 text-slate-700 border-slate-200">
                        {exam.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {formatDuration(exam.durationMin)}
                      </span>
                      <span className="flex items-center gap-1">
                        <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                        {exam._count.questions} questions
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                        {exam._count.attempts} submissions logged
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link
                      href={`/exams/${exam.id}`}
                      className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-50 transition flex items-center gap-1 shadow-2xs"
                    >
                      <span>View Records</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    </Link>
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
