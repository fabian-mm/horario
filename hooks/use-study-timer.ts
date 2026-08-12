"use client";

import { useCallback, useEffect, useState } from "react";
import type { Mission } from "@/lib/missions";
import { getMissionProgress } from "@/lib/missions";

export type StudyTimerSession = {
  missionId: string;
  title: string;
  subject: string;
  startedAt: number | null;
  elapsedMs: number;
  maxElapsedMs: number;
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

  useEffect(() => {
    setSession(userId ? readSession(userId) : null);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    try {
      if (session) window.localStorage.setItem(storageKey(userId), JSON.stringify(session));
      else window.localStorage.removeItem(storageKey(userId));
    } catch {
      // El cronómetro sigue funcionando aunque el navegador bloquee el almacenamiento.
    }
  }, [session, userId]);

  const start = useCallback((mission: Mission) => {
    if (session) return false;
    const progress = getMissionProgress(mission);
    const remainingMinutes = progress.goalMinutes - progress.completedMinutes;
    if (remainingMinutes <= 0) return false;
    setSession({ missionId: mission.id, title: mission.title, subject: mission.subject, startedAt: Date.now(), elapsedMs: 0, maxElapsedMs: remainingMinutes * 60_000 });
    return true;
  }, [session]);

  const pause = useCallback(() => setSession((current) => current ? {
    ...current,
    elapsedMs: Math.min(current.maxElapsedMs, current.elapsedMs + (current.startedAt ? Date.now() - current.startedAt : 0)),
    startedAt: null,
  } : null), []);

  const resume = useCallback(() => setSession((current) => current && !current.startedAt ? { ...current, startedAt: Date.now() } : current), []);
  const discard = useCallback(() => setSession(null), []);
  const finish = useCallback(() => {
    if (!session) return null;
    const elapsedMs = Math.min(session.maxElapsedMs, session.elapsedMs + (session.startedAt ? Date.now() - session.startedAt : 0));
    const result = { missionId: session.missionId, minutes: Math.max(1, Math.round(elapsedMs / 60_000)) };
    setSession(null);
    return result;
  }, [session]);

  return { session, start, pause, resume, discard, finish };
}
