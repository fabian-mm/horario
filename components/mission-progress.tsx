"use client";

import { Check, Clock3, Plus } from "lucide-react";
import { formatProgressDuration, getMissionProgress, type Mission } from "@/lib/missions";

type Props = {
  mission: Mission;
  onAdd?: (minutes: 30 | 60) => void;
  compact?: boolean;
};

export function MissionProgress({ mission, onAdd, compact = false }: Props) {
  const progress = getMissionProgress(mission);
  if (!progress.goalMinutes) return null;

  return <div className={`mission-progress ${compact ? "compact" : ""} ${progress.complete ? "complete" : ""}`}>
    <div className="mission-progress-heading">
      <span>{progress.complete ? <Check size={13} /> : <Clock3 size={13} />}<strong>{formatProgressDuration(progress.completedMinutes)}</strong> de {formatProgressDuration(progress.goalMinutes)}</span>
      <b>{progress.percentage}%</b>
    </div>
    <div className="mission-progress-track" aria-label={`${progress.percentage}% del objetivo completado`}><i style={{ width: `${progress.percentage}%` }} /></div>
    {onAdd && !progress.complete && <div className="mission-progress-actions">
      <button type="button" onClick={(event) => { event.stopPropagation(); onAdd(30); }}><Plus size={11} />30 min</button>
      <button type="button" onClick={(event) => { event.stopPropagation(); onAdd(60); }}><Plus size={11} />1 hora</button>
    </div>}
    {progress.complete && <small>Objetivo de horas cumplido</small>}
  </div>;
}
