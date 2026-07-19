import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.siteSetting.upsert({
    where: { key: "slideshowInterval" },
    update: { value: "10" },
    create: { key: "slideshowInterval", value: "10" },
  });
  await prisma.siteSetting.upsert({
    where: { key: "appName" },
    update: { value: "RandomeriaFlix" },
    create: { key: "appName", value: "RandomeriaFlix" },
  });
  console.log("Settings seeded!");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
