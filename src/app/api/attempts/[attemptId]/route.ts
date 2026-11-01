import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

const timestampSchema = z.object({
  enteredAt: z.string(),
  leftAt: z.string().nullable(),
});

const answerDataSchema = z.object({
  response: z.unknown().optional(),
  timeSpentMs: z.number(),
  visitCount: z.number(),
  timestamps: z.array(timestampSchema),
});

type AnswerData = z.infer<typeof answerDataSchema>;

const submitSchema = z.object({
  answers: z.record(z.string(), answerDataSchema),
  autoSubmitted: z.boolean().optional(),
});

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  const { attemptId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const attempt = await prisma.attempt.findFirst({
    where: {
      id: attemptId,
      OR: [
        { userId: session.user.id },
        { exam: { createdById: session.user.id } },
      ],
    },
    include: {
      answers: {
        include: {
          question: { select: { id: true, content: true, type: true, order: true } },
        },
      },
      flags: true,
      photos: true,
      exam: { select: { title: true, durationMin: true, allowBackNav: true, maxFlags: true } },
      user: { select: { name: true, email: true } },
    },
  });

  if (!attempt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ attempt });
}

// ── POST ──────────────────────────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  const { attemptId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const attempt = await prisma.attempt.findFirst({
    where: { id: attemptId, userId: session.user.id, status: "IN_PROGRESS" },
    include: { exam: { include: { questions: true } } },
  });

  if (!attempt) {
    return NextResponse.json({ error: "Attempt not found or already submitted" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { answers, autoSubmitted } = parsed.data;

  const answerUpserts = Object.entries(answers).map(
    ([questionId, ansData]: [string, AnswerData]) => {
      const responseJson =
        ansData.response !== undefined
          ? (ansData.response as unknown as Prisma.InputJsonValue)
          : undefined;
      const timestampsJson = { visits: ansData.timestamps } as unknown as Prisma.InputJsonValue;

      return prisma.answer.upsert({
        where: { attemptId_questionId: { attemptId, questionId } },
        create: {
          attemptId,
          questionId,
          response: responseJson,
          timeSpentMs: ansData.timeSpentMs,
          visitCount: ansData.visitCount,
          timestamps: timestampsJson,
        },
        update: {
          response: responseJson,
          timeSpentMs: ansData.timeSpentMs,
          visitCount: ansData.visitCount,
          timestamps: timestampsJson,
        },
      });
    }
  );

  await Promise.all(answerUpserts);

  let totalScore = 0;
  let totalMarks = 0;

  const scoringPromises = attempt.exam.questions.map(async (question) => {
    totalMarks += question.marks;
    const ansData: AnswerData | undefined = answers[question.id];
    if (!ansData || ansData.response == null) return;

    let isCorrect = false;

    if (question.type === "MCQ_SINGLE" || question.type === "TRUE_FALSE") {
      isCorrect =
        JSON.stringify(ansData.response) === JSON.stringify(question.correctAnswer);
    } else if (question.type === "MCQ_MULTI") {
      const studentAns = (ansData.response as number[]).slice().sort();
      const correct = ((question.correctAnswer ?? []) as number[]).slice().sort();
      isCorrect = JSON.stringify(studentAns) === JSON.stringify(correct);
    } else if (question.type === "FILL_BLANK") {
      const studentAns = String(ansData.response ?? "").trim().toLowerCase();
      let acceptableAnswers: string[] = [];

      const rawCorrect = question.correctAnswer;
      if (Array.isArray(rawCorrect)) {
        acceptableAnswers = rawCorrect
          .map((a) => String(a).trim().toLowerCase())
          .filter(Boolean);
      } else if (typeof rawCorrect === "string") {
        try {
          const parsed = JSON.parse(rawCorrect);
          if (Array.isArray(parsed)) {
            acceptableAnswers = parsed
              .map((a) => String(a).trim().toLowerCase())
              .filter(Boolean);
          } else {
            acceptableAnswers = rawCorrect
              .split(",")
              .map((a) => a.trim().toLowerCase())
              .filter(Boolean);
          }
        } catch {
          acceptableAnswers = rawCorrect
            .split(",")
            .map((a) => a.trim().toLowerCase())
            .filter(Boolean);
        }
      }

      isCorrect = Boolean(studentAns && acceptableAnswers.includes(studentAns));
    }

    const marksAwarded = isCorrect ? question.marks : -(question.negMarks ?? 0);
    if (marksAwarded > 0) totalScore += marksAwarded;

    await prisma.answer.update({
      where: { attemptId_questionId: { attemptId, questionId: question.id } },
      data: { isCorrect, marksAwarded },
    });
  });

  await Promise.all(scoringPromises);

  const updatedAttempt = await prisma.attempt.update({
    where: { id: attemptId },
    data: {
      status: autoSubmitted ? "AUTO_SUBMITTED" : "SUBMITTED",
      submittedAt: new Date(),
      score: totalScore,
      totalMarks,
    },
  });

  return NextResponse.json({ attempt: updatedAttempt, score: totalScore, totalMarks });
}
