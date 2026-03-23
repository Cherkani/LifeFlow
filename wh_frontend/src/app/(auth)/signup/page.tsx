import Link from "next/link";
import { Globe, Lock, Mail, User } from "lucide-react";

import { signInWithGoogleAction, signUpAction } from "@/app/(auth)/actions";
import { SubmitButton } from "@/components/forms/submit-button";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
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
    <Card className="auth-card relative mx-auto w-full max-w-xl border-[#d7cdea] bg-white shadow-[0_18px_36px_rgba(58,39,89,0.16)] backdrop-blur-0">
      <CardContent className="relative space-y-5 pb-16 pt-6">
        {params.error ? <Alert variant="error">{params.error}</Alert> : null}

        <form action={signUpAction} className="auth-fade-item space-y-4 px-1">
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-[#4c3e73]">Full Name</Label>
            <div className="relative">
              <User size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8f84b2]" />
              <Input
                id="fullName"
                name="fullName"
                type="text"
                required
                autoFocus
                placeholder="John Doe"
                className="h-11 rounded-xl border-[#ddd4ef] bg-white pl-9 focus:border-[#8c7ab5] focus:ring-[#8c7ab5]"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone" className="text-[#4c3e73]">Timezone</Label>
            <div className="relative">
              <Globe size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8f84b2]" />
              <Select
                id="timezone"
                name="timezone"
                required
                defaultValue="Africa/Casablanca"
                className="h-11 rounded-xl border-[#ddd4ef] bg-white pl-9 text-[#4c3e73] focus:border-[#8c7ab5] focus:ring-[#8c7ab5]"
              >
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
            <Label htmlFor="email" className="text-[#4c3e73]">Email</Label>
            <div className="relative">
              <Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8f84b2]" />
              <Input
                id="email"
                name="email"
                type="email"
                required
                placeholder="example@company.com"
                className="h-11 rounded-xl border-[#ddd4ef] bg-white pl-9 focus:border-[#8c7ab5] focus:ring-[#8c7ab5]"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-[#4c3e73]">Password</Label>
            <div className="relative">
              <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8f84b2]" />
              <Input
                id="password"
                name="password"
                type="password"
                minLength={8}
                required
                placeholder="Password"
                className="h-11 rounded-xl border-[#ddd4ef] bg-white pl-9 focus:border-[#8c7ab5] focus:ring-[#8c7ab5]"
              />
            </div>
          </div>

          <div className="flex justify-center pt-1">
            <SubmitButton
              label="Sign up"
              pendingLabel="Creating..."
              className="auth-primary-btn h-11 min-w-44 rounded-xl bg-[#6f5aa5] font-semibold hover:bg-[#5f4b92]"
            />
          </div>
        </form>

        <form action={signInWithGoogleAction} className="auth-fade-item flex justify-center">
          <input type="hidden" name="next" value="/dashboard" />
          <button
            type="submit"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#c8b9e6] bg-white text-sm font-bold text-[#5f4b92] transition-all duration-300 hover:scale-105 hover:bg-[#f6f1ff]"
            aria-label="Continue with Google"
            title="Continue with Google"
          >
            G
          </button>
        </form>

        <div className="relative text-center">
          <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-[#d9d0eb]" />
          <span className="relative bg-white px-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#8b7bac]">or continue with email</span>
        </div>

        <p className="flex items-center justify-center gap-2 text-center text-sm text-[#6b5a91]">
          <span>Already have an account?</span>
          <Link
            href="/login"
            className="rounded-full border border-[#cbbce8] bg-white px-3 py-1 font-semibold text-[#4c3e73] transition-colors duration-200 hover:bg-[#f3ecff]"
          >
            Login here
          </Link>
        </p>

      </CardContent>
    </Card>
  );
}
