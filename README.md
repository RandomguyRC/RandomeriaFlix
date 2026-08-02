This guide walks you through getting
it running on your own computer, from a completely empty machine, step by step.

It looks long, but that's on purpose — every single step is spelled out so you
don't have to guess anything. Just follow it top to bottom in order.

**If you get stuck anywhere:** copy the exact error message you're seeing, and
paste it into an AI assistant like Claude (claude.ai) or ChatGPT, along with
this sentence: *"I'm trying to set up a Next.js website on my computer, here
is the error I got: [paste error]. Here is what I already tried: [describe]."*
These tools are very good at fixing exactly this kind of thing.

---

## What you'll need

- Your computer (Windows or Mac both work)
- An internet connection (just for the initial setup — once it's running, it
  works fully offline)

---

## Step 1 — Install Node.js

Node.js is the program that lets your computer run this website. You only
need to do this once.

1. Go to **https://nodejs.org** in your browser.
2. You'll see two download buttons. Click the one that says **LTS** (this
   means "long-term support" — it's the stable, recommended version).
3. Once it's downloaded, open the installer:
   - **Windows:** double-click the `.msi` file you downloaded, click "Next"
     through all the steps using the default options, then "Finish".
   - **Mac:** double-click the `.pkg` file you downloaded, click "Continue"
     through the steps using the default options, then "Close".
4. Restart your computer after installing (this makes sure everything is set
   up correctly).

### Check it worked

After restarting, open a terminal:
- **Windows:** click the Start menu, type `PowerShell`, and open
  "Windows PowerShell".
- **Mac:** press `Cmd + Space`, type `Terminal`, and press Enter.

A black or white window will open with a blinking cursor — this is normal,
it's just a way to type commands to your computer instead of clicking icons.

Type this and press Enter:

```
node -v
```

You should see something like `v20.11.0` or similar (any version starting
with v18 or higher is fine). If instead you see an error like "command not
found", restart your computer again and try once more — if it still doesn't
work, that's a good moment to ask an AI assistant for help with the exact
error message.

---

## Step 2 — Unzip this folder

1. Find the zip file you downloaded (probably in your **Downloads** folder).
2. Right-click it and choose **Extract All** (Windows) or just double-click
   it (Mac) to unzip it.
3. **Important:** move the unzipped folder somewhere simple, like directly
   onto your **Desktop** or into **Documents**. Avoid folders that sync with
   OneDrive, Google Drive, or Dropbox — those can cause confusing errors
   during setup.
4. Rename the folder to something you'll remember, like `RandomeriaFlix`.

---

## Step 3 — Open a terminal inside the project folder

This is the trickiest-sounding step but it's actually just one right-click.

- **Windows:** open the `RandomeriaFlix` folder in File Explorer. Click once
  in the empty space in the address bar at the top, type `powershell`, and
  press Enter. A terminal will open already pointed at this folder.
- **Mac:** open **Terminal** (Spotlight search, as before). Type `cd ` (with
  a space after it), then drag the `RandomeriaFlix` folder from Finder
  directly into the terminal window — it will paste the folder's path
  automatically. Press Enter.

To make sure you're in the right place, type:

```
dir
```
(Windows) or
```
ls
```
(Mac), then press Enter. You should see a list of files including
`package.json`, `src`, `prisma`, and `data` — if you see those, you're in
the right folder.

---

## Step 4 — Install the project's dependencies

Still in the same terminal window, type this and press Enter:

```
npm install
```

This downloads and sets up everything the website needs to run. It can take
a few minutes — you'll see a lot of text scroll by, that's normal. Wait until
it finishes and you get your cursor back (a blinking line with no more text
appearing).

If you see red text mentioning "vulnerabilities," that's normal and not a
problem — ignore it. If you see the word "error" (not just "warning"), copy
the message and ask an AI assistant for help.

---

## Step 5 — Set up the database

The `.env` file (a settings file) and the database with all your memories
are already included in this folder — you don't need to create or configure
anything. You just need to run one command so the code knows how to talk to
the database:

```
npx prisma generate
```

Press Enter and wait for it to finish (usually under a minute).

---

## Step 6 — Build the website

```
npm run build
```

This prepares the website to run properly on your computer. It can take a
couple of minutes, especially the first time. Wait for it to finish.

---

## Step 7 — Start the website

```
npm start
```

You should see a message like:

```
- Local:   http://localhost:3000
```

Leave this terminal window open — closing it will stop the website. Think of
it like turning on the TV; the terminal window needs to stay "on" in the
background.

---

## Step 8 — Open it in your browser

Open your web browser (Chrome, Edge, Safari, whichever you normally use) and
go to:

```
http://localhost:3000
```

The website should load, exactly as it did online — same login, same photos,
same chat history, everything.

---

## Using it again later

Once it's set up, you don't need to repeat all these steps every time. Just:

1. Open the `RandomeriaFlix` folder.
2. Open a terminal inside it (Step 3).
3. Type `npm start` and press Enter.
4. Go to `http://localhost:3000` in your browser.

That's it.

---

## Troubleshooting

**"Port 3000 is already in use"**
Something else on your computer is using that address. Close other programs
and try `npm start` again, or ask an AI assistant how to free up port 3000
on your computer (Windows/Mac).

**The page loads but looks broken / images are missing**
Make sure the `data` folder is still inside the `RandomeriaFlix` folder and
wasn't accidentally left out when unzipping. It should sit right alongside
the `src` folder.

**"npm: command not found" or "node: command not found"**
Node.js isn't installed correctly, or your computer needs a restart after
installing it. Go back to Step 1.

**Anything else**
Copy the full error message from the terminal (scroll up if needed to see
the very first line that mentions "Error") and share it with an AI assistant
along with which step you were on. They'll be able to walk you through it.

---

This whole thing was built for you, so take your time with the setup — once
it's running, everything's exactly as it was. ❤️

**YOUR NAME IS THE PASSWORD FOR ADMIN PANEL(What I used to call you)**
