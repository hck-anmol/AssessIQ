import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { MonitorClient } from "./MonitorClient";

interface PageProps {
  params: Promise<{ examId: string }>;
}

export default async function MonitorPage({ params }: PageProps) {
  const { examId } = await params;
  const session = await auth();

  if (!session || session.user.role !== "EXAMINER") {
    redirect("/sign-in");
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

  if (!exam) notFound();

  // Serialize dates for client
  const serializedExam = {
    ...exam,
    attempts: exam.attempts.map((a) => ({
      ...a,
      startedAt: a.startedAt.toISOString(),
      flags: a.flags.map((f) => ({
        ...f,
        createdAt: f.createdAt.toISOString(),
      })),
    })),
  };

  return <MonitorClient initialExam={serializedExam} />;
}

