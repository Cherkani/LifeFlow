import { SubmitButton } from "@/components/forms/submit-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { updateProfileAction } from "@/app/(app)/actions";
import { requireAppContext } from "@/lib/server-context";

export default async function SettingsPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const params = await searchParams;
  const { supabase, user, account } = await requireAppContext();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, timezone, role, is_active, created_at")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="space-y-6">
      <SectionHeader title="Settings" description="Profile configuration and workspace diagnostics." />

      {params.error ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{params.error}</p>
      ) : null}

      {params.success ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Profile updated.</p>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={updateProfileAction} className="space-y-3">
              <div className="space-y-1">
                <label htmlFor="fullName" className="text-sm font-medium text-slate-700">
                  Full name
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  required
                  defaultValue={profile?.full_name ?? ""}
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none transition focus:border-blue-400"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="timezone" className="text-sm font-medium text-slate-700">
                  Timezone
                </label>
                <input
                  id="timezone"
                  name="timezone"
                  required
                  defaultValue={profile?.timezone ?? "UTC"}
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none transition focus:border-blue-400"
                />
              </div>

              <SubmitButton label="Update profile" pendingLabel="Updating..." />
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Workspace</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-600">
            <p>
              <span className="font-medium text-slate-800">Account:</span> {account.accountName}
            </p>
            <p>
              <span className="font-medium text-slate-800">Role:</span> {account.role}
            </p>
            <p>
              <span className="font-medium text-slate-800">Currency:</span> {account.currencyCode}
            </p>
            <p>
              <span className="font-medium text-slate-800">Email:</span> {profile?.email ?? user.email}
            </p>
            <p>
              <span className="font-medium text-slate-800">Active user:</span> {profile?.is_active ? "Yes" : "No"}
            </p>
            <p>
              <span className="font-medium text-slate-800">Joined:</span> {profile?.created_at?.slice(0, 10) ?? "Unknown"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Production checklist</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-1 pl-4 text-sm text-slate-600">
            <li>Set `.env.local` with production Supabase project URL + anon key.</li>
            <li>Enable HTTPS + secure cookies on deployment domain.</li>
            <li>Restrict CORS and Auth redirect URLs in Supabase Auth settings.</li>
            <li>Run `npm run build` before deployment and monitor runtime logs.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
