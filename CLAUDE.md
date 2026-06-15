# Music Diary

## Deployment

Deployed on Railway. Auto-deploy is NOT enabled — after pushing to `master`, manually trigger with:

```
railway up
```

The app builds with `astro build` and is served by `server.cjs` (plain Node HTTP server on `PORT` env var, defaults to 8080). The `.railwayignore` excludes `node_modules/` and `.wrangler/`.

## Audio files

Audio is stored in a Cloudflare R2 bucket. The public base URL is:

```
https://pub-d1e4591f14c94d2f84a21fed1d9f0d79.r2.dev/
```

Upload files directly via the Cloudflare dashboard or `wrangler r2 object put music-diary-audio/<filename>`. Filenames with spaces must be URL-encoded in the frontmatter (e.g. `06%2007.wav`).

Reference an uploaded file in an entry's frontmatter:

```yaml
audioUrl: "https://pub-d1e4591f14c94d2f84a21fed1d9f0d79.r2.dev/my-file.mp3"
```

Multiple files are supported as a list:

```yaml
audioUrl:
  - "https://pub-d1e4591f14c94d2f84a21fed1d9f0d79.r2.dev/take-1.mp3"
  - "https://pub-d1e4591f14c94d2f84a21fed1d9f0d79.r2.dev/take-2.mp3"
```

The `AudioPlayer` component (`src/components/AudioPlayer.astro`) streams the file directly from R2 and renders a waveform canvas with a play/pause button. SoundCloud URLs in `audioUrl` are rendered via `SoundCloudEmbed` instead.

### MOV audio (afconvert)

When trimming or re-encoding `.mov` recordings (ProRes with pcm_s24be audio), **do NOT use `ffmpeg -c:a copy`** — it produces noise due to ffmpeg mishandling big-endian PCM. Use this workflow instead:

```sh
ffmpeg -i input.mov -ss TIME -c:v copy -an video_only.mov
ffmpeg -i input.mov -ss TIME -vn -f caf -c:a pcm_s24be audio_raw.caf
afconvert audio_raw.caf -o audio.caf -d LEI24@48000 -c CHANNELS
ffmpeg -i video_only.mov -i audio.caf -c:v copy -c:a copy output.mov
```

## Entry frontmatter schema

Defined in `src/content.config.ts`. Key fields:

| Field | Type | Notes |
|---|---|---|
| `title` | string | required |
| `date` | date | required |
| `tags` | string[] | optional |
| `audioUrl` | string \| string[] | R2 URL or SoundCloud widget URL |
| `videoUrl` | string \| string[] | SoundCloud widget URL(s) for the Instagram export script |
| `moodboard` | array | `{ type: "image", src, caption?, url? }` or `{ type: "link", url, title }` |

Moodboard images go in `public/moodboards/<entry-slug>/` and are referenced with an absolute path like `/moodboards/<slug>/01.jpg`.

## Instagram export

`scripts/to-instagram.mjs` converts a diary entry's SoundCloud audio into a 1080×1920 MP4 reel (blurred cover + audio). Requires `yt-dlp`, `ffmpeg`, and Python 3 with Pillow.

```sh
node scripts/to-instagram.mjs 2026-04-11        # match by entry filename fragment
node scripts/to-instagram.mjs https://soundcloud.com/...  # direct URL
```

Output goes to `instagram-output/`.
