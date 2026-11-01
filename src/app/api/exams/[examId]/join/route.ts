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
      title: true,
      status: true,
      accessType: true,
      password: true,
      allowedDomains: true,
      allowedEmails: true,
      allowedEmailPrefixes: true,
      allowedYear: true,
      allowedDepartment: true,
    },
  });

  if (!exam) return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
  if (exam.status === "DRAFT" || exam.status === "ENDED") {
    return NextResponse.json({ error: "Assessment is not currently active" }, { status: 403 });
  }

  const userEmail = (session.user.email || "").toLowerCase().trim();
  const [userUsername, userDomainRaw] = userEmail.split("@");

  if (exam.accessType === "PASSWORD") {
    const body = await request.json().catch(() => ({}));
    const { password } = body as { password?: string };
    if (!password || password !== exam.password) {
      return NextResponse.json({ error: "Incorrect examination passcode" }, { status: 403 });
    }
  } else {
    // Check specific allowed emails whitelist
    const isExplicitlyAllowed = exam.allowedEmails.some(
      (e) => e.toLowerCase().trim() === userEmail
    );

    if (!isExplicitlyAllowed) {
      // 1. Check Domain restriction
      if (exam.allowedDomains && exam.allowedDomains.length > 0) {
        const domainMatches = exam.allowedDomains.some((d) => {
          const cleanDomain = d.trim().toLowerCase().replace(/^@/, "");
          return cleanDomain === userDomainRaw;
        });

        if (!domainMatches) {
          return NextResponse.json(
            {
              error: `Access Restricted: This examination is strictly restricted to domain(s): ${exam.allowedDomains
                .map((d) => `@${d.replace(/^@/, "")}`)
                .join(", ")}. Your domain is @${userDomainRaw || "unknown"}.`,
            },
            { status: 403 }
          );
        }
      }

      // 2. Check Batch / Email Prefix filter (e.g. "2024" for 202451019@iiitvadodara.ac.in)
      if (exam.allowedEmailPrefixes && exam.allowedEmailPrefixes.length > 0) {
        const prefixMatches = exam.allowedEmailPrefixes.some((p) => {
          const cleanPrefix = p.trim().toLowerCase();
          return cleanPrefix.length > 0 && userUsername.startsWith(cleanPrefix);
        });

        if (!prefixMatches) {
          return NextResponse.json(
            {
              error: `Access Restricted: This examination is restricted to batch/roll prefix(es): ${exam.allowedEmailPrefixes.join(
                ", "
              )}. Your student account ID (${userUsername}) is not eligible for this sitting.`,
            },
            { status: 403 }
          );
        }
      }

      // 3. Optional Year & Department checks
      const dbUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { year: true, department: true },
      });

      if (exam.allowedYear && dbUser?.year && dbUser.year !== exam.allowedYear) {
        return NextResponse.json(
          {
            error: `Access Restricted: This assessment is configured for Year ${exam.allowedYear} candidates. Your profile is Year ${dbUser.year}.`,
          },
          { status: 403 }
        );
      }

      if (
        exam.allowedDepartment &&
        dbUser?.department &&
        dbUser.department.toLowerCase() !== exam.allowedDepartment.toLowerCase()
      ) {
        return NextResponse.json(
          {
            error: `Access Restricted: This assessment is restricted to the ${exam.allowedDepartment} department.`,
          },
          { status: 403 }
        );
      }
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
    return NextResponse.json({ error: "Candidate has already submitted this examination." }, { status: 409 });
  }

  return NextResponse.json({ attemptId: attempt.id });
}
