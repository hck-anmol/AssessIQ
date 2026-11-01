import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const flagSchema = z.object({
  type: z.enum(["FULLSCREEN_EXIT", "TAB_SWITCH", "PRINT_SCREEN", "COPY_ATTEMPT", "DEV_TOOLS"]),
  details: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  const { attemptId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = flagSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const attempt = await prisma.attempt.findFirst({
    where: { id: attemptId, userId: session.user.id },
    select: { id: true, status: true, flagCount: true, exam: { select: { maxFlags: true } } },
  });

  if (!attempt) {
    return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
  }

  if (attempt.status !== "IN_PROGRESS") {
    return NextResponse.json(
      { error: "Attempt is already completed", status: attempt.status },
      { status: 400 }
    );
  }

  const { type, details } = parsed.data;

  const flag = await prisma.flag.create({
    data: { attemptId, type, details },
  });

  const newFlagCount = attempt.flagCount + 1;
  await prisma.attempt.update({
    where: { id: attemptId },
    data: { flagCount: newFlagCount },
  });

  const shouldAutoSubmit = newFlagCount > attempt.exam.maxFlags;
  if (shouldAutoSubmit) {
    await prisma.attempt.update({
      where: { id: attemptId },
      data: { status: "AUTO_SUBMITTED", submittedAt: new Date() },
    });
  }

  return NextResponse.json({ flag, newFlagCount, autoSubmitted: shouldAutoSubmit });
}
