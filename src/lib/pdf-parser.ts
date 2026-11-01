export interface ParsedQuestion {
  id: string;
  type: "MCQ_SINGLE" | "MCQ_MULTI" | "TRUE_FALSE" | "FILL_BLANK" | "DESCRIPTIVE";
  content: string;
  options?: string[];
  correctAnswer?: unknown;
  marks: number;
}

/**
 * Parses raw text extracted from a PDF document into structured assessment questions.
 * Supports standard numbering, multi-column inline options (e.g. A. ... B. ...),
 * Fill-in-the-blank statements, True/False, and Subjective questions.
 */
export function parseQuestionsFromText(rawText: string): ParsedQuestion[] {
  if (!rawText || !rawText.trim()) return [];

  // Normalize line breaks and clean whitespace
  const normalized = rawText
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\t/g, " ")
    .replace(/\n--\s*\d+\s*of\s*\d+\s*--\n?/gi, "\n"); // remove page markers

  const lines = normalized.split("\n").map((l) => l.trim());

  // Regex to detect start of a question:
  // e.g. "1.", "1)", "(1)", "Q1.", "Q1:", "Question 1:", "Q.1", "1 -"
  const questionStartRegex =
    /^(?:(?:Q|Question|Que|Prob|Problem)\s*(?:\.|\:)?\s*)?\(?(\d{1,3})\)?[\.\:\-\)]\s+(.*)/i;

  const blocks: { number: number; lines: string[] }[] = [];
  let currentBlock: { number: number; lines: string[] } | null = null;

  for (const line of lines) {
    if (!line) continue;

    const match = line.match(questionStartRegex);
    if (match) {
      const qNum = parseInt(match[1], 10);
      const rest = match[2];
      if (currentBlock) {
        blocks.push(currentBlock);
      }
      currentBlock = {
        number: qNum,
        lines: [rest || line],
      };
    } else {
      if (currentBlock) {
        currentBlock.lines.push(line);
      }
    }
  }

  if (currentBlock) {
    blocks.push(currentBlock);
  }

  // Fallback if numbering was not detected
  if (blocks.length === 0) {
    const paragraphs = normalized.split(/\n\s*\n/).filter((p) => p.trim().length > 10);
    paragraphs.forEach((p, i) => {
      blocks.push({
        number: i + 1,
        lines: p.split("\n").map((l) => l.trim()).filter(Boolean),
      });
    });
  }

  const results: ParsedQuestion[] = [];

  for (let idx = 0; idx < blocks.length; idx++) {
    const block = blocks[idx];
    const fullBlockText = block.lines.join("\n");

    // Check for marks in prompt, e.g. [2 marks] or (5M)
    let marks = 1;
    const marksMatch = fullBlockText.match(/\[(\d+)\s*(?:marks?|pts?|m)\]|\((\d+)\s*(?:marks?|pts?|m)\)/i);
    if (marksMatch) {
      marks = parseInt(marksMatch[1] || marksMatch[2], 10) || 1;
    }

    // Check for answer hint in block: e.g. "Ans: B", "Answer: (C)", "Correct Option: A"
    let detectedAnswerKey: string | null = null;
    const ansMatch = fullBlockText.match(/(?:Ans|Answer|Correct Option|Correct)\s*(?:\:|\-)?\s*\(?([A-Da-d]|True|False)\)?/i);
    if (ansMatch) {
      detectedAnswerKey = ansMatch[1].toUpperCase();
    }

    // Option detection: support both line-start AND inline options (e.g. "A. Leaf B. Root")
    const markerRegex = /(?:^|\s+)(?:\(?([A-Fa-f])\)|([A-Fa-f])[\.\:\-])\s+/g;
    const optionMatches: { key: string; startIndex: number; endIndex: number }[] = [];
    let m: RegExpExecArray | null;

    while ((m = markerRegex.exec(fullBlockText)) !== null) {
      const key = (m[1] || m[2]).toUpperCase();
      optionMatches.push({
        key,
        startIndex: m.index,
        endIndex: m.index + m[0].length,
      });
    }

    let promptText = fullBlockText;
    const foundOptions: { key: string; text: string }[] = [];

    // Verify option markers: ensure options start from 'A' or form a coherent list
    if (optionMatches.length >= 2) {
      const firstAIdx = optionMatches.findIndex((o) => o.key === "A");
      const validMatches = firstAIdx !== -1 ? optionMatches.slice(firstAIdx) : optionMatches;

      if (validMatches.length >= 2) {
        promptText = fullBlockText.substring(0, validMatches[0].startIndex).trim();
        for (let i = 0; i < validMatches.length; i++) {
          const cur = validMatches[i];
          const nextStart = i + 1 < validMatches.length ? validMatches[i + 1].startIndex : fullBlockText.length;
          const optText = fullBlockText.substring(cur.endIndex, nextStart).trim();
          if (optText) {
            foundOptions.push({ key: cur.key, text: optText });
          }
        }
      }
    }

    // Clean up prompt text: strip answer hints and marks badges
    promptText = promptText
      .replace(/(?:Ans|Answer|Correct Option|Correct)\s*(?:\:|\-)?\s*\(?[A-Da-dTrueFalse]+\)?/gi, "")
      .replace(/\[\d+\s*(?:marks?|pts?|m)\]|\(\d+\s*(?:marks?|pts?|m)\)/gi, "")
      .trim();

    if (!promptText && foundOptions.length === 0) continue;

    if (foundOptions.length >= 2) {
      // Check if True/False
      const isTF =
        foundOptions.length === 2 &&
        foundOptions.some((o) => o.text.toLowerCase() === "true") &&
        foundOptions.some((o) => o.text.toLowerCase() === "false");

      if (isTF) {
        let correctTF: boolean | null = null;
        if (detectedAnswerKey === "TRUE" || detectedAnswerKey === "A") correctTF = true;
        if (detectedAnswerKey === "FALSE" || detectedAnswerKey === "B") correctTF = false;

        results.push({
          id: `parsed_${Date.now()}_${idx}`,
          type: "TRUE_FALSE",
          content: promptText || "State whether the statement is True or False.",
          marks,
          correctAnswer: correctTF,
        });
      } else {
        // Standard MCQ
        const optionsList = foundOptions.map((o) => o.text.replace(/(?:Ans|Answer)\:.*$/i, "").trim());
        let correctIdx: number | null = null;
        if (detectedAnswerKey) {
          const letterIdx = detectedAnswerKey.charCodeAt(0) - 65; // A -> 0, B -> 1
          if (letterIdx >= 0 && letterIdx < optionsList.length) {
            correctIdx = letterIdx;
          }
        }

        const isMulti = /select all|multiple choice|choose all|all that apply/i.test(promptText);

        results.push({
          id: `parsed_${Date.now()}_${idx}`,
          type: isMulti ? "MCQ_MULTI" : "MCQ_SINGLE",
          content: promptText,
          options: optionsList,
          marks,
          correctAnswer: isMulti ? (correctIdx != null ? [correctIdx] : []) : (correctIdx != null ? correctIdx : 0),
        });
      }
    } else {
      // No options detected: check for Fill in the Blank vs Descriptive
      const lower = promptText.toLowerCase();
      if (lower.includes("____") || lower.includes("blank:") || lower.includes("fill in")) {
        results.push({
          id: `parsed_${Date.now()}_${idx}`,
          type: "FILL_BLANK",
          content: promptText,
          marks,
          correctAnswer: "",
        });
      } else {
        // Descriptive question
        results.push({
          id: `parsed_${Date.now()}_${idx}`,
          type: "DESCRIPTIVE",
          content: promptText,
          marks: marks > 1 ? marks : 5,
          correctAnswer: "",
        });
      }
    }
  }

  return results;
}
