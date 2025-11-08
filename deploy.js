const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

console.log("🚀 Preparing deployment for gussakah/cerita-di-sekitarmu...");

// Build project
console.log("📦 Building project...");
execSync("npm run build", { stdio: "inherit" });

// Create CNAME file for custom domain (optional)
const cnameContent = "gussakah.github.io";
fs.writeFileSync(path.join(__dirname, "dist", "CNAME"), cnameContent);

// Create .nojekyll file
fs.writeFileSync(path.join(__dirname, "dist", ".nojekyll"), "");

console.log("✅ Build completed!");
console.log("📋 Next steps:");
console.log("1. Commit and push changes to GitHub");
console.log("2. Enable GitHub Pages in repository settings");
console.log(
  "3. Your app will be available at: https://gussakah.github.io/cerita-di-sekitarmu"
);
