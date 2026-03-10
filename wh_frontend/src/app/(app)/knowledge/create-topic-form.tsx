"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import Image from "next/image";

import { ActionForm } from "@/components/forms/action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { RedirectResult } from "@/lib/action-with-state";

type PexelsPhoto = {
  id: number;
  src: {
    medium: string;
    large: string;
  };
  alt?: string;
};

type CreateTopicFormProps = {
  action: (prevState: RedirectResult | null, formData: FormData) => Promise<RedirectResult | null>;
  onSuccess?: () => void;
};

export function CreateTopicForm({ action, onSuccess }: CreateTopicFormProps) {
  const [search, setSearch] = useState("");
  const [gallery, setGallery] = useState<PexelsPhoto[]>([]);
  const [selectedImage, setSelectedImage] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const selectedPhoto = useMemo(() => gallery.find((photo) => photo.src.large === selectedImage), [gallery, selectedImage]);

  async function loadImages(query?: string) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query && query.trim().length > 0) {
        params.set("q", query.trim());
      }
      params.set("per_page", "12");
      const response = await fetch(`/api/pexels/search?${params.toString()}`);
      const data = await response.json();
      setGallery(Array.isArray(data.photos) ? data.photos : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadImages();
  }, []);

  return (
    <ActionForm action={action} className="space-y-4" onSuccess={onSuccess}>
      <input type="hidden" name="returnPath" value="/knowledge" />
      <input type="hidden" name="imageUrl" value={selectedImage} />

      <div className="space-y-2">
        <Label htmlFor="spaceTitle">Topic title</Label>
        <Input id="spaceTitle" name="title" required placeholder="e.g. AI Research, Marketing, Product Ideas" />
      </div>

      <div className="space-y-2">
        <Label>Topic image (optional)</Label>
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search images from Pexels"
              className="pl-9"
            />
          </div>
          <Button type="button" variant="secondary" onClick={() => void loadImages(search)} disabled={loading}>
            {loading ? "Searching..." : "Search"}
          </Button>
        </div>
      </div>

      <div className="grid max-h-72 grid-cols-2 gap-2 overflow-y-auto rounded-lg border border-[#c7d3e8] bg-[#f8fbff] p-2 sm:grid-cols-3">
        {gallery.map((photo) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => setSelectedImage(photo.src.large)}
            className={[
              "overflow-hidden rounded-md border bg-white text-left",
              selectedImage === photo.src.large ? "border-[#0b1f3b] ring-1 ring-[#0b1f3b]" : "border-[#d7e0f1]"
            ].join(" ")}
          >
            <Image
              src={photo.src.medium}
              alt={photo.alt || "Pexels image"}
              width={260}
              height={120}
              className="h-24 w-full object-cover"
            />
          </button>
        ))}
        {gallery.length === 0 && !loading ? (
          <p className="col-span-full text-sm text-slate-500">No images found.</p>
        ) : null}
      </div>

      {selectedPhoto ? (
        <p className="text-xs text-[#4a5f83]">
          Selected image: {selectedPhoto.alt || "Pexels photo"}.
        </p>
      ) : (
        <p className="text-xs text-[#4a5f83]">No image selected.</p>
      )}

      <SubmitButton label="Create topic" pendingLabel="Creating..." className="w-full sm:w-auto" />
    </ActionForm>
  );
}
