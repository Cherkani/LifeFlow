"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, FileText, Link2, List, Shuffle, X } from "lucide-react";

type KnowledgeItem = {
  id: string;
  space_id: string;
  kind: "link" | "note" | "bullets";
  title: string | null;
  url: string | null;
  content: string | null;
  created_at: string;
  checked?: boolean;
};

function parseBullets(content: string): string[] {
  return content
    .split(/\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => line.replace(/^[-*•]\s*/, ""));
}

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

type KnowledgeRevisionCardsProps = {
  spaceTitle: string;
  items: KnowledgeItem[];
  onClose: () => void;
};

export function KnowledgeRevisionCards({ spaceTitle, items, onClose }: KnowledgeRevisionCardsProps) {
  const [index, setIndex] = useState(0);
  const [orderedItems, setOrderedItems] = useState<KnowledgeItem[]>(() => items);

  useEffect(() => {
    setOrderedItems(items);
    setIndex(0);
  }, [items]);

  const item = orderedItems[index] ?? null;
  const total = orderedItems.length;
  const hasPrev = index > 0;
  const hasNext = index < total - 1;

  const goPrev = useCallback(() => {
    if (hasPrev) setIndex((i) => i - 1);
  }, [hasPrev]);

  const goNext = useCallback(() => {
    if (hasNext) setIndex((i) => i + 1);
  }, [hasNext]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, goPrev, goNext]);

  const handleShuffle = () => {
    setOrderedItems(shuffleArray(items));
    setIndex(0);
  };

  const content =
    total === 0 ? (
      <div className="fixed inset-0 z-50 flex flex-col bg-[#f8fbff]">
        <div className="flex items-center justify-between border-b border-[#d7e0f1] px-4 py-3">
          <h2 className="text-lg font-semibold text-[#0c1d3c]">Revision cards</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-2 text-[#4a5f83] hover:bg-[#e3ebf9]"
          >
            <X size={20} />
          </button>
        </div>
        <div className="flex flex-1 items-center justify-center p-8">
          <p className="text-lg text-[#4a5f83]">No items to review. Add some first.</p>
        </div>
      </div>
    ) : (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#f8fbff]">
      <header className="flex shrink-0 items-center justify-between border-b border-[#d7e0f1] px-4 py-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-[#0c1d3c]">{spaceTitle} · Revision</h2>
          <span className="text-sm text-[#4a5f83]">
            {index + 1} / {total}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleShuffle}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#c7d3e8] bg-white px-3 py-1.5 text-sm font-medium text-[#23406d] hover:bg-[#edf3ff]"
          >
            <Shuffle size={14} />
            Shuffle
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-2 text-[#4a5f83] hover:bg-[#e3ebf9]"
          >
            <X size={20} />
          </button>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-6 overflow-y-auto p-6">
        <div className="flex w-full max-w-2xl flex-1 flex-col items-center justify-center">
          {item && (
            <article className="w-full rounded-2xl border border-[#d7e0f1] bg-white p-8 shadow-[0_4px_20px_rgba(11,31,59,0.08)]">
              <div className="mb-4 flex items-center gap-2">
                {item.kind === "link" ? (
                  <Link2 size={18} className="text-[#4a5f83]" />
                ) : item.kind === "bullets" ? (
                  <List size={18} className="text-[#4a5f83]" />
                ) : (
                  <FileText size={18} className="text-[#4a5f83]" />
                )}
                <span className="rounded-full bg-[#edf3ff] px-2.5 py-0.5 text-xs font-semibold text-[#23406d]">
                  {item.kind}
                </span>
              </div>

              {item.title ? (
                <h3 className="mb-4 text-xl font-semibold text-[#0c1d3c]">{item.title}</h3>
              ) : null}

              {item.kind === "bullets" ? (
                <ul className="list-inside list-disc space-y-2 text-lg leading-relaxed text-[#23406d]">
                  {parseBullets(item.content ?? "").map((bullet, i) => (
                    <li key={i}>{bullet}</li>
                  ))}
                </ul>
              ) : (
                <p className="whitespace-pre-wrap text-lg leading-relaxed text-[#23406d]">{item.content}</p>
              )}

              {item.url ? (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-6 inline-flex items-center gap-2 rounded-lg border border-[#c7d3e8] bg-[#edf3ff] px-4 py-2.5 text-sm font-semibold text-[#23406d] transition hover:bg-[#e3ebf9]"
                >
                  Check
                  <ExternalLink size={14} />
                </a>
              ) : null}
            </article>
          )}
        </div>

        <nav className="flex items-center gap-4">
          <button
            type="button"
            onClick={goPrev}
            disabled={!hasPrev}
            aria-label="Previous card"
            className="inline-flex size-12 items-center justify-center rounded-full border border-[#c7d3e8] bg-white text-[#23406d] transition hover:bg-[#edf3ff] disabled:opacity-40 disabled:hover:bg-white"
          >
            <ChevronLeft size={24} />
          </button>
          <span className="min-w-[4rem] text-center text-sm font-medium text-[#4a5f83]">
            {index + 1} / {total}
          </span>
          <button
            type="button"
            onClick={goNext}
            disabled={!hasNext}
            aria-label="Next card"
            className="inline-flex size-12 items-center justify-center rounded-full border border-[#c7d3e8] bg-white text-[#23406d] transition hover:bg-[#edf3ff] disabled:opacity-40 disabled:hover:bg-white"
          >
            <ChevronRight size={24} />
          </button>
        </nav>
      </main>
    </div>
    );

  if (typeof document !== "undefined") {
    return createPortal(content, document.body);
  }
  return content;
}
