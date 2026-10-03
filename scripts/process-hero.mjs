// Turns the untouched hero originals into the files committed in public/hero/.
//
//   npm run hero:process [-- <originalsDir>]     (default C:\Progetti\hero-originals)
//
// The originals live OUTSIDE the repo and are only ever read. Output keeps
// each input filename and extension exactly, because src/lib/hero-images.ts
// references the photos by name.
//
// One rule for every photo: width capped at 2560px, never upscaled. The cap is
// on WIDTH, not the long edge — the photos are portrait and the hero
// cover-crops them by width on desktop, so a long-edge cap would silently hold
// a future high-res original to ~1920px wide (soft on a 1280px retina screen).
//
// All metadata is dropped (sharp keeps none unless asked), GPS included, and
// every output is re-read to prove it.

import { readFile, readdir, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const DEFAULT_ORIGINALS = "C:\\Progetti\\hero-originals";
const OUTPUT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../public/hero");
const MAX_WIDTH = 2560;
const QUALITY = 88;
// Narrower than this and the photo is upscaled on a 1280px-wide retina screen.
const SOFT_BELOW_WIDTH = 1920;

function fail(message) {
  console.error(`\nERROR: ${message}\n`);
  process.exit(1);
}

const inputDir = path.resolve(process.argv[2] ?? DEFAULT_ORIGINALS);

const inputStat = await stat(inputDir).catch(() => null);
if (!inputStat?.isDirectory()) fail(`originals folder not found: ${inputDir}`);

const files = (await readdir(inputDir)).filter((f) => /\.jpe?g$/i.test(f)).sort();
if (files.length === 0) fail(`no .jpg/.jpeg files in ${inputDir} — nothing written`);

const outputStat = await stat(OUTPUT_DIR).catch(() => null);
if (!outputStat?.isDirectory()) fail(`output folder not found: ${OUTPUT_DIR}`);

// Windows: sharp keeps a file opened by path locked, so always hand it a Buffer.
sharp.cache(false);

const rows = [];
const warnings = [];

for (const file of files) {
  const source = await readFile(path.join(inputDir, file));
  const original = await sharp(source).metadata();

  const output = await sharp(source)
    .rotate() // apply EXIF orientation before the tag is dropped
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .jpeg({ quality: QUALITY, mozjpeg: true, progressive: true })
    .toBuffer();

  const check = await sharp(output).metadata();
  const leaked = ["exif", "icc", "xmp", "iptc"].filter((key) => check[key]);
  if (leaked.length > 0) fail(`${file}: output still carries ${leaked.join(", ")} — nothing renamed`);

  const target = path.join(OUTPUT_DIR, file);
  const temp = path.join(OUTPUT_DIR, `.${file}.tmp`);
  await writeFile(temp, output);
  await rename(temp, target);

  // EXIF orientations 5–8 swap the axes; report the upright size.
  const swapped = (original.orientation ?? 1) >= 5;
  const originalWidth = swapped ? original.height : original.width;
  const originalHeight = swapped ? original.width : original.height;
  if (originalWidth < SOFT_BELOW_WIDTH) {
    warnings.push(
      `WARNING: ${file} original is only ${originalWidth}px wide (< ${SOFT_BELOW_WIDTH}) — it will look soft on desktop retina.`
    );
  }

  rows.push({
    file,
    original: `${originalWidth}x${originalHeight}`,
    output: `${check.width}x${check.height}`,
    "output KB": Math.round(output.length / 1024),
  });
}

console.table(rows);
for (const warning of warnings) console.warn(warning);
console.log(`\n${rows.length} photo(s) written to ${OUTPUT_DIR}`);
