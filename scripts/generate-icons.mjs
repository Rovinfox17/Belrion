import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const source = path.join(root, "public", "logo.png");
const outDir = path.join(root, "public", "icons");

const sizes = [16, 32, 180, 192, 512];

for (const size of sizes) {
  const outPath = path.join(outDir, `icon-${size}.png`);
  await sharp(source).resize(size, size).png().toFile(outPath);
  console.log(`Generated ${outPath}`);
}

// Maskable icon: same artwork, since the logo already fills the square with the
// terracota background (no transparent margins that would get clipped by masks).
await sharp(source)
  .resize(512, 512)
  .png()
  .toFile(path.join(outDir, "icon-512-maskable.png"));
console.log("Generated maskable icon-512-maskable.png");
