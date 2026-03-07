import Link from "next/link";
import { Building2, Globe, Lock, Mail, User } from "lucide-react";

import { loginDemoUserAction, signUpAction } from "@/app/(auth)/actions";
import { SubmitButton } from "@/components/forms/submit-button";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export default async function SignUpPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <Card className="auth-card">
      <CardHeader className="space-y-3">
        <CardTitle className="auth-title text-2xl">Create an account</CardTitle>
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
          <Link
            href="/login"
            className="rounded-lg px-3 py-2 text-center text-sm font-semibold text-slate-600 transition-all duration-200 hover:bg-white/70 hover:text-slate-800"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-white px-3 py-2 text-center text-sm font-semibold text-slate-900 shadow-sm transition-all duration-200 hover:-translate-y-0.5"
          >
            Sign up
          </Link>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {params.error ? <Alert variant="error">{params.error}</Alert> : null}

        <form action={signUpAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <div className="relative">
              <User size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input id="fullName" name="fullName" type="text" required autoFocus placeholder="John Doe" className="pl-9" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="accountName">Workspace Name</Label>
            <div className="relative">
              <Building2 size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input id="accountName" name="accountName" type="text" required placeholder="My Life" className="pl-9" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <div className="relative">
              <Globe size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Select id="timezone" name="timezone" required defaultValue="Africa/Casablanca" className="pl-9">
                <option value="Africa/Casablanca">Africa/Casablanca (Morocco)</option>
                <option value="UTC">UTC</option>
                <option value="Europe/Paris">Europe/Paris</option>
                <option value="Europe/London">Europe/London</option>
                <option value="America/New_York">America/New_York</option>
                <option value="Asia/Dubai">Asia/Dubai</option>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input id="email" name="email" type="email" required placeholder="example@company.com" className="pl-9" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input id="password" name="password" type="password" minLength={8} required placeholder="Password" className="pl-9" />
            </div>
          </div>

          <label htmlFor="terms" className="inline-flex items-start gap-2 text-sm text-slate-600">
            <Checkbox id="terms" name="terms" required className="mt-0.5" />
            <span>I agree to the <span className="font-semibold text-slate-900">terms and conditions</span></span>
          </label>

          <SubmitButton label="Sign up" pendingLabel="Creating..." className="auth-primary-btn w-full" />
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
          Already have an account? <Link href="/login" className="font-semibold text-slate-900">Login here</Link>
        </p>
      </CardContent>
    </Card>
  );
}
