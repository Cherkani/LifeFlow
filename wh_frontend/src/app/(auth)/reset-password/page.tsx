import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";

import { resetPasswordAction } from "@/app/(auth)/actions";
import { SubmitButton } from "@/components/forms/submit-button";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function ResetPasswordPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const params = await searchParams;

  return (
    <Card>
      <CardHeader className="space-y-3">
        <Link href="/login" className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900">
          <ArrowLeft size={16} className="mr-2" />
          Back to sign in
        </Link>
        <CardTitle className="text-2xl">Reset password</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {params.error ? <Alert variant="error">{params.error}</Alert> : null}
        {params.success ? <Alert variant="success">Password updated. You can sign in now.</Alert> : null}

        <form action={resetPasswordAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New password</Label>
            <div className="relative">
              <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input id="password" name="password" type="password" required minLength={8} autoFocus placeholder="Password" className="pl-9" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <div className="relative">
              <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input id="confirmPassword" name="confirmPassword" type="password" required minLength={8} placeholder="Confirm Password" className="pl-9" />
            </div>
          </div>

          <SubmitButton label="Reset password" pendingLabel="Resetting..." className="w-full" />
        </form>
      </CardContent>
    </Card>
  );
}
