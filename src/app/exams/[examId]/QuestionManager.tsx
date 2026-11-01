"use client";

import { useState } from "react";
import {
  Plus,
  FileUp,
  Edit3,
  Trash2,
  Check,
  X,
  HelpCircle,
  Loader2,
  AlertCircle,
  Bell,
  CheckCircle2,
} from "lucide-react";
import type { QuestionType } from "@prisma/client";

interface QuestionItem {
  id: string;
  type: QuestionType;
  content: string;
  options: unknown;
  correctAnswer: unknown;
  order: number;
  marks: number;
  negMarks: number;
  isRevised?: boolean;
  revisionNotice?: string | null;
}

interface QuestionManagerProps {
  examId: string;
  initialQuestions: QuestionItem[];
  examStatus: string;
}

export function QuestionManager({ examId, initialQuestions, examStatus }: QuestionManagerProps) {
  const [questions, setQuestions] = useState<QuestionItem[]>(initialQuestions);
  const [editingQuestion, setEditingQuestion] = useState<QuestionItem | null>(null);
  const [clarificationNotice, setClarificationNotice] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // PDF Import state
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isParsingPdf, setIsParsingPdf] = useState(false);
  const [parsedPreview, setParsedPreview] = useState<any[] | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);

  // Handle Editing
  const handleStartEdit = (q: QuestionItem) => {
    setEditingQuestion({ ...q });
    setClarificationNotice(q.revisionNotice || "");
    setSaveSuccess(null);
    setSaveError(null);
  };

  const handleSaveQuestion = async () => {
    if (!editingQuestion) return;
    setIsSaving(true);
    setSaveSuccess(null);
    setSaveError(null);

    try {
      let formattedCorrect = editingQuestion.correctAnswer;
      if (editingQuestion.type === "FILL_BLANK") {
        if (typeof editingQuestion.correctAnswer === "string") {
          formattedCorrect = editingQuestion.correctAnswer
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        } else if (Array.isArray(editingQuestion.correctAnswer)) {
          formattedCorrect = editingQuestion.correctAnswer
            .map((s) => String(s).trim())
            .filter(Boolean);
        }
      }

      const res = await fetch(`/api/exams/${examId}/questions/${editingQuestion.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: editingQuestion.content,
          options: Array.isArray(editingQuestion.options) ? editingQuestion.options : undefined,
          correctAnswer: formattedCorrect,
          marks: editingQuestion.marks,
          negMarks: editingQuestion.negMarks,
          clarificationNotice: clarificationNotice.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update question.");
      }

      const data = await res.json();
      setQuestions((prev) =>
        prev.map((q) => (q.id === editingQuestion.id ? { ...q, ...data.question } : q))
      );

      setSaveSuccess(
        data.clearedPreviousAnswers
          ? "Question saved! Real-time update notice dispatched to examinees. Previous attempts have been cleared and shifted to the end."
          : "Question saved! Real-time notice dispatched to examinees."
      );

      setTimeout(() => {
        setEditingQuestion(null);
        setSaveSuccess(null);
      }, 1500);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Error saving question update.");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle PDF Parsing
  const handleParsePdf = async () => {
    if (!pdfFile) return;
    setIsParsingPdf(true);
    setPdfError(null);
    setParsedPreview(null);

    const fd = new FormData();
    fd.append("file", pdfFile);

    try {
      const res = await fetch("/api/exams/parse-pdf", {
        method: "POST",
        body: fd,
      });

      const responseText = await res.text();
      let data: any = null;
      try {
        data = responseText ? JSON.parse(responseText) : null;
      } catch {
        // Fallback for non-JSON response
      }

      if (!res.ok) {
        throw new Error(data?.error || `Server responded with status ${res.status}.`);
      }

      if (!data || !Array.isArray(data.questions)) {
        throw new Error(data?.error || "No questions could be extracted from the document.");
      }

      setParsedPreview(data.questions);
    } catch (err: unknown) {
      setPdfError(err instanceof Error ? err.message : "Error parsing PDF.");
    } finally {
      setIsParsingPdf(false);
    }
  };

  // Commit Parsed PDF questions to Exam
  const handleCommitParsedQuestions = async () => {
    if (!parsedPreview || parsedPreview.length === 0) return;
    setIsParsingPdf(true);

    try {
      const startOrder = questions.length + 1;
      const createdQuestions: QuestionItem[] = [];

      for (let i = 0; i < parsedPreview.length; i++) {
        const q = parsedPreview[i];
        const res = await fetch(`/api/exams/${examId}/questions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: q.type,
            content: q.content,
            options: q.options || [],
            correctAnswer: q.correctAnswer,
            marks: q.marks || 1,
            negMarks: 0,
            order: startOrder + i,
          }),
        });

        if (res.ok) {
          const resData = await res.json();
          createdQuestions.push(resData.question);
        }
      }

      setQuestions((prev) => [...prev, ...createdQuestions]);
      setIsPdfModalOpen(false);
      setParsedPreview(null);
      setPdfFile(null);
    } catch {
      setPdfError("Failed while saving parsed questions to database.");
    } finally {
      setIsParsingPdf(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
      {/* Header with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2 className="font-bold text-sm text-slate-900 uppercase tracking-wider">
            Question Inventory ({questions.length})
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            You can edit questions at any stage. Live revisions automatically notify examinees in session.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPdfModalOpen(true)}
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition"
          >
            <FileUp className="w-3.5 h-3.5 text-blue-600" />
            <span>Import from PDF</span>
          </button>
        </div>
      </div>

      {/* Questions List */}
      <div className="divide-y divide-slate-100">
        {questions.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            <HelpCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">No questions in inventory</p>
            <p className="text-slate-500 mt-0.5">Upload a question paper PDF or add questions manually.</p>
          </div>
        ) : (
          questions.map((q, i) => (
            <div key={q.id} className="py-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4 group">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <span className="text-slate-400 font-mono text-xs font-bold mt-0.5 w-6 flex-shrink-0">
                  #{i + 1}
                </span>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                      {q.type.replace(/_/g, " ")}
                    </span>
                    <span className="text-xs font-semibold text-slate-600">
                      {q.marks} pt{q.marks !== 1 ? "s" : ""}
                    </span>
                    {q.isRevised && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 border border-blue-200 text-blue-700">
                        <Bell className="w-2.5 h-2.5" /> Revised
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-slate-900 leading-relaxed">{q.content}</p>

                  {/* Options preview for MCQ */}
                  {Array.isArray(q.options) && q.options.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-2">
                      {q.options.map((opt: string, optIdx: number) => {
                        const isCorrect =
                          q.correctAnswer === optIdx ||
                          (Array.isArray(q.correctAnswer) && q.correctAnswer.includes(optIdx));

                        return (
                          <div
                            key={optIdx}
                            className={`text-xs px-2.5 py-1 rounded border flex items-center gap-2 ${
                              isCorrect
                                ? "bg-emerald-50 border-emerald-300 text-emerald-900 font-medium"
                                : "bg-slate-50 border-slate-200 text-slate-600"
                            }`}
                          >
                            <span className="font-mono text-[10px] font-bold">
                              {String.fromCharCode(65 + optIdx)}.
                            </span>
                            <span className="truncate">{opt}</span>
                            {isCorrect && <Check className="w-3 h-3 text-emerald-600 ml-auto" />}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Acceptable answers preview for Fill in the Blank */}
                  {q.type === "FILL_BLANK" && q.correctAnswer != null && (
                    <div className="pt-2 flex items-center gap-2 text-xs">
                      <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
                        Acceptable keys:
                      </span>
                      <span className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 font-mono text-[11px]">
                        {Array.isArray(q.correctAnswer)
                          ? (q.correctAnswer as string[]).join(" / ")
                          : String(q.correctAnswer)}
                      </span>
                    </div>
                  )}

                  {q.revisionNotice && (
                    <p className="text-[11px] text-blue-700 bg-blue-50/70 border border-blue-100 rounded px-2 py-0.5 mt-1 inline-block">
                      Candidate note: {q.revisionNotice}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex-shrink-0 flex items-center gap-2">
                <button
                  onClick={() => handleStartEdit(q)}
                  type="button"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition"
                >
                  <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Edit / Revise</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Edit Question Modal ────────────────────────────────────── */}
      {editingQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Revise Question #{editingQuestion.order}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Update prompt, options, answer key, or issue clarification to candidates.
                </p>
              </div>
              <button
                onClick={() => setEditingQuestion(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Question Statement / Prompt
              </label>
              <textarea
                value={editingQuestion.content}
                onChange={(e) =>
                  setEditingQuestion({ ...editingQuestion, content: e.target.value })
                }
                rows={4}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
              />
            </div>

            {/* MCQ Options Editor */}
            {(editingQuestion.type === "MCQ_SINGLE" || editingQuestion.type === "MCQ_MULTI") &&
              Array.isArray(editingQuestion.options) && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Answer Choices (Click checkmark to set correct answer)
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setEditingQuestion({
                          ...editingQuestion,
                          options: [...(Array.isArray(editingQuestion.options) ? editingQuestion.options : []), ""],
                        })
                      }
                      className="text-blue-600 text-xs font-semibold hover:underline inline-flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add Choice
                    </button>
                  </div>

                  {editingQuestion.options.map((opt: string, idx: number) => {
                    const isCorrect =
                      editingQuestion.type === "MCQ_SINGLE"
                        ? editingQuestion.correctAnswer === idx
                        : Array.isArray(editingQuestion.correctAnswer) &&
                          editingQuestion.correctAnswer.includes(idx);

                    return (
                      <div key={idx} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (editingQuestion.type === "MCQ_SINGLE") {
                              setEditingQuestion({ ...editingQuestion, correctAnswer: idx });
                            } else {
                              const curr = Array.isArray(editingQuestion.correctAnswer)
                                ? editingQuestion.correctAnswer
                                : [];
                              const next = curr.includes(idx)
                                ? curr.filter((x: number) => x !== idx)
                                : [...curr, idx];
                              setEditingQuestion({ ...editingQuestion, correctAnswer: next });
                            }
                          }}
                          className={`w-7 h-7 rounded-lg text-xs font-bold font-mono flex items-center justify-center flex-shrink-0 border transition ${
                            isCorrect
                              ? "bg-emerald-600 border-emerald-600 text-white"
                              : "bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200"
                          }`}
                          title="Toggle as correct answer"
                        >
                          {String.fromCharCode(65 + idx)}
                        </button>
                        <input
                          value={opt}
                          onChange={(e) => {
                            const next = [...(editingQuestion.options as string[])];
                            next[idx] = e.target.value;
                            setEditingQuestion({ ...editingQuestion, options: next });
                          }}
                          placeholder={`Choice ${String.fromCharCode(65 + idx)}`}
                          className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-blue-600 transition"
                        />
                        {(editingQuestion.options as string[]).length > 2 && (
                          <button
                            type="button"
                            onClick={() => {
                              const next = (editingQuestion.options as string[]).filter(
                                (_, i) => i !== idx
                              );
                              setEditingQuestion({ ...editingQuestion, options: next });
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

            {/* True/False Editor */}
            {editingQuestion.type === "TRUE_FALSE" && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Correct Answer Key
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[true, false].map((val) => (
                    <button
                      key={String(val)}
                      type="button"
                      onClick={() =>
                        setEditingQuestion({ ...editingQuestion, correctAnswer: val })
                      }
                      className={`py-2.5 rounded-xl border font-semibold text-xs flex items-center justify-center gap-2 transition ${
                        editingQuestion.correctAnswer === val
                          ? "bg-emerald-50 border-emerald-500 text-emerald-800 ring-1 ring-emerald-500"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{val ? "True" : "False"} is Correct</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Fill in the Blank Editor */}
            {editingQuestion.type === "FILL_BLANK" && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Acceptable Answers (Comma-separated keys)
                </label>
                <input
                  type="text"
                  value={
                    Array.isArray(editingQuestion.correctAnswer)
                      ? (editingQuestion.correctAnswer as string[]).join(", ")
                      : String(editingQuestion.correctAnswer || "")
                  }
                  onChange={(e) =>
                    setEditingQuestion({ ...editingQuestion, correctAnswer: e.target.value })
                  }
                  placeholder="e.g. 10, 20, 30 or sun, moon, earth"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-blue-600 transition"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Separate multiple acceptable answers with commas. Evaluation accepts any match regardless of letter case (uppercase/lowercase).
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Points Awarded
                </label>
                <input
                  type="number"
                  min={1}
                  value={editingQuestion.marks}
                  onChange={(e) =>
                    setEditingQuestion({
                      ...editingQuestion,
                      marks: parseInt(e.target.value, 10) || 1,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 text-xs font-semibold focus:outline-none focus:border-blue-600 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Examinee Notification Note (Optional)
                </label>
                <input
                  type="text"
                  value={clarificationNotice}
                  onChange={(e) => setClarificationNotice(e.target.value)}
                  placeholder="e.g. Typo in choice C corrected to O(n log n)"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-blue-600 transition"
                />
              </div>
            </div>

            {saveSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{saveSuccess}</span>
              </div>
            )}

            {saveError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{saveError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingQuestion(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveQuestion}
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-semibold text-xs shadow-xs transition"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Transmitting Updates...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Broadcast Revisions to Examinees</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PDF Import Modal ──────────────────────────────────────── */}
      {isPdfModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Parse Question Paper from PDF
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Upload a text-based question paper PDF. Questions, options, and types are extracted automatically.
                </p>
              </div>
              <button
                onClick={() => {
                  setIsPdfModalOpen(false);
                  setParsedPreview(null);
                  setPdfFile(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* File Upload Box */}
            <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl p-6 text-center transition bg-slate-50/50">
              <FileUp className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-900">
                {pdfFile ? pdfFile.name : "Select Question Paper (.pdf)"}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5 mb-4">
                Ensure text in the PDF is selectable (standard typed documents)
              </p>
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setPdfFile(f);
                }}
                className="hidden"
                id="pdf-upload-input"
              />
              <label
                htmlFor="pdf-upload-input"
                className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-2xs transition"
              >
                Browse PDF Document
              </label>
            </div>

            {pdfFile && !parsedPreview && (
              <button
                onClick={handleParsePdf}
                disabled={isParsingPdf}
                type="button"
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-semibold text-xs shadow-xs transition flex items-center justify-center gap-2"
              >
                {isParsingPdf ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Extracting & Parsing Questions...</span>
                  </>
                ) : (
                  <span>Extract Questions from PDF</span>
                )}
              </button>
            )}

            {pdfError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{pdfError}</span>
              </div>
            )}

            {/* Parsed Preview */}
            {parsedPreview && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">
                    Successfully Extracted ({parsedPreview.length} Items)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Review and append to your assessment roster
                  </span>
                </div>

                <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-60 overflow-y-auto">
                  {parsedPreview.map((q, idx) => (
                    <div key={idx} className="p-3 text-xs space-y-1 bg-white">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-400">#{idx + 1}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                          {q.type.replace(/_/g, " ")}
                        </span>
                        <span className="text-slate-500">{q.marks} mark{q.marks !== 1 ? "s" : ""}</span>
                      </div>
                      <p className="font-medium text-slate-800 truncate">{q.content}</p>
                      {q.options && q.options.length > 0 && (
                        <p className="text-[11px] text-slate-500 truncate">
                          Choices: {q.options.join(" | ")}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setParsedPreview(null);
                      setPdfFile(null);
                    }}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium transition"
                  >
                    Discard
                  </button>
                  <button
                    type="button"
                    onClick={handleCommitParsedQuestions}
                    disabled={isParsingPdf}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Append {parsedPreview.length} Questions to Exam</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
