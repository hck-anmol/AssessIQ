import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  const { examId } = await params;
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "EXAMINER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const exam = await prisma.exam.findUnique({
    where: { id: examId, createdById: session.user.id },
    select: { id: true, status: true, _count: { select: { questions: true } } },
  });

  if (!exam) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (exam.status !== "DRAFT") return NextResponse.json({ error: "Already published" }, { status: 400 });
  if (exam._count.questions === 0) return NextResponse.json({ error: "Add at least one question before publishing" }, { status: 400 });

  const updated = await prisma.exam.update({
    where: { id: examId },
    data: { status: "SCHEDULED" },
  });

  return NextResponse.json({ exam: updated });
}

