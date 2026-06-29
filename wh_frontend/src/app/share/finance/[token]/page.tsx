import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatMoneyDhs } from "@/lib/utils";

type PublicDebt = {
  id: string;
  name: string;
  type: "owed" | "owing";
  principal: number;
  remainingBalance: number;
  status: "open" | "closed";
  dueDate: string | null;
};

type PublicDebtPayload = {
  found: boolean;
  accountName?: string;
  currencyCode?: string;
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
      <main className="min-h-screen bg-[#f5efe5] px-4 py-10 text-[#172033]">
        <section className="mx-auto max-w-2xl rounded-[2rem] border border-[#e3d4bd] bg-white p-8 shadow-sm">
          <Badge className="bg-[#fff4dc] text-[#8a5a00]">Public finance link</Badge>
          <h1 className="mt-5 text-3xl font-black tracking-tight">This share link is not available.</h1>
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
  const openDebts = debts.filter((debt) => debt.status === "open" && debt.remainingBalance > 0);
  const openTotal = openDebts.reduce((sum, debt) => sum + debt.remainingBalance, 0);
  const owedToYou = openDebts.filter((debt) => debt.type === "owed").reduce((sum, debt) => sum + debt.remainingBalance, 0);
  const youOwe = openDebts.filter((debt) => debt.type === "owing").reduce((sum, debt) => sum + debt.remainingBalance, 0);

  return (
    <main className="min-h-screen bg-[#f5efe5] px-4 py-8 text-[#172033]">
      <section className="mx-auto flex max-w-5xl flex-col gap-5">
        <div className="overflow-hidden rounded-[2rem] border border-[#e3d4bd] bg-white shadow-sm">
          <div className="bg-[radial-gradient(circle_at_top_left,_#fde2a6,_transparent_34%),linear-gradient(135deg,_#172033,_#32405f)] p-7 text-white">
            <Badge className="bg-white/15 text-white">Read-only public view</Badge>
            <h1 className="mt-4 text-3xl font-black tracking-tight">{payload.accountName ?? "Finance"} debt snapshot</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75">
              Shared debt overview grouped by person. This page is view-only and does not require login.
            </p>
          </div>
          <div className="grid gap-3 p-5 sm:grid-cols-3">
            <Card className="border-[#eadcc8] bg-[#fffaf2]">
              <CardHeader>
                <CardTitle className="text-sm text-[#6f5b45]">Open debt</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-black">{formatMoneyDhs(openTotal)}</CardContent>
            </Card>
            <Card className="border-[#d7eadf] bg-[#f3fff7]">
              <CardHeader>
                <CardTitle className="text-sm text-[#456650]">Owed to you</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-black">{formatMoneyDhs(owedToYou)}</CardContent>
            </Card>
            <Card className="border-[#ead6d6] bg-[#fff6f4]">
              <CardHeader>
                <CardTitle className="text-sm text-[#79504d]">You owe</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-black">{formatMoneyDhs(youOwe)}</CardContent>
            </Card>
          </div>
        </div>

        {Object.entries(groups).length === 0 ? (
          <Card className="border-[#e3d4bd] bg-white">
            <CardContent className="p-8 text-sm text-[#667085]">No debts are visible in this public snapshot yet.</CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {Object.entries(groups).map(([group, groupDebts]) => {
              const groupOpen = groupDebts
                .filter((debt) => debt.status === "open")
                .reduce((sum, debt) => sum + debt.remainingBalance, 0);
              return (
                <Card key={group} className="border-[#e3d4bd] bg-white shadow-sm">
                  <CardHeader className="flex flex-row items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-xl font-black">{titleCase(group)}</CardTitle>
                      <p className="text-sm text-[#667085]">
                        {groupDebts.length} {groupDebts.length === 1 ? "line" : "lines"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#98a2b3]">Open</p>
                      <p className="text-lg font-black">{formatMoneyDhs(groupOpen)}</p>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {groupDebts.map((debt) => (
                      <div
                        key={debt.id}
                        className="rounded-2xl border border-[#edf0f5] bg-[#fbfcfe] p-4 shadow-[0_1px_0_rgba(23,32,51,0.04)]"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-bold text-[#172033]">{debt.name}</p>
                            <p className="mt-1 text-sm text-[#667085]">
                              {debt.type === "owed" ? "Owes you" : "You owe"}
                              {debt.status === "closed" ? " · closed" : ""}
                              {formatDateLabel(debt.dueDate) ? ` · due ${formatDateLabel(debt.dueDate)}` : ""}
                            </p>
                          </div>
                          <p className="text-lg font-black">{formatMoneyDhs(debt.remainingBalance)}</p>
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
