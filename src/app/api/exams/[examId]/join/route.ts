import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  const { examId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    select: {
      id: true,
      status: true,
      accessType: true,
      password: true,
      allowedDomains: true,
      allowedEmails: true,
    },
  });

  if (!exam) return NextResponse.json({ error: "Exam not found" }, { status: 404 });
  if (exam.status === "DRAFT" || exam.status === "ENDED") {
    return NextResponse.json({ error: "Exam is not available" }, { status: 403 });
  }

  const userEmail = session.user.email!;
  const userDomain = "@" + userEmail.split("@")[1];

  if (exam.accessType === "PASSWORD") {
    const body = await request.json().catch(() => ({}));
    const { password } = body as { password?: string };
    if (!password || password !== exam.password) {
      return NextResponse.json({ error: "Incorrect password" }, { status: 403 });
    }
  } else {
    const allowed =
      exam.allowedEmails.includes(userEmail) ||
      exam.allowedDomains.includes(userDomain) ||
      (exam.allowedDomains.length === 0 && exam.allowedEmails.length === 0);

    if (!allowed) {
      return NextResponse.json({ error: "You are not authorized to take this exam" }, { status: 403 });
    }
  }

  let attempt = await prisma.attempt.findFirst({
    where: { examId, userId: session.user.id },
    select: { id: true, status: true },
  });

  if (!attempt) {
    await prisma.examEnrollment.upsert({
      where: { examId_userId: { examId, userId: session.user.id } },
      create: { examId, userId: session.user.id },
      update: {},
    });

    attempt = await prisma.attempt.create({
      data: { examId, userId: session.user.id, status: "IN_PROGRESS" },
      select: { id: true, status: true },
    });
  }

  if (attempt.status !== "IN_PROGRESS") {
    return NextResponse.json({ error: "Exam already submitted" }, { status: 409 });
  }

  return NextResponse.json({ attemptId: attempt.id });
}
