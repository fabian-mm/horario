import { Compass, Shield, Sparkles, Trophy } from "lucide-react";
import { calculatePlayerProgress, type Mission } from "@/lib/missions";

/** Decorative, code-native landscape: no downloads or extra asset dependencies. */
function JourneyLandscape() {
  return <svg className="rpg-landscape" viewBox="0 0 500 220" fill="none" aria-hidden="true" focusable="false">
    <circle cx="355" cy="65" r="37" fill="currentColor" opacity=".13" />
    <circle cx="355" cy="65" r="49" stroke="currentColor" opacity=".2" strokeDasharray="2 8" />
    <path d="M10 195 105 76 190 176 264 105 360 201 430 133 500 209" stroke="currentColor" opacity=".22" />
    <path d="m76 112 29-36 28 34-18-8-10 14-9-13Z" fill="currentColor" opacity=".2" />
    <path d="M0 211Q96 140 173 188T325 180 500 189V220H0Z" fill="currentColor" opacity=".1" />
    <path d="M138 220c-15-29 163-9 109-47s84-14 90-33" stroke="currentColor" strokeWidth="2" strokeDasharray="4 7" opacity=".5" />
    <g stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
      <path d="M300 143V99h15v8h12V99h16v8h12V99h15v44Z" fill="currentColor" fillOpacity=".1" />
      <path d="M291 143V86h25v57m39 0V86h25v57M288 86l15-20 16 20m33 0 15-20 16 20M329 143v-19a6 6 0 0 1 12 0v19M335 99V53l25 6-25 10M300 98v9m69-9v9" />
      <path d="m47 183 11-28 11 28H47Zm11 0v13m353-34 10-24 10 24h-20Zm10 0v12m26 17 13-33 13 33h-26Zm13 0v14" opacity=".45" />
      <path d="M205 47v10m-5-5h10m220-18v10m-5-5h10M155 116v8m-4-4h8" opacity=".65" />
    </g>
    <circle cx="247" cy="173" r="4" fill="currentColor" />
  </svg>;
}

export function AdventureProgress({ missions }: { missions: Mission[] }) {
  const player = calculatePlayerProgress(missions);
  return <section className="rpg-journey" aria-label="Progreso de aventura">
    <JourneyLandscape />
    <div className="rpg-journey-copy">
      <span className="rpg-kicker"><Compass size={13} /> TU SEMESTRE, UNA AVENTURA</span>
      <h2>Cada misión cuenta.</h2>
      <p>Aprende, explora y escribe tu propia leyenda.</p>
      <div className="rpg-player-line"><span className="rpg-level-seal"><Shield size={34} /><b>{player.level}</b></span><div><strong>{player.rank}</strong><small>Nivel {player.level} · {player.totalXp} XP en tu bitácora</small></div></div>
    </div>
    <div className="rpg-journey-footer">
      <div className="rpg-experience"><div><span><Sparkles size={12} /> Camino al nivel {player.level + 1}</span><strong>{player.xpInLevel} / {player.xpPerLevel} XP</strong></div><progress aria-label="Experiencia del nivel" value={player.xpInLevel} max={player.xpPerLevel} /><small>25 / 50 / 100 XP según la prioridad. Se calculan con tus tareas completadas.</small></div>
      <span className="rpg-completed"><Trophy size={18} /><strong>{player.completed}</strong><small>misiones completadas</small></span>
    </div>
  </section>;
}
