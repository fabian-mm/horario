"use client";

import { useEffect, useState } from "react";
import { Pause, Play, Square, TimerReset, Trash2 } from "lucide-react";
import type { StudyTimerSession } from "@/hooks/use-study-timer";

type Props = {
  session: StudyTimerSession;
  onPause: () => void;
  onResume: () => void;
  onFinish: () => void;
  onDiscard: () => void;
};

const formatElapsed = (milliseconds: number) => {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
};

export function StudyTimer({ session, onPause, onResume, onFinish, onDiscard }: Props) {
  const [liveElapsed, setLiveElapsed] = useState(session.elapsedMs);
  useEffect(() => {
    const update = () => setLiveElapsed(session.elapsedMs + (session.startedAt ? Date.now() - session.startedAt : 0));
    const initialUpdate = window.setTimeout(update, 0);
    if (!session.startedAt) return () => window.clearTimeout(initialUpdate);
    const interval = window.setInterval(update, 1000);
    return () => { window.clearTimeout(initialUpdate); window.clearInterval(interval); };
  }, [session.elapsedMs, session.startedAt]);

  return <aside className={`study-timer-float ${session.startedAt ? "running" : "paused"}`} aria-live="polite" aria-label={`Cronómetro de ${session.title}`}>
    <div className="study-timer-orb"><TimerReset size={20} /></div>
    <div className="study-timer-copy"><small>{session.startedAt ? "SESIÓN EN CURSO" : "SESIÓN EN PAUSA"}</small><strong>{session.title}</strong><span>{session.subject}</span></div>
    <time>{formatElapsed(liveElapsed)}</time>
    <div className="study-timer-actions">
      <button type="button" onClick={session.startedAt ? onPause : onResume} aria-label={session.startedAt ? "Pausar cronómetro" : "Reanudar cronómetro"}>{session.startedAt ? <Pause size={16} /> : <Play size={16} />}</button>
      <button type="button" className="finish" onClick={onFinish} aria-label="Finalizar y sumar tiempo"><Square size={14} /><span>Finalizar</span></button>
      <button type="button" className="discard" onClick={onDiscard} aria-label="Descartar cronómetro" title="Descartar sin sumar"><Trash2 size={15} /></button>
    </div>
  </aside>;
}
