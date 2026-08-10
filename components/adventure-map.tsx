"use client";

import { useMemo, useState } from "react";
import { Anchor, Check, ChevronRight, Clock3, Compass, Crown, FileCheck2, Flag, Footprints, Gem, MapPinned, Navigation, Plus, ScrollText, Ship, Sparkles, Swords, Trophy } from "lucide-react";
import { formatLongDate, formatProgressDuration, getMissionProgress, getMissionStatus, getMissionXp, isProgressMission, Mission, MissionStatus, priorityMeta, sortMissionsByDateTime, statusMeta } from "@/lib/missions";
import { formatTime12Hour } from "@/lib/time";
import { MissionProgress } from "@/components/mission-progress";

type Props = {
  missions: Mission[];
  onAdd: () => void;
  onEdit: (mission: Mission) => void;
  onStatusChange: (id: string, status: MissionStatus) => void;
  onAddProgress: (id: string, minutes: 30 | 60) => void;
};

// Organic horizontal marker position percentages for an irregular serpentine route
const NODE_POSITIONS = [
  { xPercent: 24, side: "left", label: "Isla de Inicio" },
  { xPercent: 74, side: "right", label: "Pico de la Entregas" },
  { xPercent: 36, side: "left", label: "Bahía del Saber" },
  { xPercent: 82, side: "right", label: "Paso Peligroso" },
  { xPercent: 18, side: "left", label: "Puerto de Apuntes" },
  { xPercent: 62, side: "right", label: "Cima del Estudio" },
];

