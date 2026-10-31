import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const onboardingSchema = z.object({
  role: z.enum(["EXAMINER", "EXAMINEE"]),
  college: z.string().min(2).max(200),
  department: z.string().min(2).max(100),
  year: z.number().int().min(1).max(5).nullable(),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = onboardingSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { role, college, department, year } = parsed.data;

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: { role, college, department, year },
  });

  return NextResponse.json({ user });
}
