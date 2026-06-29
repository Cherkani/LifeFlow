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
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={copyLink}
        className="inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-black text-[#172033] shadow-sm transition hover:bg-[#fff4dc]"
      >
        {copied ? "Copied" : "Copy link"}
      </button>
      {copyFailed ? (
        <input
          readOnly
          value={currentUrl}
          onFocus={(event) => event.currentTarget.select()}
          className="w-72 rounded-full border border-white/30 bg-white/10 px-3 py-2 text-xs text-white outline-none"
          aria-label="Share link"
        />
      ) : null}
    </div>
  );
}
