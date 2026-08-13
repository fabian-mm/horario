"use client";

import { useState } from "react";
import { Check, Clock3, LockKeyhole, Play, Plus } from "lucide-react";
import { formatProgressDuration, getMissionProgress, isFailedProgressMission, type Mission } from "@/lib/missions";

type Props = {
  mission: Mission;
  onAdd?: (minutes: number) => void;
  onStartTimer?: () => void;
  timerActive?: boolean;
  timerBlocked?: boolean;
  compact?: boolean;
};

export function MissionProgress({ mission, onAdd, onStartTimer, timerActive = false, timerBlocked = false, compact = false }: Props) {
  const progress = getMissionProgress(mission);
  const failed = isFailedProgressMission(mission);
  const [customMinutes, setCustomMinutes] = useState(15);
  if (!progress.goalMinutes) return null;

  return <div className={`mission-progress ${compact ? "compact" : ""} ${progress.complete ? "complete" : ""} ${failed ? "failed" : ""}`}>
    <div className="mission-progress-heading">
      <span>{progress.complete ? <Check size={13} /> : failed ? <LockKeyhole size={13} /> : <Clock3 size={13} />}<strong>{formatProgressDuration(progress.completedMinutes)}</strong> de {formatProgressDuration(progress.goalMinutes)}</span>
      <b>{progress.percentage}%</b>
    </div>
    <div className="mission-progress-track" aria-label={`${progress.percentage}% del objetivo completado`}><i style={{ width: `${progress.percentage}%` }} /></div>
    {onAdd && !progress.complete && !failed && <div className="mission-progress-actions">
      <button type="button" onClick={(event) => { event.stopPropagation(); onAdd(30); }}><Plus size={11} />30 min</button>
      <button type="button" onClick={(event) => { event.stopPropagation(); onAdd(60); }}><Plus size={11} />1 hora</button>
      <form className="mission-custom-time" onSubmit={(event) => { event.preventDefault(); event.stopPropagation(); if (customMinutes > 0) onAdd(customMinutes); }}>
        <label><span>Minutos</span><input aria-label="Minutos personalizados" type="number" inputMode="numeric" min="1" max={Math.max(1, progress.goalMinutes - progress.completedMinutes)} step="1" value={customMinutes} onChange={(event) => setCustomMinutes(Number(event.target.value))} /></label>
        <button type="submit"><Plus size={11} />Sumar</button>
      </form>
    </div>}
    {onStartTimer && !progress.complete && !failed && <button className={`mission-timer-start ${timerActive ? "active" : ""}`} type="button" disabled={timerActive || timerBlocked} onClick={(event) => { event.stopPropagation(); onStartTimer(); }}><Play size={11} />{timerActive ? "Cronómetro activo" : timerBlocked ? "Finaliza la sesión actual" : "Iniciar cronómetro"}</button>}
    {progress.complete && <small>Objetivo de horas cumplido</small>}
    {failed && <small>Meta vencida · progreso bloqueado</small>}
  </div>;
}