export function AdventureMap({ missions, onAdd, onEdit, onStatusChange, onAddProgress }: Props) {
  const orderedMissions = useMemo(() => sortMissionsByDateTime(missions), [missions]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedMission = orderedMissions.find((mission) => mission.id === selectedId) ?? orderedMissions.find((mission) => getMissionStatus(mission) !== "completed") ?? orderedMissions[0] ?? null;
  const completed = orderedMissions.filter((mission) => getMissionStatus(mission) === "completed").length;
  const bosses = orderedMissions.filter((mission) => mission.priority === "boss");
  const defeatedBosses = bosses.filter((mission) => getMissionStatus(mission) === "completed").length;
  const journeyProgress = orderedMissions.length ? Math.round((completed / orderedMissions.length) * 100) : 0;

  // Generate SVG bezier curve path connecting nodes organically
  const svgPathData = useMemo(() => {
    if (!orderedMissions.length) return "";
    const nodeHeight = 115;
    const startY = 45;

    const points = orderedMissions.map((_, i) => ({
      x: NODE_POSITIONS[i % NODE_POSITIONS.length].xPercent,
      y: startY + i * nodeHeight,
    }));

    // Add final treasure chest point at 50% center
    const finalY = startY + orderedMissions.length * nodeHeight;
    points.push({ x: 50, y: finalY });

    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const midY = (p1.y + p2.y) / 2;
      path += ` C ${p1.x} ${midY}, ${p2.x} ${midY}, ${p2.x} ${p2.y}`;
    }
    return path;
  }, [orderedMissions]);

  return (
    <div className="adventure-map-view">
      <header className="adventure-map-heading">
        <div>
          <span className="eyebrow">CARTA DE NAVEGACIÓN</span>
          <h1>Mapa del <i>Tesoro de Campaña</i></h1>
          <p>Sigue el rastro marcado por el mapa, conquista cada territorio y alcanza el tesoro final.</p>
        </div>
        <button className="primary-button compact" type="button" onClick={onAdd}>
          <Plus size={18} /> Nueva misión
        </button>
      </header>

      <div className="map-expedition-hud" aria-label="Progreso del mapa">
        <span><MapPinned size={16} /><small>MARCA DE RUTA</small><strong>{journeyProgress}%</strong></span>
        <span><ScrollText size={16} /><small>ISLAS / DESTINOS</small><strong>{orderedMissions.length}</strong></span>
        <span className="fortress-counter"><Crown size={16} /><small>FORTALEZAS</small><strong>{defeatedBosses}/{bosses.length}</strong></span>
        <div><span><i style={{ width: `${journeyProgress}%` }} /></span><small>{completed} misiones conquistadas</small></div>
      </div>

      <div className="adventure-map-grid">
        <section className="treasure-route parchment-map irregular-map" aria-label="Ruta del Tesoro">
          {/* Map Grid Coordinates */}
          <div className="map-coordinates coord-top" aria-hidden="true"><span>74° W</span><span>72° W</span><span>70° W</span><span>68° W</span></div>
          <div className="map-coordinates coord-side" aria-hidden="true"><span>14° N</span><span>12° N</span><span>10° N</span><span>08° N</span></div>

          {/* Decorative Sea and Island Labels */}
          <div className="map-sea-label sea-north" aria-hidden="true">MAR DE LOS SABERES</div>
          <div className="map-sea-label sea-center" aria-hidden="true">ARCHIPIÉLAGO DEL CONOCIMIENTO</div>
          <div className="map-sea-label sea-south" aria-hidden="true">GOLFO DEL EXAMEN FINAL</div>

          {/* Nautical decorative elements */}
          <div className="map-deco-element deco-ship" aria-hidden="true" title="Barco de exploración"><Ship size={28} /></div>
          <div className="map-deco-element deco-anchor" aria-hidden="true" title="Puerto seguro"><Anchor size={22} /></div>
          <div className="map-deco-element deco-kraken" aria-hidden="true">🦑</div>

          {/* Antique Compass Rose */}
          <div className="map-compass antique-compass" aria-hidden="true">
            <span className="compass-n">N</span>
            <span className="compass-e">E</span>
            <span className="compass-s">S</span>
            <span className="compass-w">W</span>
            <Navigation size={22} className="compass-needle" />
            <i className="compass-center">✣</i>
          </div>

          {orderedMissions.length ? (
            <div className="map-route-container">
              {/* Dynamic SVG Serpentine Winding Trail */}
              <svg
                className="treasure-svg-canvas"
                viewBox={`0 0 100 ${orderedMissions.length * 115 + 90}`}
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path
                  d={svgPathData}
                  className="treasure-path-background"
                  vectorEffect="non-scaling-stroke"
                />
                <path
                  d={svgPathData}
                  className="treasure-path-active"
                  vectorEffect="non-scaling-stroke"
                  style={{ strokeDasharray: "6,6" }}
                />
              </svg>

              <ol className="map-route-list irregular-path">
                {orderedMissions.map((mission, index) => {
                  const status = getMissionStatus(mission);
                  const isBoss = mission.priority === "boss";
                  const isSelected = selectedMission?.id === mission.id;
                  const isCompleted = status === "completed";
                  const posConfig = NODE_POSITIONS[index % NODE_POSITIONS.length];

                  return (
                    <li
                      key={mission.id}
                      className={`map-route-item node-item ${status} ${isBoss ? "boss" : ""} ${isSelected ? "selected" : ""} pos-${posConfig.side}`}
                      style={{
                        "--marker-x": `${posConfig.xPercent}%`,
                      } as React.CSSProperties}
                    >
                      <button
                        className="route-objective treasure-card organic-card"
                        type="button"
                        onClick={() => setSelectedId(mission.id)}
                        aria-pressed={isSelected}
                      >
                        <span className="route-date">
                          <strong>{new Date(`${mission.date}T12:00:00`).getDate()}</strong>
                          <small>{new Intl.DateTimeFormat("es-CO", { month: "short" }).format(new Date(`${mission.date}T12:00:00`))}</small>
                        </span>
                        <span className="route-copy">
                          <small>{isBoss ? "🏰 FORTALEZA FINAL" : priorityMeta[mission.priority].label.toUpperCase()}</small>
                          <strong>{mission.title} · {mission.subject}</strong>
                          <span>
                            {isProgressMission(mission)
                              ? `${formatProgressDuration(getMissionProgress(mission).completedMinutes)} de ${formatProgressDuration(getMissionProgress(mission).goalMinutes)}`
                              : formatTime12Hour(mission.time)}
                          </span>
                        </span>
                        <ChevronRight size={16} className="card-arrow" />
                      </button>

                      <span className="route-marker organic-marker" style={{ left: `${posConfig.xPercent}%` }} aria-hidden="true">
                        <i>
                          {isCompleted ? (
                            <Check size={16} className="check-icon" />
                          ) : isBoss ? (
                            <Swords size={18} />
                          ) : (
                            index + 1
                          )}
                        </i>
                        {isCompleted && <span className="marker-footprints" title="Camino recorrido"><Footprints size={12} /></span>}
                      </span>
                    </li>
                  );
                })}

                <li className="route-treasure treasure-spot" aria-hidden="true">
                  <div className="x-marks-the-spot">
                    <span className="x-mark">✖</span>
                    <span className="treasure-chest-glow">
                      <Trophy size={26} />
                    </span>
                  </div>
                  <strong>EL TESORO DE LA CAMPAÑA</strong>
                  <small>¡LLEGA AL FINAL Y RECLAMA TU RECOMPENSA!</small>
                </li>
              </ol>
            </div>
          ) : (
            <div className="map-empty-state">
              <MapPinned size={48} />
              <h2>Carta Náutica sin Trazar</h2>
              <p>Crea tu primera misión para desplegar la ruta serpenteante en este pergamino.</p>
              <button type="button" onClick={onAdd}>Trazar primer objetivo</button>
            </div>
          )}
        </section>

        <aside className={`map-objective-sheet parchment-scroll ${selectedMission?.priority ?? ""}`} aria-live="polite">
          {selectedMission ? (
            <>
              <div className="sheet-banner">
                <span>{selectedMission.priority === "boss" ? <Swords size={20} /> : <Flag size={20} />}</span>
                <div>
                  <small>DESTINO EN LA CARTA</small>
                  <strong>{priorityMeta[selectedMission.priority].label}</strong>
                </div>
              </div>
              <div className="sheet-content">
                <span className={`status-pill ${getMissionStatus(selectedMission)}`}><i />{statusMeta[getMissionStatus(selectedMission)].label}</span>
                <h2>{selectedMission.title} · {selectedMission.subject}</h2>
                <div className="sheet-reward">
                  <Sparkles size={17} />
                  <span><small>BOTÍN DE XP</small><strong>+{getMissionXp(selectedMission)} XP</strong></span>
                </div>
                <dl className="objective-stats">
                  <div><dt>Fecha</dt><dd>{formatLongDate(selectedMission.date)}</dd></div>
                  <div><dt>{isProgressMission(selectedMission) ? "Meta" : "Hora"}</dt><dd><Clock3 size={12} /> {isProgressMission(selectedMission) ? formatProgressDuration(selectedMission.progressGoalMinutes ?? 0) : selectedMission.time}</dd></div>
                  <div><dt>Impacto</dt><dd>{selectedMission.weight !== undefined ? `${selectedMission.weight}%` : "Sin definir"}</dd></div>
                  <div><dt>Nota</dt><dd>{selectedMission.grade?.trim() || "Pendiente"}</dd></div>
                </dl>
                {isProgressMission(selectedMission) && <MissionProgress mission={selectedMission} onAdd={(minutes) => onAddProgress(selectedMission.id, minutes)} />}
                {selectedMission.notes && <div className="objective-clue"><small>PISTA EN EL PERGAMINO</small><p>{selectedMission.notes}</p></div>}
                {!isProgressMission(selectedMission) && (
                  <div className="sheet-status-actions" aria-label={`Cambiar estado de ${selectedMission.title}`}>
                    <button type="button" className={getMissionStatus(selectedMission) === "pending" ? "active" : ""} onClick={() => onStatusChange(selectedMission.id, "pending")}><Flag size={14} /> Pendiente</button>
                    <button type="button" className={getMissionStatus(selectedMission) === "submitted" ? "active" : ""} onClick={() => onStatusChange(selectedMission.id, "submitted")}><FileCheck2 size={14} /> Entregada</button>
                    <button type="button" className={getMissionStatus(selectedMission) === "completed" ? "active" : ""} onClick={() => onStatusChange(selectedMission.id, "completed")}><Check size={14} /> Cumplida</button>
                  </div>
                )}
                <button className="open-objective-button" type="button" onClick={() => onEdit(selectedMission)}>
                  Inspeccionar objetivo <ChevronRight size={15} />
                </button>
              </div>
            </>
          ) : (
            <div className="sheet-placeholder">
              <ScrollText size={36} />
              <h2>Selecciona un Destino</h2>
              <p>Las coordenadas y notas del mapa se revelarán en este pergamino.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
