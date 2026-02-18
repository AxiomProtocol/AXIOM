import { execSync } from "child_process";

try {
  console.log("Regenerating package-lock.json...");
  execSync("npm install --package-lock-only --legacy-peer-deps", {
    cwd: "/vercel/share/v0-project",
    stdio: "inherit",
    timeout: 120000,
  });
  console.log("package-lock.json regenerated successfully.");
} catch (err) {
  console.error("Failed to regenerate lockfile:", err.message);
  process.exit(1);
}
