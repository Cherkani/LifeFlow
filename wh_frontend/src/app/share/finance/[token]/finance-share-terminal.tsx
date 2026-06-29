"use client";

import { useEffect, useRef, useState } from "react";

import { formatMoneyDhs } from "@/lib/utils";

import { CopyShareLinkButton } from "./copy-share-link-button";

type TerminalDebt = {
  id: string;
  name: string;
  type: "owed" | "owing";
  amount: number;
  status: "open" | "closed";
  dueDate: string | null;
};

type TerminalLine = {
  id: number;
  kind: "command" | "output" | "error" | "muted";
  text: string;
};

type FinanceShareTerminalProps = {
  accountName: string;
  groupKey: string;
  groupName: string;
  debts: TerminalDebt[];
};

function formatDateLabel(isoDate: string | null) {
  if (!isoDate) return null;
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function buildLedgerLines(debts: TerminalDebt[]) {
  if (debts.length === 0) return ["no rows"];
  return [
    "RELATION   NAME                                           AMOUNT",
    "---------  ---------------------------------------------  ----------",
    ...debts.map((debt) => {
      const relation = debt.type === "owed" ? "Owes you" : "You owe ";
      const clippedName = debt.name.length > 45 ? `${debt.name.slice(0, 42)}...` : debt.name;
      return `${relation.padEnd(9)}  ${clippedName.padEnd(45)}  ${formatMoneyDhs(debt.amount)}`;
    })
  ];
}

export function FinanceShareTerminal({ accountName, groupKey, groupName, debts }: FinanceShareTerminalProps) {
  const openDebts = debts.filter((debt) => debt.status === "open" && debt.amount > 0);
  const openTotal = openDebts.reduce((sum, debt) => sum + debt.amount, 0);
  const promptPath = `~/finance/debts/${groupKey}`;
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<TerminalLine[]>(() => [
    { id: 1, kind: "muted", text: `connected to finance-share/${groupKey}` },
    { id: 2, kind: "muted", text: `group=${groupName} read_only=true` },
    { id: 3, kind: "command", text: "summary" },
    { id: 4, kind: "output", text: `OPEN_BALANCE  ${formatMoneyDhs(openTotal)}` },
    { id: 5, kind: "output", text: `OPEN_LINES    ${openDebts.length}` },
    { id: 6, kind: "muted", text: "type `help` to see commands" }
  ]);
  const [commandCount, setCommandCount] = useState(0);
  const nextId = useRef(7);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [history]);

  function append(lines: Array<Omit<TerminalLine, "id">>) {
    setHistory((current) => [
      ...current,
      ...lines.map((line) => ({
        ...line,
        id: nextId.current++
      }))
    ]);
  }

  function runCommand(rawCommand: string) {
    const command = rawCommand.trim();
    if (!command) return;

    if (command === "clear") {
      setHistory([]);
      setCommandCount(0);
      return;
    }

    const lower = command.toLowerCase();
    const output: Array<Omit<TerminalLine, "id">> = [{ kind: "command", text: command }];
    const nextCommandCount = commandCount + 1;

    if (lower === "help") {
      output.push(
        { kind: "output", text: "commands:" },
        { kind: "output", text: "  summary    show open balance" },
        { kind: "output", text: "  list       print debt lines" },
        { kind: "output", text: "  whoami     show share scope" },
        { kind: "output", text: "  clear      clear terminal" }
      );
    } else if (lower === "summary" || lower === "balance") {
      output.push(
        { kind: "output", text: `OPEN_BALANCE  ${formatMoneyDhs(openTotal)}` },
        { kind: "output", text: `OPEN_LINES    ${openDebts.length}` }
      );
    } else if (lower === "list" || lower === "ls") {
      output.push(...buildLedgerLines(debts).map((text) => ({ kind: "output" as const, text })));
    } else if (lower === "whoami") {
      output.push(
        { kind: "output", text: `account=${accountName}` },
        { kind: "output", text: `group=${groupKey}` },
        { kind: "output", text: "mode=read_only" }
      );
    } else {
      output.push({ kind: "error", text: `command not found: ${command}` });
    }

    if (nextCommandCount > 3) {
      output.push({ kind: "error", text: "watared asahbi lfloss lmolaha o nta galess katl3ab" });
    }

    setCommandCount(nextCommandCount);
    append(output);
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[#183322] bg-[#05080b] shadow-[0_0_90px_rgba(28,230,120,0.13)]">
      <div className="flex items-center gap-2 border-b border-[#17291f] bg-[#0d151b] px-5 py-3">
        <span className="h-3 w-3 rounded-full bg-[#ff5f56]" />
        <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
        <span className="h-3 w-3 rounded-full bg-[#27c93f]" />
        <span className="ml-3 text-xs text-[#6d8b77]">bash - finance-share/{groupKey}</span>
      </div>

      <div className="terminal-surface relative overflow-hidden p-5 sm:p-7" onClick={() => inputRef.current?.focus()}>
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[#25d366]/10 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4 border-b border-dashed border-[#1d3b2a] pb-5">
          <div>
            <p className="text-sm leading-7 text-[#89a693]">
              <span className="text-[#67e889]">{accountName}@life-flow</span>
              <span className="text-[#d6f7dd]">:</span>
              <span className="text-[#8fc7ff]">{promptPath}</span>
              <span className="text-[#d6f7dd]">$</span>{" "}
              <span className="terminal-type inline-block max-w-full overflow-hidden whitespace-nowrap align-bottom text-[#f5fff7]">
                open {groupKey}
              </span>
              <span className="terminal-cursor ml-1 inline-block h-4 w-2 bg-[#67e889] align-[-2px]" />
            </p>
            <p className="mt-3 text-sm text-[#89a693]">
              # group: <span className="text-[#f5fff7]">{groupName}</span>
            </p>
            <p className="mt-1 text-sm text-[#89a693]"># interactive read-only terminal</p>
          </div>
          <CopyShareLinkButton />
        </div>

        <div
          ref={scrollRef}
          className="relative mt-5 max-h-[28rem] overflow-y-auto rounded border border-[#17291f] bg-[#020506]/90 p-4 text-sm leading-7"
        >
          {history.map((line) => (
            <p
              key={line.id}
              className={
                line.kind === "command"
                  ? "text-[#d6f7dd]"
                  : line.kind === "error"
                    ? "text-[#ffb199]"
                    : line.kind === "muted"
                      ? "text-[#6d8b77]"
                      : "whitespace-pre text-[#d6f7dd]"
              }
            >
              {line.kind === "command" ? (
                <>
                  <span className="text-[#67e889]">$</span> {line.text}
                </>
              ) : (
                line.text
              )}
            </p>
          ))}
          <form
            className="mt-1 flex items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              runCommand(input);
              setInput("");
            }}
          >
            <span className="text-[#67e889]">$</span>
            <input
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              className="min-w-0 flex-1 bg-transparent font-mono text-[#f5fff7] caret-[#67e889] outline-none"
              aria-label="Terminal command"
              autoComplete="off"
              spellCheck={false}
            />
          </form>
        </div>
      </div>
      <style>{`
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

        .terminal-cursor {
          animation: terminal-caret 900ms steps(1, end) infinite;
        }

        .terminal-type {
          width: 14ch;
          animation: terminal-type 1.2s steps(14, end) both;
        }

        .terminal-surface::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: repeating-linear-gradient(
            to bottom,
            rgba(214, 247, 221, 0.035),
            rgba(214, 247, 221, 0.035) 1px,
            transparent 1px,
            transparent 5px
          );
          mix-blend-mode: screen;
        }
      `}</style>
    </div>
  );
}
