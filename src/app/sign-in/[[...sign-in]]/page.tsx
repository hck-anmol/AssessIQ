import { SignIn } from "@clerk/nextjs";
import { ShieldCheck, Lock } from "lucide-react";
import Link from "next/link";

export default function SignInPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-900 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Institutional Branding */}
        <div className="text-center mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-bold text-xl tracking-tight text-slate-900"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <span>
              Assess<span className="text-blue-600">IQ</span>
            </span>
          </Link>
          <p className="text-xs text-slate-500 mt-1">Institutional Proctoring & Examination Portal</p>
        </div>

        {/* Clerk Sign In Card */}
        <div className="flex justify-center">
          <SignIn
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "border border-slate-200 shadow-sm rounded-2xl bg-white p-6 sm:p-8",
                headerTitle: "text-slate-900 font-bold text-xl tracking-tight text-center",
                headerSubtitle: "text-slate-500 text-xs text-center",
                formButtonPrimary:
                  "bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm shadow-xs transition",
                socialButtonsBlockButton:
                  "border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-700 font-medium text-xs shadow-2xs transition",
                formFieldInput:
                  "rounded-xl border border-slate-200 text-slate-900 focus:border-blue-600 text-sm",
                footerActionLink: "text-blue-600 hover:text-blue-700 font-semibold text-xs",
              },
            }}
            signUpUrl="/sign-up"
            fallbackRedirectUrl="/onboarding"
          />
        </div>

        <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-slate-400">
          <Lock className="w-3.5 h-3.5" />
          <span>Encrypted Institutional Authentication</span>
        </div>
      </div>
    </main>
  );
}

