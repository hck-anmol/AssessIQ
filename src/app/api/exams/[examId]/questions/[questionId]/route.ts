import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { z } from "zod";

const updateQuestionSchema = z.object({
  content: z.string().min(1, "Question content is required"),
  options: z.array(z.string()).optional(),
  correctAnswer: z.unknown().optional(),
  marks: z.number().int().min(1).default(1),
  negMarks: z.number().int().min(0).default(0),
  clarificationNotice: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ examId: string; questionId: string }> }
) {
  const { examId, questionId } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify that the exam belongs to the examiner
  const exam = await prisma.exam.findUnique({
    where: { id: examId, createdById: session.user.id },
    select: { id: true, allowBackNav: true },
  });

  if (!exam) {
    return NextResponse.json({ error: "Assessment not found or unauthorized" }, { status: 404 });
  }

  const existingQuestion = await prisma.question.findUnique({
    where: { id: questionId, examId },
    select: { id: true, order: true },
  });

  if (!existingQuestion) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = updateQuestionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { clarificationNotice, options, correctAnswer, ...rest } = parsed.data;

  // 1. Update the Question record
  const updatedQuestion = await prisma.question.update({
    where: { id: questionId },
    data: {
      ...rest,
      options: options ? (options as unknown as Prisma.InputJsonValue) : undefined,
      correctAnswer:
        correctAnswer !== undefined
          ? (correctAnswer as unknown as Prisma.InputJsonValue)
          : undefined,
      isRevised: true,
      revisionNotice: clarificationNotice || "Question updated by the examiner.",
    },
  });

  // 2. Publish an ExamNotification to notify examinees
  await prisma.examNotification.create({
    data: {
      examId,
      questionId,
      type: "QUESTION_UPDATED",
      title: `Question #${existingQuestion.order} Updated`,
      message:
        clarificationNotice ||
        `Question #${existingQuestion.order} was updated by the examiner. Please review the updated content.`,
    },
  });

  // 3. If back-navigation is OFF, delete previous answers for in-progress attempts
  // so the student can re-attempt it cleanly
  if (!exam.allowBackNav) {
    await prisma.answer.deleteMany({
      where: {
        questionId,
        attempt: {
          examId,
          status: "IN_PROGRESS",
        },
      },
    });
  }

  return NextResponse.json({
    success: true,
    question: updatedQuestion,
    noticeSent: true,
    clearedPreviousAnswers: !exam.allowBackNav,
  });
}

