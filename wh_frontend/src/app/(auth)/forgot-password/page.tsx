import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { forgotPasswordAction } from "@/app/(auth)/actions";
import { SubmitButton } from "@/components/forms/submit-button";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function ForgotPasswordPage({
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
        <CardTitle className="text-2xl">Forgot your password?</CardTitle>
        <p className="text-sm text-slate-500">Enter your email and we will send a reset link.</p>
      </CardHeader>

      <CardContent className="space-y-4">
        {params.error ? <Alert variant="error">{params.error}</Alert> : null}
        {params.success ? <Alert variant="success">Check your email for the reset link.</Alert> : null}

        <form action={forgotPasswordAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required autoFocus placeholder="john@company.com" />
          </div>
          <SubmitButton label="Recover password" pendingLabel="Sending..." className="w-full" />
        </form>
      </CardContent>
    </Card>
  );
}
