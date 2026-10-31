import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  const { attemptId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("photo") as File | null;
  const stage = formData.get("stage") as string | null;

  if (!file || !stage || !["BEFORE", "MID", "AFTER"].includes(stage)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const attempt = await prisma.attempt.findFirst({
    where: { id: attemptId, userId: session.user.id },
    select: { id: true },
  });

  if (!attempt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const fileName = `${session.user.id}/${attemptId}/${stage.toLowerCase()}-${Date.now()}.jpg`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from("proctoring-photos")
    .upload(fileName, buffer, { contentType: "image/jpeg", upsert: true });

  if (uploadError) {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }

  const { data: urlData } = supabaseAdmin.storage
    .from("proctoring-photos")
    .getPublicUrl(fileName);

  const photo = await prisma.photo.create({
    data: {
      attemptId,
      stage: stage as "BEFORE" | "MID" | "AFTER",
      url: urlData.publicUrl,
    },
  });

  return NextResponse.json({ photo });
}
