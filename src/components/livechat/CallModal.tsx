"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { Phone, PhoneOff, PhoneIncoming, Video, VideoOff, Mic, MicOff } from "lucide-react";

type Role = "admin" | "viewer";
type CallType = "audio" | "video";
type Phase = "idle" | "outgoing" | "incoming" | "active";

// Poll every 2s while nothing is happening (matches the chat's own poll
// rhythm), then switch to a fast 400ms poll the moment a call starts
// ringing — SDP offers/answers and ICE candidates need low latency.
const IDLE_POLL_MS = 2000;
const ACTIVE_POLL_MS = 400;

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  // If calls fail to connect on some networks (symmetric NAT, strict
  // mobile-carrier or corporate firewalls), add a TURN server here, e.g.:
  // { urls: "turn:your-turn-host:3478", username: "...", credential: "..." },
];

export default function CallModal({ role, partnerLabel }: { role: Role; partnerLabel: string }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [callType, setCallType] = useState<CallType>("audio");
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [connecting, setConnecting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mediaError) return;
    const t = setTimeout(() => setMediaError(null), 6000);
    return () => clearTimeout(t);
  }, [mediaError]);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const afterRef = useRef(0);
  // True until the very first poll response comes back. On a fresh page
  // load/refresh, afterRef starts at 0, so that first poll would otherwise
  // return the ENTIRE signal history still sitting in the server's in-memory
  // queue (old "ringing"/"accepted"/"ended" signals from long-finished calls,
  // since that queue is only ever trimmed at 300 entries, never cleared on
  // call end). Replaying those as if they were live is exactly what produced
  // the "every refresh shows an incoming/outgoing call that immediately fades"
  // loop. We fast-forward past that backlog instead, and rely on the
  // server-state reconciliation below (which checks the *current* phase, not
  // historical signals) to correctly show a real in-progress incoming call.
  const initialSyncRef = useRef(true);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callStartRef = useRef<number | null>(null);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const phaseRef = useRef<Phase>("idle");
  const callTypeRef = useRef<CallType>("audio");
  phaseRef.current = phase;
  callTypeRef.current = callType;

  // Assigning `srcObject` programmatically and relying solely on the
  // `autoPlay` HTML attribute is unreliable on Safari/iOS (and sometimes
  // Chrome) for elements that aren't muted — the browser can silently
  // refuse to start playback, leaving the element black/frozen with no
  // error visible in the UI. This is why local preview (muted) always
  // works but remote video (not muted) can fail to render even though the
  // underlying connection is fine. Explicitly calling .play() — and
  // retrying once metadata has actually loaded — fixes this reliably.
  const attachStream = useCallback((el: HTMLVideoElement | HTMLAudioElement | null, stream: MediaStream) => {
    if (!el) return;
    el.srcObject = stream;
    const tryPlay = () => {
      el.play().catch((err) => {
        console.warn("Media autoplay was blocked, will retry on next data:", err);
      });
    };
    tryPlay();
    el.addEventListener("loadedmetadata", tryPlay, { once: true });
  }, []);

  const cleanup = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    pendingCandidatesRef.current = [];
    if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    elapsedTimerRef.current = null;
    callStartRef.current = null;
    setElapsed(0);
    setMuted(false);
    setCameraOff(false);
    setConnecting(false);
  }, []);

  const endLocally = useCallback(() => {
    cleanup();
    setPhase("idle");
  }, [cleanup]);

  // Report a local failure (e.g. camera/mic couldn't be grabbed) to the
  // server so it doesn't get stuck thinking the call is still ringing/active
  // — and surface a readable message instead of just silently fading out.
  const failCall = useCallback(
    (message: string) => {
      setMediaError(message);
      fetch("/api/live-chat/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "hangup" }),
      }).catch(() => {});
      endLocally();
    },
    [endLocally]
  );

  function describeMediaError(err: unknown, type: CallType): string {
    const name = err instanceof Error ? err.name : "";
    if (name === "NotReadableError" || name === "TrackStartError") {
      return type === "video"
        ? "Couldn't start the camera — it may be in use by another app or browser tab."
        : "Couldn't start the microphone — it may be in use by another app or browser tab.";
    }
    if (name === "NotAllowedError" || name === "PermissionDeniedError") {
      return "Camera/microphone permission was blocked. Check your browser's site settings and try again.";
    }
    if (name === "NotFoundError") {
      return type === "video" ? "No camera was found on this device." : "No microphone was found on this device.";
    }
    return "Couldn't access the camera/microphone.";
  }

  const createPeerConnection = useCallback((type: CallType) => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        fetch("/api/live-chat/call/signal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind: "candidate", data: e.candidate.toJSON() }),
        }).catch(() => {});
      }
    };
    pc.ontrack = (e) => {
      const stream = e.streams[0];
      // Only attach to one element — attaching to both would double the audio.
      if (type === "video") {
        attachStream(remoteVideoRef.current, stream);
      } else {
        attachStream(remoteAudioRef.current, stream);
      }
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected" && !callStartRef.current) {
        setConnecting(false);
        callStartRef.current = Date.now();
        elapsedTimerRef.current = setInterval(() => {
          setElapsed(Math.floor((Date.now() - (callStartRef.current || Date.now())) / 1000));
        }, 1000);
      }
    };
    pcRef.current = pc;
    return pc;
  }, [attachStream]);

  const getLocalStream = useCallback(async (type: CallType) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: type === "video" ? { facingMode: "user" } : false,
    });
    localStreamRef.current = stream;
    if (type === "video") {
      attachStream(localVideoRef.current, stream);
    }
    return stream;
  }, [attachStream]);

  // ---- actions --------------------------------------------------------

  const startCall = useCallback(async (type: CallType) => {
    try {
      const res = await fetch("/api/live-chat/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "invite", callType: type }),
      });
      if (!res.ok) return; // e.g. 409 busy — silently ignore, other side is already on a call
      setCallType(type);
      setPhase("outgoing");
    } catch {
      // ignore — user can just try again
    }
  }, []);

  const cancelOutgoing = useCallback(async () => {
    await fetch("/api/live-chat/call", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel" }),
    }).catch(() => {});
    endLocally();
  }, [endLocally]);

  const acceptIncoming = useCallback(async () => {
    setConnecting(true);
    await fetch("/api/live-chat/call", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "accept" }),
    }).catch(() => {});
    setPhase("active");
    try {
      const type = callTypeRef.current;
      const stream = await getLocalStream(type);
      const pc = createPeerConnection(type);
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      // Now we wait for the caller's "offer" signal, handled below.
    } catch (err) {
      console.error("Failed to get local media", err);
      failCall(describeMediaError(err, callTypeRef.current));
    }
  }, [createPeerConnection, failCall, getLocalStream]);

  const rejectIncoming = useCallback(async () => {
    await fetch("/api/live-chat/call", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reject" }),
    }).catch(() => {});
    endLocally();
  }, [endLocally]);

  const hangup = useCallback(async () => {
    await fetch("/api/live-chat/call", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "hangup" }),
    }).catch(() => {});
    endLocally();
  }, [endLocally]);

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !muted;
    stream.getAudioTracks().forEach((t) => (t.enabled = !next));
    setMuted(next);
  }, [muted]);

  const toggleCamera = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !cameraOff;
    stream.getVideoTracks().forEach((t) => (t.enabled = !next));
    setCameraOff(next);
  }, [cameraOff]);

  // ---- signal handling --------------------------------------------------

  const handleSignal = useCallback(
    async (sig: { kind: string; data?: any }) => {
      switch (sig.kind) {
        case "ringing": {
          if (phaseRef.current !== "idle") return; // already busy — server enforces this too
          setCallType(sig.data?.callType === "video" ? "video" : "audio");
          setPhase("incoming");
          break;
        }
        case "accepted": {
          // We're the caller — the callee just picked up. Create the offer.
          setConnecting(true);
          try {
            const type = callTypeRef.current;
            const stream = await getLocalStream(type);
            const pc = createPeerConnection(type);
            stream.getTracks().forEach((t) => pc.addTrack(t, stream));
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            setPhase("active");
            await fetch("/api/live-chat/call/signal", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ kind: "offer", data: offer }),
            });
          } catch (err) {
            console.error("Failed to start outgoing media", err);
            failCall(describeMediaError(err, callTypeRef.current));
          }
          break;
        }
        case "offer": {
          // We're the callee — pc was already created in acceptIncoming().
          const pc = pcRef.current;
          if (!pc) return;
          await pc.setRemoteDescription(new RTCSessionDescription(sig.data));
          for (const c of pendingCandidatesRef.current) {
            await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
          }
          pendingCandidatesRef.current = [];
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await fetch("/api/live-chat/call/signal", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ kind: "answer", data: answer }),
          });
          break;
        }
        case "answer": {
          const pc = pcRef.current;
          if (!pc) return;
          await pc.setRemoteDescription(new RTCSessionDescription(sig.data));
          for (const c of pendingCandidatesRef.current) {
            await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
          }
          pendingCandidatesRef.current = [];
          break;
        }
        case "candidate": {
          const pc = pcRef.current;
          if (!pc) return;
          if (!pc.remoteDescription) {
            pendingCandidatesRef.current.push(sig.data);
          } else {
            await pc.addIceCandidate(new RTCIceCandidate(sig.data)).catch(() => {});
          }
          break;
        }
        case "rejected":
        case "cancelled":
        case "ended":
        case "timeout": {
          endLocally();
          break;
        }
      }
    },
    [createPeerConnection, endLocally, failCall, getLocalStream]
  );

  // ---- polling loop -------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(`/api/live-chat/call/poll?after=${afterRef.current}`);
        if (res.ok && !cancelled) {
          const data = await res.json();
          afterRef.current = data.lastSeq ?? afterRef.current;
          if (initialSyncRef.current) {
            // Fast-forward past any backlog from before this mount — don't
            // replay it. (Server-state reconciliation just below still
            // correctly picks up a genuinely-live incoming call.)
            initialSyncRef.current = false;
          } else {
            for (const sig of data.signals ?? []) {
              await handleSignal(sig);
            }
          }

          // Safety net: reconcile with the server's authoritative state in
          // case a discrete signal was ever missed (queue trimmed, a poll
          // dropped, etc). Never treat our own outgoing invite as an
          // incoming call — only react to "ringing" when the other side
          // started it.
          const serverState = data.state;
          if (
            serverState?.phase === "ringing" &&
            serverState.callerRole !== role &&
            phaseRef.current === "idle"
          ) {
            setCallType(serverState.callType === "video" ? "video" : "audio");
            setPhase("incoming");
          } else if (serverState?.phase === "idle" && phaseRef.current !== "idle") {
            endLocally();
          }
        }
      } catch {
        // ignore — next poll retries
      }
      if (!cancelled) {
        const interval = phaseRef.current === "idle" ? IDLE_POLL_MS : ACTIVE_POLL_MS;
        pollTimerRef.current = setTimeout(poll, interval);
      }
    }

    poll();
    return () => {
      cancelled = true;
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, [handleSignal, role, endLocally]);

  // If the tab closes mid-call, tell the server so the other side isn't left hanging.
  useEffect(() => {
    const onUnload = () => {
      if (phaseRef.current !== "idle") {
        navigator.sendBeacon?.(
          "/api/live-chat/call",
          new Blob([JSON.stringify({ action: "hangup" })], { type: "application/json" })
        );
      }
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, []);

  function formatElapsed(sec: number) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  // The full-screen call UI (ringing / active call) is rendered via a portal
  // straight to document.body. It MUST NOT be rendered inline here: this
  // component is mounted inside the chat header, which has `backdrop-blur`
  // applied to it. Any ancestor with `backdrop-filter` (or `filter`,
  // `transform`, `perspective`, `will-change: transform`) becomes the
  // containing block for descendant `position: fixed` elements — so instead
  // of covering the viewport, our "fixed inset-0" overlay would get squeezed
  // into the header's own ~60px-tall box and effectively disappear. This was
  // the cause of "no call dialog appears, but the header buttons go grey."
  const overlay = (
    <>
      {/* Media error toast — shown even after the call overlay has already
          closed, so a failed camera/mic grab doesn't just silently fade
          without explanation. */}
      <AnimatePresence>
        {mediaError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed left-1/2 top-[max(1rem,env(safe-area-inset-top))] z-[60] w-[min(90vw,26rem)] -translate-x-1/2 rounded-xl bg-gray-900 px-4 py-3 text-sm text-white shadow-2xl ring-1 ring-white/10"
          >
            {mediaError}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full-screen call overlay */}
      <AnimatePresence>
        {phase !== "idle" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-between overflow-hidden bg-gradient-to-b from-[#0a0a0a] via-rose-950/10 to-[#0a0a0a] p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))]"
          >
            {callType === "video" && phase === "active" && (
              <video ref={remoteVideoRef} autoPlay playsInline className="absolute inset-0 h-full w-full object-cover" />
            )}
            <audio ref={remoteAudioRef} autoPlay />

            <div className="relative z-10 flex flex-col items-center gap-2 pt-10 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-red-700 text-2xl font-semibold text-white shadow-xl">
                {partnerLabel.trim().charAt(0).toUpperCase() || "?"}
              </div>
              <p className="text-lg font-semibold text-white">{partnerLabel}</p>
              <p className="text-sm text-gray-400">
                {phase === "outgoing" && (callType === "video" ? "Video calling…" : "Calling…")}
                {phase === "incoming" && (callType === "video" ? "Incoming video call" : "Incoming call")}
                {phase === "active" && connecting && "Connecting…"}
                {phase === "active" && !connecting && formatElapsed(elapsed)}
              </p>
            </div>

            {callType === "video" && phase === "active" && (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="absolute bottom-32 right-5 z-10 h-40 w-28 rounded-xl border border-white/20 object-cover shadow-2xl"
              />
            )}

            <div className="relative z-10 flex items-center gap-5 pb-6">
              {phase === "incoming" ? (
                <>
                  <button
                    onClick={rejectIncoming}
                    className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-700 text-white shadow-lg transition hover:scale-105"
                    aria-label="Decline"
                  >
                    <PhoneOff className="h-6 w-6" />
                  </button>
                  <button
                    onClick={acceptIncoming}
                    className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg transition hover:scale-105"
                    aria-label="Accept"
                  >
                    <PhoneIncoming className="h-6 w-6" />
                  </button>
                </>
              ) : phase === "outgoing" ? (
                <button
                  onClick={cancelOutgoing}
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-white shadow-lg transition hover:scale-105"
                  aria-label="Cancel call"
                >
                  <PhoneOff className="h-6 w-6" />
                </button>
              ) : (
                <>
                  <button
                    onClick={toggleMute}
                    className={`flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition hover:scale-105 ${
                      muted ? "bg-white text-black" : "bg-white/10 text-white"
                    }`}
                    aria-label={muted ? "Unmute" : "Mute"}
                  >
                    {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  </button>
                  {callType === "video" && (
                    <button
                      onClick={toggleCamera}
                      className={`flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition hover:scale-105 ${
                        cameraOff ? "bg-white text-black" : "bg-white/10 text-white"
                      }`}
                      aria-label={cameraOff ? "Turn camera on" : "Turn camera off"}
                    >
                      {cameraOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                    </button>
                  )}
                  <button
                    onClick={hangup}
                    className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-white shadow-lg transition hover:scale-105"
                    aria-label="Hang up"
                  >
                    <PhoneOff className="h-6 w-6" />
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );

  return (
    <>
      {/* Header call trigger buttons */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => startCall("audio")}
          disabled={phase !== "idle"}
          className="flex h-9 w-9 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-white/10 hover:text-rose-400 disabled:opacity-30"
          aria-label="Start audio call"
        >
          <Phone className="h-5 w-5" />
        </button>
        <button
          onClick={() => startCall("video")}
          disabled={phase !== "idle"}
          className="flex h-9 w-9 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-white/10 hover:text-rose-400 disabled:opacity-30"
          aria-label="Start video call"
        >
          <Video className="h-5 w-5" />
        </button>
      </div>

      {/* Portal to document.body — see comment above `overlay` for why. */}
      {mounted && createPortal(overlay, document.body)}
    </>
  );
}
