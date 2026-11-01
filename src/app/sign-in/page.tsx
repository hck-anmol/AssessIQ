"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SignInContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard/student";

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white px-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm shadow-xl">
          {/* Logo */}
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center font-bold text-xl">
              A
            </div>
            <span className="text-2xl font-bold">
              Assess<span className="text-blue-400">IQ</span>
            </span>
          </div>
          <p className="text-slate-400 text-center text-sm mb-8">
            Secure Online Examination Platform
          </p>

          <h2 className="text-xl font-semibold text-center mb-2">
            Sign in to continue
          </h2>
          <p className="text-slate-400 text-center text-sm mb-8">
            Use your college Google account to sign in.
          </p>

          <button
            onClick={() => signIn("google", { callbackUrl })}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-white text-slate-900 font-semibold hover:bg-slate-100 transition-all duration-200 shadow-md hover:shadow-lg"
          >
            {/* Google Icon */}
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-slate-800" />
            <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
              Or Quick Test
            </span>
            <div className="flex-1 h-px bg-slate-800" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() =>
                signIn("demo-login", {
                  email: "examiner@college.edu",
                  role: "EXAMINER",
                  callbackUrl: "/dashboard/examiner",
                })
              }
              className="px-3 py-2.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 text-xs font-medium transition flex items-center justify-center gap-1.5"
            >
              🎓 Login as Examiner
            </button>
            <button
              onClick={() =>
                signIn("demo-login", {
                  email: "student@college.edu",
                  role: "EXAMINEE",
                  callbackUrl: "/dashboard/student",
                })
              }
              className="px-3 py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-medium transition flex items-center justify-center gap-1.5"
            >
              🎒 Login as Student
            </button>
          </div>

          <p className="text-slate-500 text-xs text-center mt-6">
            By signing in, you agree to our{" "}
            <span className="text-blue-400 cursor-pointer hover:underline">
              Terms of Service
            </span>{" "}
            and{" "}
            <span className="text-blue-400 cursor-pointer hover:underline">
              Privacy Policy
            </span>
            .
          </p>
        </div>

        <p className="text-slate-600 text-xs text-center mt-4">
          AssessIQ © {new Date().getFullYear()}
        </p>
      </div>
    </main>
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInContent />
    </Suspense>
  );
}
