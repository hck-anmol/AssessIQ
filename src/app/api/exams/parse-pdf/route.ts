export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { parseQuestionsFromText } from "@/lib/pdf-parser";
import { PDFParse } from "pdf-parse";

function fallbackExtractPdfText(buffer: Buffer): string {
  try {
    const raw = buffer.toString("binary");
    const textChunks: string[] = [];
    const tjRegex = /\(([^)]+)\)\s*Tj/g;
    let m: RegExpExecArray | null;
    while ((m = tjRegex.exec(raw)) !== null) {
      if (m[1]) textChunks.push(m[1]);
    }
    if (textChunks.length === 0) {
      const arrayTjRegex = /\[([^\]]+)\]\s*TJ/gi;
      while ((m = arrayTjRegex.exec(raw)) !== null) {
        const inner = m[1].replace(/<[^>]+>/g, "").replace(/\(([^)]+)\)/g, "$1 ");
        textChunks.push(inner);
      }
    }
    return textChunks.join(" ");
  } catch {
    return "";
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "EXAMINER") {
    return NextResponse.json({ error: "Unauthorized. Examiner privileges required." }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No PDF file attached." }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Uploaded file must be a valid .pdf document." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let extractedText = "";

    try {
      const parser = new PDFParse({ data: buffer });
      const pdfData = await parser.getText({ pageJoiner: "" });
      await parser.destroy();
      extractedText = pdfData?.text || "";
    } catch (parseErr) {
      console.warn("Primary PDFParse engine failed, attempting fallback recovery:", parseErr);
      extractedText = fallbackExtractPdfText(buffer);
    }

    if (!extractedText.trim()) {
      extractedText = fallbackExtractPdfText(buffer);
    }

    if (!extractedText.trim()) {
      return NextResponse.json(
        {
          error:
            "No extractable text was found in the PDF. Please ensure the PDF is a text-based document (not scanned raster images).",
        },
        { status: 422 }
      );
    }

    const questions = parseQuestionsFromText(extractedText);

    if (questions.length === 0) {
      return NextResponse.json(
        {
          error:
            "Unable to parse distinct questions from this document. Please ensure questions are numbered (e.g. '1.', 'Q1.') and options labeled (e.g. 'A.', 'B.').",
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      count: questions.length,
      questions,
    });
  } catch (err: unknown) {
    console.error("PDF parse route error:", err);
    const message = err instanceof Error ? err.message : "Failed to parse PDF document.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
