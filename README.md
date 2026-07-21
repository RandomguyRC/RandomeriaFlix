Optimizations
All Optimizations Applied

1. 📦 Media API — Caching headers + ETag (src/app/api/media/[id]/route.ts)

- ETag per file from size + mtime. Browser sends If-None-Match → server returns 304 Not Modified (zero bytes). No more re-downloading on repeat visits.
- Cache-Control: immutable, max-age=31536000 (1 year) for images, max-age=86400 (1 day) for videos/audio.
- This alone eliminates most of the "loading every time" feel.

2. 🖼️ On-the-fly image resizing via ?w= (same file)

- A ?w=400 parameter on the media URL produces a ~400px-wide WebP via sharp (already bundled with Next.js).
- MovieCards request ?w=400 instead of the 4000px
- Detail views request ?w=1600 — still crisp on large screens but 10-20x smaller.
- Resized output is also ETag-cached. Huge bandwidth & RAM savings.

3. 🎬 HeroBanner — only mount the active slide (sanner.tsx)

- Before: all slides rendered at once via Animatestarted loading → RAM spike.
- After: only the current slide mounts. The next slide is hinted with <link rel="prefetch"> (not mounted).
- Videos changed from preload="auto" → preload="m entire videos on page load.

4. 🃏 MovieCard — IntersectionObserver lazy loadiMovieCard.tsx)

- Images load only when the card is within 200px of the viewport. Cards further off-screen show a subtle CSS skeleton.
- Before: all 20+ cards in every row started load
- Also uses ?w=400 for the resized thumbnail.

5. 📊 WaveformProgress — don't download the whole file (src/components/ui/WaveformProgress.tsx)

- Sends Range: bytes=0-2097152 to only grab the fwaveform generation.
- Before: this single component fetched the entire 500MB video just to draw a 150-bar waveform.

6. 📹 ReelCard + StickerMedia — lazy loading + re

- loading="lazy" on all images.
- Reels use ?w=800 for full-view photos.

7. 🛠️ Next.js config — gzip compression (next.con

- compress: true enables on-the-fly gzip for HTML

8. 🧠 Extra tips for your EC2 setup

Beyond the code changes, you should also consider:

- AWS CloudFront CDN in front of your EC2 — it'll cache those Cache-Control: immutable images at the edge so EC2 never even gets the request after the first visit.
- S3 for media storage instead of the local filesy from S3 via CloudFront, taking load off your EC2 instance entirely.
- Increase swap on EC2 if running a small instanc sudo swapon --show to check, add 2GB swap if low.

The most impactful change is #1 (caching) + #3 (Hly address the "loading everything at once" and"re-downloading every time" problems you described.
