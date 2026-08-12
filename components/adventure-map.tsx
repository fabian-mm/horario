"use client";

import { memo, useMemo, useState } from "react";
import { Check, ChevronRight, Clock3, Crown, FileCheck2, Flag, MapPinned, Plus, ScrollText, Sparkles, Swords } from "lucide-react";
import { formatLongDate, getMissionStatus, getMissionXp, Mission, MissionStatus, priorityMeta, statusMeta } from "@/lib/missions";

type Props = {
  missions: Mission[];
  onAdd: () => void;
  onEdit: (mission: Mission) => void;
  onStatusChange: (id: string, status: MissionStatus) => void;
};

const AdventureMapComponent = ({ missions, onAdd, onEdit, onStatusChange }: Props) => {
  const orderedMissions = useMemo(() => [...missions].sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`)), [missions]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedMission = orderedMissions.find((mission) => mission.id === selectedId) ?? orderedMissions.find((mission) => getMissionStatus(mission) !== "completed") ?? orderedMissions[0] ?? null;
  const completed = orderedMissions.filter((mission) => getMissionStatus(mission) === "completed").length;
  const bosses = orderedMissions.filter((mission) => mission.priority === "boss");
  const defeatedBosses = bosses.filter((mission) => getMissionStatus(mission) === "completed").length;
  const journeyProgress = orderedMissions.length ? Math.round((completed / orderedMissions.length) * 100) : 0;

  return (
    <div className="adventure-map-view">
      <header className="adventure-map-heading">
        <div><span className="eyebrow">RUTA DEL SEMESTRE</span><h1>Mapa de <i>Campaña</i></h1><p>Recorre la ruta, inspecciona cada objetivo y conquista las fortalezas finales.</p></div>
        <button className="primary-button compact" type="button" onClick={onAdd}><Plus size={18} /> Nueva misión</button>
      </header>

      <div className="map-expedition-hud" aria-label="Progreso del mapa">
        <span><MapPinned size={16} /><small>RUTA EXPLORADA</small><strong>{journeyProgress}%</strong></span>
        <span><ScrollText size={16} /><small>OBJETIVOS</small><strong>{orderedMissions.length}</strong></span>
        <span className="fortress-counter"><Crown size={16} /><small>FORTALEZAS</small><strong>{defeatedBosses}/{bosses.length}</strong></span>
        <div><span><i style={{ width: `${journeyProgress}%` }} /></span><small>{completed} objetivos conquistados</small></div>
      </div>

      <div className="adventure-map-grid">
        <section className="treasure-route" aria-label="Ruta cronológica de objetivos">
          <div className="map-sea-label sea-north" aria-hidden="true">MAR DE LOS APUNTES</div>
          <div className="map-sea-label sea-south" aria-hidden="true">GOLFO DE LOS EXÁMENES</div>
          <div className="map-compass" aria-hidden="true"><span>N</span><i>✣</i></div>
          {orderedMissions.length ? (
            <ol className="map-route-list">
              {orderedMissions.map((mission, index) => {
                const status = getMissionStatus(mission);
                const isBoss = mission.priority === "boss";
                return (
                  <li key={mission.id} className={`map-route-item ${status} ${isBoss ? "boss" : ""} ${selectedMission?.id === mission.id ? "selected" : ""}`}>
                    <button className="route-objective" type="button" onClick={() => setSelectedId(mission.id)} aria-pressed={selectedMission?.id === mission.id}>
                      <span className="route-date"><strong>{new Date(`${mission.date}T12:00:00`).getDate()}</strong><small>{new Intl.DateTimeFormat("es-CO", { month: "short" }).format(new Date(`${mission.date}T12:00:00`))}</small></span>
                      <span className="route-copy"><small>{isBoss ? "FORTALEZA FINAL" : priorityMeta[mission.priority].label.toUpperCase()}</small><strong>{mission.title}</strong><span>{mission.subject} · {mission.time}</span></span>
                      <ChevronRight size={16} />
                    </button>
                    <span className="route-marker" aria-hidden="true"><i>{isBoss ? <Swords size={17} /> : index + 1}</i></span>
                  </li>
                );
              })}
              <li className="route-treasure" aria-hidden="true"><span>✦</span><strong>TESORO DEL SEMESTRE</strong></li>
            </ol>
          ) : (
            <div className="map-empty-state"><MapPinned size={38} /><h2>La ruta aún no ha sido trazada</h2><p>Crea una misión y aparecerá como el primer destino de tu mapa.</p><button type="button" onClick={onAdd}>Trazar primer objetivo</button></div>
          )}
        </section>

        <aside className={`map-objective-sheet ${selectedMission?.priority ?? ""}`} aria-live="polite">
          {selectedMission ? (
            <>
              <div className="sheet-banner"><span>{selectedMission.priority === "boss" ? <Swords size={19} /> : <Flag size={19} />}</span><div><small>OBJETIVO SELECCIONADO</small><strong>{priorityMeta[selectedMission.priority].label}</strong></div></div>
              <div className="sheet-content">
                <span className={`status-pill ${getMissionStatus(selectedMission)}`}><i />{statusMeta[getMissionStatus(selectedMission)].label}</span>
                <h2>{selectedMission.title}</h2>
                <p className="sheet-subject">{selectedMission.subject}</p>
                <div className="sheet-reward"><Sparkles size={17} /><span><small>RECOMPENSA</small><strong>+{getMissionXp(selectedMission)} XP</strong></span></div>
                <dl className="objective-stats">
                  <div><dt>Fecha</dt><dd>{formatLongDate(selectedMission.date)}</dd></div>
                  <div><dt>Hora</dt><dd><Clock3 size={12} /> {selectedMission.time}</dd></div>
                  <div><dt>Impacto</dt><dd>{selectedMission.weight !== undefined ? `${selectedMission.weight}%` : "Sin definir"}</dd></div>
                  <div><dt>Nota</dt><dd>{selectedMission.grade?.trim() || "Pendiente"}</dd></div>
                </dl>
                {selectedMission.notes && <div className="objective-clue"><small>PISTA / NOTAS</small><p>{selectedMission.notes}</p></div>}
                <div className="sheet-status-actions" aria-label={`Cambiar estado de ${selectedMission.title}`}>
                  <button type="button" className={getMissionStatus(selectedMission) === "pending" ? "active" : ""} onClick={() => onStatusChange(selectedMission.id, "pending")}><Flag size={14} /> Pendiente</button>
                  <button type="button" className={getMissionStatus(selectedMission) === "submitted" ? "active" : ""} onClick={() => onStatusChange(selectedMission.id, "submitted")}><FileCheck2 size={14} /> Entregada</button>
                  <button type="button" className={getMissionStatus(selectedMission) === "completed" ? "active" : ""} onClick={() => onStatusChange(selectedMission.id, "completed")}><Check size={14} /> Cumplida</button>
                </div>
                <button className="open-objective-button" type="button" onClick={() => onEdit(selectedMission)}>Abrir ficha completa <ChevronRight size={15} /></button>
              </div>
            </>
          ) : <div className="sheet-placeholder"><MapPinned size={32} /><h2>Selecciona un destino</h2><p>La información del objetivo aparecerá en este pergamino.</p></div>}
        </aside>
      </div>
    </div>
  );
};

export const AdventureMap = memo(AdventureMapComponent);
