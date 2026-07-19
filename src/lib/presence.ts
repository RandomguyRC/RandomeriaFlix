// Lightweight in-memory presence tracker for the 2-person live chat.
// Works because this app runs as a single persistent Node process on a VM
// (not serverless/multi-instance), so module-level state survives across requests.
// Presence resets on server restart, which is fine — it just means both people
// briefly show as "offline" until their next poll.

type Role = "admin" | "viewer";

interface RoleState {
  lastSeen: number; // epoch ms, updated on every poll (heartbeat)
  typingUntil: number; // epoch ms; typing indicator is active while now < typingUntil
}

const ONLINE_WINDOW_MS = 8000; // considered "online" if seen within this window
const TYPING_WINDOW_MS = 4000; // typing indicator auto-expires this long after last keystroke ping

const state: Record<Role, RoleState> = {
  admin: { lastSeen: 0, typingUntil: 0 },
  viewer: { lastSeen: 0, typingUntil: 0 },
};

export function touch(role: Role) {
  state[role].lastSeen = Date.now();
}

export function setTyping(role: Role, isTyping: boolean) {
  state[role].typingUntil = isTyping ? Date.now() + TYPING_WINDOW_MS : 0;
}

export function getStatus(role: Role) {
  const now = Date.now();
  const s = state[role];
  return {
    online: now - s.lastSeen < ONLINE_WINDOW_MS,
    typing: now < s.typingUntil,
    lastSeen: s.lastSeen ? new Date(s.lastSeen).toISOString() : null,
  };
}
