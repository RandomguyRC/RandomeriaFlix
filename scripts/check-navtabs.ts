import "dotenv/config";
import { PrismaClient } from "@prisma/client";

async function main() {
  const p = new PrismaClient();
  const tabs = await p.navTab.findMany();
  console.log(JSON.stringify(tabs, null, 2));
  await p.$disconnect();
}

main();
