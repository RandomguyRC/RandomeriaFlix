import bcrypt from "bcryptjs";

async function main() {
  const v = await bcrypt.hash("040424", 12);
  const a = await bcrypt.hash("cherry", 12);
  console.log("Viewer hash:", v);
  console.log("Admin hash:", a);
}

main();
