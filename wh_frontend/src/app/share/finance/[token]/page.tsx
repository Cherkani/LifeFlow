import Link from "next/link";

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
      <main className="min-h-screen bg-[#070b0f] px-4 py-10 font-mono text-[#d6f7dd]">
        <section className="mx-auto max-w-2xl rounded-2xl border border-[#1d3b2a] bg-[#0b1117] p-8 shadow-[0_0_80px_rgba(28,230,120,0.12)]">
          <p className="text-xs uppercase tracking-[0.24em] text-[#67e889]">$ finance-share --status</p>
          <h1 className="mt-5 text-3xl font-black tracking-tight text-[#f4f7f3]">link_not_available</h1>
          <p className="mt-3 text-sm leading-6 text-[#89a693]">
            It may have been disabled, deleted, or copied incorrectly. Ask the owner to generate a fresh public link.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex rounded-lg border border-[#2a5b3a] bg-[#102117] px-5 py-3 text-sm font-bold text-[#9cffb2] transition hover:bg-[#173420]"
          >
            cd /home
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
  const groupName = titleCase(payload.debtGroupKey ?? "group");

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_20%_0%,_rgba(56,189,118,0.16),_transparent_28%),radial-gradient(circle_at_80%_10%,_rgba(245,158,11,0.12),_transparent_24%),linear-gradient(135deg,_#05080b,_#0a1016_48%,_#07100b)] px-4 py-8 font-mono text-[#d6f7dd]">
      <section className="mx-auto flex max-w-4xl flex-col gap-5">
        <div className="overflow-hidden rounded-2xl border border-[#1d3b2a] bg-[#0a0f14] shadow-[0_0_90px_rgba(28,230,120,0.13)]">
          <div className="flex items-center gap-2 border-b border-[#17291f] bg-[#0d151b] px-5 py-3">
            <span className="h-3 w-3 rounded-full bg-[#ff5f56]" />
            <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
            <span className="h-3 w-3 rounded-full bg-[#27c93f]" />
            <span className="ml-3 text-xs text-[#6d8b77]">finance-share/{payload.debtGroupKey ?? "group"}</span>
          </div>
          <div className="relative overflow-hidden p-6 sm:p-7">
            <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[#25d366]/10 blur-3xl" />
            <div className="relative flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[#67e889]">$ cat debt_group.json</p>
                <h1 className="mt-4 text-4xl font-black tracking-[-0.04em] text-[#f5fff7] sm:text-5xl">{groupName}</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#89a693]">
                  <span className="text-[#67e889]">source:</span> {payload.accountName ?? "Finance"} ·{" "}
                  <span className="text-[#67e889]">mode:</span> read_only · <span className="text-[#67e889]">scope:</span> this_group_only
                </p>
              </div>
              <CopyShareLinkButton />
            </div>
            <div className="relative mt-8 rounded-xl border border-[#204b32] bg-[#07100b] p-5 shadow-inner">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#6d8b77]">open_balance</p>
              <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
                <p className="text-5xl font-black tracking-[-0.05em] text-[#f7c66b] sm:text-6xl">
                  {formatMoneyDhs(openTotal)}
                </p>
                <p className="rounded-lg border border-[#29442f] bg-[#102117] px-4 py-2 text-sm font-black text-[#9cffb2]">
                  {openDebts.length}_open_{openDebts.length === 1 ? "line" : "lines"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {Object.entries(groups).length === 0 ? (
          <div className="rounded-2xl border border-[#1d3b2a] bg-[#0a0f14] p-8 text-sm text-[#89a693]">
            {"//"} No debts are visible in this public snapshot yet.
          </div>
        ) : (
          <div className="grid gap-4">
            {Object.entries(groups).map(([group, groupDebts]) => {
              const groupOpen = groupDebts
                .filter((debt) => debt.status === "open")
                .reduce((sum, debt) => sum + getDebtAmount(debt), 0);
              return (
                <div
                  key={group}
                  className="overflow-hidden rounded-2xl border border-[#1d3b2a] bg-[#0a0f14] shadow-[0_0_60px_rgba(28,230,120,0.08)]"
                >
                  <div className="flex flex-row items-start justify-between gap-4 border-b border-[#17291f] bg-[#0d151b] p-5">
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-[#67e889]">./group</p>
                      <h2 className="mt-1 text-xl font-black tracking-[-0.03em] text-[#f5fff7]">{titleCase(group)}</h2>
                      <p className="text-sm text-[#89a693]">
                        rows={groupDebts.length}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#6d8b77]">open</p>
                      <p className="text-2xl font-black tracking-[-0.04em] text-[#f7c66b]">{formatMoneyDhs(groupOpen)}</p>
                    </div>
                  </div>
                  <div className="space-y-3 p-4">
                    {groupDebts.map((debt) => (
                      <div
                        key={debt.id}
                        className="rounded-xl border border-[#17291f] bg-[#07100b] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={
                                  debt.type === "owed"
                                    ? "rounded-md border border-[#204b32] bg-[#102117] px-2.5 py-1 text-xs font-black text-[#9cffb2]"
                                    : "rounded-md border border-[#553226] bg-[#22130f] px-2.5 py-1 text-xs font-black text-[#ffb199]"
                                }
                              >
                                {debt.type === "owed" ? "OWES_YOU" : "YOU_OWE"}
                              </span>
                              {debt.status === "closed" ? (
                                <span className="rounded-md border border-[#2f3c48] bg-[#121a22] px-2.5 py-1 text-xs font-black text-[#9caeba]">CLOSED</span>
                              ) : null}
                            </div>
                            <p className="mt-3 break-words font-black leading-snug text-[#d6f7dd]">
                              <span className="text-[#67e889]">&gt;</span> {debt.name}
                            </p>
                            {formatDateLabel(debt.dueDate) ? (
                              <p className="mt-1 text-sm text-[#89a693]">due_at={formatDateLabel(debt.dueDate)}</p>
                            ) : null}
                          </div>
                          <p className="text-2xl font-black tracking-[-0.04em] text-[#f7c66b]">
                            {formatMoneyDhs(getDebtAmount(debt))}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
