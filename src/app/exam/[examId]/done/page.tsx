import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { CheckCircle2, AlertTriangle, Award, ArrowLeft, ShieldCheck } from "lucide-react";

interface PageProps {
  params: Promise<{ examId: string }>;
}

export default async function ExamDonePage({ params }: PageProps) {
  const { examId } = await params;
  const session = await auth();
  if (!session) redirect("/sign-in");

  const attempt = await prisma.attempt.findFirst({
    where: { examId, userId: session.user.id },
    include: { exam: { select: { title: true, showScoreAfter: true } } },
  });

  const isAutoSubmitted = attempt?.status === "AUTO_SUBMITTED";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-4 sm:p-6">
      <div className="max-w-lg w-full">
        {/* Institutional Branding */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-xs">
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-slate-900 tracking-tight text-base">AssessIQ</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-10 shadow-sm text-center">
          {/* Status Icon */}
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-2xs ${
              isAutoSubmitted
                ? "bg-rose-50 border border-rose-200 text-rose-600"
                : "bg-emerald-50 border border-emerald-200 text-emerald-600"
            }`}
          >
            {isAutoSubmitted ? (
              <AlertTriangle className="w-8 h-8" />
            ) : (
              <CheckCircle2 className="w-8 h-8" />
            )}
          </div>

          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-3 ${
              isAutoSubmitted
                ? "bg-rose-50 border border-rose-200 text-rose-700"
                : "bg-emerald-50 border border-emerald-200 text-emerald-700"
            }`}
          >
            {isAutoSubmitted ? "Disqualified Session" : "Session Finalized"}
          </span>

          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            {isAutoSubmitted ? "Assessment Auto-Submitted" : "Assessment Complete"}
          </h1>

          <p className="text-slate-600 text-sm leading-relaxed mb-6">
            {isAutoSubmitted
              ? "Your assessment was automatically locked and submitted due to multiple detected security or integrity infractions."
              : "Your responses, time allocations, and biometric verification photographs have been safely recorded."}
          </p>

          {/* Conditional Score Display Card */}
          {attempt?.exam.showScoreAfter && attempt.score != null && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 my-6 text-center">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                <Award className="w-4 h-4 text-blue-600" />
                <span>Computed Score</span>
              </div>
              <p className="text-3xl font-extrabold text-slate-900">
                {attempt.score}{" "}
                <span className="text-base font-medium text-slate-500">/ {attempt.totalMarks}</span>
              </p>
              {attempt.totalMarks ? (
                <p className="text-xs font-semibold text-blue-600 mt-1">
                  Grade: {Math.round((attempt.score / attempt.totalMarks) * 100)}%
                </p>
              ) : null}
            </div>
          )}

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-left text-xs text-slate-500 mb-8 space-y-1">
            <p className="font-semibold text-slate-700">Official Submission Record</p>
            <p>
              Your examiner has received your submission log. You may close this tab or return to your student dashboard.
            </p>
          </div>

          <Link
            href="/dashboard/student"
            className="inline-flex items-center justify-center gap-2 w-full py-3 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Candidate Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
