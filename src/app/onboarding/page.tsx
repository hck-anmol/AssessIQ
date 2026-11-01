"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { ShieldCheck, GraduationCap, UserCheck, ArrowRight, Building, BookOpen } from "lucide-react";

const TEACHER_EMAILS = [
  "anmolkrjha006@gmail.com",
  "gauriborse1808@gmail.com",
];

const departments = [
  "Computer Science",
  "Information Technology",
  "Electronics",
  "Mechanical",
  "Civil",
  "Chemical",
  "Biotechnology",
  "Commerce",
  "Arts",
  "Science",
  "Other",
];

const years = [1, 2, 3, 4, 5];

export default function OnboardingPage() {
  const { user } = useUser();
  const router = useRouter();

  const userEmail = (
    user?.primaryEmailAddress?.emailAddress ||
    user?.emailAddresses?.[0]?.emailAddress ||
    ""
  ).toLowerCase().trim();

  const isTeacher = TEACHER_EMAILS.includes(userEmail);
  const role: "EXAMINER" | "EXAMINEE" = isTeacher ? "EXAMINER" : "EXAMINEE";

  const [college, setCollege] = useState("");
  const [department, setDepartment] = useState("");
  const [year, setYear] = useState<number>(1);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("/api/users/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, college, department, year: role === "EXAMINEE" ? year : null }),
    });

    if (res.ok) {
      router.push(role === "EXAMINER" ? "/dashboard/examiner" : "/dashboard/student");
    } else {
      setLoading(false);
      alert("Something went wrong. Please try again.");
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-900 px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 font-bold text-xl tracking-tight text-slate-900">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <span>
              Assess<span className="text-blue-600">IQ</span>
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 text-center mb-1">
            Complete Profile Verification
          </h1>
          <p className="text-slate-500 text-xs text-center mb-8">
            Please associate your account with your academic institution.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Assigned Role Display */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Assigned Role
              </label>
              <div className="py-3 px-4 rounded-xl border border-blue-200 bg-blue-50/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
                    {isTeacher ? (
                      <GraduationCap className="w-5 h-5" />
                    ) : (
                      <UserCheck className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {isTeacher ? "Examiner / Faculty" : "Examinee / Student"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {isTeacher
                        ? "Designated Examiner Account"
                        : "Candidate / Student Account"}
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                  {role}
                </span>
              </div>
            </div>

            {/* College */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                College or University
              </label>
              <div className="relative">
                <Building className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={college}
                  onChange={(e) => setCollege(e.target.value)}
                  placeholder="e.g. Stanford University"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm transition"
                />
              </div>
            </div>

            {/* Department */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Department / Faculty
              </label>
              <div className="relative">
                <BookOpen className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <select
                  required
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm transition"
                >
                  <option value="" disabled>
                    Select academic department
                  </option>
                  {departments.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Year (only for students) */}
            {role === "EXAMINEE" && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Academic Year
                </label>
                <div className="flex gap-2">
                  {years.map((y) => (
                    <button
                      key={y}
                      type="button"
                      onClick={() => setYear(y)}
                      className={`flex-1 py-2 rounded-lg border text-xs font-semibold transition ${
                        year === y
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      Year {y}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !college || !department}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition flex items-center justify-center gap-2 shadow-xs"
            >
              <span>{loading ? "Registering Profile…" : "Confirm Profile"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
