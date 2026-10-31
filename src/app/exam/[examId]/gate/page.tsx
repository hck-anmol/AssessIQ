import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ExamGateClient } from "./ExamGateClient";

interface PageProps {
  params: Promise<{ examId: string }>;
}

export default async function ExamGatePage({ params }: PageProps) {
  const { examId } = await params;
  const session = await auth();
  if (!session) redirect("/sign-in");

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    select: {
      id: true,
      title: true,
      durationMin: true,
      allowBackNav: true,
      webcamEnabled: true,
      maxFlags: true,
      accessType: true,
      status: true,
      _count: { select: { questions: true } },
    },
  });

  if (!exam || exam.status === "DRAFT") notFound();
  if (exam.status === "ENDED") redirect(`/exam/${examId}/done`);

  const existingAttempt = await prisma.attempt.findFirst({
    where: { examId, userId: session.user.id, status: "IN_PROGRESS" },
    select: { id: true },
  });

  return (
    <ExamGateClient
      exam={{ ...exam, questionCount: exam._count.questions }}
      existingAttemptId={existingAttempt?.id}
    />
  );
}
