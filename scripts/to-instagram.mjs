#!/usr/bin/env node
/**
 * Export a diary entry as an Instagram Reel (1080x1920 MP4).
 * Animated waveform visualization with title overlay.
 *
 * Usage:
 *   node scripts/to-instagram.mjs <entry-slug-or-partial-filename>
 *   node scripts/to-instagram.mjs 2026-04-11
 *   node scripts/to-instagram.mjs monday-sunset
 *
 * Outputs to: instagram-output/<slug>.mp4
 */

import { spawnSync } from "child_process";
import { readFileSync, mkdirSync, rmSync, existsSync, writeFileSync } from "fs";
import { join, resolve, basename } from "path";
import { tmpdir } from "os";
import { readdirSync } from "fs";

const ROOT = resolve(import.meta.dirname, "..");
const ENTRIES_DIR = join(ROOT, "src/content/entries");
const OUT_DIR = join(ROOT, "instagram-output");

// Video dimensions
const W = 1080;
const H = 1920;

function parseFrontmatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!match) throw new Error("No frontmatter found");
  const fm = {};
  for (const line of match[1].split("\n")) {
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    const val = line.slice(colon + 1).trim().replace(/^["']|["']$/g, "");
    if (val) fm[key] = val;
  }
  const listMatch = raw.match(/^videoUrl:\s*\n((?:  - .+\n?)+)/m);
  if (listMatch) {
    fm.videoUrl = listMatch[1]
      .split("\n")
      .map((l) => l.replace(/^\s+-\s+/, "").trim())
      .filter(Boolean);
  } else if (fm.videoUrl) {
    fm.videoUrl = [fm.videoUrl];
  }
  return fm;
}

function extractSoundCloudUrl(widgetUrl) {
  try {
    const u = new URL(widgetUrl);
    const inner = u.searchParams.get("url");
    if (inner) {
      let sc = decodeURIComponent(inner);
      // Private tracks come through as api.soundcloud.com/tracks/soundcloud:tracks:ID?secret_token=...
      // Normalize to api.soundcloud.com/tracks/ID?secret_token=... which yt-dlp handles
      sc = sc.replace(/\/tracks\/soundcloud%3Atracks%3A(\d+)/g, "/tracks/$1");
      sc = sc.replace(/\/tracks\/soundcloud:tracks:(\d+)/g, "/tracks/$1");
      return sc;
    }
  } catch {}
  return widgetUrl;
}

function sanitize(str) {
  return str.replace(/[^a-zA-Z0-9 _-]/g, "").trim();
}

function generateTitleOverlay(title, outputPng) {
  const py = `
from PIL import Image, ImageDraw, ImageFont

W, H = ${W}, ${H}
img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)

def load_font(size):
    for path in [
        "/System/Library/Fonts/SFNSMono.ttf",
        "/System/Library/Fonts/Supplemental/Courier New.ttf",
        "/System/Library/Fonts/Monaco.ttf",
    ]:
        try:
            return ImageFont.truetype(path, size)
        except:
            pass
    return ImageFont.load_default()

title_font = load_font(36)

title = ${JSON.stringify(title)}

# Track title — top left, no wrap needed at this size
x, y = 60, 80
draw.text((x, y), title, fill=(240, 240, 240, 200), font=title_font)

img.save(${JSON.stringify(outputPng)}, "PNG")
print("overlay saved")
`;

  const tmpPy = join(tmpdir(), "music-diary-overlay.py");
  writeFileSync(tmpPy, py);
  const result = spawnSync("python3", [tmpPy], { stdio: "inherit" });
  rmSync(tmpPy, { force: true });
  if (result.status !== 0) throw new Error("Overlay image generation failed");
}

function downloadAudio(scUrl, destPath) {
  console.log(`  Downloading audio: ${scUrl}`);
  const result = spawnSync(
    "yt-dlp",
    ["-x", "--audio-format", "m4a", "-o", destPath, scUrl],
    { stdio: "inherit" }
  );
  if (result.status !== 0) throw new Error("yt-dlp audio failed");
}

function downloadThumbnail(scUrl, destDir, baseName) {
  console.log(`  Downloading thumbnail...`);
  const result = spawnSync(
    "yt-dlp",
    ["--skip-download", "--write-thumbnail", "-o", join(destDir, baseName), scUrl],
    { stdio: "inherit" }
  );
  if (result.status !== 0) throw new Error("yt-dlp thumbnail failed");
  // yt-dlp writes <baseName>.jpg or .webp — find whichever landed
  for (const ext of ["jpg", "jpeg", "webp", "png"]) {
    const p = join(destDir, `${baseName}.${ext}`);
    if (existsSync(p)) return p;
  }
  throw new Error("Thumbnail file not found after download");
}

function buildVideo(audioPath, coverPath, outputPath) {
  console.log(`  Rendering video: ${outputPath}`);

  // Split cover into blurred full-frame background + sharp centered foreground
  const filterComplex = [
    `[0:v]split[bg_in][fg_in]`,
    `[bg_in]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},gblur=sigma=40[bg]`,
    `[fg_in]scale=${W}:-1:force_original_aspect_ratio=decrease[fg]`,
    `[bg][fg]overlay=(W-w)/2:(H-h)/2[out]`,
  ].join(";");

  const result = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-loop", "1", "-i", coverPath,
      "-i", audioPath,
      "-filter_complex", filterComplex,
      "-map", "[out]",
      "-map", "1:a",
      "-c:v", "libx264",
      "-preset", "fast",
      "-crf", "18",
      "-pix_fmt", "yuv420p",
      "-c:a", "aac",
      "-b:a", "192k",
      "-shortest",
      "-movflags", "+faststart",
      outputPath,
    ],
    { stdio: "inherit" }
  );
  if (result.status !== 0) throw new Error("ffmpeg failed");
}

