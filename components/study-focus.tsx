"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, Square, X } from "lucide-react";
import type { Mission } from "@/lib/missions";

type Session = { id: string; missionId: string; title: string; elapsedMs: number; startedAt: number | null; finishedAt?: string };
export type StudyRecord = { id: string; minutes: number; finishedAt: string };
type Props = { userId: string; requestedTask: Mission | null; onRequestHandled: () => void; onSave: (missionId: string, record: StudyRecord) => Promise<boolean> };
const elapsed = (session: Session) => session.elapsedMs + (session.startedAt === null ? 0 : Math.max(0, Date.now() - session.startedAt));

export function StudyFocus({ userId, requestedTask, onRequestHandled, onSave }: Props) {
  const key = `bitacora-study-timer:${userId}`;
  const [session, setSession] = useState<Session | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [message, setMessage] = useState("");
  const commit = (next: Session | null) => {
    sessionRef.current = next;
    setSession(next);
    try { if (next) localStorage.setItem(key, JSON.stringify(next)); else localStorage.removeItem(key); }
    catch { setMessage("El navegador no permite conservar la sesión al cerrar. Mantén esta página abierta."); }
  };
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(key) ?? "null");
      if (saved && typeof saved.missionId === "string" && Number.isFinite(saved.elapsedMs) && saved.elapsedMs >= 0) {
        const restored: Session = { id: saved.id ?? saved.operationId ?? `timer-${saved.trackedAt ?? Date.now()}-${saved.missionId}`, missionId: saved.missionId, title: saved.title ?? "Sesión de estudio", elapsedMs: saved.elapsedMs, startedAt: Number.isFinite(saved.startedAt) ? saved.startedAt : null, finishedAt: saved.finishedAt };
        sessionRef.current = restored;
        setSession(restored);
      }
    } catch { setMessage("No se pudo recuperar el cronómetro guardado."); }
    const pauseOnExit = () => {
      const current = sessionRef.current;
      if (!current) return;
      const paused = { ...current, elapsedMs: elapsed(current), startedAt: null };
      sessionRef.current = paused;
      setSession(paused);
      try { localStorage.setItem(key, JSON.stringify(paused)); } catch { /* Keep in-memory session. */ }
    };
    window.addEventListener("pagehide", pauseOnExit);
    return () => { pauseOnExit(); window.removeEventListener("pagehide", pauseOnExit); };
  }, [key]);
  useEffect(() => {
    if (!requestedTask) return;
    if (sessionRef.current) setMessage("Ya tienes una sesión abierta. Guárdala antes de cambiar de tarea.");
    else commit({ id: crypto.randomUUID(), missionId: requestedTask.id, title: requestedTask.title, elapsedMs: 0, startedAt: Date.now() });
    onRequestHandled();
  // Requests are consumed once; timer state must not restart this effect.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedTask]);
  useEffect(() => {
    if (!session) return;
    const update = () => setSeconds(Math.floor(elapsed(session) / 1000));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [session]);
  const finish = async () => {
    const current = sessionRef.current;
    if (!current || savingRef.current) return;
    const stopped: Session = { ...current, elapsedMs: elapsed(current), startedAt: null, finishedAt: current.finishedAt ?? new Date().toISOString() };
    commit(stopped);
    savingRef.current = true;
    setSaving(true);
    setMessage("");
    try {
      const saved = await onSave(stopped.missionId, { id: stopped.id, minutes: Math.max(1, Math.round(stopped.elapsedMs / 60000)), finishedAt: stopped.finishedAt! });
      if (saved) { commit(null); setMessage("Sesión guardada. La tarea conserva su estado de entrega."); }
      else setMessage("No se pudo guardar. Tu tiempo está conservado: vuelve a pulsar Guardar.");
    } catch { setMessage("No se pudo guardar. Tu tiempo está conservado: vuelve a pulsar Guardar."); }
    finally { savingRef.current = false; setSaving(false); }
  };
  return <>
    {message && <div className="academic-toast" role="status">{message}<button type="button" aria-label="Cerrar aviso" onClick={() => setMessage("")}><X size={15} /></button></div>}
    {session && <aside className="academic-focus" aria-label="Sesión de estudio"><div><small>{session.finishedAt ? "PENDIENTE DE GUARDAR" : session.startedAt ? "ENFOQUE ACTIVO" : "EN PAUSA"}</small><strong>{session.title}</strong></div><time>{String(Math.floor(seconds / 3600)).padStart(2, "0")}:{String(Math.floor(seconds / 60) % 60).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}</time><button type="button" disabled={saving || Boolean(session.finishedAt)} aria-label={session.startedAt ? "Pausar estudio" : "Reanudar estudio"} onClick={() => commit(session.startedAt ? { ...session, elapsedMs: elapsed(session), startedAt: null } : { ...session, startedAt: Date.now() })}>{session.startedAt ? <Pause size={16} /> : <Play size={16} />}</button><button type="button" disabled={saving} className="focus-save" onClick={finish}><Square size={14} />{saving ? "Guardando…" : "Guardar sesión"}</button></aside>}
  </>;
}
