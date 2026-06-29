"use client";

import { useEffect, useState } from "react";

export function CopyShareLinkButton() {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [currentUrl, setCurrentUrl] = useState("");

  useEffect(() => {
    setCurrentUrl(window.location.href);
  }, []);

  async function copyLink() {
    const url = currentUrl || window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setCopyFailed(false);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopyFailed(true);
    }
  }

  return (
    <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:items-end">
      <button
        type="button"
        onClick={copyLink}
        className="inline-flex items-center justify-center rounded-lg border border-[#2a5b3a] bg-[#102117] px-4 py-2 font-mono text-sm font-black text-[#9cffb2] shadow-[0_0_24px_rgba(103,232,137,0.08)] transition hover:bg-[#173420]"
      >
        {copied ? "copied" : "copy_link"}
      </button>
      {copyFailed ? (
        <input
          readOnly
          value={currentUrl}
          onFocus={(event) => event.currentTarget.select()}
          className="w-full rounded-full border border-white/30 bg-white/10 px-3 py-2 text-xs text-white outline-none placeholder:text-white/60 sm:w-72"
          aria-label="Share link"
        />
      ) : null}
    </div>
  );
}
