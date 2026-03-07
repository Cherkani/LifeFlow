import Link from "next/link";
import { ArrowLeft, Building2, Globe, Lock, Mail, User } from "lucide-react";

import { signUpAction } from "@/app/(auth)/actions";
import { SubmitButton } from "@/components/forms/submit-button";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function SignUpPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <Card>
      <CardHeader className="space-y-3">
        <Link href="/" className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900">
          <ArrowLeft size={16} className="mr-2" />
          Back to home
        </Link>
        <CardTitle className="text-2xl">Create an account</CardTitle>
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
              <Input id="timezone" name="timezone" type="text" defaultValue="UTC" required placeholder="UTC" className="pl-9" />
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

          <SubmitButton label="Sign up" pendingLabel="Creating..." className="w-full" />
        </form>

        <p className="text-center text-sm text-slate-600">
          Already have an account? <Link href="/login" className="font-semibold text-slate-900">Login here</Link>
        </p>
      </CardContent>
    </Card>
  );
}
