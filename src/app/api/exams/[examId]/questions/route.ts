import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { z } from "zod";

const questionSchema = z.object({
  type: z.enum(["MCQ_SINGLE", "MCQ_MULTI", "FILL_BLANK", "DESCRIPTIVE", "TRUE_FALSE"]),
  content: z.string().min(1, "Question content is required"),
  options: z.array(z.string()).optional(),
  correctAnswer: z.unknown().optional(),
  marks: z.number().int().min(1).default(1),
  negMarks: z.number().int().min(0).default(0),
  order: z.number().int().min(1),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  const { examId } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: { questions: { orderBy: { order: "asc" } } },
  });
  if (!exam) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ questions: exam.questions });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  const { examId } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const exam = await prisma.exam.findUnique({
    where: { id: examId, createdById: session.user.id },
    select: { id: true },
  });
  if (!exam) return NextResponse.json({ error: "Exam not found or unauthorized" }, { status: 404 });

  const body = await request.json();
  const parsed = questionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { correctAnswer, options, ...rest } = parsed.data;

  const question = await prisma.question.create({
    data: {
      examId,
      ...rest,
      options: options ? (options as unknown as Prisma.InputJsonValue) : undefined,
      correctAnswer:
        correctAnswer !== undefined
          ? (correctAnswer as unknown as Prisma.InputJsonValue)
          : undefined,
    },
  });

  return NextResponse.json({ question }, { status: 201 });
}
