"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import ReelCard from "@/components/reels/ReelCard";

interface ReelItem {
  id: string;
  title: string;
  type: string;
  description?: string | null;
  dateLabel?: string | null;
  tags?: string | null;
  mood?: string | null;
  mainAsset: { id: string; mimeType: string };
  thumbnailAsset?: { id: string } | null;
}

export default function ReelsPage() {
  const params = useParams();
  const profileSlug = params.profileslug as string;
  const [reels, setReels] = useState<ReelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/reels?profileSlug=${profileSlug}`);
        if (res.ok) setReels(await res.json());
      } catch {}
      setLoading(false);
    }
    load();
  }, [profileSlug]);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-red-500" />
      </div>
    );
  }

  if (reels.length === 0) {
    return (
      <div className="flex h-[80vh] items-center justify-center bg-black">
        <div className="text-center">
          <p className="text-xl text-gray-500">No reels.</p>
          <p className="mt-2 text-sm text-gray-600">Reels got deleted with your Random Guy.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-56px)] bg-black overflow-y-scroll snap-y snap-mandatory">
      {reels.map((reel, index) => (
        <ReelCard
          key={reel.id}
          reel={reel}
          isActive={index === activeIndex}
          onInView={() => setActiveIndex(index)}
        />
      ))}
    </div>
  );
}
