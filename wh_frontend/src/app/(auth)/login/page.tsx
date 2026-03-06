import Link from "next/link";

import { SubmitButton } from "@/components/forms/submit-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loginAction } from "@/app/(auth)/actions";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const params = await searchParams;

  return (
    <Card className="border-0 bg-white/95">
      <CardHeader className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-blue-600">LifeFlow</p>
        <CardTitle className="text-2xl">Welcome back</CardTitle>
        <p className="text-sm text-slate-500">Sign in to continue building your weekly system.</p>
      </CardHeader>
      <CardContent>
        {params.error ? (
          <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{params.error}</p>
        ) : null}
        {params.success ? (
          <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Account created. You can sign in now.
          </p>
        ) : null}

        <form action={loginAction} className="space-y-4">
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
              required
              minLength={8}
              className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none transition focus:border-blue-400"
            />
          </div>

          <SubmitButton label="Sign in" pendingLabel="Signing in..." className="w-full" />
        </form>

        <p className="mt-5 text-sm text-slate-600">
          New here?{" "}
          <Link href="/signup" className="font-medium text-blue-700 hover:text-blue-800">
            Create an account
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
