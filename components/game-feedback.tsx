"use client";

import { Award, Sparkles, Swords, Trophy, X } from "lucide-react";
import type { XpMilestone } from "@/lib/missions";

export type RewardEvent = {
  id: number;
  title: string;
  xp: number;
  boss: boolean;
  activity?: boolean;
  milestone?: XpMilestone;
};

type Props = {
  reward: RewardEvent | null;
  onDismiss: () => void;
};

export function GameFeedback({ reward, onDismiss }: Props) {
  if (!reward) return null;

  return (
    <aside key={reward.id} className={`game-feedback ${reward.boss ? "boss" : ""} ${reward.milestone ? "milestone" : ""}`} role="status" aria-live="polite">
      <div className="reward-particles" aria-hidden="true">
        {Array.from({ length: 9 }, (_, index) => <i key={index} />)}
      </div>
      <span className="victory-sigil" aria-hidden="true">{reward.milestone ? <Award size={24} /> : reward.boss ? <Swords size={24} /> : <Trophy size={24} />}</span>
      <div className="game-feedback-copy">
        <small>{reward.milestone ? `HITO DE ${reward.milestone.threshold} XP` : reward.boss ? "JEFE FINAL DERROTADO" : reward.activity ? "RUTINA COMPLETADA" : "MISIÓN CUMPLIDA"}</small>
        <strong>{reward.milestone?.title ?? reward.title}</strong>
        {reward.milestone && <p>{reward.milestone.message}</p>}
        <span><Sparkles size={13} /> +{reward.xp} XP obtenida</span>
      </div>
      <button type="button" onClick={onDismiss} aria-label="Cerrar recompensa"><X size={15} /></button>
    </aside>
  );
}
