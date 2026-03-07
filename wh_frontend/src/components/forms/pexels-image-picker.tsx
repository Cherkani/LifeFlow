"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PexelsPhoto = {
  id: number;
  src: {
    medium: string;
    large: string;
  };
  alt?: string;
};

type PexelsImagePickerProps = {
  inputName?: string;
  label?: string;
};

export function PexelsImagePicker({
  inputName = "imageUrl",
  label = "Image (optional)"
}: PexelsImagePickerProps) {
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
    <div className="space-y-2">
      <Label>{label}</Label>
      <input type="hidden" name={inputName} value={selectedImage} />
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
      <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto rounded-lg border border-[#c7d3e8] bg-[#f8fbff] p-2 sm:grid-cols-3">
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
            <Image src={photo.src.medium} alt={photo.alt || "Pexels image"} width={260} height={120} className="h-24 w-full object-cover" />
          </button>
        ))}
        {gallery.length === 0 && !loading ? (
          <p className="col-span-full text-sm text-slate-500">No images found.</p>
        ) : null}
      </div>
      <p className="text-xs text-[#4a5f83]">
        {selectedPhoto ? `Selected image: ${selectedPhoto.alt || "Pexels photo"}.` : "No image selected."}
      </p>
    </div>
  );
}
