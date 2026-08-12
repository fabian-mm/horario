"use client";

import { useMemo, useState } from "react";
import { Anchor, Castle, Check, ChevronRight, Clock3, Crown, FileCheck2, Flag, MapPinned, Mountain, Navigation, ScrollText, Shield, Ship, Skull, Sparkles, Swords, Trees } from "lucide-react";
import { formatLongDate, formatProgressDuration, getMissionProgress, getMissionStatus, getMissionXp, isProgressMission, Mission, MissionStatus, priorityMeta, sortMissionsByDateTime, statusMeta } from "@/lib/missions";
import { formatTime12Hour } from "@/lib/time";
import { createTreasureMapLayout, createTreasurePath } from "@/lib/treasure-map";
import { MissionProgress } from "@/components/mission-progress";

type Props = {
  missions: Mission[];
  onAdd: () => void;
  onEdit: (mission: Mission) => void;
  onStatusChange: (id: string, status: MissionStatus) => void;
  onAddProgress: (id: string, minutes: number) => void;
  onStartTimer: (mission: Mission) => void;
  activeTimerMissionId?: string;
};

const START_POINT = { x: 11, y: 48 };

export function AdventureMap({ missions, onAdd, onEdit, onStatusChange, onAddProgress, onStartTimer, activeTimerMissionId }: Props) {
  const orderedMissions = useMemo(() => sortMissionsByDateTime(missions), [missions]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedMission = orderedMissions.find((mission) => mission.id === selectedId) ?? orderedMissions[0] ?? null;
  const completed = orderedMissions.filter((mission) => getMissionStatus(mission) === "completed").length;
  const bosses = orderedMissions.filter((mission) => mission.priority === "boss");
  const defeatedBosses = bosses.filter((mission) => getMissionStatus(mission) === "completed").length;
  const journeyProgress = orderedMissions.length ? Math.round((completed / orderedMissions.length) * 100) : 0;
  const mapPoints = useMemo(
    () => createTreasureMapLayout(orderedMissions.map((mission) => mission.id)),
    [orderedMissions],
  );
  const treasurePoint = useMemo(() => {
    const lastPoint = mapPoints.at(-1);
    if (!lastPoint) return { x: 50, y: 360 };
    return {
      x: lastPoint.x < 50 ? 72 : 28,
      y: lastPoint.y + 230,
    };
  }, [mapPoints]);
  const mapHeight = orderedMissions.length ? Math.max(620, treasurePoint.y + 120) : 620;
  const svgPathData = useMemo(
    () => createTreasurePath([START_POINT, ...mapPoints, treasurePoint]),
    [mapPoints, treasurePoint],
  );
  const remainingMissions = Math.max(0, orderedMissions.length - completed);

  return (
    <div className="adventure-map-view">
      <header className="adventure-map-heading">
        <div>
          <span className="eyebrow">CARTA DE NAVEGACIÓN</span>
          <h1>Mapa del <i>Tesoro de Campaña</i></h1>
          <p>Pasa el cursor sobre una fecha para descubrir el objetivo; tócala para abrir su ficha.</p>
          <div className="map-chapter"><Shield size={12} /><span>CAPÍTULO I</span><i />La senda del navegante</div>
        </div>
      </header>

      <div className="map-expedition-hud" aria-label="Progreso del mapa">
        <span><MapPinned size={16} /><small>MARCA DE RUTA</small><strong>{journeyProgress}%</strong></span>
        <span><ScrollText size={16} /><small>ISLAS / DESTINOS</small><strong>{orderedMissions.length}</strong></span>
        <span className="fortress-counter"><Crown size={16} /><small>FORTALEZAS</small><strong>{defeatedBosses}/{bosses.length}</strong></span>
        <div><span><i style={{ width: `${journeyProgress}%` }} /></span><small>{completed} misiones conquistadas</small></div>
      </div>

      <div className="adventure-map-grid">
        <section className="treasure-route parchment-map" aria-label="Ruta del Tesoro">
          <div className="map-inner-frame" aria-hidden="true" />
          {/* Map Grid Coordinates */}
          <div className="map-coordinates coord-top" aria-hidden="true"><span>74° W</span><span>72° W</span><span>70° W</span><span>68° W</span></div>
          <div className="map-coordinates coord-side" aria-hidden="true"><span>14° N</span><span>12° N</span><span>10° N</span><span>08° N</span></div>

          {/* Decorative Sea Labels */}
          <div className="map-sea-label sea-north" aria-hidden="true">MAR DE LOS SABERES</div>
          <div className="map-sea-label sea-center" aria-hidden="true">ARCHIPIÉLAGO DEL CONOCIMIENTO</div>
          <div className="map-sea-label sea-south" aria-hidden="true">GOLFO DEL EXAMEN FINAL</div>

          <div className="map-terrain" aria-hidden="true">
            <span className="terrain-island island-west" />
            <span className="terrain-island island-east" />
            <span className="terrain-island island-south" />
            <div className="rpg-landmark landmark-mountains"><Mountain /><small>CUMBRES DEL ESFUERZO</small></div>
            <div className="rpg-landmark landmark-forest"><Trees /><small>BOSQUE DE LA CONSTANCIA</small></div>
            <div className="rpg-landmark landmark-ruins"><Skull /><small>RUINAS DEL OLVIDO</small></div>
          </div>

          {/* Nautical decorative elements */}
          <div className="map-deco-element deco-ship" aria-hidden="true" title="Barco de exploración"><Ship size={26} /></div>
          <div className="map-deco-element deco-anchor" aria-hidden="true" title="Puerto seguro"><Anchor size={20} /></div>
          <div className="map-deco-element deco-kraken" aria-hidden="true">🦑</div>

          {/* Antique Compass Rose */}
          <div className="map-compass antique-compass" aria-hidden="true">
            <span className="compass-n">N</span>
            <span className="compass-e">E</span>
            <span className="compass-s">S</span>
            <span className="compass-w">W</span>
            <Navigation size={20} className="compass-needle" />
            <i className="compass-center">✣</i>
          </div>

          {orderedMissions.length ? (
            <div className="map-route-container">
              {/* Dynamic SVG Serpentine Winding Trail */}
              <svg
                className="treasure-svg-canvas"
                viewBox={`0 0 100 ${mapHeight}`}
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
                />
              </svg>

              <div className="clean-nodes-list" style={{ height: `${mapHeight}px` }}>
                <div className="map-start-point" style={{ left: `${START_POINT.x}%`, top: `${START_POINT.y}px` }} aria-hidden="true">
                  <span><Ship size={17} /></span>
                  <small>PUERTO INICIAL</small>
                </div>
                {orderedMissions.map((mission, index) => {
                  const status = getMissionStatus(mission);
                  const isBoss = mission.priority === "boss";
                  const isSelected = selectedMission?.id === mission.id;
                  const point = mapPoints[index];

                  return (
                    <div
                      key={mission.id}
                      className={`map-node-wrapper ${status} ${isBoss ? "boss" : ""} ${isSelected ? "selected" : ""}`}
                      style={{
                        left: `${point.x}%`,
                        top: `${point.y}px`,
                      }}
                    >
                      <button
                        type="button"
                        className="map-circle-node"
                        onClick={() => setSelectedId(mission.id)}
                        aria-label={`${formatLongDate(mission.date)}. ${mission.title} · ${mission.subject}. ${statusMeta[status].label}`}
                        aria-pressed={isSelected}
                      >
                        <span className="node-date-num">
                          {new Date(`${mission.date}T12:00:00`).getDate()}
                        </span>
                        <span className="node-date-month">
                          {new Intl.DateTimeFormat("es-CO", { month: "short" }).format(new Date(`${mission.date}T12:00:00`))}
                        </span>

                        <div className={`node-tooltip ${point.x > 50 ? "tooltip-left" : "tooltip-right"}`} role="tooltip">
                          <span className="tooltip-kicker">
                            {isBoss ? "🏰 FORTALEZA DE JEFES" : priorityMeta[mission.priority].label.toUpperCase()}
                          </span>
                          <strong className="tooltip-title">{mission.title} · {mission.subject}</strong>
                          <span className={`tooltip-status ${status}`}><i />{statusMeta[status].label}</span>
                          <span className="tooltip-meta">
                            <Clock3 size={11} />
                            {isProgressMission(mission)
                              ? `${formatProgressDuration(getMissionProgress(mission).completedMinutes)} de ${formatProgressDuration(getMissionProgress(mission).goalMinutes)}`
                              : formatTime12Hour(mission.time)}
                          </span>
                          <span className="tooltip-xp">+{getMissionXp(mission)} XP</span>
                        </div>
                      </button>
                    </div>
                  );
                })}

                {/* Final Treasure Spot */}
                <div
                  className="treasure-spot clean-treasure-spot"
                  style={{
                    left: `${treasurePoint.x}%`,
                    top: `${treasurePoint.y}px`,
                  }}
                  aria-hidden="true"
                >
                  <div className="x-marks-the-spot">
                    <span className="x-mark">✦</span>
                    <span className="treasure-chest-glow">
                      <Castle size={24} />
                    </span>
                  </div>
                  <strong>FORTALEZA FINAL</strong>
                  <small>{remainingMissions ? `${remainingMissions} ${remainingMissions === 1 ? "victoria pendiente" : "victorias pendientes"}` : "Tesoro desbloqueado"}</small>
                </div>
              </div>
            </div>
          ) : (
            <div className="map-empty-state">
              <MapPinned size={48} />
              <h2>Carta Náutica sin Trazar</h2>
              <p>Crea tu primera misión para desplegar los círculos de la ruta en este pergamino.</p>
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
                  <small>CONTRATO DE AVENTURA</small>
                  <strong>{priorityMeta[selectedMission.priority].label}</strong>
                </div>
                <b className="sheet-rank">{selectedMission.priority === "boss" ? "JEFE" : selectedMission.priority === "important" ? "RANGO A" : "RANGO B"}</b>
              </div>
              <div className="sheet-content">
                <span className={`status-pill ${getMissionStatus(selectedMission)}`}><i />{statusMeta[getMissionStatus(selectedMission)].label}</span>
                <h2>{selectedMission.title}</h2>
                <p className="sheet-subject">Territorio: {selectedMission.subject}</p>
                <div className="sheet-reward">
                  <Sparkles size={17} />
                  <span><small>BOTÍN DE XP</small><strong>+{getMissionXp(selectedMission)} XP</strong></span>
                </div>
                <dl className="objective-stats">
                  <div><dt>Fecha</dt><dd>{formatLongDate(selectedMission.date)}</dd></div>
                  <div><dt>{isProgressMission(selectedMission) ? "Meta" : "Hora"}</dt><dd><Clock3 size={12} /> {isProgressMission(selectedMission) ? formatProgressDuration(selectedMission.progressGoalMinutes ?? 0) : formatTime12Hour(selectedMission.time)}</dd></div>
                  {!isProgressMission(selectedMission) && <div><dt>Impacto</dt><dd>{selectedMission.weight !== undefined ? `${selectedMission.weight}%` : "Sin definir"}</dd></div>}
                  <div><dt>Nota</dt><dd>{selectedMission.grade?.trim() || "Pendiente"}</dd></div>
                </dl>
                {isProgressMission(selectedMission) && <MissionProgress mission={selectedMission} onAdd={(minutes) => onAddProgress(selectedMission.id, minutes)} onStartTimer={() => onStartTimer(selectedMission)} timerActive={activeTimerMissionId === selectedMission.id} />}
                {selectedMission.notes && <div className="objective-clue"><small>PISTA EN EL PERGAMINO</small><p>{selectedMission.notes}</p></div>}
                {!isProgressMission(selectedMission) && (
                  <div className="sheet-status-actions" aria-label={`Cambiar estado de ${selectedMission.title}`}>
                    <button type="button" className={getMissionStatus(selectedMission) === "pending" ? "active" : ""} onClick={() => onStatusChange(selectedMission.id, "pending")}><Flag size={14} /> Pendiente</button>
                    <button type="button" className={getMissionStatus(selectedMission) === "submitted" ? "active" : ""} onClick={() => onStatusChange(selectedMission.id, "submitted")}><FileCheck2 size={14} /> Entregada</button>
                    <button type="button" className={getMissionStatus(selectedMission) === "completed" ? "active" : ""} onClick={() => onStatusChange(selectedMission.id, "completed")}><Check size={14} /> Cumplida</button>
                  </div>
                )}
                <button className="open-objective-button" type="button" disabled={getMissionStatus(selectedMission) === "failed"} onClick={() => onEdit(selectedMission)}>
                  {getMissionStatus(selectedMission) === "failed" ? "Trabajo vencido y bloqueado" : <>Abrir ficha completa <ChevronRight size={15} /></>}
                </button>
              </div>
            </>
          ) : (
            <div className="sheet-placeholder">
              <ScrollText size={36} />
              <h2>Selecciona un Destino</h2>
              <p>Toca o pasa el cursor sobre cualquiera de los círculos del mapa para inspeccionarlo.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
