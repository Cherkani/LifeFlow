import Link from "next/link";
import { ArrowLeft, Lock, Mail } from "lucide-react";

import { loginAction } from "@/app/(auth)/actions";
import { SubmitButton } from "@/components/forms/submit-button";
import { Alert } from "@/components/ui/alert";
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
    <Card>
      <CardHeader className="space-y-3">
        <Link href="/" className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900">
          <ArrowLeft size={16} className="mr-2" />
          Back to home
        </Link>
        <CardTitle className="text-2xl">Sign in to LifeFlow</CardTitle>
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

          <SubmitButton label="Sign in" pendingLabel="Signing in..." className="w-full" />
        </form>

        <p className="text-center text-sm text-slate-600">
          Not registered? <Link href="/signup" className="font-semibold text-slate-900">Create account</Link>
        </p>
      </CardContent>
    </Card>
  );
}
