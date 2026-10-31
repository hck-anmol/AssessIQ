import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  const { examId } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: {
      questions: { orderBy: { order: "asc" } },
      _count: { select: { enrollments: true, attempts: true } },
    },
  });
  if (!exam) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isCreator = exam.createdById === session.user.id;
  const isEnrolled = await prisma.examEnrollment.findFirst({
    where: { examId, userId: session.user.id },
  });
  if (!isCreator && !isEnrolled) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ exam });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  const { examId } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const exam = await prisma.exam.findUnique({
    where: { id: examId, createdById: session.user.id },
    select: { id: true, status: true },
  });
  if (!exam) return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 });

  const body = await request.json();
  const updated = await prisma.exam.update({ where: { id: examId }, data: body });
  return NextResponse.json({ exam: updated });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  const { examId } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const exam = await prisma.exam.findUnique({
    where: { id: examId, createdById: session.user.id },
    select: { id: true, status: true },
  });
  if (!exam) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (exam.status !== "DRAFT") return NextResponse.json({ error: "Can only delete draft exams" }, { status: 400 });

  await prisma.exam.delete({ where: { id: examId } });
  return NextResponse.json({ success: true });
}
