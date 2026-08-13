"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Mission } from "@/lib/missions";
import { getMissionProgress } from "@/lib/missions";

export type StudyTimerSession = {
  missionId: string;
  title: string;
  subject: string;
  trackedAt: number;
  startedAt: number | null;
  elapsedMs: number;
  maxElapsedMs: number;
};

export const getStudyTimerResult = (session: StudyTimerSession, endedAt = Date.now()) => {
  const activeElapsed = session.startedAt ? Math.max(0, endedAt - session.startedAt) : 0;
  const elapsedMs = Math.min(session.maxElapsedMs, session.elapsedMs + activeElapsed);
  return {
    missionId: session.missionId,
    minutes: Math.max(1, Math.round(elapsedMs / 60_000)),
    trackedAt: endedAt,
  };
};

export const pauseStudyTimerSession = (session: StudyTimerSession, pausedAt = Date.now()): StudyTimerSession => {
  if (!session.startedAt) return session;
  return {
    ...session,
    elapsedMs: Math.min(session.maxElapsedMs, session.elapsedMs + Math.max(0, pausedAt - session.startedAt)),
    startedAt: null,
  };
};

const storageKey = (userId: string) => `bitacora-study-timer:${userId}`;

const readSession = (userId: string): StudyTimerSession | null => {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(storageKey(userId)) ?? "null") as Partial<StudyTimerSession> | null;
    if (!parsed?.missionId || typeof parsed.elapsedMs !== "number" || typeof parsed.maxElapsedMs !== "number") return null;
    const maxElapsedMs = Math.max(60_000, parsed.maxElapsedMs);
    const startedAt = typeof parsed.startedAt === "number" && parsed.startedAt <= Date.now() ? parsed.startedAt : null;
    return {
      missionId: parsed.missionId,
      title: parsed.title ?? "Trabajo",
      subject: parsed.subject ?? "",
      trackedAt: typeof parsed.trackedAt === "number" ? parsed.trackedAt : startedAt ?? Date.now(),
      startedAt,
      elapsedMs: Math.min(maxElapsedMs, Math.max(0, parsed.elapsedMs)),
      maxElapsedMs,
    };
  } catch {
    return null;
  }
};

export function useStudyTimer(userId?: string | null) {
  const [session, setSession] = useState<StudyTimerSession | null>(null);
  const sessionRef = useRef<StudyTimerSession | null>(null);
  const commitSession = useCallback((next: StudyTimerSession | null) => {
    sessionRef.current = next;
    setSession(next);
  }, []);

  useEffect(() => {
    commitSession(userId ? readSession(userId) : null);
  }, [commitSession, userId]);

  useEffect(() => {
    if (!userId) return;
    try {
      if (session) window.localStorage.setItem(storageKey(userId), JSON.stringify(session));
      else window.localStorage.removeItem(storageKey(userId));
    } catch {
      // El cronómetro sigue funcionando aunque el navegador bloquee el almacenamiento.
    }
  }, [session, userId]);

  useEffect(() => {
    if (!userId) return;
    const pauseBeforeExit = () => {
      const current = sessionRef.current;
      if (!current?.startedAt) return;
      const paused = pauseStudyTimerSession(current);
      sessionRef.current = paused;
      try {
        window.localStorage.setItem(storageKey(userId), JSON.stringify(paused));
      } catch {
        // El estado de React conserva la sesión mientras la página siga disponible.
      }
      setSession(paused);
    };
    window.addEventListener("pagehide", pauseBeforeExit);
    window.addEventListener("beforeunload", pauseBeforeExit);
    return () => {
      window.removeEventListener("pagehide", pauseBeforeExit);
      window.removeEventListener("beforeunload", pauseBeforeExit);
    };
  }, [userId]);

  const start = useCallback((mission: Mission) => {
    if (sessionRef.current) return false;
    const progress = getMissionProgress(mission);
    const remainingMinutes = progress.goalMinutes - progress.completedMinutes;
    if (remainingMinutes <= 0) return false;
    const startedAt = Date.now();
    commitSession({ missionId: mission.id, title: mission.title, subject: mission.subject, trackedAt: startedAt, startedAt, elapsedMs: 0, maxElapsedMs: remainingMinutes * 60_000 });
    return true;
  }, [commitSession]);

  const pause = useCallback(() => {
    const current = sessionRef.current;
    if (current) commitSession(pauseStudyTimerSession(current));
  }, [commitSession]);

  const resume = useCallback(() => {
    const current = sessionRef.current;
    if (current && !current.startedAt) commitSession({ ...current, startedAt: Date.now() });
  }, [commitSession]);
  const discard = useCallback(() => {
    commitSession(null);
    if (!userId) return;
    try {
      window.localStorage.removeItem(storageKey(userId));
    } catch {
      // El estado en memoria ya fue limpiado.
    }
  }, [commitSession, userId]);
  const finish = useCallback((endedAt = Date.now()) => {
    const current = sessionRef.current;
    return current ? getStudyTimerResult(current, endedAt) : null;
  }, []);

  return { session, start, pause, resume, discard, finish };
}
