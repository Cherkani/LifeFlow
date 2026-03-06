import Link from "next/link";

import { SubmitButton } from "@/components/forms/submit-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { signUpAction } from "@/app/(auth)/actions";

export default async function SignUpPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <Card className="border-0 bg-white/95">
      <CardHeader className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-blue-600">LifeFlow</p>
        <CardTitle className="text-2xl">Create your workspace</CardTitle>
        <p className="text-sm text-slate-500">Get your strategic system online in less than a minute.</p>
      </CardHeader>

      <CardContent>
        {params.error ? (
          <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{params.error}</p>
        ) : null}

        <form action={signUpAction} className="space-y-3">
          <div className="space-y-1">
            <label htmlFor="fullName" className="text-sm font-medium text-slate-700">
              Full name
            </label>
            <input
              id="fullName"
              name="fullName"
              required
              className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none transition focus:border-blue-400"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="accountName" className="text-sm font-medium text-slate-700">
              Workspace name
            </label>
            <input
              id="accountName"
              name="accountName"
              required
              placeholder="My Life"
              className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none transition focus:border-blue-400"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="timezone" className="text-sm font-medium text-slate-700">
              Timezone
            </label>
            <input
              id="timezone"
              name="timezone"
              defaultValue="UTC"
              required
              className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none transition focus:border-blue-400"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="email" className="text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none transition focus:border-blue-400"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              minLength={8}
              required
              className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none transition focus:border-blue-400"
            />
          </div>

          <SubmitButton label="Create account" pendingLabel="Creating..." className="mt-2 w-full" />
        </form>

        <p className="mt-5 text-sm text-slate-600">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-blue-700 hover:text-blue-800">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
