"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, Square, X } from "lucide-react";
import type { Mission } from "@/lib/missions";
import type { Concentration } from "@/lib/planning";
import { advanceSession, pauseSession, resumeSession, phaseRemaining, type StudySession } from "@/lib/study-session";

export type StudyRecord = { id: string; minutes: number; finishedAt: string };
type Props = { userId: string; requestedTask: Mission | null; configuration?: Concentration; onRequestHandled: () => void; onSave: (missionId: string, record: StudyRecord) => Promise<boolean> };
const displayTime = (ms: number) => { const s = Math.floor(ms / 1000); return [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map(n => String(n).padStart(2, "0")).join(":"); };

export function StudyFocus({ userId, requestedTask, configuration, onRequestHandled, onSave }: Props) {
  const key = "bitacora-study-timer:" + userId;
  const [session, setSession] = useState<StudySession | null>(null);
  const sessionRef = useRef<StudySession | null>(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [message, setMessage] = useState("");
  const commit = (next: StudySession | null) => {
    sessionRef.current = next; setSession(next);
    try { if (next) localStorage.setItem(key, JSON.stringify(next)); else localStorage.removeItem(key); }
    catch { setMessage("El navegador no permite conservar la sesión al cerrar. Mantén esta página abierta."); }
  };
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(key) ?? "null");
      if (saved && typeof saved.missionId === "string" && Number.isFinite(saved.elapsedMs) && saved.elapsedMs >= 0) {
        const restored: StudySession = {
          id: typeof saved.id === "string" ? saved.id : typeof saved.operationId === "string" ? saved.operationId : crypto.randomUUID(),
          missionId: saved.missionId, title: typeof saved.title === "string" ? saved.title : "Sesión de estudio", elapsedMs: saved.elapsedMs,
          startedAt: Number.isFinite(saved.startedAt) ? saved.startedAt : null,
          finishedAt: typeof saved.finishedAt === "string" ? saved.finishedAt : undefined,
          mode: saved.mode === "interval" ? "interval" : "free",
          workMinutes: Number.isInteger(saved.workMinutes) && saved.workMinutes >= 1 && saved.workMinutes <= 180 ? saved.workMinutes : 25,
          breakMinutes: Number.isInteger(saved.breakMinutes) && saved.breakMinutes >= 1 && saved.breakMinutes <= 60 ? saved.breakMinutes : 5,
          phase: saved.phase === "break" || saved.phase === "ready" ? saved.phase : "work",
          phaseElapsedMs: Number.isFinite(saved.phaseElapsedMs) && saved.phaseElapsedMs >= 0 ? saved.phaseElapsedMs : 0,
        };
        commit(advanceSession(restored, Date.now()));
      }
    } catch { setMessage("No se pudo recuperar el cronómetro guardado."); }
    const pauseOnExit = () => { if (sessionRef.current) commit(pauseSession(sessionRef.current, Date.now())); };
    const ticker = window.setInterval(() => { const current = sessionRef.current; if (current && current.startedAt !== null && !current.finishedAt) commit(advanceSession(current, Date.now())); }, 1000);
    window.addEventListener("pagehide", pauseOnExit);
    return () => { pauseOnExit(); window.clearInterval(ticker); window.removeEventListener("pagehide", pauseOnExit); };
  // This component is keyed by account; the ticker uses the current session ref.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  useEffect(() => {
    if (!requestedTask) return;
    if (sessionRef.current) setMessage("Ya tienes una sesión abierta. Guárdala antes de cambiar de tarea.");
    else commit({ id: crypto.randomUUID(), missionId: requestedTask.id, title: requestedTask.title, elapsedMs: 0, startedAt: Date.now(), mode: configuration?.mode ?? "free", workMinutes: configuration?.workMinutes ?? 25, breakMinutes: configuration?.breakMinutes ?? 5, phase: "work", phaseElapsedMs: 0 });
    onRequestHandled();
  // Requests are consumed once; settings changes affect the next session.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedTask]);
  const finish = async () => {
    const current = sessionRef.current;
    if (!current || savingRef.current) return;
    const paused = pauseSession(current, Date.now());
    if (paused.elapsedMs < 1000) { setMessage("Aún no hay tiempo de estudio para guardar."); return; }
    const stopped = { ...paused, finishedAt: current.finishedAt ?? new Date().toISOString() };
    commit(stopped); savingRef.current = true; setSaving(true); setMessage("");
    try {
      const saved = await onSave(stopped.missionId, { id: stopped.id, minutes: Math.max(1, Math.round(stopped.elapsedMs / 60000)), finishedAt: stopped.finishedAt });
      if (saved) { commit(null); setMessage("Sesión guardada. La tarea conserva su estado de entrega."); }
      else setMessage("No se pudo guardar. Tu tiempo está conservado: vuelve a pulsar Guardar.");
    } catch { setMessage("No se pudo guardar. Tu tiempo está conservado: vuelve a pulsar Guardar."); }
    finally { savingRef.current = false; setSaving(false); }
  };
  const interval = session?.mode === "interval";
  const phaseLabel = session?.finishedAt ? "PENDIENTE DE GUARDAR" : session?.phase === "ready" ? "DESCANSO TERMINADO · CONTINÚA CUANDO QUIERAS" : session?.phase === "break" ? (session.startedAt === null ? "DESCANSO EN PAUSA" : "CAMPAMENTO · DESCANSO") : session?.startedAt !== null ? "ENFOQUE ACTIVO" : "EN PAUSA";
  return <>
    {message && <div className="academic-toast" role="status">{message}<button type="button" aria-label="Cerrar aviso" onClick={() => setMessage("")}><X size={15} /></button></div>}
    {session && <aside className={"academic-focus " + (interval ? "interval-focus" : "")} aria-label="Sesión de estudio">
      <div><small role="status">{phaseLabel}</small><strong>{session.title}</strong>{interval && <span className="focus-total">Estudio acumulado: {displayTime(session.elapsedMs)} · {session.workMinutes}/{session.breakMinutes} min</span>}</div>
      <time aria-label={interval ? "Tiempo restante del bloque" : "Tiempo estudiado"}>{displayTime(interval && !session.finishedAt ? phaseRemaining(session) : session.elapsedMs)}</time>
      <button type="button" disabled={saving || Boolean(session.finishedAt)} aria-label={session.phase === "ready" ? "Siguiente bloque de estudio" : session.startedAt !== null ? "Pausar estudio" : "Reanudar estudio"} onClick={() => { const current = sessionRef.current; if (current) commit(current.startedAt !== null ? pauseSession(current, Date.now()) : resumeSession(current, Date.now())); }}>{session.startedAt !== null ? <Pause size={16} /> : <Play size={16} />}</button>
      <button type="button" disabled={saving} className="focus-save" onClick={finish}><Square size={14} />{saving ? "Guardando…" : "Guardar sesión"}</button>
    </aside>}
  </>;
}
