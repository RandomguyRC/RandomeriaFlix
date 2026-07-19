"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import dynamic from "next/dynamic";

const MemoryGraph = dynamic(() => import("@/components/memoryGraph/MemoryGraph"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-red-500" />
    </div>
  ),
});

interface Memory {
  id: string;
  title: string;
  paragraph: string;
  owner: "random" | "cherry";
  createdAt: string;
}

export default function MemoriesPage() {
  const params = useParams();
  const profileSlug = params.profileslug as string;
  const [memories, setMemories] = useState<Memory[]>([]);
  const [randomDesc, setRandomDesc] = useState("");
  const [cherryDesc, setCherryDesc] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch(`/api/memories?profileSlug=${profileSlug}`);
        if (res.ok) {
          const data = await res.json();
          setMemories(data.memories || []);
          setRandomDesc(data.randomDescription || "");
          setCherryDesc(data.cherryDescription || "");
        }
      } catch {}
      setLoading(false);
    }
    loadData();
  }, [profileSlug]);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-red-500" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-56px)] flex-col px-4 py-4">
      {/* Graph takes remaining space */}
      <div className="min-h-0 flex-1">
        <MemoryGraph
          memories={memories}
          randomDescription={randomDesc}
          cherryDescription={cherryDesc}
        />
      </div>

      {/* Romantic note — always visible at bottom */}
      <div className="flex-shrink-0 pt-4 pb-0 text-center">
        <p className="text-xs leading-relaxed text-gray-500 italic">
          The universe is filled with planets that have dozens of moons.
          Earth has only one, yet that single companion steadies its seasons,
          shapes its tides, and lights its darkest nights. Without it, Earth
          would never be quite the same. Perhaps that&apos;s the beautiful
          thing about some worlds, they were never meant to have many, only the
          one that makes them whole. ❤️
        </p>
      </div>
    </div>
  );
}
