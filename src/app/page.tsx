import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  ShieldCheck,
  Maximize2,
  Camera,
  EyeOff,
  Clock,
  AlertTriangle,
  FileSpreadsheet,
  ArrowRight,
  Lock,
  Building2,
  CheckCircle2,
} from "lucide-react";

export default async function HomePage() {
  const session = await auth();

  if (session) {
    const role = session.user.role;
    redirect(role === "EXAMINER" ? "/dashboard/examiner" : "/dashboard/student");
  }

  const features = [
    {
      icon: Maximize2,
      title: "Fullscreen Lockdown",
      desc: "Zero-tolerance full-screen enforcement with instant exit trap and automatic attempt submission.",
    },
    {
      icon: EyeOff,
      title: "Anti-Screen Capture",
      desc: "DevTools disabled, PrintScreen blocked, clipboard sanitization, and watermark anti-leak layer.",
    },
    {
      icon: Camera,
      title: "Automated Proctoring",
      desc: "Pre-entry identity verification, randomized mid-exam snapshots, and post-submission check.",
    },
    {
      icon: Clock,
      title: "Per-Question Telemetry",
      desc: "Microsecond tracking of time spent per question, visit counts, and sequence traversal history.",
    },
    {
      icon: AlertTriangle,
      title: "Live Violation Alerts",
      desc: "Real-time examiner notification channel for tab switches, focus blur, and unauthorized hotkeys.",
    },
    {
      icon: FileSpreadsheet,
      title: "Institutional Audit Reports",
      desc: "Granular per-student forensic reports with side-by-side photos, violation timelines, and CSV export.",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Navigation */}
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-slate-900">
                Assess<span className="text-blue-600">IQ</span>
              </span>
              <span className="ml-2 hidden sm:inline-block text-[11px] font-medium tracking-wide uppercase px-2 py-0.5 rounded border border-slate-200 text-slate-500 bg-slate-50">
                Institutional Edition
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/sign-in"
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition"
            >
              Sign In
            </Link>
            <Link
              href="/sign-in"
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm hover:shadow transition"
            >
              Access Portal
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-16 px-6 overflow-hidden">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-medium mb-8 shadow-xs">
            <Lock className="w-3.5 h-3.5" />
            Academic Examination & Integrity Infrastructure
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-950 mb-6 leading-tight">
            High-Assurance Proctoring for Modern Institutions
          </h1>

          <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
            AssessIQ secures college and university examinations with strict browser lockdown, 
            continuous behavioral telemetry, and tamper-resistant evidence logging.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/sign-in"
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base shadow-sm hover:shadow-md transition flex items-center justify-center gap-2 group"
            >
              <span>Enter Examination Portal</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/sign-in"
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-semibold text-base shadow-2xs transition"
            >
              Examiner Console
            </Link>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> WebRTC Camera Protocol
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Fullscreen Enforcement
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Institutional Gmail Filtering
            </span>
          </div>
        </div>
      </section>

      {/* Grid of Security Features */}
      <section className="py-16 bg-white border-y border-slate-200/80 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mb-3">
              Standardized Proctoring Controls
            </h2>
            <p className="text-sm text-slate-600 leading-normal">
              Every examination session is governed by multi-tier browser sandboxing and verifiable telemetry.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="p-6 rounded-2xl border border-slate-200/90 bg-slate-50/50 hover:bg-white hover:shadow-md hover:border-slate-300 transition-all duration-200"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-base text-slate-900 mb-2">
                    {item.title}
                  </h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Institutional Assurance */}
      <section className="py-16 px-6 bg-slate-50">
        <div className="max-w-4xl mx-auto bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 sm:p-12 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-slate-300 text-xs font-medium">
              <Building2 className="w-3.5 h-3.5 text-blue-400" />
              University & Higher Education Deployment
            </div>
            <h3 className="text-2xl font-bold tracking-tight">
              Ready to schedule an examination?
            </h3>
            <p className="text-sm text-slate-300 max-w-md">
              Examiners can configure question banks, time limits, and security restrictions in minutes.
            </p>
          </div>

          <Link
            href="/sign-in"
            className="flex-shrink-0 px-6 py-3 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-semibold text-sm transition shadow-md"
          >
            Launch Session
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 py-8 px-6 bg-white text-xs text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span className="font-semibold text-slate-700">AssessIQ</span>
            <span>— Examination & Proctoring Platform</span>
          </div>
          <div>
            © {new Date().getFullYear()} AssessIQ. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
