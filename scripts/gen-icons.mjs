// Generates PWA PNG icons from an inline SVG using sharp.
// Run: npm run gen:icons
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "icons");

function svg({ size, padding }) {
  const p = padding;
  const inner = size - p * 2;
  // Trend-line mark scaled into the inner (padded) box.
  const s = inner / 64;
  const tx = p;
  const ty = p;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#3b82f6"/>
      <stop offset="1" stop-color="#4f46e5"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#g)"/>
  <g transform="translate(${tx},${ty}) scale(${s})">
    <path d="M8 46L24 30l9 9 20-20" fill="none" stroke="white" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M42 19h14v14" fill="none" stroke="white" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>`;
}

async function render(name, size, padding) {
  const buf = Buffer.from(svg({ size, padding }));
  await sharp(buf).png().toFile(join(outDir, name));
  console.log("  ✓", name);
}

async function main() {
  await mkdir(outDir, { recursive: true });
  console.log("Generating PWA icons…");
  await render("icon-192.png", 192, 34);
  await render("icon-512.png", 512, 92);
  await render("apple-touch-icon.png", 180, 30);
  // Maskable needs extra safe-zone padding (icon within center ~80%).
  await render("maskable-512.png", 512, 128);
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
