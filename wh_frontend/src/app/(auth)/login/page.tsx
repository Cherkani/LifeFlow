import Link from "next/link";
import { BarChart3, CheckCircle2, FlaskConical, Lock, Mail, ShieldCheck, Target, Timer } from "lucide-react";

import { loginAction, loginDemoUserAction, signInWithGoogleAction } from "@/app/(auth)/actions";
import { SubmitButton } from "@/components/forms/submit-button";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <section className="auth-fade-item hidden flex-col justify-between rounded-3xl border border-[#9ec1ff]/20 bg-[#071325]/58 p-6 text-white shadow-[0_28px_70px_rgba(2,8,20,0.5)] backdrop-blur-xl sm:p-8 lg:flex">
        <div className="space-y-5">
          <div className="space-y-3">
            <span className="inline-flex items-center rounded-full border border-[#aacaFF]/30 bg-[#13284a]/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#edf4ff]">
              Momentum Grid
            </span>
            <h1 className="auth-title text-3xl font-semibold leading-tight sm:text-4xl">Plan your days with clarity and consistency.</h1>
            <p className="max-w-2xl text-sm leading-relaxed text-blue-100/90 sm:text-base">
              One workspace for your tasks, events, habits, and cycle insights so you can stay focused and keep progress visible.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <article className="rounded-2xl border border-[#97bbff]/20 bg-[#0b1b32]/72 p-4 backdrop-blur-md">
              <Timer size={19} className="mb-3 text-cyan-200" />
              <h3 className="text-sm font-semibold text-white">Daily rhythm</h3>
              <p className="mt-1 text-xs leading-relaxed text-blue-100/85">Track habits and routines with easy daily progress updates.</p>
            </article>
            <article className="rounded-2xl border border-[#97bbff]/20 bg-[#0b1b32]/72 p-4 backdrop-blur-md">
              <Target size={19} className="mb-3 text-emerald-200" />
              <h3 className="text-sm font-semibold text-white">Weekly focus</h3>
              <p className="mt-1 text-xs leading-relaxed text-blue-100/85">Build realistic plans and convert goals into actionable tasks.</p>
            </article>
            <article className="rounded-2xl border border-[#97bbff]/20 bg-[#0b1b32]/72 p-4 backdrop-blur-md">
              <BarChart3 size={19} className="mb-3 text-orange-200" />
              <h3 className="text-sm font-semibold text-white">Performance view</h3>
              <p className="mt-1 text-xs leading-relaxed text-blue-100/85">See trends and analytics to improve your execution over time.</p>
            </article>
          </div>
        </div>

        <p className="mt-8 text-xs text-blue-100/80">
          Built by{" "}
          <a href="https://cherkani.vercel.app/" target="_blank" rel="noreferrer" className="font-semibold text-white underline decoration-white/40 underline-offset-2">
            Aymen Cherkani
          </a>
        </p>
      </section>

      <Card className="auth-card auth-login-card relative border-[#98beff]/24 bg-[#08162b]/66 shadow-[0_24px_58px_rgba(3,10,25,0.55)] backdrop-blur-xl">
        <CardContent className="relative space-y-5 px-6 pb-6 pt-6 sm:px-7">
          <div className="auth-fade-item space-y-2 text-center">
            <h2 className="auth-title text-2xl font-semibold text-white sm:text-[1.75rem]">Welcome back</h2>
            <p className="text-sm text-blue-100/85">Sign in to continue your workflow.</p>
          </div>

          {params.error ? <Alert variant="error">{params.error}</Alert> : null}
          {params.success === "signup-created-check-email" ? (
            <Alert variant="success">Account created. Please confirm your email, then sign in.</Alert>
          ) : null}
          {params.success && params.success !== "signup-created-check-email" ? (
            <Alert variant="success">Account created. You can sign in now.</Alert>
          ) : null}

          <form action={signInWithGoogleAction} className="auth-fade-item">
            <input type="hidden" name="next" value="/dashboard" />
            <button type="submit" className="auth-social-btn w-full" aria-label="Continue with Google" title="Continue with Google">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5">
                <path
                  fill="#EA4335"
                  d="M12.26 10.2v3.95h5.5c-.24 1.27-.96 2.34-2.03 3.06l3.27 2.55c1.9-1.75 2.99-4.33 2.99-7.4 0-.72-.06-1.41-.2-2.08h-9.53z"
                />
                <path
                  fill="#34A853"
                  d="M12 22c2.7 0 4.96-.9 6.61-2.44l-3.27-2.55c-.9.6-2.06.95-3.34.95-2.57 0-4.75-1.73-5.53-4.05l-3.38 2.62A10 10 0 0 0 12 22z"
                />
                <path
                  fill="#4A90E2"
                  d="M6.47 13.9A6.08 6.08 0 0 1 6.16 12c0-.66.12-1.3.31-1.9L3.09 7.47A10 10 0 0 0 2 12c0 1.62.4 3.15 1.09 4.53l3.38-2.63z"
                />
                <path
                  fill="#FBBC05"
                  d="M12 6.05c1.48 0 2.8.51 3.84 1.5l2.86-2.86C16.95 3.05 14.7 2 12 2a10 10 0 0 0-8.91 5.47l3.38 2.62C7.25 7.78 9.43 6.05 12 6.05z"
                />
              </svg>
              <span className="font-medium text-[#f2f6ff]">Continue with Google</span>
            </button>
          </form>

          <div className="relative text-center">
            <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-white/20" />
            <span className="relative bg-transparent px-3 text-xs font-semibold uppercase tracking-[0.12em] text-blue-100/80">or sign in with email</span>
          </div>

          <form action={loginAction} className="auth-fade-item space-y-4">
            <div className="space-y-2.5">
              <Label htmlFor="email" className="text-blue-50">Email address</Label>
              <div className="relative">
                <Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-blue-100/70" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoFocus
                  placeholder="example@company.com"
                  className="h-11 rounded-xl border-[#8cb6ff]/35 bg-[#08162c]/85 pl-9 text-white placeholder:text-blue-100/55 focus:border-[#9bc5ff] focus:ring-[#9bc5ff]"
                />
              </div>
            </div>

            <div className="space-y-2.5">
              <Label htmlFor="password" className="text-blue-50">Password</Label>
              <div className="relative">
                <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-blue-100/70" />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  placeholder="Password"
                  className="h-11 rounded-xl border-[#8cb6ff]/35 bg-[#08162c]/85 pl-9 text-white placeholder:text-blue-100/55 focus:border-[#9bc5ff] focus:ring-[#9bc5ff]"
                />
              </div>
              <div className="flex justify-end pt-1 text-sm">
                <Link href="/forgot-password" className="font-medium text-[#d3e4ff] hover:text-white">
                  Forgot password?
                </Link>
              </div>
            </div>

            <div className="space-y-3 pt-1">
              <div className="flex justify-center">
                <SubmitButton
                  label="Sign in to dashboard"
                  pendingLabel="Signing in..."
                  className="auth-primary-btn h-11 w-full sm:w-[22rem] rounded-xl bg-gradient-to-r from-[#3a6dcc] to-[#5d8ce6] font-semibold text-white hover:from-[#3564bb] hover:to-[#507bcb]"
                />
              </div>
              <div className="flex items-center justify-center gap-2 text-xs text-blue-100/80">
                <ShieldCheck size={14} />
                <span>Secure login powered by encrypted authentication.</span>
              </div>
            </div>
          </form>

          <p className="flex items-center justify-center gap-1.5 border-t border-white/15 pt-4 text-center text-sm text-blue-100/80">
            <CheckCircle2 size={15} className="text-[#aad0ff]" />
            <span>New to Momentum Grid?</span>
            <Link
              href="/signup"
              className="font-semibold text-white underline decoration-white/45 decoration-2 underline-offset-4 transition-colors duration-200 hover:text-[#dce9ff]"
            >
              Create account
            </Link>
          </p>

          <form action={loginDemoUserAction} className="flex justify-center pb-1">
            <button
              type="submit"
              className="group inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[#98beff]/35 bg-[#112449]/80 px-3 text-sm font-medium text-white transition-all duration-300 hover:border-[#bfd8ff]/70 hover:bg-[#17305d]"
              aria-label="Demo"
              title="Demo"
            >
              <FlaskConical size={16} className="shrink-0" />
              <span>Open Demo Space</span>
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
