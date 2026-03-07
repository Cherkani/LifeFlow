import { updateProfileAction } from "@/app/(app)/actions";
import { SubmitButton } from "@/components/forms/submit-button";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionHeader } from "@/components/ui/section-header";
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

  const profileTab = (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {params.error ? <Alert variant="error">{params.error}</Alert> : null}
        {params.success ? <Alert variant="success">Profile updated.</Alert> : null}

        <form action={updateProfileAction} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full name</Label>
              <Input id="fullName" name="fullName" required defaultValue={profile?.full_name ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Input id="timezone" name="timezone" required defaultValue={profile?.timezone ?? "UTC"} />
            </div>
          </div>
          <SubmitButton label="Update profile" pendingLabel="Updating..." className="w-full" />
        </form>
      </CardContent>
    </Card>
  );

  const workspaceTab = (
    <Card>
      <CardHeader>
        <CardTitle>Workspace</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-3 text-sm sm:grid-cols-[180px_1fr]">
          <dt className="font-medium text-slate-500">Account</dt><dd>{account.accountName}</dd>
          <dt className="font-medium text-slate-500">Role</dt><dd>{account.role}</dd>
          <dt className="font-medium text-slate-500">Currency</dt><dd>{account.currencyCode}</dd>
          <dt className="font-medium text-slate-500">Email</dt><dd>{profile?.email ?? user.email}</dd>
          <dt className="font-medium text-slate-500">Active</dt><dd>{profile?.is_active ? "Yes" : "No"}</dd>
          <dt className="font-medium text-slate-500">Joined</dt><dd>{profile?.created_at?.slice(0, 10) ?? "Unknown"}</dd>
        </dl>
      </CardContent>
    </Card>
  );

  const checklistTab = (
    <Card>
      <CardHeader>
        <CardTitle>Production checklist</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3 text-sm text-slate-700">
          <li className="rounded-lg border border-slate-200 p-3">Set <code>.env.local</code> with production Supabase project URL + anon key.</li>
          <li className="rounded-lg border border-slate-200 p-3">Enable HTTPS and secure cookies on deployment domain.</li>
          <li className="rounded-lg border border-slate-200 p-3">Restrict CORS and auth redirect URLs in Supabase Auth settings.</li>
          <li className="rounded-lg border border-slate-200 p-3">Run <code>npm run build</code> before deployment and monitor runtime logs.</li>
        </ul>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <SectionHeader title="Settings" description="Profile configuration and workspace diagnostics." />

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-slate-900">Profile</h2>
        {profileTab}
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-slate-900">Workspace</h2>
        {workspaceTab}
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-slate-900">Checklist</h2>
        {checklistTab}
      </section>
    </div>
  );
}
