import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

async function main() {
  await p.navTab.deleteMany();

  const tabs = [
    { slug: "home", label: "Home", kind: "HOME", sortOrder: 0 },
    { slug: "reels", label: "Reels", kind: "COLLECTION", sortOrder: 10 },
    { slug: "memories", label: "Memories", kind: "COLLECTION", sortOrder: 20 },
    { slug: "storyline", label: "Storyline", kind: "STORYLINE", sortOrder: 30 },
    { slug: "chat", label: "Chat History", kind: "CHAT", sortOrder: 40 },
    { slug: "book", label: "Book", kind: "BOOK", sortOrder: 50 },
    { slug: "stickers", label: "Stickers", kind: "COLLECTION", sortOrder: 60 },
  ];

  for (const t of tabs) {
    await p.navTab.create({ data: t });
  }

  console.log("Seeded", tabs.length, "tabs");
}

main()
  .then(() => p.$disconnect())
  .catch((e) => { console.error(e); p.$disconnect(); });
