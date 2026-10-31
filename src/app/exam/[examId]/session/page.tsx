import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ExamSessionClient } from "./ExamSessionClient";

interface PageProps {
  params: Promise<{ examId: string }>;
  searchParams: Promise<{ attemptId?: string }>;
}

export default async function ExamSessionPage({ params, searchParams }: PageProps) {
  const { examId } = await params;
  const { attemptId } = await searchParams;
  const session = await auth();
  if (!session) redirect("/sign-in");

  if (!attemptId) redirect(`/exam/${examId}/gate`);

  const attempt = await prisma.attempt.findFirst({
    where: { id: attemptId, userId: session.user.id, status: "IN_PROGRESS" },
    select: { id: true, startedAt: true },
  });

  if (!attempt) redirect(`/exam/${examId}/done`);

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: {
      questions: {
        orderBy: { order: "asc" },
        select: { id: true, type: true, content: true, options: true, order: true, marks: true },
      },
    },
  });

  if (!exam) notFound();

  const endTime = exam.endTime
    ? exam.endTime.toISOString()
    : new Date(attempt.startedAt.getTime() + exam.durationMin * 60 * 1000).toISOString();

  const existingAnswers = await prisma.answer.findMany({
    where: { attemptId },
    select: { questionId: true, response: true, timeSpentMs: true, visitCount: true, timestamps: true },
  });

  return (
    <ExamSessionClient
      attempt={attempt}
      exam={exam}
      endTime={endTime}
      existingAnswers={existingAnswers}
    />
  );
}
