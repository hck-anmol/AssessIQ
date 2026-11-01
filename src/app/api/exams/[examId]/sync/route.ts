import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  const { examId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const sinceStr = searchParams.get("since");
  const sinceDate = sinceStr ? new Date(sinceStr) : new Date(Date.now() - 30 * 60 * 1000);

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    select: {
      id: true,
      allowBackNav: true,
      status: true,
      questions: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          type: true,
          content: true,
          options: true,
          order: true,
          marks: true,
          isRevised: true,
          revisionNotice: true,
        },
      },
      notifications: {
        where: {
          createdAt: { gte: sinceDate },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!exam) {
    return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
  }

  return NextResponse.json({
    questions: exam.questions,
    notifications: exam.notifications,
    allowBackNav: exam.allowBackNav,
    status: exam.status,
    timestamp: new Date().toISOString(),
  });
}

