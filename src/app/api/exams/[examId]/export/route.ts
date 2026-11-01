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

  const exam = await prisma.exam.findUnique({
    where: { id: examId, createdById: session.user.id },
    include: {
      questions: { select: { marks: true } },
      attempts: {
        include: {
          user: {
            select: {
              name: true,
              email: true,
              college: true,
              department: true,
              year: true,
            },
          },
          flags: { select: { id: true } },
        },
        orderBy: { startedAt: "desc" },
      },
    },
  });

  if (!exam) {
    return NextResponse.json({ error: "Exam not found" }, { status: 404 });
  }

  const totalPossibleMarks = exam.questions.reduce((sum, q) => sum + q.marks, 0);

  // Generate CSV Header
  const headers = [
    "Student Name",
    "Email",
    "College",
    "Department",
    "Year",
    "Status",
    "Score",
    "Total Marks",
    "Percentage",
    "Violations Count",
    "Started At",
    "Submitted At",
    "Duration (Min)",
  ];

  const escapeCsv = (str: string | number | null | undefined) => {
    if (str == null) return '""';
    const s = String(str).replace(/"/g, '""');
    return `"${s}"`;
  };

  const rows = exam.attempts.map((attempt) => {
    const durationMin = attempt.submittedAt
      ? Math.round(
          (attempt.submittedAt.getTime() - attempt.startedAt.getTime()) / 60000
        )
      : "In Progress";

    const percentage =
      attempt.score != null && totalPossibleMarks > 0
        ? `${((attempt.score / totalPossibleMarks) * 100).toFixed(1)}%`
        : "N/A";

    return [
      escapeCsv(attempt.user.name || "N/A"),
      escapeCsv(attempt.user.email),
      escapeCsv(attempt.user.college || "N/A"),
      escapeCsv(attempt.user.department || "N/A"),
      escapeCsv(attempt.user.year || "N/A"),
      escapeCsv(attempt.status),
      escapeCsv(attempt.score ?? "Pending"),
      escapeCsv(totalPossibleMarks),
      escapeCsv(percentage),
      escapeCsv(attempt.flags.length),
      escapeCsv(attempt.startedAt.toISOString()),
      escapeCsv(attempt.submittedAt?.toISOString() || "Not Submitted"),
      escapeCsv(durationMin),
    ].join(",");
  });

  const csvContent = [headers.join(","), ...rows].join("\r\n");

  const sanitizedTitle = exam.title.replace(/[^a-zA-Z0-9_-]/g, "_");
  const filename = `${sanitizedTitle}_Results_${new Date().toISOString().split("T")[0]}.csv`;

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

