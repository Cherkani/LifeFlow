"use client";

import { useEffect, useMemo, useRef } from "react";
import { Terminal } from "@xterm/xterm";

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

function safeTerminalName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "user";
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

function buildDetailedDebtLines(debts: TerminalDebt[]) {
  if (debts.length === 0) return ["# no debts"];
  return debts.flatMap((debt, index) => [
    `[${index + 1}] ${debt.type === "owed" ? "Owes you" : "You owe"}`,
    `    name:   ${debt.name}`,
    `    amount: ${formatMoneyDhs(debt.amount)}`,
    `    status: ${debt.status}`,
    ...(formatDateLabel(debt.dueDate) ? [`    due:    ${formatDateLabel(debt.dueDate)}`] : []),
    ""
  ]);
}

export function FinanceShareTerminal({ accountName, groupKey, groupName, debts }: FinanceShareTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstanceRef = useRef<Terminal | null>(null);
  const commandRef = useRef("");
  const commandCountRef = useRef(0);
  const commandHistoryRef = useRef<string[]>([]);
  const historyIndexRef = useRef<number | null>(null);
  const normalizedAccountName = safeTerminalName(accountName);
  const openDebts = useMemo(() => debts.filter((debt) => debt.status === "open" && debt.amount > 0), [debts]);
  const openTotal = useMemo(() => openDebts.reduce((sum, debt) => sum + debt.amount, 0), [openDebts]);
  const promptPath = `~/finance/debts/${groupKey}`;
  const completions = useMemo(
    () => [
      "help",
      "pwd",
      "ls",
      "ls -la",
      "ll",
      "tree",
      "cat balance",
      "cat debts.txt",
      "cat details.txt",
      "cat README.md",
      "date",
      "whoami",
      "clear"
    ],
    []
  );

  useEffect(() => {
    const element = terminalRef.current;
    if (!element || terminalInstanceRef.current) return;

    const terminal = new Terminal({
      allowProposedApi: false,
      convertEol: true,
      cursorBlink: true,
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      fontSize: 14,
      lineHeight: 1.35,
      rows: 24,
      theme: {
        background: "#020506",
        foreground: "#d6f7dd",
        cursor: "#67e889",
        cursorAccent: "#020506",
        selectionBackground: "#1d3b2a",
        black: "#05080b",
        red: "#ffb199",
        green: "#9cffb2",
        yellow: "#f7c66b",
        blue: "#8fc7ff",
        magenta: "#d8b4fe",
        cyan: "#67e8f9",
        white: "#f5fff7",
        brightBlack: "#6d8b77",
        brightRed: "#ffb199",
        brightGreen: "#9cffb2",
        brightYellow: "#f7c66b",
        brightBlue: "#8fc7ff",
        brightMagenta: "#d8b4fe",
        brightCyan: "#67e8f9",
        brightWhite: "#ffffff"
      }
    });

    function prompt() {
      terminal.write(`\r\n\x1b[32m${normalizedAccountName}@life-flow\x1b[0m:\x1b[34m${promptPath}\x1b[0m$ `);
    }

    function redrawCommand(command: string) {
      terminal.write(`\x1b[2K\r\x1b[32m${normalizedAccountName}@life-flow\x1b[0m:\x1b[34m${promptPath}\x1b[0m$ ${command}`);
    }

    function autocompleteCommand() {
      const current = commandRef.current;
      const currentLower = current.toLowerCase();
      const matches = completions.filter((item) => item.toLowerCase().startsWith(currentLower));

      if (matches.length === 1) {
        commandRef.current = matches[0];
        redrawCommand(commandRef.current);
        return;
      }

      if (matches.length > 1) {
        terminal.write("\r\n");
        writeLines(matches);
        prompt();
        terminal.write(commandRef.current);
      }
    }

    function writeLines(lines: string[], color?: string) {
      for (const line of lines) {
        terminal.writeln(`${color ?? ""}${line}${color ? "\x1b[0m" : ""}`);
      }
    }

    function runCommand(rawCommand: string) {
      const command = rawCommand.trim();
      if (!command) {
        prompt();
        return;
      }

      if (command === "clear") {
        terminal.clear();
        commandCountRef.current = 0;
        prompt();
        return;
      }

      commandCountRef.current += 1;
      commandHistoryRef.current = [...commandHistoryRef.current, command].slice(-50);
      historyIndexRef.current = null;
      const lower = command.toLowerCase();
      const parts = lower.split(/\s+/);

      if (lower === "help") {
        writeLines([
          "available commands:",
          "  help                 show this help",
          "  pwd                  print current folder",
          "  ls / ls -la          list files",
          "  tree                 show shared folder tree",
          "  cat balance          show open balance",
          "  cat debts.txt        show debt lines",
          "  cat details.txt      show detailed debts",
          "  cat README.md        explain this share",
          "  date                 print local date",
          "  whoami               show share scope",
          "  clear                clear terminal"
        ]);
      } else if (lower === "pwd") {
        terminal.writeln(promptPath);
      } else if (lower === "ls" || lower === "ls -la" || lower === "ll" || lower === "dir") {
        if (lower === "ls -la" || lower === "ll") {
          writeLines([
            "dr-xr-xr-x  1 share  public    128 .",
            "dr-xr-xr-x  1 share  public    128 ..",
            "-r--r--r--  1 share  public    184 README.md",
            "-r--r--r--  1 share  public     44 balance",
            "-r--r--r--  1 share  public    512 debts.txt",
            "-r--r--r--  1 share  public    512 details.txt"
          ]);
        } else {
          writeLines(["README.md  balance  debts.txt  details.txt"]);
        }
      } else if (lower === "tree") {
        writeLines([
          ".",
          "|-- README.md",
          "|-- balance",
          "|-- debts.txt",
          "`-- details.txt"
        ]);
      } else if (lower === "summary" || lower === "balance" || lower === "cat balance") {
        writeLines([`OPEN_BALANCE  ${formatMoneyDhs(openTotal)}`, `OPEN_LINES    ${openDebts.length}`], "\x1b[33m");
      } else if (lower === "list" || lower === "cat debts.txt" || lower === "cat debts" || lower === "less debts.txt") {
        writeLines(buildLedgerLines(debts));
      } else if (lower === "cat details.txt" || lower === "cat details" || lower === "less details.txt") {
        writeLines(buildDetailedDebtLines(debts));
      } else if (lower === "cat readme.md" || lower === "cat readme") {
        writeLines([
          "# finance share",
          `group: ${groupName}`,
          "mode: read-only",
          "hint: try `cat debts.txt`, `cat balance`, or `tree`."
        ]);
      } else if (lower === "date") {
        terminal.writeln(new Date().toString());
      } else if (lower === "whoami") {
        writeLines([`account=${accountName}`, `group=${groupKey}`, "mode=read_only"]);
      } else if (parts[0] === "mkdir" || parts[0] === "touch" || parts[0] === "rm" || parts[0] === "mv" || parts[0] === "cp") {
        terminal.writeln("\x1b[31mread-only filesystem: permission denied\x1b[0m");
      } else {
        terminal.writeln(`\x1b[31mcommand not found: ${command}\x1b[0m`);
      }

      if (commandCountRef.current > 3) {
        terminal.writeln("\x1b[31mwatared asahbi lfloss lmolaha o nta galess katl3ab\x1b[0m");
      }

      prompt();
    }

    terminal.open(element);
    terminalInstanceRef.current = terminal;
    terminal.writeln("\x1b[32m  __ _                         \x1b[0m");
    terminal.writeln("\x1b[32m / _(_)_ __   __ _ _ __   ___ ___\x1b[0m");
    terminal.writeln("\x1b[32m| |_| | '_ \\ / _` | '_ \\ / __/ _ \\\x1b[0m");
    terminal.writeln("\x1b[32m|  _| | | | | (_| | | | | (_|  __/\x1b[0m");
    terminal.writeln("\x1b[32m|_| |_|_| |_|\\__,_|_| |_|\\___\\___|\x1b[0m");
    terminal.writeln("");
    terminal.writeln(`connected: finance-share/${groupKey}`);
    terminal.writeln(`mounted:   ${promptPath}`);
    terminal.writeln(`group:     ${groupName}`);
    terminal.writeln("mode:      read-only");
    terminal.writeln("hint:      type `help`, use ↑/↓ for history");
    terminal.writeln("");
    terminal.writeln(`OPEN_BALANCE  \x1b[33m${formatMoneyDhs(openTotal)}\x1b[0m`);
    terminal.writeln(`OPEN_LINES    ${openDebts.length}`);
    prompt();

    const disposable = terminal.onKey(({ key, domEvent }) => {
      if (domEvent.key === "ArrowUp") {
        if (commandHistoryRef.current.length === 0) return;
        historyIndexRef.current =
          historyIndexRef.current === null
            ? commandHistoryRef.current.length - 1
            : Math.max(0, historyIndexRef.current - 1);
        commandRef.current = commandHistoryRef.current[historyIndexRef.current] ?? "";
        redrawCommand(commandRef.current);
        return;
      }

      if (domEvent.key === "ArrowDown") {
        if (historyIndexRef.current === null) return;
        historyIndexRef.current += 1;
        if (historyIndexRef.current >= commandHistoryRef.current.length) {
          historyIndexRef.current = null;
          commandRef.current = "";
        } else {
          commandRef.current = commandHistoryRef.current[historyIndexRef.current] ?? "";
        }
        redrawCommand(commandRef.current);
        return;
      }

      if (domEvent.key === "Tab") {
        domEvent.preventDefault();
        autocompleteCommand();
        return;
      }

      if (domEvent.key === "Enter") {
        terminal.write("\r\n");
        runCommand(commandRef.current);
        commandRef.current = "";
        return;
      }

      if (domEvent.key === "Backspace") {
        if (commandRef.current.length > 0) {
          commandRef.current = commandRef.current.slice(0, -1);
          terminal.write("\b \b");
        }
        return;
      }

      if (domEvent.ctrlKey || domEvent.metaKey || domEvent.altKey) return;

      const code = key.charCodeAt(0);
      if (code >= 32 && code <= 126) {
        commandRef.current += key;
        terminal.write(key);
      }
    });

    return () => {
      disposable.dispose();
      terminal.dispose();
      terminalInstanceRef.current = null;
    };
  }, [accountName, completions, debts, groupKey, groupName, normalizedAccountName, openDebts.length, openTotal, promptPath]);

  return (
    <div className="overflow-hidden rounded-xl border border-[#183322] bg-[#05080b] shadow-[0_0_90px_rgba(28,230,120,0.13)]">
      <div className="flex items-center gap-2 border-b border-[#17291f] bg-[#0d151b] px-5 py-3">
        <span className="h-3 w-3 rounded-full bg-[#ff5f56]" />
        <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
        <span className="h-3 w-3 rounded-full bg-[#27c93f]" />
        <span className="ml-3 text-xs text-[#6d8b77]">xterm - finance-share/{groupKey}</span>
        <div className="ml-auto">
          <CopyShareLinkButton />
        </div>
      </div>
      <div className="terminal-surface relative overflow-hidden p-3 sm:p-5">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[#25d366]/10 blur-3xl" />
        <div ref={terminalRef} className="relative min-h-[30rem] overflow-hidden rounded border border-[#17291f] bg-[#020506]/95 p-2" />
      </div>
      <style>{`
        .terminal-surface::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: repeating-linear-gradient(
            to bottom,
            rgba(214, 247, 221, 0.03),
            rgba(214, 247, 221, 0.03) 1px,
            transparent 1px,
            transparent 5px
          );
          mix-blend-mode: screen;
        }

        .xterm {
          padding: 0.25rem;
        }

        .xterm,
        .xterm-viewport,
        .xterm-screen {
          height: 100%;
        }

        .xterm {
          cursor: text;
          position: relative;
          user-select: none;
        }

        .xterm.focus,
        .xterm:focus {
          outline: none;
        }

        .xterm .xterm-helpers {
          position: absolute;
          top: 0;
          z-index: 5;
        }

        .xterm .xterm-helper-textarea {
          border: 0;
          height: 0;
          left: -9999em;
          margin: 0;
          opacity: 0;
          overflow: hidden;
          padding: 0;
          position: absolute;
          resize: none;
          top: 0;
          white-space: nowrap;
          width: 0;
          z-index: -5;
        }

        .xterm .composition-view {
          background: #020506;
          color: #d6f7dd;
          display: none;
          position: absolute;
          white-space: nowrap;
          z-index: 1;
        }

        .xterm .xterm-viewport {
          background-color: transparent;
          cursor: default;
          overflow-y: auto;
        }

        .xterm .xterm-screen {
          position: relative;
        }

        .xterm .xterm-scroll-area {
          visibility: hidden;
        }
      `}</style>
    </div>
  );
}
