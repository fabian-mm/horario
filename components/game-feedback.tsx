"use client";

import { Sparkles, Swords, Trophy, X } from "lucide-react";

export type RewardEvent = {
  id: number;
  title: string;
  xp: number;
  boss: boolean;
};

type Props = {
  reward: RewardEvent | null;
  onDismiss: () => void;
};

export function GameFeedback({ reward, onDismiss }: Props) {
  if (!reward) return null;

  return (
    <aside key={reward.id} className={`game-feedback ${reward.boss ? "boss" : ""}`} role="status" aria-live="polite">
      <div className="reward-particles" aria-hidden="true">
        {Array.from({ length: 9 }, (_, index) => <i key={index} />)}
      </div>
      <span className="victory-sigil" aria-hidden="true">{reward.boss ? <Swords size={24} /> : <Trophy size={24} />}</span>
      <div className="game-feedback-copy">
        <small>{reward.boss ? "JEFE FINAL DERROTADO" : "MISIÓN CUMPLIDA"}</small>
        <strong>{reward.title}</strong>
        <span><Sparkles size={13} /> +{reward.xp} XP obtenida</span>
      </div>
      <button type="button" onClick={onDismiss} aria-label="Cerrar recompensa"><X size={15} /></button>
    </aside>
  );
}
