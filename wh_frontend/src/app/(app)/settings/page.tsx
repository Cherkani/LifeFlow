import { Linkedin, Mail, MessageCircle } from "lucide-react";

import { updateProfileFormAction } from "@/app/(app)/actions";
import { ActionForm } from "@/components/forms/action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionHeader } from "@/components/ui/section-header";
import { Select } from "@/components/ui/select";
import { getProfileFull } from "@/lib/queries";
import { requireAppContext } from "@/lib/server-context";

export default async function SettingsPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const params = await searchParams;
  const { supabase, user, account } = await requireAppContext();

  const profile = await getProfileFull(supabase, user.id);

  return (
    <div className="space-y-6">
      <SectionHeader title="Settings" description="Profile configuration and workspace diagnostics." />

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-slate-900">Profile</h2>
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {params.error ? <Alert variant="error">{params.error}</Alert> : null}
            {params.success ? <Alert variant="success">Profile updated.</Alert> : null}

            <ActionForm action={updateProfileFormAction} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full name</Label>
                  <Input id="fullName" name="fullName" required defaultValue={profile?.full_name ?? ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select id="timezone" name="timezone" required defaultValue={profile?.timezone ?? "Africa/Casablanca"}>
                    <option value="Africa/Casablanca">Africa/Casablanca (Morocco)</option>
                    <option value="UTC">UTC</option>
                    <option value="Europe/Paris">Europe/Paris</option>
                    <option value="Europe/London">Europe/London</option>
                    <option value="America/New_York">America/New_York</option>
                    <option value="Asia/Dubai">Asia/Dubai</option>
                  </Select>
                </div>
              </div>
              <SubmitButton label="Update profile" pendingLabel="Updating..." className="w-full" />
            </ActionForm>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-slate-900">Workspace</h2>
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
      </section>

      <section id="owner-contact" className="space-y-2">
        <h2 className="text-lg font-semibold text-slate-900">Owner Contact</h2>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle size={18} />
              Talk to owner
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="text-slate-600">
              Reach out directly for product feedback, partnership requests, or account support.
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <a
                href="mailto:cherkaniaymen1@gmail.com"
                className="rounded-xl border border-slate-200 bg-white p-3 transition hover:border-slate-300 hover:shadow-sm"
              >
                <p className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <Mail size={14} />
                  Email
                </p>
                <p className="font-semibold text-slate-900">cherkaniaymen1@gmail.com</p>
              </a>

              <a
                href="https://www.linkedin.com/in/aymen-cherkani-a68b1224a/"
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-slate-200 bg-white p-3 transition hover:border-slate-300 hover:shadow-sm"
              >
                <p className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <Linkedin size={14} />
                  LinkedIn
                </p>
                <p className="font-semibold text-slate-900">aymen-cherkani-a68b1224a</p>
              </a>
            </div>

            <div className="flex flex-wrap gap-2">
              <a
                href="mailto:cherkaniaymen1@gmail.com"
                className="inline-flex h-10 items-center justify-center rounded-lg bg-[#6f6aa8] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#625d98]"
              >
                Send Email
              </a>
              <a
                href="https://www.linkedin.com/in/aymen-cherkani-a68b1224a/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 items-center justify-center rounded-lg border border-[#8c88bc] bg-[#f5f4fb] px-4 py-2 text-sm font-medium text-[#5e5a87] transition-colors hover:bg-[#eceaf7]"
              >
                Open LinkedIn
              </a>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
