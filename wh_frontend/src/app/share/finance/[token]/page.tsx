import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatMoneyDhs } from "@/lib/utils";

import { CopyShareLinkButton } from "./copy-share-link-button";

type PublicDebt = {
  id: string;
  name: string;
  type: "owed" | "owing";
  principal: number | string | null;
  remainingBalance: number | string | null;
  status: "open" | "closed";
  dueDate: string | null;
};

type PublicDebtPayload = {
  found: boolean;
  accountName?: string;
  currencyCode?: string;
  debtGroupKey?: string | null;
  debts?: PublicDebt[];
};

function groupDebtName(name: string) {
  const firstWord = name.trim().split(/\s+/)[0];
  return firstWord ? firstWord.toLowerCase() : "ungrouped";
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatDateLabel(isoDate: string | null) {
  if (!isoDate) return null;
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function getDebtAmount(debt: PublicDebt) {
  const remaining = Number(debt.remainingBalance ?? 0);
  const principal = Number(debt.principal ?? 0);
  return debt.status === "open" && remaining <= 0 ? principal : remaining;
}

export default async function PublicFinanceDebtSharePage({
  params
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.rpc("get_public_finance_debts", { p_token: token });
  const payload = (data ?? { found: false }) as PublicDebtPayload;

  if (!payload.found) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#ffe7ad,_transparent_34%),linear-gradient(135deg,_#f7efe2,_#eaf2f6)] px-4 py-10 text-[#172033]">
        <section className="mx-auto max-w-2xl rounded-[2rem] border border-white/70 bg-white/85 p-8 shadow-[0_24px_80px_rgba(23,32,51,0.12)] backdrop-blur">
          <Badge className="bg-[#fff4dc] text-[#8a5a00]">Public finance link</Badge>
          <h1 className="mt-5 text-3xl font-black tracking-tight">This group share link is not available.</h1>
          <p className="mt-3 text-sm leading-6 text-[#667085]">
            It may have been disabled, deleted, or copied incorrectly. Ask the owner to generate a fresh public link.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex rounded-full bg-[#172033] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#25304a]"
          >
            Go home
          </Link>
        </section>
      </main>
    );
  }

  const debts = payload.debts ?? [];
  const groups = debts.reduce<Record<string, PublicDebt[]>>((acc, debt) => {
    const key = groupDebtName(debt.name);
    acc[key] = [...(acc[key] ?? []), debt];
    return acc;
  }, {});
  const openDebts = debts.filter((debt) => debt.status === "open" && getDebtAmount(debt) > 0);
  const openTotal = openDebts.reduce((sum, debt) => sum + getDebtAmount(debt), 0);
  const owedToYou = openDebts.filter((debt) => debt.type === "owed").reduce((sum, debt) => sum + getDebtAmount(debt), 0);
  const youOwe = openDebts.filter((debt) => debt.type === "owing").reduce((sum, debt) => sum + getDebtAmount(debt), 0);
  const groupName = titleCase(payload.debtGroupKey ?? "group");

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#ffe7ad,_transparent_30%),radial-gradient(circle_at_85%_15%,_#c9f0e1,_transparent_28%),linear-gradient(135deg,_#f8efe2,_#e8f1f6)] px-4 py-8 text-[#172033]">
      <section className="mx-auto flex max-w-4xl flex-col gap-5">
        <div className="overflow-hidden rounded-[2.25rem] border border-white/70 bg-white/90 shadow-[0_28px_90px_rgba(23,32,51,0.14)] backdrop-blur">
          <div className="relative overflow-hidden bg-[#172033] p-7 text-white">
            <div className="absolute -right-16 -top-20 h-52 w-52 rounded-full bg-[#f7c96d]/30 blur-2xl" />
            <div className="absolute -bottom-20 left-8 h-44 w-44 rounded-full bg-[#5ed1a8]/20 blur-2xl" />
            <div className="relative flex flex-wrap items-start justify-between gap-4">
              <div>
                <Badge className="bg-white/15 text-white ring-1 ring-white/20">Read-only group view</Badge>
                <h1 className="mt-4 text-4xl font-black tracking-[-0.04em] sm:text-5xl">{groupName}</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75">
                  Shared from {payload.accountName ?? "Finance"}. Only this group is visible, and this page is view-only.
                </p>
              </div>
              <CopyShareLinkButton />
            </div>
            <div className="relative mt-8 rounded-[1.75rem] border border-white/15 bg-white/10 p-5 shadow-inner">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-white/55">Open balance</p>
              <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
                <p className="text-5xl font-black tracking-[-0.05em] sm:text-6xl">{formatMoneyDhs(openTotal)}</p>
                <p className="rounded-full bg-white px-4 py-2 text-sm font-black text-[#172033]">
                  {openDebts.length} open {openDebts.length === 1 ? "line" : "lines"}
                </p>
              </div>
            </div>
          </div>
          <div className="grid gap-3 p-5 sm:grid-cols-3">
            <Card className="border-[#eadcc8] bg-[#fffaf2] shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-black uppercase tracking-[0.14em] text-[#8a6b42]">Total</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-black tracking-[-0.03em]">{formatMoneyDhs(openTotal)}</CardContent>
            </Card>
            <Card className="border-[#d7eadf] bg-[#f3fff7] shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-black uppercase tracking-[0.14em] text-[#456650]">Owed to you</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-black tracking-[-0.03em]">{formatMoneyDhs(owedToYou)}</CardContent>
            </Card>
            <Card className="border-[#ead6d6] bg-[#fff6f4] shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-black uppercase tracking-[0.14em] text-[#79504d]">You owe</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-black tracking-[-0.03em]">{formatMoneyDhs(youOwe)}</CardContent>
            </Card>
          </div>
        </div>

        {Object.entries(groups).length === 0 ? (
          <Card className="border-white/70 bg-white/90 shadow-[0_18px_60px_rgba(23,32,51,0.08)]">
            <CardContent className="p-8 text-sm text-[#667085]">No debts are visible in this public snapshot yet.</CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {Object.entries(groups).map(([group, groupDebts]) => {
              const groupOpen = groupDebts
                .filter((debt) => debt.status === "open")
                .reduce((sum, debt) => sum + getDebtAmount(debt), 0);
              return (
                <Card key={group} className="overflow-hidden border-white/70 bg-white/92 shadow-[0_18px_60px_rgba(23,32,51,0.08)] backdrop-blur">
                  <CardHeader className="flex flex-row items-start justify-between gap-4 border-b border-[#eef1f5] bg-[#fbfcf8]">
                    <div>
                      <CardTitle className="text-xl font-black tracking-[-0.03em]">{titleCase(group)}</CardTitle>
                      <p className="text-sm text-[#667085]">
                        {groupDebts.length} {groupDebts.length === 1 ? "line" : "lines"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#98a2b3]">Open</p>
                      <p className="text-2xl font-black tracking-[-0.04em]">{formatMoneyDhs(groupOpen)}</p>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 p-4">
                    {groupDebts.map((debt) => (
                      <div
                        key={debt.id}
                        className="rounded-[1.35rem] border border-[#edf0f5] bg-white p-4 shadow-[0_10px_30px_rgba(23,32,51,0.05)]"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={
                                  debt.type === "owed"
                                    ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700"
                                    : "rounded-full bg-rose-50 px-2.5 py-1 text-xs font-black text-rose-700"
                                }
                              >
                                {debt.type === "owed" ? "Owes you" : "You owe"}
                              </span>
                              {debt.status === "closed" ? (
                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-500">Closed</span>
                              ) : null}
                            </div>
                            <p className="mt-3 font-black leading-snug text-[#172033]">{debt.name}</p>
                            {formatDateLabel(debt.dueDate) ? (
                              <p className="mt-1 text-sm text-[#667085]">Due {formatDateLabel(debt.dueDate)}</p>
                            ) : null}
                          </div>
                          <p className="text-2xl font-black tracking-[-0.04em]">{formatMoneyDhs(getDebtAmount(debt))}</p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
