# MemoryFlix: Claude Code Handoff

## 1. Project Summary
MemoryFlix is a local-first, private Next.js app designed to act as a personal "streaming service" for memories. It organizes photos, videos, stories, and chat exports into a cinematic, Netflix-style UI.
It is built strictly for personal use on a home server (e.g., Mac mini) and accessed via a local network or Tailscale.

The core philosophy is: "No cloud, no subscriptions, total privacy, cinematic presentation."

## 2. Tech Stack
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS (Dark mode default, cinematic aesthetic)
- **Database:** SQLite (via Prisma)
- **Storage:** Local File System (`/data/uploads` directory)
- **Authentication:** Custom simple password protection (viewer vs. admin)
- **Icons:** Lucide React
- **UI Components:** Radix UI primitives (or custom if simpler), Framer Motion (for subtle animations)

## 3. Core Architecture & Constraints
**Local First:**
No external cloud storage. Everything lives on the local disk.

**Database:**
SQLite is used for portability and ease of setup. The database file should live in the `/data` directory alongside uploads.

**Media Serving:**
Since files are outside the Next.js `public` directory (for privacy and dynamic management), they must be served via a protected Next.js API route (e.g., `/api/media/[id]`). This route must support HTTP range requests for video streaming.

**No Vercel Lock-in:**
The app must be buildable via `next build` and runnable via `next start` on a raw Linux/macOS machine.

## 4. Auth & Security
**Role-Based Access:**
- **Admin:** Full access to upload, edit, delete, and reorder content. (Password configured via `ADMIN_PASSWORD` env var).
- **Viewer:** Can only watch content. (Password configured via `VIEWER_PASSWORD` env var).

**Profiles:**
Similar to Netflix, viewers can select a "Profile" (e.g., "Alice", "Bob") to track watch progress or personalized lists.

**Middleware:**
Next.js middleware must protect all routes (except `/login` and static assets) requiring a valid session cookie.

## 5. Key Features
**Cinematic UI:**
Dark theme, large hero headers, horizontal scrolling rails for categories, auto-playing muted trailers (optional).

**Content Types:**
- **Memories:** Videos or photos (the core "movies").
- **Storylines:** Curated sequences of memories (the "series").
- **Chats:** WhatsApp text exports rendered in a custom chat UI reader.
- **Books/PDFs:** Scanned diaries or photo books via a PDF viewer.

**Admin Dashboard:**
A simple, hidden UI (e.g., `/admin`) for CRUD operations on content.

## 6. Database Schema (Prisma)
```prisma
// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Profile {
  id        String   @id @default(uuid())
  name      String
  avatar    String   // local path or emoji
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Category {
  id        String    @id @default(uuid())
  name      String
  order     Int       @default(0)
  contents  Content[]
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}

model Content {
  id            String     @id @default(uuid())
  title         String
  description   String?
  type          String     // 'video', 'image', 'chat', 'pdf'
  fileUrl       String     // path relative to /data/uploads
  thumbnailUrl  String?    // path relative to /data/uploads
  duration      Int?       // in seconds
  date          DateTime?  // when the memory happened
  
  categoryId    String?
  category      Category?  @relation(fields: [categoryId], references: [id])
  
  storylineId   String?
  storyline     Storyline? @relation(fields: [storylineId], references: [id])
  storylineOrder Int?
  
  featured      Boolean    @default(false)
  
  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt
}

model Storyline {
  id          String    @id @default(uuid())
  title       String
  description String?
  thumbnailUrl String?
  contents    Content[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}
```

## 7. Directory Structure
```text
memoryflix/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx
│   ├── (main)/
│   │   ├── admin/
│   │   ├── browse/
│   │   ├── profile/
│   │   ├── watch/
│   │   │   └── [id]/
│   │   └── layout.tsx
│   ├── api/
│   │   ├── auth/
│   │   ├── media/
│   │   │   └── [id]/
│   │   └── ...
│   ├── globals.css
│   └── layout.tsx
├── components/
│   ├── ui/
│   ├── layout/
│   └── ...
├── lib/
│   ├── db.ts
│   ├── auth.ts
│   └── utils.ts
├── prisma/
│   └── schema.prisma
├── data/
│   ├── uploads/
│   └── memoryflix.db
├── .env.local
├── middleware.ts
└── next.config.js
```

## 8. Environment Variables (.env)
```bash
DATABASE_URL="file:../data/memoryflix.db"
ADMIN_PASSWORD="your_admin_password"
VIEWER_PASSWORD="your_viewer_password"
SESSION_SECRET="your_long_random_string"
```

## 9. Core Workflows
**A. Media Upload (Admin)**
- Admin navigates to `/admin/upload`.
- Selects a file (video, image, zip, pdf).
- Form submits as `multipart/form-data` to an API route.
- API route saves the file to `/data/uploads` using standard Node.js `fs`.
- API route creates a `Content` record in the database with the generated file path.

**B. Media Streaming (Viewer)**
- Viewer clicks a memory on the `/browse` page.
- Navigates to `/watch/[id]`.
- The `<video>` element points to `/api/media/[id]`.
- The API route authenticates the request via cookie.
- The API route reads the file from `/data/uploads` and streams it using HTTP 206 Partial Content (handling `Range` headers). This is crucial for Safari and iOS support.

**C. WhatsApp Chat Import (Admin)**
- Admin uploads a `.txt` file exported from WhatsApp (and optionally a `.zip` of media).
- System parses the text file (Regex to extract Date, Sender, Message).
- System creates a specialized JSON structure or directly renders the chat.
- (For Phase 1, just storing the text file and rendering it basic is fine).

## 10. Styling Guidelines
- **Backgrounds:** Almost black (e.g., `bg-zinc-950`).
- **Text:** Off-white (`text-zinc-100`) and muted (`text-zinc-400`).
- **Accents:** A subtle brand color (e.g., Netflix red, or a soft blue/purple).
- **Cards:** Hover states should slightly scale up (`hover:scale-105`) with a subtle border or glow.
- **Typography:** Inter or sans-serif for UI, maybe a serif for "Storyline" titles.

## 11. Next Steps / Implementation Phases
**Phase 1: Foundation**
- Init Next.js app, Tailwind, Prisma.
- Setup custom local auth and middleware.
- Create basic profile selection.

**Phase 2: Core Viewing**
- Implement `api/media/[id]` for video streaming.
- Build the `/browse` dashboard (hero, categories, rails).
- Build the `/watch` viewer.

**Phase 3: Admin & Uploads**
- Build the `/admin` dashboard.
- Implement file upload via API to the `/data` folder.
- Implement basic CRUD for content.

**Phase 4: Specialized Formats**
- Add chat viewer component.
- Add PDF viewer component (e.g., `react-pdf`).

**Phase 5: Storylines**
- Build UI for viewing and managing sequential storylines.

## 12. Specific Technical Nuances (Do not ignore)
- **Media Route Range Requests:** Node.js `fs.createReadStream` combined with Next.js App Router API responses can be tricky. Use `NextResponse` with a `ReadableStream` or fallback to older API route style if needed, but ensure 206 status codes work.
- **File System Permissions:** The app needs read/write access to `./data`. Ensure path resolution uses `process.cwd()` correctly so it doesn't break in production builds.

## 13. Detailed Media Streaming Implementation (The tricky part)
Here is a reference implementation for the media streaming route to save time:

```typescript
// app/api/media/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { db } from '@/lib/db';
import { checkAuth } from '@/lib/auth'; // Your custom auth check

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // 1. Authenticate
  const isAuthenticated = await checkAuth(request);
  if (!isAuthenticated) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // 2. Fetch record
  const content = await db.content.findUnique({
    where: { id: params.id },
  });

  if (!content) {
    return new NextResponse('Not found', { status: 404 });
  }

  // 3. Resolve path
  const filePath = path.join(process.cwd(), 'data/uploads', content.fileUrl);

  if (!fs.existsSync(filePath)) {
    return new NextResponse('File missing on disk', { status: 404 });
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = request.headers.get('range');

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = (end - start) + 1;
    const file = fs.createReadStream(filePath, { start, end });

    const stream = new ReadableStream({
      start(controller) {
        file.on('data', (chunk) => controller.enqueue(chunk));
        file.on('end', () => controller.close());
        file.on('error', (err) => controller.error(err));
      }
    });

    return new NextResponse(stream, {
      status: 206,
      headers: {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize.toString(),
        'Content-Type': content.type === 'video' ? 'video/mp4' : 'image/jpeg', // derive from extension
      },
    });
  } else {
    const file = fs.createReadStream(filePath);
    const stream = new ReadableStream({
      start(controller) {
        file.on('data', (chunk) => controller.enqueue(chunk));
        file.on('end', () => controller.close());
        file.on('error', (err) => controller.error(err));
      }
    });
    
    return new NextResponse(stream, {
      headers: {
        'Content-Length': fileSize.toString(),
        'Content-Type': content.type === 'video' ? 'video/mp4' : 'image/jpeg',
      }
    });
  }
}
```

