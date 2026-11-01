import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ExamStatus } from "@prisma/client";

const VALID_STATUSES: ExamStatus[] = ["DRAFT", "SCHEDULED", "LIVE", "ENDED"];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  const { examId } = await params;
  const session = await auth();

  if (!session?.user?.id || session.user.role !== "EXAMINER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const exam = await prisma.exam.findUnique({
    where: { id: examId, createdById: session.user.id },
    select: { id: true, status: true, _count: { select: { questions: true } } },
  });

  if (!exam) {
    return NextResponse.json({ error: "Exam not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const { status }: { status: ExamStatus } = body;

  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  // Business validations
  if (status === "SCHEDULED" || status === "LIVE") {
    if (exam._count.questions === 0) {
      return NextResponse.json(
        { error: "Cannot start or schedule an exam with 0 questions." },
        { status: 400 }
      );
    }
  }

  const updateData: { status: ExamStatus; startTime?: Date; endTime?: Date } = {
    status,
  };

  if (status === "LIVE") {
    updateData.startTime = new Date();
  } else if (status === "ENDED") {
    updateData.endTime = new Date();
  }

  const updated = await prisma.exam.update({
    where: { id: examId },
    data: updateData,
  });

  return NextResponse.json({ exam: updated });
}

