import Link from "next/link";
import { Lock, Mail } from "lucide-react";

import { loginAction, loginDemoUserAction } from "@/app/(auth)/actions";
import { SubmitButton } from "@/components/forms/submit-button";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const params = await searchParams;

  return (
    <Card className="auth-card">
      <CardHeader className="space-y-3">
        <CardTitle className="auth-title text-2xl">Sign in to Momentum Grid</CardTitle>
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
          <Link
            href="/login"
            className="rounded-lg bg-white px-3 py-2 text-center text-sm font-semibold text-slate-900 shadow-sm transition-all duration-200 hover:-translate-y-0.5"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-lg px-3 py-2 text-center text-sm font-semibold text-slate-600 transition-all duration-200 hover:bg-white/70 hover:text-slate-800"
          >
            Sign up
          </Link>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {params.error ? <Alert variant="error">{params.error}</Alert> : null}
        {params.success ? <Alert variant="success">Account created. You can sign in now.</Alert> : null}

        <form action={loginAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input id="email" name="email" type="email" required autoFocus placeholder="example@company.com" className="pl-9" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input id="password" name="password" type="password" required minLength={8} placeholder="Password" className="pl-9" />
            </div>
            <div className="flex items-center justify-between pt-1 text-sm">
              <label htmlFor="remember" className="inline-flex items-center gap-2 text-slate-600">
                <Checkbox id="remember" name="remember" />
                Remember me
              </label>
              <Link href="/forgot-password" className="text-slate-600 hover:text-slate-900">
                Forgot password?
              </Link>
            </div>
          </div>

          <SubmitButton label="Sign in" pendingLabel="Signing in..." className="auth-primary-btn w-full" />
        </form>

        <div className="pt-1">
          <p className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">Google (soon)</p>
          <div className="flex items-center justify-center gap-2">
            <Button type="button" variant="outline" size="icon" disabled aria-label="Continue with Google (coming soon)">
              <span className="text-base font-bold text-slate-600">G</span>
            </Button>
            <form action={loginDemoUserAction}>
              <button
                type="submit"
                className="inline-flex h-10 items-center justify-center rounded-lg border border-[#8c88bc] bg-[#f5f4fb] px-3 text-sm font-semibold text-[#5e5a87] transition-colors hover:bg-[#eceaf7]"
              >
                Demo
              </button>
            </form>
          </div>
        </div>

        <p className="text-center text-sm text-slate-600">
          Not registered? <Link href="/signup" className="font-semibold text-slate-900">Create account</Link>
        </p>
      </CardContent>
    </Card>
  );
}