// ── helpers ──────────────────────────────────────────────────────────────────

function processTrack(scUrl, title) {
  const slug = sanitize(title).replace(/\s+/g, "-").toLowerCase();
  const tmpAudio = join(tmpdir(), `music-diary-${slug}.m4a`);
  const outFile = join(OUT_DIR, `${slug}.mp4`);
  let tmpCover = null;

  try {
    downloadAudio(scUrl, tmpAudio);
    const actualAudio = existsSync(tmpAudio) ? tmpAudio : `${tmpAudio}.m4a`;
    if (!existsSync(actualAudio)) throw new Error(`Audio not found at ${actualAudio}`);

    tmpCover = downloadThumbnail(scUrl, tmpdir(), `music-diary-${slug}-cover`);

    buildVideo(actualAudio, tmpCover, outFile);
    console.log(`  Done: ${outFile}`);
  } finally {
    for (const p of [tmpAudio, `${tmpAudio}.m4a`, tmpCover]) {
      if (p && existsSync(p)) rmSync(p, { force: true });
    }
  }
}

// ── main ────────────────────────────────────────────────────────────────────

const query = process.argv[2];
if (!query) {
  console.error("Usage: node scripts/to-instagram.mjs <soundcloud-url|entry-slug>");
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });

// Direct SoundCloud URL — derive title from the URL slug
if (query.startsWith("http")) {
  const urlSlug = query.split("/").pop().split("?")[0];
  const title = urlSlug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  console.log(`\nProcessing URL: ${query} → "${title}"`);
  processTrack(query, title);
  console.log(`\nAll done. Files saved to: ${OUT_DIR}`);
  process.exit(0);
}

const files = readdirSync(ENTRIES_DIR).filter(
  (f) => f.toLowerCase().includes(query.toLowerCase()) && f.endsWith(".md")
);

if (files.length === 0) {
  console.error(`No entries matching "${query}" found in ${ENTRIES_DIR}`);
  process.exit(1);
}

for (const file of files) {
  const raw = readFileSync(join(ENTRIES_DIR, file), "utf8");
  const fm = parseFrontmatter(raw);

  if (!fm.videoUrl || fm.videoUrl.length === 0) {
    console.log(`Skipping ${file} — no videoUrl`);
    continue;
  }

  const title = fm.title || basename(file, ".md");
  console.log(`\nProcessing: ${title} (${file})`);

  for (let i = 0; i < fm.videoUrl.length; i++) {
    const scUrl = extractSoundCloudUrl(fm.videoUrl[i]);
    const trackTitle = fm.videoUrl.length > 1 ? `${title} ${i + 1}` : title;
    processTrack(scUrl, trackTitle);
  }
}

console.log(`\nAll done. Files saved to: ${OUT_DIR}`);
