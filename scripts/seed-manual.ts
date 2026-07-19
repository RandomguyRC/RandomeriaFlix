import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const randomeria = await prisma.profile.upsert({
    where: { slug: "randomeria" },
    update: {},
    create: {
      slug: "randomeria",
      name: "Randomeria",
      sortOrder: 0,
      theme: "red",
    },
  });

  const bonus = await prisma.profile.upsert({
    where: { slug: "bonus" },
    update: {},
    create: {
      slug: "bonus",
      name: "Bonus",
      sortOrder: 10,
      theme: "violet",
    },
  });

  const tabs = [
    { slug: "home", label: "Home", kind: "HOME" as const, sortOrder: 0 },
    { slug: "storyline", label: "Storyline", kind: "STORYLINE" as const, sortOrder: 10 },
    { slug: "chat-history", label: "Chat History", kind: "CHAT" as const, sortOrder: 20 },
    { slug: "book", label: "Book", kind: "BOOK" as const, sortOrder: 30 },
    { slug: "movies", label: "Movies", kind: "COLLECTION" as const, sortOrder: 40 },
    { slug: "tv-shows", label: "TV Shows", kind: "COLLECTION" as const, sortOrder: 50 },
    { slug: "photos", label: "Photos", kind: "COLLECTION" as const, sortOrder: 60 },
  ];

  for (const tab of tabs) {
    await prisma.navTab.upsert({
      where: { slug: tab.slug },
      update: {},
      create: tab,
    });
  }

  const photosTab = await prisma.navTab.findUniqueOrThrow({ where: { slug: "photos" } });

  for (const profile of [randomeria, bonus]) {
    const categories = [
      { slug: "our-best-moments", title: "Our Best Moments", sortOrder: 0 },
      { slug: "chaotic-energy", title: "Chaotic Energy", sortOrder: 10 },
      { slug: "cute-stuff", title: "Cute Stuff", sortOrder: 20 },
    ];

    for (const cat of categories) {
      await prisma.category.upsert({
        where: {
          profileId_slug: {
            profileId: profile.id,
            slug: cat.slug,
          },
        },
        update: {},
        create: {
          ...cat,
          profileId: profile.id,
          navTabId: photosTab.id,
        },
      });
    }
  }

  console.log("Seeded successfully!");
  console.log("Profiles:", randomeria.name, bonus.name);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
