import "dotenv/config";
import bcrypt from "bcryptjs";

async function main() {
  const viewerHash = process.env.VIEWER_PASSWORD_HASH;
  const adminHash = process.env.ADMIN_PASSWORD_HASH;

  console.log("Viewer hash:", viewerHash);
  console.log("Admin hash:", adminHash);

  const viewerMatch = await bcrypt.compare("040424", viewerHash!);
  const adminMatch = await bcrypt.compare("cherry", adminHash!);

  console.log("040424 matches viewer:", viewerMatch);
  console.log("cherry matches admin:", adminMatch);
}

main();
