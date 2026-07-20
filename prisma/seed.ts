import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const profiles = [
    {
      slug: "randomeria",
      name: "Randomeria",
      sortOrder: 0,
      theme: "red",
    },
    {
      slug: "bonus",
      name: "Bonus",
      sortOrder: 10,
      theme: "violet",
    },
  ];

  for (const profile of profiles) {
    await prisma.profile.upsert({
      where: { slug: profile.slug },
      update: profile,
      create: profile,
    });
  }

  const navTabs = [
    {
      slug: "home",
      label: "Home",
      kind: "HOME",
      sortOrder: 0,
    },
    {
      slug: "storyline",
      label: "Storyline",
      kind: "STORYLINE",
      sortOrder: 10,
    },
    {
      slug: "chat-history",
      label: "Chat History",
      kind: "CHAT",
      sortOrder: 20,
    },
    {
      slug: "book",
      label: "Book",
      kind: "BOOK",
      sortOrder: 30,
    },
    {
      slug: "maps",
      label: "Randomeria Maps",
      kind: "MAPS",
      sortOrder: 35,
    },
    {
      slug: "movies",
      label: "Movies",
      kind: "COLLECTION",
      sortOrder: 40,
    },
    {
      slug: "tv-shows",
      label: "TV Shows",
      kind: "COLLECTION",
      sortOrder: 50,
    },
    {
      slug: "photos",
      label: "Photos",
      kind: "COLLECTION",
      sortOrder: 60,
    },
  ];

  for (const tab of navTabs) {
    await prisma.navTab.upsert({
      where: { slug: tab.slug },
      update: tab,
      create: tab,
    });
  }

  const allProfiles = await prisma.profile.findMany();

  const photosTab = await prisma.navTab.findUniqueOrThrow({
    where: {
      slug: "photos",
    },
  });

  for (const profile of allProfiles) {
    const categories = [
      {
        slug: "our-best-moments",
        title: "Our Best Moments",
        sortOrder: 0,
      },
      {
        slug: "chaotic-energy",
        title: "Chaotic Energy",
        sortOrder: 10,
      },
      {
        slug: "cute-stuff",
        title: "Cute Stuff",
        sortOrder: 20,
      },
    ];

    for (const category of categories) {
      await prisma.category.upsert({
        where: {
          profileId_slug: {
            profileId: profile.id,
            slug: category.slug,
          },
        },
        update: {
          title: category.title,
          sortOrder: category.sortOrder,
          navTabId: photosTab.id,
        },
        create: {
          ...category,
          profileId: profile.id,
          navTabId: photosTab.id,
        },
      });
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });