# Live Chat: Calling + Photos/Videos/Voice Notes

## 1. Where these files go

Drop these into your project at the **same relative paths** (they mirror your `src/` layout):

```
prisma/schema.prisma                                  → REPLACES your existing one (only additive changes — see diff below)
src/lib/media.ts                                       → REPLACES your existing one (one line added: audio/webm support)
src/lib/call-signal.ts                                 → NEW
src/app/api/live-chat/route.ts                         → REPLACES your existing one
src/app/api/live-chat/call/route.ts                    → NEW
src/app/api/live-chat/call/signal/route.ts             → NEW
src/app/api/live-chat/call/poll/route.ts               → NEW
src/app/api/live-chat/media/route.ts                   → NEW
src/components/livechat/CallModal.tsx                  → NEW
src/components/livechat/AttachmentMenu.tsx              → NEW
src/components/livechat/VoiceRecorder.tsx               → NEW
src/components/livechat/LiveChatWindow.tsx              → REPLACES your existing one
```

Nothing else in your repo needs to change — `LiveChatNotifier.tsx`, `presence.ts`, `notify.ts`, `middleware.ts`, the admin live-chat page, etc. are untouched.

## 2. Run the migration

```bash
npm run db:generate
npm run db:migrate   # will prompt for a migration name, e.g. "live_chat_media_and_calls"
```

This only **adds** optional columns to `LiveChatMessage` (`kind`, `attachmentId`, `durationMs`, `callType`, `callOutcome`, `callDurationMs`) and makes `content` optional — your existing chat history is untouched and will just show up as `kind: "TEXT"`.

## 3. The one thing that will trip you up: HTTPS

`getUserMedia()` (camera/mic access) only works in a **secure context** — `https://` or `localhost`. It will silently fail (or throw) over plain `http://` on your EC2 box's public IP.

- If your EC2 app is already served over HTTPS (a real domain + cert, e.g. via nginx + Let's Encrypt), you're fine — nothing to do.
- If you're currently accessing it via `http://<ec2-ip>:3000` or similar, calling won't work until you put it behind HTTPS. `certbot` + nginx reverse proxy in front of `next start` is the standard, low-effort way to do this on a single EC2 box.
- Local dev (`npm run dev` on `localhost`) works fine without HTTPS — browsers treat `localhost` as secure.

## 4. If you're behind nginx: allow bigger uploads

The new `/api/live-chat/media` route accepts up to 150MB per file (photos/videos/voice notes from a phone). If nginx sits in front of your app, make sure its config allows that:

```nginx
client_max_body_size 150M;
```

(Same thing may already be set for your admin upload flow — just confirm it covers this route too.)

## 5. STUN/TURN (only matters if calls fail to connect)

Calling uses free public STUN servers (already in `CallModal.tsx`) which work for most home networks. If you and your girlfriend are ever on networks where the call rings but audio/video never connects (common with some mobile carriers or corporate/university wifi), you'll need a TURN server. Options, roughly easiest first:

1. A free-tier TURN provider (search "free TURN server WebRTC" — a few offer small free quotas), drop the credentials into the `ICE_SERVERS` array in `CallModal.tsx`.
2. Self-host `coturn` on your own EC2 instance (you already have one) — a bit more setup but no third-party dependency.

Don't bother with this up front — just try calling first; STUN alone gets you a long way for two people on normal home internet.

## 6. How it all fits together (quick mental model)

- **Calling**: no websocket server needed. `call-signal.ts` is an in-memory mailbox (same trick as your existing `presence.ts`) that relays "ringing / accepted / offer / answer / ICE candidate / ended" between the two of you. `CallModal.tsx` polls it every 2s while idle and every 400ms during a call, then WebRTC takes over and the actual audio/video streams go **peer-to-peer** — your server never touches the media itself, just the initial handshake.
- **Photos/videos**: `AttachmentMenu.tsx` uploads directly to `/api/live-chat/media` (reusing your existing `saveUploadedFile`/HEIC-conversion logic), then posts a chat message pointing at the resulting `MediaAsset`. Playback reuses your existing `/api/media/[id]` route — range requests, thumbnails, etc. all just work.
- **Voice notes**: `VoiceRecorder.tsx` uses the browser's `MediaRecorder` API, same upload path as photos/videos.
- **Missed calls**: logged automatically as a `CALL`-kind chat message (rejected / cancelled / no-answer after 45s of ringing / completed with duration), rendered as a centered pill in the message list — like a real messaging app.

## 7. Known limitations (fine for a 2-person app, worth knowing)

- Only one call at a time, obviously — if you both hit "call" in the same instant, the second request gets a 409 and just silently no-ops. Rare enough not to bother handling more gracefully.
- If the server restarts mid-call (deploy, crash), the call just drops — same tradeoff your `presence.ts` already accepts.
- Voice note playback uses the plain browser `<audio controls>` element for now rather than your custom waveform player (`WaveformProgress.tsx`) — works fine, just not as polished. Easy to upgrade later if you want that same waveform-scrub look for voice notes.
