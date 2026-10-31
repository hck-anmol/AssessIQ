import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  const { examId } = await params;
  const session = await auth();

  if (!session?.user?.id || session.user.role !== "EXAMINER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const exam = await prisma.exam.findFirst({
    where: { id: examId, createdById: session.user.id },
    select: {
      id: true,
      title: true,
      status: true,
      maxFlags: true,
      durationMin: true,
      attempts: {
        select: {
          id: true,
          userId: true,
          status: true,
          flagCount: true,
          startedAt: true,
          submittedAt: true,
          user: {
            select: {
              name: true,
              email: true,
              college: true,
              department: true,
              year: true,
            },
          },
          flags: {
            select: {
              id: true,
              type: true,
              details: true,
              createdAt: true,
            },
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: { startedAt: "desc" },
      },
    },
  });

  if (!exam) {
    return NextResponse.json({ error: "Exam not found" }, { status: 404 });
  }

  return NextResponse.json({ exam });
}

