import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createExamSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().optional(),
  subject: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  durationMin: z.number().int().min(5).max(360).default(60),
  accessType: z.enum(["GMAIL_FILTER", "PASSWORD"]),
  allowedDomains: z.array(z.string()).default([]),
  allowedEmails: z.array(z.string().email()).default([]),
  allowedYear: z.number().int().min(1).max(5).nullable().optional(),
  allowedDepartment: z.string().nullable().optional(),
  password: z.string().nullable().optional(),
  allowBackNav: z.boolean().default(false),
  maxFlags: z.number().int().min(1).max(5).default(1),
  webcamEnabled: z.boolean().default(true),
  showScoreAfter: z.boolean().default(false),
});

// GET /api/exams — list exams for the current user
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.role;

  if (role === "EXAMINER") {
    const exams = await prisma.exam.findMany({
      where: { createdById: session.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { enrollments: true, attempts: true, questions: true },
        },
      },
    });
    return NextResponse.json({ exams });
  } else {
    const enrollments = await prisma.examEnrollment.findMany({
      where: { userId: session.user.id },
      include: {
        exam: { include: { _count: { select: { questions: true } } } },
      },
      orderBy: { enrolledAt: "desc" },
    });
    return NextResponse.json({ exams: enrollments.map((e) => e.exam) });
  }
}

// POST /api/exams — create a new exam
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "EXAMINER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createExamSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const exam = await prisma.exam.create({
    data: {
      ...parsed.data,
      createdById: session.user.id,
      status: "DRAFT",
    },
  });

  return NextResponse.json({ exam }, { status: 201 });
}
