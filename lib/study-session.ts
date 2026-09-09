export type StudySession = { id: string; missionId: string; title: string; elapsedMs: number; startedAt: number | null; finishedAt?: string; mode?: "free" | "interval"; workMinutes?: number; breakMinutes?: number; phase?: "work" | "break" | "ready"; phaseElapsedMs?: number };

// Materialize timestamps rather than trusting interval ticks. If the page sleeps
// through a cycle, cap work, finish the break, and wait for explicit continuation.
export function advanceSession(session: StudySession, now: number): StudySession {
  if (session.startedAt === null || session.finishedAt || session.phase === "ready") return session;
  const delta = Math.max(0, now - session.startedAt);
  if (session.mode !== "interval") return { ...session, elapsedMs: session.elapsedMs + delta, startedAt: now };
  const workMs = (session.workMinutes ?? 25) * 60000;
  const breakMs = (session.breakMinutes ?? 5) * 60000;
  const phaseElapsed = session.phaseElapsedMs ?? 0;
  if (session.phase === "break") {
    const spent = phaseElapsed + delta;
    return spent >= breakMs ? { ...session, phase: "ready", startedAt: null, phaseElapsedMs: 0 } : { ...session, startedAt: now, phaseElapsedMs: spent };
  }
  const worked = Math.min(delta, Math.max(0, workMs - phaseElapsed));
  if (phaseElapsed + delta < workMs) return { ...session, elapsedMs: session.elapsedMs + worked, phaseElapsedMs: phaseElapsed + delta, startedAt: now };
  const rest = delta - worked;
  return { ...session, elapsedMs: session.elapsedMs + worked, phase: rest >= breakMs ? "ready" : "break", phaseElapsedMs: rest >= breakMs ? 0 : rest, startedAt: rest >= breakMs ? null : now };
}
export function pauseSession(session: StudySession, now: number) { return { ...advanceSession(session, now), startedAt: null }; }
export function resumeSession(session: StudySession, now: number): StudySession {
  if (session.finishedAt) return session;
  return { ...session, phase: session.phase === "ready" ? "work" : session.phase, phaseElapsedMs: session.phase === "ready" ? 0 : session.phaseElapsedMs, startedAt: now };
}
export function phaseRemaining(session: StudySession) {
  if (session.phase === "ready") return 0;
  return Math.max(0, (session.phase === "break" ? session.breakMinutes ?? 5 : session.workMinutes ?? 25) * 60000 - (session.phaseElapsedMs ?? 0));
}
