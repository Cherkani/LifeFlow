import Link from "next/link";

import { createServerSupabaseClient } from "@/lib/supabase/server";

import { FinanceShareTerminal } from "./finance-share-terminal";

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

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
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
  const groupKey = payload.debtGroupKey ?? "group";
  const groupName = titleCase(payload.debtGroupKey ?? "group");
  const terminalDebts = debts.map((debt) => ({
    id: debt.id,
    name: debt.name,
    type: debt.type,
    amount: getDebtAmount(debt),
    status: debt.status,
    dueDate: debt.dueDate
  }));

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_20%_0%,_rgba(56,189,118,0.16),_transparent_28%),radial-gradient(circle_at_80%_10%,_rgba(245,158,11,0.12),_transparent_24%),linear-gradient(135deg,_#05080b,_#0a1016_48%,_#07100b)] px-4 py-8 font-mono text-[#d6f7dd]">
      <section className="mx-auto flex max-w-4xl flex-col gap-5">
        <FinanceShareTerminal
          accountName={payload.accountName ?? "user"}
          groupKey={groupKey}
          groupName={groupName}
          debts={terminalDebts}
        />
      </section>
    </main>
  );
}
