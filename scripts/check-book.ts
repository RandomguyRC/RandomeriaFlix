import "dotenv/config";
import { PrismaClient } from "@prisma/client";

async function main() {
  const p = new PrismaClient();
  const books = await p.book.findMany({ include: { pdfAsset: true } });
  console.log("Books:", JSON.stringify(books, null, 2));
  await p.$disconnect();
}

main();
