import { ReactNode } from "react";
import { prisma } from "@/lib/db";
import TopNav from "@/components/layout/TopNav";
import SpotifyPlayerShell from "@/components/storyline/SpotifyPlayerShell";
import LiveChatNotifier from "@/components/livechat/LiveChatNotifier";

interface NavTab {
  slug: string;
  label: string;
  isEnabled: boolean;
}

export default async function WatchLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ profileslug: string }>;
}) {
  const { profileslug } = await params;

  // Fetch tabs server-side — no flash
  let serverTabs: NavTab[] = [];
  try {
    const tabs = await prisma.navTab.findMany({
      where: { isEnabled: true },
      orderBy: { sortOrder: "asc" },
    });
    serverTabs = tabs.map((t) => ({ slug: t.slug, label: t.label, isEnabled: t.isEnabled }));
  } catch {}

  return (
    <div className="relative z-0 min-h-screen bg-[#0a0a0a]">
      <TopNav profileSlug={profileslug} initialTabs={serverTabs} />
      <div className="pt-14">{children}</div>
      <SpotifyPlayerShell />
      <LiveChatNotifier
        role="viewer"
        chatHref={`/watch/${profileslug}/livechat`}
        partnerLabel="Random"
      />
    </div>
  );
}
