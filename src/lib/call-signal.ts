// In-memory WebRTC signaling mailbox for the 2-person live audio/video call
// feature. Same trick as presence.ts: this works because the app runs as a
// single persistent Node process on the VM, so this module-level state
// survives across requests. A server restart mid-call just drops the call —
// an acceptable edge case for a 2-person app.
//
// This module only relays *signaling* (who's calling, SDP offers/answers,
// ICE candidates) — the actual audio/video stream is peer-to-peer via
// WebRTC and never touches the server.

export type Role = "admin" | "viewer";
export type CallType = "audio" | "video";
type CallPhase = "idle" | "ringing" | "active";
type SignalKind =
  | "ringing"
  | "accepted"
  | "rejected"
  | "cancelled"
  | "ended"
  | "timeout"
  | "offer"
  | "answer"
  | "candidate";

interface CallState {
  phase: CallPhase;
  callType: CallType | null;
  callerRole: Role | null;
  ringingAt: number | null;
  startedAt: number | null;
}

interface QueuedSignal {
  seq: number;
  kind: SignalKind;
  data?: unknown;
}

// How long a call rings before it's auto-marked as a missed call.
const RING_TIMEOUT_MS = 45_000;

let seqCounter = 0;
let state: CallState = {
  phase: "idle",
  callType: null,
  callerRole: null,
  ringingAt: null,
  startedAt: null,
};

const queues: Record<Role, QueuedSignal[]> = { admin: [], viewer: [] };

function otherRole(role: Role): Role {
  return role === "admin" ? "viewer" : "admin";
}

function push(toRole: Role, kind: SignalKind, data?: unknown) {
  seqCounter += 1;
  queues[toRole].push({ seq: seqCounter, kind, data });
  // Safety valve — shouldn't realistically fill up, but avoid unbounded growth
  // if one side stops polling mid-call (e.g. tab closed without a clean hangup).
  if (queues[toRole].length > 300) queues[toRole].splice(0, queues[toRole].length - 300);
}

function reset() {
  state = { phase: "idle", callType: null, callerRole: null, ringingAt: null, startedAt: null };
}

export function getState(): CallState {
  return state;
}

/** Caller starts a call. Fails with "busy" if a call is already in progress. */
export function invite(role: Role, callType: CallType): { ok: true } | { ok: false; reason: string } {
  if (state.phase !== "idle") return { ok: false, reason: "busy" };
  state = { phase: "ringing", callType, callerRole: role, ringingAt: Date.now(), startedAt: null };
  push(otherRole(role), "ringing", { callType, callerRole: role });
  return { ok: true };
}

/** Callee accepts an incoming call. */
export function accept(role: Role) {
  if (state.phase !== "ringing") return;
  state.phase = "active";
  state.startedAt = Date.now();
  push(otherRole(role), "accepted");
}

/** Callee declines. Returns info for logging a "rejected" call message. */
export function reject(role: Role): { callerRole: Role; callType: CallType } | null {
  if (state.phase !== "ringing") return null;
  const info = { callerRole: state.callerRole!, callType: state.callType! };
  push(otherRole(role), "rejected");
  reset();
  return info;
}

/** Caller backs out before the callee answers. */
export function cancel(role: Role): { callerRole: Role; callType: CallType } | null {
  if (state.phase !== "ringing" || state.callerRole !== role) return null;
  const info = { callerRole: state.callerRole!, callType: state.callType! };
  push(otherRole(role), "cancelled");
  reset();
  return info;
}

/** Either side ends an active call, or the caller hangs up while still ringing. */
export function hangup(
  role: Role
): { callerRole: Role; callType: CallType; durationMs: number; wasActive: boolean } | null {
  if (state.phase === "idle") return null;
  const wasActive = state.phase === "active";
  const info = {
    callerRole: state.callerRole!,
    callType: state.callType!,
    durationMs: wasActive && state.startedAt ? Date.now() - state.startedAt : 0,
    wasActive,
  };
  push(otherRole(role), "ended");
  reset();
  return info;
}

/** Relay an SDP offer/answer or ICE candidate to the other party. */
export function relaySignal(role: Role, kind: "offer" | "answer" | "candidate", data: unknown) {
  push(otherRole(role), kind, data);
}

/** Called opportunistically from the poll route on every poll. Auto-expires a
 * call that's been ringing too long with nobody answering, and returns info
 * for logging a "no_answer" (missed call) message. */
export function checkRingTimeout(): { callerRole: Role; callType: CallType } | null {
  if (state.phase === "ringing" && state.ringingAt && Date.now() - state.ringingAt > RING_TIMEOUT_MS) {
    const info = { callerRole: state.callerRole!, callType: state.callType! };
    // Notify BOTH sides: the callee (so an incoming-call dialog they still
    // have open clears itself) and the caller (so their "Calling…" screen
    // doesn't hang forever with no signal telling it to give up).
    push(otherRole(state.callerRole!), "timeout");
    push(state.callerRole!, "timeout");
    reset();
    return info;
  }
  return null;
}

/** Pull all signals queued for this role after the given sequence number. */
export function pullSignals(role: Role, after: number): QueuedSignal[] {
  return queues[role].filter((s) => s.seq > after);
}