## 14. WhatsApp Chat Parser Implementation
```typescript
// lib/whatsapp-parser.ts
export interface ChatMessage {
  date: string;
  sender: string;
  text: string;
}

export function parseWhatsAppChat(text: string): ChatMessage[] {
  const messages: ChatMessage[] = [];
  // Standard WhatsApp regex: [DD/MM/YYYY, HH:MM:SS] Sender: Message
  // Note: Formats vary by region. This handles the standard iOS export.
  const regex = /\[(\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}:\d{2})\] ([^:]+): (.*)/g;
  
  let match;
  while ((match = regex.exec(text)) !== null) {
    messages.push({
      date: match[1],
      sender: match[2],
      text: match[3],
    });
  }
  
  return messages;
}
```

## 15. Styling the Chat UI
We want an iMessage/WhatsApp style view.
- Messages from "Me" (configurable or determined by the most common sender) aligned right, distinct color.
- Other senders aligned left.
- Sticky date headers when scrolling.

## 16. PDF Viewing
For PDFs, we can use standard `<embed>` or `<iframe>` for v1, but for a premium feel, integrate `react-pdf` to render individual pages in a custom carousel or book-flip UI.

## 17. Deployment & Initialization
To run this project:
1. `npm install`
2. `mkdir -p data/uploads`
3. `npx prisma db push` (This creates the sqlite db)
4. `npm run dev`

## 18. Initial Seed Data
To test the UI before implementing upload, create a small seed script that populates the SQLite DB with a few categories and points to dummy files in `data/uploads` (e.g., place a `test.mp4` there manually).

## 19. Important Tailwind Classes to use
- Typography: `tracking-tight`, `leading-relaxed`.
- Netflix-style gradients: `bg-gradient-to-b from-transparent to-black/80` for overlaying text on thumbnails.
- Hidden scrollbars: Add a custom utility for `scrollbar-width: none` (Firefox) and `::-webkit-scrollbar { display: none; }` (Chrome/Safari) for the horizontal rails.

## 20. Phases in detail for Claude
**Phase 1: Setup & DB**
- Next.js setup.
- Tailwind config.
- Prisma schema setup.
- `npx prisma generate` & `npx prisma db push`.

**Phase 2: Auth**
- Password page.
- Login/logout APIs.
- Session cookie.
- Middleware protection.
- Profiles page.

**Phase 3: Basic viewer**
- Streaming shell/top nav.
- Home page with fake seeded placeholder cards.
- Content rails.
- Memory modal for image/video.

**Phase 4: Admin content management**
- Admin shell.
- File upload.
- CRUD for content.
- Categories and reorder.
- Hook viewer to real DB content.

**Phase 5: Storyline**
- Story events admin CRUD.
- Timeline/pathway viewer with animations.

**Phase 6: Chat import/viewer**
- WhatsApp parser.
- Import txt first.
- Add zip/media support second.
- Chat UI with virtualization.

**Phase 7: Book/PDF**
- PDF upload.
- React-PDF display.
- Page flip integration.
- Responsive one-page/two-page behavior.

**Phase 8: Polish**
- Loading skeletons.
- Empty states.
- Error states.
- Toasts.
- Better mobile layout.
- README.

## 21. Exact first prompt to give Claude Code

Paste this into Claude Code at the start of the project:

"Build a local-first private Next.js app called MemoryFlix based on the attached handoff. Use Next.js App Router, TypeScript, Tailwind, Prisma SQLite, local filesystem uploads under data/uploads, custom password auth with viewer/admin passwords from env hashes, and protected media streaming via /api/media/[id]. Do not use Netflix trademarks, logos, copyrighted assets, or copied source code; create an original streaming-inspired dark cinematic UI. Implement in phases: foundation, auth/profiles, viewer home/modal, admin content CRUD/upload/reorder, storyline, WhatsApp chat import/viewer, PDF flipbook, polish. Start by scaffolding the project structure, Prisma schema, seed data for Randomeria and Bonus, env validation, auth helpers, login page, middleware, and profiles page. After each phase, run lint/build where possible and summarize what changed."
