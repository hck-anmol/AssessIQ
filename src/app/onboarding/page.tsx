"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

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
  const { data: session, update } = useSession();
  const router = useRouter();

  const [role, setRole] = useState<"EXAMINER" | "EXAMINEE">("EXAMINEE");
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
      await update({ role });
      router.push(role === "EXAMINER" ? "/dashboard/examiner" : "/dashboard/student");
    } else {
      setLoading(false);
      alert("Something went wrong. Please try again.");
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white px-4">
      <div className="w-full max-w-lg">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm shadow-xl">
          <h1 className="text-2xl font-bold text-center mb-1">
            Welcome, {session?.user?.name?.split(" ")[0]}! 👋
          </h1>
          <p className="text-slate-400 text-center text-sm mb-8">
            Tell us a bit about yourself to get started.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Role selection */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                I am a...
              </label>
              <div className="grid grid-cols-2 gap-3">
                {(["EXAMINER", "EXAMINEE"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`py-3 rounded-xl border font-medium transition-all ${
                      role === r
                        ? "bg-blue-500 border-blue-400 text-white"
                        : "bg-white/5 border-white/10 text-slate-300 hover:border-white/30"
                    }`}
                  >
                    {r === "EXAMINER" ? "👨‍🏫 Examiner" : "👩‍🎓 Student"}
                  </button>
                ))}
              </div>
            </div>

            {/* College */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                College / Institution
              </label>
              <input
                type="text"
                required
                value={college}
                onChange={(e) => setCollege(e.target.value)}
                placeholder="e.g. IIT Bombay"
                className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-blue-400 transition"
              />
            </div>

            {/* Department */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Department
              </label>
              <select
                required
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-white/10 text-white focus:outline-none focus:border-blue-400 transition"
              >
                <option value="" disabled>
                  Select department
                </option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Year (only for students) */}
            {role === "EXAMINEE" && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Year of Study
                </label>
                <div className="flex gap-2">
                  {years.map((y) => (
                    <button
                      key={y}
                      type="button"
                      onClick={() => setYear(y)}
                      className={`flex-1 py-2 rounded-lg border font-medium transition-all text-sm ${
                        year === y
                          ? "bg-blue-500 border-blue-400 text-white"
                          : "bg-white/5 border-white/10 text-slate-300 hover:border-white/30"
                      }`}
                    >
                      {y}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !college || !department}
              className="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-all duration-200"
            >
              {loading ? "Setting up your account..." : "Complete Setup →"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
