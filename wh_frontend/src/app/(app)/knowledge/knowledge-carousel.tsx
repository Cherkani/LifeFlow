"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, FileText, Link2, List } from "lucide-react";

type KnowledgeItem = {
  id: string;
  space_id: string;
  kind: "link" | "note" | "bullets";
  title: string | null;
  url: string | null;
  content: string | null;
  created_at: string;
  checked?: boolean;
  is_hidden?: boolean;
};

function parseBullets(content: string): string[] {
  return content
    .split(/\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => line.replace(/^[-*•]\s*/, ""));
}

type KnowledgeCarouselProps = {
  items: KnowledgeItem[];
  onEdit: (itemId: string) => void;
};

export function KnowledgeCarousel({ items, onEdit }: KnowledgeCarouselProps) {
  const [index, setIndex] = useState(0);
  const item = items[index] ?? null;
  const total = items.length;
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
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [goPrev, goNext]);

  if (total === 0 || !item) return null;

  return (
    <div className="relative">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={goPrev}
          disabled={!hasPrev}
          aria-label="Previous card"
          className="shrink-0 rounded-full border border-[#c7d3e8] bg-white p-2 text-[#23406d] transition hover:bg-[#edf3ff] disabled:opacity-40 disabled:hover:bg-white"
        >
          <ChevronLeft size={24} />
        </button>

        <div className="min-w-0 flex-1 overflow-hidden rounded-xl border border-[#d7e0f1] bg-white p-6 shadow-[0_2px_12px_rgba(11,31,59,0.06)]">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="mb-3 flex items-center gap-2">
                {item.kind === "link" ? (
                  <Link2 size={16} className="text-[#4a5f83]" />
                ) : item.kind === "bullets" ? (
                  <List size={16} className="text-[#4a5f83]" />
                ) : (
                  <FileText size={16} className="text-[#4a5f83]" />
                )}
                <span className="rounded-full bg-[#edf3ff] px-2 py-0.5 text-xs font-semibold text-[#23406d]">
                  {item.kind}
                </span>
              </div>

              {item.title ? (
                <h3 className="mb-3 text-lg font-semibold text-[#0c1d3c]">{item.title}</h3>
              ) : null}

              {item.kind === "bullets" ? (
                <ul className="list-inside list-disc space-y-1.5 text-[#23406d]">
                  {parseBullets(item.content ?? "").map((bullet, i) => (
                    <li key={i}>{bullet}</li>
                  ))}
                </ul>
              ) : (
                <p className="whitespace-pre-wrap text-[#23406d]">{item.content}</p>
              )}

              {item.url ? (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[#c7d3e8] bg-[#edf3ff] px-3 py-2 text-sm font-semibold text-[#23406d] transition hover:bg-[#e3ebf9]"
                >
                  Check
                  <ExternalLink size={14} />
                </a>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => onEdit(item.id)}
              className="shrink-0 rounded-md border border-[#c7d3e8] bg-[#edf3ff] px-2.5 py-1.5 text-xs font-medium text-[#23406d] hover:bg-[#e3ebf9]"
            >
              Edit
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={goNext}
          disabled={!hasNext}
          aria-label="Next card"
          className="shrink-0 rounded-full border border-[#c7d3e8] bg-white p-2 text-[#23406d] transition hover:bg-[#edf3ff] disabled:opacity-40 disabled:hover:bg-white"
        >
          <ChevronRight size={24} />
        </button>
      </div>

      <div className="mt-3 flex items-center justify-center gap-1.5">
        {items.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`Go to card ${i + 1}`}
            className={`h-2 rounded-full transition ${
              i === index ? "w-6 bg-[#0b1f3b]" : "w-2 bg-[#c7d3e8] hover:bg-[#9eb3d8]"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
