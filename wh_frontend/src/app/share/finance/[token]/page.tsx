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
  const promptPath = `~/finance/debts/${payload.debtGroupKey ?? "group"}`;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_20%_0%,_rgba(56,189,118,0.16),_transparent_28%),radial-gradient(circle_at_80%_10%,_rgba(245,158,11,0.12),_transparent_24%),linear-gradient(135deg,_#05080b,_#0a1016_48%,_#07100b)] px-4 py-8 font-mono text-[#d6f7dd]">
      <section className="mx-auto flex max-w-4xl flex-col gap-5">
        <div className="overflow-hidden rounded-xl border border-[#183322] bg-[#05080b] shadow-[0_0_90px_rgba(28,230,120,0.13)]">
          <div className="flex items-center gap-2 border-b border-[#17291f] bg-[#0d151b] px-5 py-3">
            <span className="h-3 w-3 rounded-full bg-[#ff5f56]" />
            <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
            <span className="h-3 w-3 rounded-full bg-[#27c93f]" />
            <span className="ml-3 text-xs text-[#6d8b77]">finance-share/{payload.debtGroupKey ?? "group"}</span>
          </div>
          <div className="relative overflow-hidden p-5 sm:p-7">
            <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[#25d366]/10 blur-3xl" />
            <div className="relative flex flex-wrap items-start justify-between gap-4 border-b border-dashed border-[#1d3b2a] pb-5">
              <div>
                <p className="text-sm leading-7 text-[#89a693]">
                  <span className="text-[#67e889]">{payload.accountName ?? "user"}@life-flow</span>
                  <span className="text-[#d6f7dd]">:</span>
                  <span className="text-[#8fc7ff]">{promptPath}</span>
                  <span className="text-[#d6f7dd]">$</span>{" "}
                  <span className="terminal-type inline-block max-w-full overflow-hidden whitespace-nowrap align-bottom text-[#f5fff7]">
                    open {payload.debtGroupKey ?? "group"}
                  </span>
                  <span className="terminal-cursor ml-1 inline-block h-4 w-2 bg-[#67e889] align-[-2px]" />
                </p>
                <p className="mt-3 text-sm text-[#89a693]"># group: <span className="text-[#f5fff7]">{groupName}</span></p>
                <p className="mt-1 text-sm text-[#89a693]"># read_only=true scope=this_group_only</p>
              </div>
              <CopyShareLinkButton />
            </div>
            <div className="relative mt-5 space-y-2">
              <p className="text-sm text-[#89a693]"><span className="text-[#67e889]">$</span> debtctl balance --open</p>
              <pre className="overflow-x-auto rounded-lg border border-[#17291f] bg-[#020506] p-4 text-sm leading-7 text-[#d6f7dd]">
{`OPEN_BALANCE  ${formatMoneyDhs(openTotal)}
OPEN_LINES    ${openDebts.length}`}
              </pre>
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
                  className="overflow-hidden rounded-xl border border-[#183322] bg-[#05080b] shadow-[0_0_60px_rgba(28,230,120,0.08)]"
                >
                  <div className="border-b border-[#17291f] bg-[#0d151b] p-5">
                    <p className="text-sm text-[#89a693]"><span className="text-[#67e889]">$</span> debtctl list --group {group} --format lines</p>
                    <p className="mt-2 text-sm text-[#6d8b77]"># rows={groupDebts.length} open={formatMoneyDhs(groupOpen)}</p>
                  </div>
                  <div className="p-4">
                    <pre className="mb-3 overflow-x-auto border-b border-dashed border-[#1d3b2a] pb-3 text-xs leading-6 text-[#6d8b77]">
{`RELATION    NAME                                      AMOUNT
----------  ----------------------------------------  ----------`}
                    </pre>
                    {groupDebts.map((debt, index) => (
                      <div
                        key={debt.id}
                        className="terminal-line opacity-0"
                        style={{ animationDelay: `${index * 180 + 250}ms` }}
                      >
                        <div className="grid gap-1 border-b border-[#0f1d15] py-3 sm:grid-cols-[8rem_1fr_auto] sm:gap-4">
                          <p className={debt.type === "owed" ? "text-sm font-black text-[#9cffb2]" : "text-sm font-black text-[#ffb199]"}>
                            {debt.type === "owed" ? "Owes you" : "You owe"}
                          </p>
                          <div className="min-w-0">
                            <p className="break-words text-sm font-bold leading-6 text-[#d6f7dd]">{debt.name}</p>
                            {formatDateLabel(debt.dueDate) ? (
                              <p className="text-sm text-[#89a693]">due_at={formatDateLabel(debt.dueDate)}</p>
                            ) : null}
                          </div>
                          <p className="text-sm font-black text-[#f7c66b] sm:text-right">
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
      <style>{`
        @keyframes terminal-reveal {
          from {
            opacity: 0;
            transform: translateY(8px);
            filter: blur(2px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
            filter: blur(0);
          }
        }

        @keyframes terminal-caret {
          0%, 49% {
            opacity: 1;
          }
          50%, 100% {
            opacity: 0;
          }
        }

        @keyframes terminal-type {
          from {
            width: 0;
          }
          to {
            width: 14ch;
          }
        }

        .terminal-line {
          animation: terminal-reveal 420ms ease-out forwards;
        }

        .terminal-cursor {
          animation: terminal-caret 900ms steps(1, end) infinite;
        }

        .terminal-type {
          width: 14ch;
          animation: terminal-type 1.2s steps(14, end) both;
        }
      `}</style>
    </main>
  );
}
