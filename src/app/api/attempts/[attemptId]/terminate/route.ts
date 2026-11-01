import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  const { attemptId } = await params;
  const session = await auth();

  if (!session?.user?.id || session.user.role !== "EXAMINER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    include: { exam: { select: { createdById: true } } },
  });

  if (!attempt || attempt.exam.createdById !== session.user.id) {
    return NextResponse.json(
      { error: "Attempt not found or unauthorized" },
      { status: 404 }
    );
  }

  if (attempt.status !== "IN_PROGRESS") {
    return NextResponse.json(
      { error: `Attempt is already ${attempt.status}` },
      { status: 400 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const reason = body.reason || "Disqualified / force-submitted by examiner";

  const updatedAttempt = await prisma.$transaction(async (tx) => {
    await tx.flag.create({
      data: {
        attemptId,
        type: "DEV_TOOLS",
        details: reason,
      },
    });

    return tx.attempt.update({
      where: { id: attemptId },
      data: {
        status: "AUTO_SUBMITTED",
        submittedAt: new Date(),
        flagCount: { increment: 1 },
      },
    });
  });

  return NextResponse.json({ success: true, attempt: updatedAttempt });
}

