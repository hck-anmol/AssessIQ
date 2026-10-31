import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

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
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">{isAutoSubmitted ? "⚠️" : "🎉"}</div>
        <h1 className="text-2xl font-bold mb-2">
          {isAutoSubmitted ? "Exam Auto-Submitted" : "Exam Submitted!"}
        </h1>
        <p className="text-slate-400 mb-2">
          {isAutoSubmitted
            ? "Your exam was automatically submitted due to multiple violations."
            : "Your answers have been recorded successfully."}
        </p>

        {attempt?.exam.showScoreAfter && attempt.score != null && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl px-6 py-4 my-6">
            <p className="text-slate-400 text-sm mb-1">Your Score</p>
            <p className="text-3xl font-bold text-blue-400">
              {attempt.score} / {attempt.totalMarks}
            </p>
            <p className="text-slate-500 text-sm mt-1">
              {attempt.totalMarks
                ? `${Math.round((attempt.score / attempt.totalMarks) * 100)}%`
                : ""}
            </p>
          </div>
        )}

        <p className="text-slate-500 text-sm mt-4 mb-8">
          Your examiner will review your responses and get back to you.
        </p>

        <Link
          href="/dashboard/student"
          className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition"
        >
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
