import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await auth();

  if (session) {
    const role = session.user.role;
    redirect(role === "EXAMINER" ? "/dashboard/examiner" : "/dashboard/student");
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white px-4">
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center font-bold text-2xl shadow-lg">
            A
          </div>
          <h1 className="text-4xl font-bold tracking-tight">
            Assess<span className="text-blue-400">IQ</span>
          </h1>
        </div>
        <p className="text-slate-400 text-lg max-w-md">
          Secure, proctored online examinations for schools and colleges.
          Full-screen enforced. Zero compromise.
        </p>
      </div>

      {/* Feature pills */}
      <div className="flex flex-wrap gap-2 justify-center mb-10 max-w-lg">
        {[
          "🔒 Fullscreen Lock",
          "📷 Webcam Proctoring",
          "🚫 No Screenshots",
          "⏱ Per-Question Analytics",
          "🚨 Auto-Submit on Violation",
          "📊 Rich Reports",
        ].map((f) => (
          <span
            key={f}
            className="px-3 py-1 rounded-full bg-white/10 border border-white/20 text-sm text-slate-300 backdrop-blur-sm"
          >
            {f}
          </span>
        ))}
      </div>

      {/* CTA */}
      <Link
        href="/sign-in"
        className="px-8 py-3 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-semibold text-lg shadow-lg transition-all duration-200 hover:scale-105"
      >
        Get Started →
      </Link>

      <p className="mt-6 text-slate-500 text-sm">
        Sign in with your college Google account
      </p>
    </main>
  );
}
