# Integrating the download feature

## 1. Copy files into your project

Copy these into your actual `RandomeriaFlix` project, preserving the paths:

```
src/lib/export-job.ts
src/app/api/export/start/route.ts
src/app/api/export/status/route.ts
src/app/api/export/download/route.ts
src/components/storyline/DownloadAppButton.tsx
```

Also copy `bundled-readme/START-HERE.md` into your project root as
`bundled-readme/START-HERE.md` (i.e. create a `bundled-readme` folder in
your project root and put the file in it). This is the guide that gets
bundled into the zip — feel free to personalize the last line before you
ship it.

## 2. Install the one new dependency

```bash
npm install archiver
npm install --save-dev @types/archiver
```

## 3. Wire the button into the storyline page

In `src/app/watch/[profileslug]/storyline/page.tsx`, inside `AnswerDialog`,
find this block (around line 617-648):

```tsx
<div className="space-y-2">
  {answers.map((answer, i) => {
    ...
  })}
</div>
```

Add the import at the top of the file:

```tsx
import DownloadAppButton from "@/components/storyline/DownloadAppButton";
```

And render the button right after that closing `</div>`, still inside the
`view === "answers"` block:

```tsx
<div className="space-y-2">
  {answers.map((answer, i) => { ... })}
</div>

<DownloadAppButton />
```

## 4. Double-check the include list matches your real project root

Open `src/lib/export-job.ts` and check `INCLUDE_ENTRIES` against what's
actually sitting in your project root (`ls` in the project folder). I
included the standard Next.js + Prisma + Tailwind files based on your `src/`
structure, but if you have anything extra at the root that the app needs to
run (e.g. a `components.json` for shadcn, a `middleware.ts` at the root
instead of in `src/`, etc.), add it to the list. Anything not listed is
simply left out of the zip — nothing gets included by accident.

## 5. Add the temp export folder to `.gitignore`

```
tmp-exports/
```

This is where zips are built before download; they get deleted automatically
after each download completes (or after 30 minutes if never downloaded), but
you don't want it committed to git in the meantime.

## 6. Deploy as usual

```bash
git add .
git commit -m "Add downloadable full-app export"
git push
```

Then on the EC2 instance, your normal update sequence:

```bash
git pull
npm install
npx prisma generate
npm run build
pm2 restart randomeriaflix
```

## A few things worth knowing

- **First zip will take a few minutes** — with ~15GB of media on a small EC2
  instance, expect somewhere in the range of 3-8 minutes depending on your
  instance's disk throughput. The progress bar reflects real bytes processed,
  not a fake animation.
- **Only one export runs at a time** — if she clicks the button twice, the
  second click just watches the same job instead of starting a duplicate.
- **The site stays up during zipping** — but on a small instance (t3.micro/
  small), the zip job will compete for CPU and disk I/O with the live site,
  so things may feel a little sluggish for those few minutes. Not a problem
  at your scale, just don't be alarmed if the site feels slower while it's
  happening.
- **The real `.env` ships in the zip**, per what you said — Spotify keys,
  Telegram bot token, SMTP creds, all of it, so it works for her without any
  extra setup. Just remember the Telegram bot will keep notifying you if she
  uses the live chat locally, since the token is still yours.
- **Nothing is left on disk after download** — the zip is deleted the moment
  the download stream closes (whether it finishes normally or she cancels
  partway through), and there's a 30-minute safety cleanup in case she never
  clicks download at all after the zip finishes building.
