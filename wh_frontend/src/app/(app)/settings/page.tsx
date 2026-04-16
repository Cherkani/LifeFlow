import Link from "next/link";
import { Download, KeyRound, Linkedin, Mail, MessageCircle, ShieldCheck, UserRound, Wallet } from "lucide-react";

import {
  clearKnowledgeUnlockCodeFormAction,
  updateKnowledgeUnlockCodeFormAction,
  updateProfileFormAction
} from "@/app/(app)/actions";
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
import { displayCurrencyLabel } from "@/lib/utils";

function readAccountSettings(settings: unknown) {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    return {} as Record<string, unknown>;
  }
  return settings as Record<string, unknown>;
}

export default async function SettingsPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const params = await searchParams;
  const { supabase, user, account } = await requireAppContext();

  const profile = await getProfileFull(supabase, user.id);
  const { data: accountRow } = await supabase
    .from("accounts")
    .select("settings")
    .eq("id", account.accountId)
    .maybeSingle();

  const settings = readAccountSettings(accountRow?.settings);
  const hasKnowledgeCode = typeof settings.knowledge_unlock_code_hash === "string" && settings.knowledge_unlock_code_hash.length > 0;
  const knowledgeCodeUpdatedAt =
    typeof settings.knowledge_unlock_code_updated_at === "string" ? settings.knowledge_unlock_code_updated_at.slice(0, 10) : null;

  return (
    <div className="space-y-6">
      <SectionHeader title="Settings" description="Profile, workspace controls, and private knowledge protection." />

      {params.error ? <Alert variant="error">{params.error}</Alert> : null}
      {params.success ? (
        <Alert variant="success">
          {params.success === "knowledge-code-updated"
            ? "Unlock code updated."
            : params.success === "knowledge-code-cleared"
              ? "Unlock code cleared."
              : "Profile updated."}
        </Alert>
      ) : null}

      <Card className="overflow-hidden border-[var(--app-panel-border-strong)] bg-[linear-gradient(135deg,var(--app-panel-bg-soft)_0%,var(--app-btn-secondary-bg)_55%,var(--app-panel-bg)_100%)]">
        <CardContent className="grid gap-5 px-5 py-5 lg:grid-cols-[1.4fr_0.9fr] lg:px-6">
          <div className="space-y-3">
            <div
              className="inline-flex items-center gap-2 rounded-full border border-[var(--app-panel-border-strong)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--app-text-muted)]"
              style={{ backgroundColor: "color-mix(in srgb, var(--app-panel-bg) 84%, transparent)" }}
            >
              <ShieldCheck size={14} />
              Workspace controls
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-[var(--app-text-strong)]">Keep profile settings simple and sensitive knowledge gated.</h2>
              <p className="mt-2 max-w-2xl text-sm text-[var(--app-text-muted)]">
                Profile preferences, workspace details, exports, and the unlock code for hidden topic items all live here.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <div
              className="rounded-2xl border border-[var(--app-panel-border)] p-4 shadow-sm"
              style={{ backgroundColor: "color-mix(in srgb, var(--app-panel-bg) 88%, transparent)" }}
            >
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--app-text-muted)]">
                <UserRound size={14} />
                Account
              </p>
              <p className="mt-2 text-lg font-semibold text-[var(--app-text-strong)]">{account.accountName}</p>
              <p className="text-sm text-[var(--app-text-muted)]">{account.role}</p>
            </div>
            <div
              className="rounded-2xl border border-[var(--app-panel-border)] p-4 shadow-sm"
              style={{ backgroundColor: "color-mix(in srgb, var(--app-panel-bg) 88%, transparent)" }}
            >
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--app-text-muted)]">
                <Wallet size={14} />
                Currency
              </p>
              <p className="mt-2 text-lg font-semibold text-[var(--app-text-strong)]">{displayCurrencyLabel(account.currencyCode)}</p>
              <p className="text-sm text-[var(--app-text-muted)]">Default workspace currency</p>
            </div>
            <div
              className="rounded-2xl border border-[var(--app-panel-border)] p-4 shadow-sm"
              style={{ backgroundColor: "color-mix(in srgb, var(--app-panel-bg) 88%, transparent)" }}
            >
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--app-text-muted)]">
                <KeyRound size={14} />
                Hidden info
              </p>
              <p className="mt-2 text-lg font-semibold text-[var(--app-text-strong)]">{hasKnowledgeCode ? "Protected" : "Not set"}</p>
              <p className="text-sm text-[var(--app-text-muted)]">{knowledgeCodeUpdatedAt ? `Updated ${knowledgeCodeUpdatedAt}` : "Create an unlock code below."}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
        <section className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                  <input
                    type="checkbox"
                    id="cycleTrackingEnabled"
                    name="cycleTrackingEnabled"
                    defaultChecked={profile?.cycle_tracking_enabled ?? false}
                    className="size-4 rounded border-slate-300"
                  />
                  <div>
                    <Label htmlFor="cycleTrackingEnabled" className="cursor-pointer font-medium">
                      Enable cycle tracking
                    </Label>
                    <p className="text-sm text-slate-500">
                      Track periods, predictions, and symptoms. Adds Cycle to the sidebar.
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lutealPhaseLength">Luteal phase length</Label>
                  <Input
                    id="lutealPhaseLength"
                    name="lutealPhaseLength"
                    type="number"
                    min={8}
                    max={20}
                    step={1}
                    required
                    defaultValue={profile?.luteal_phase_length ?? 14}
                  />
                  <p className="text-xs text-slate-500">
                    Most people ovulate about 14 days before their period. Adjust if you know your typical luteal phase.
                  </p>
                </div>
                <SubmitButton label="Update profile" pendingLabel="Updating..." className="w-full sm:w-auto" />
              </ActionForm>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Private Knowledge</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border border-[var(--app-panel-border-strong)] bg-[var(--app-panel-bg-soft)] p-4">
                <p className="text-sm font-medium text-[var(--app-text-strong)]">Workspace unlock code</p>
                <p className="mt-1 text-sm text-[var(--app-text-muted)]">
                  Hidden topic items stay blurred until someone clicks the eye icon and enters this code.
                </p>
              </div>

              <ActionForm action={updateKnowledgeUnlockCodeFormAction} className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="knowledgeUnlockCode">New unlock code</Label>
                    <Input id="knowledgeUnlockCode" name="knowledgeUnlockCode" type="password" placeholder="Minimum 4 characters" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmKnowledgeUnlockCode">Confirm unlock code</Label>
                    <Input
                      id="confirmKnowledgeUnlockCode"
                      name="confirmKnowledgeUnlockCode"
                      type="password"
                      placeholder="Repeat the code"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <SubmitButton label={hasKnowledgeCode ? "Update unlock code" : "Save unlock code"} pendingLabel="Saving..." className="w-full sm:w-auto" />
                </div>
                <p className="text-xs text-slate-500">
                  {hasKnowledgeCode
                    ? `Hidden item protection is active${knowledgeCodeUpdatedAt ? ` since ${knowledgeCodeUpdatedAt}` : ""}.`
                    : "No unlock code is set yet, so hidden items cannot be revealed."}
                </p>
              </ActionForm>
              {hasKnowledgeCode ? (
                <ActionForm action={clearKnowledgeUnlockCodeFormAction}>
                  <SubmitButton
                    label="Clear code"
                    pendingLabel="Clearing..."
                    className="w-full border border-[#fecaca] bg-[#fef2f2] text-[#b91c1c] hover:bg-[#fee2e2] sm:w-auto"
                  />
                </ActionForm>
              ) : null}
            </CardContent>
          </Card>
        </section>

        <section className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Workspace</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-3 text-sm sm:grid-cols-[140px_1fr]">
                <dt className="font-medium text-slate-500">Account</dt><dd>{account.accountName}</dd>
                <dt className="font-medium text-slate-500">Role</dt><dd>{account.role}</dd>
                <dt className="font-medium text-slate-500">Currency</dt><dd>{displayCurrencyLabel(account.currencyCode)}</dd>
                <dt className="font-medium text-slate-500">Email</dt><dd>{profile?.email ?? user.email}</dd>
                <dt className="font-medium text-slate-500">Active</dt><dd>{profile?.is_active ? "Yes" : "No"}</dd>
                <dt className="font-medium text-slate-500">Joined</dt><dd>{profile?.created_at?.slice(0, 10) ?? "Unknown"}</dd>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data export</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-slate-600">
                Download your current data set, including profile, knowledge, habits, finance, planning, and events.
              </p>
              <Link
                href="/api/export/excel"
                className="inline-flex items-center gap-2 rounded-lg bg-[#0b1f3b] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#102a52]"
              >
                <Download size={16} />
                Export to Excel
              </Link>
            </CardContent>
          </Card>

          <Card id="owner-contact" className="overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle size={18} />
                Owner Contact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p className="text-slate-600">
                Reach out directly for product feedback, partnership requests, or account support.
              </p>

              <div className="grid gap-3">
                <a
                  href="mailto:cherkaniaymen1@gmail.com"
                  className="rounded-2xl border border-slate-200 bg-[linear-gradient(135deg,var(--app-panel-bg)_0%,var(--app-panel-bg-soft)_100%)] p-4 transition hover:border-slate-300 hover:shadow-sm"
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
                  className="rounded-2xl border border-slate-200 bg-[linear-gradient(135deg,var(--app-panel-bg)_0%,var(--app-panel-bg-soft)_100%)] p-4 transition hover:border-slate-300 hover:shadow-sm"
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
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-[#0b1f3b] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#102a52]"
                >
                  Send Email
                </a>
                <a
                  href="https://www.linkedin.com/in/aymen-cherkani-a68b1224a/"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-[#c7d3e8] bg-[#edf3ff] px-4 py-2 text-sm font-medium text-[#23406d] transition-colors hover:bg-[#e3ebf9]"
                >
                  Open LinkedIn
                </a>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
