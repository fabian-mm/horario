"use client";

import { useMemo } from "react";
import { BookOpen, Check, ChevronRight, CircleDot, Clock3, Crown, FileCheck2, Flag, GraduationCap, NotebookPen, Plus, ScrollText, Trophy } from "lucide-react";
import { calculateSubjectAverage, getMissionStatus, getMissionXp, Mission, MissionStatus, statusMeta } from "@/lib/missions";

type Props = {
  missions: Mission[];
  selectedSubject: string | null;
  onSelectSubject: (subject: string) => void;
  onEdit: (mission: Mission) => void;
  onAdd: (subject?: string) => void;
  onStatusChange: (id: string, status: MissionStatus) => void;
};

const subjectIcon = (index: number) => [BookOpen, GraduationCap, ScrollText, NotebookPen][index % 4];
const taskDateFormatter = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", year: "numeric" });

export function WorldMissions({ missions, selectedSubject, onSelectSubject, onEdit, onAdd, onStatusChange }: Props) {
  const subjectGroups = useMemo(() => {
    const grouped = new Map<string, Mission[]>();
    missions.forEach((mission) => {
      const subjectMissions = grouped.get(mission.subject);
      if (subjectMissions) subjectMissions.push(mission);
      else grouped.set(mission.subject, [mission]);
    });
    grouped.forEach((tasks, subject) => grouped.set(subject, [...tasks].sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`))));
    return grouped;
  }, [missions]);
  const subjects = useMemo(() => Array.from(subjectGroups.keys()).sort((a, b) => a.localeCompare(b, "es")), [subjectGroups]);
  const subjectTasks = selectedSubject ? subjectGroups.get(selectedSubject) ?? [] : [];
  const pendingCount = subjectTasks.filter((mission) => getMissionStatus(mission) === "pending").length;
  const impact = subjectTasks.reduce((sum, mission) => sum + (mission.weight ?? 0), 0);
  const selectedAverage = calculateSubjectAverage(subjectTasks);
  const selectedCompleted = subjectTasks.filter((mission) => getMissionStatus(mission) === "completed").length;
  const selectedProgress = subjectTasks.length ? Math.round((selectedCompleted / subjectTasks.length) * 100) : 0;
  const worldStats = useMemo(() => missions.reduce((stats, mission) => {
    const completed = getMissionStatus(mission) === "completed";
    if (completed) stats.completed += 1;
    if (mission.priority === "boss") {
      stats.bosses += 1;
      if (completed) stats.bossesDefeated += 1;
    }
    return stats;
  }, { bosses: 0, bossesDefeated: 0, completed: 0 }), [missions]);

  return (
    <div className="world-layout">
      <section className="world-main">
        <div className="world-heading">
          <div><span className="eyebrow">TERRITORIOS DEL SEMESTRE</span><h1>Misiones de <i>Mundo</i></h1><p>Explora cada materia y consulta las tareas de ese territorio.</p></div>
          <button className="primary-button compact" onClick={() => onAdd(selectedSubject ?? undefined)}><Plus size={18} /> Nueva tarea</button>
        </div>

        <div className="subject-bar" aria-label="Materias">
          {subjects.map((subject, index) => {
            const Icon = subjectIcon(index);
            const tasks = subjectGroups.get(subject) ?? [];
            const pending = tasks.filter((mission) => getMissionStatus(mission) === "pending").length;
            const completed = tasks.filter((mission) => getMissionStatus(mission) === "completed").length;
            const territoryProgress = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
            const result = calculateSubjectAverage(tasks);
            return (
              <button key={subject} className={selectedSubject === subject ? "active" : ""} onClick={() => onSelectSubject(subject)}>
                <span className="subject-icon"><Icon size={18} /><i>{index + 1}</i></span>
                <span><strong>{subject}</strong><small>{tasks.length} misiones · {pending} pendientes</small><span className="territory-progress"><i style={{ width: `${territoryProgress}%` }} /></span></span>
                <span className={`subject-average ${result.average === null ? "empty" : ""}`}>
                  <strong>{result.average === null ? "—" : result.average.toFixed(2)}</strong>
                  <small>{result.average === null ? "Sin notas" : `${result.coverage}% evaluado`}</small>
                </span>
                <ChevronRight size={16} />
              </button>
            );
          })}
          {!subjects.length && <div className="no-subjects"><BookOpen size={25} /><span>Aún no hay materias registradas.</span></div>}
        </div>

        <div className="world-map-panel">
          <div className="world-decoration">✣</div>
          <span className="eyebrow">CÓMO FUNCIONA</span>
          <h2>Elige un territorio para abrir su diario</h2>
          <p>Cada materia reúne sus entregas, notas y porcentaje de impacto en un solo lugar. Puedes cambiar el estado de una tarea directamente desde el panel.</p>
          <div className="status-guide">
            {(Object.keys(statusMeta) as MissionStatus[]).map((status) => <span key={status} className={status}><i />{statusMeta[status].label}</span>)}
          </div>
          <div className="world-game-stats"><span><Trophy size={15} /><b>{worldStats.completed}</b> victorias</span><span><Crown size={15} /><b>{worldStats.bossesDefeated}/{worldStats.bosses}</b> jefes</span></div>
        </div>
      </section>

      <aside className={`task-drawer ${selectedSubject ? "visible" : ""}`}>
        {selectedSubject ? (
          <>
            <div className="drawer-heading">
              <span className="eyebrow">DIARIO DE MISIONES</span>
              <h2>{selectedSubject}</h2>
              <div className="drawer-stats"><span><Flag size={14} /> {pendingCount} pendientes</span><span><CircleDot size={14} /> {impact}% registrado</span></div>
              <div className="territory-rank"><span><small>PROGRESO DEL TERRITORIO</small><b>{selectedProgress}%</b></span><div><i style={{ width: `${selectedProgress}%` }} /></div></div>
              <div className={`average-summary ${selectedAverage.average === null ? "empty" : ""}`}>
                <div><small>Promedio ponderado</small><strong>{selectedAverage.average === null ? "Sin notas" : selectedAverage.average.toFixed(2)}</strong></div>
                <div className="average-coverage"><span><i style={{ width: `${Math.min(selectedAverage.coverage, 100)}%` }} /></span><small>{selectedAverage.coverage}% con nota · {selectedAverage.gradedTasks} tareas</small></div>
              </div>
            </div>
            <div className="drawer-list">
              {subjectTasks.map((mission) => {
                const status = getMissionStatus(mission);
                return (
                  <article key={mission.id} className={`world-task ${status}`}>
                    <div className="task-topline"><span className={`status-pill ${status}`}><i />{statusMeta[status].label}</span><span className="task-reward">+{getMissionXp(mission)} XP</span><time><Clock3 size={12} />{taskDateFormatter.format(new Date(`${mission.date}T12:00:00`))}</time></div>
                    <button className="task-title" onClick={() => onEdit(mission)}><h3>{mission.title}</h3><ChevronRight size={16} /></button>
                    {(mission.notes || mission.grade || mission.weight) && (
                      <div className="task-details">
                        {mission.notes && <p>{mission.notes}</p>}
                        <div>{mission.grade && <span><strong>{mission.grade}</strong> Nota</span>}{mission.weight !== undefined && <span><strong>{mission.weight}%</strong> Impacto</span>}</div>
                      </div>
                    )}
                    <div className="task-status-actions" aria-label={`Cambiar estado de ${mission.title}`}>
                      <button className={status === "pending" ? "active" : ""} onClick={() => onStatusChange(mission.id, "pending")} title="Marcar pendiente"><Flag size={14} /></button>
                      <button className={status === "submitted" ? "active" : ""} onClick={() => onStatusChange(mission.id, "submitted")} title="Marcar entregada"><FileCheck2 size={14} /></button>
                      <button className={status === "completed" ? "active" : ""} onClick={() => onStatusChange(mission.id, "completed")} title="Marcar cumplida"><Check size={14} /></button>
                    </div>
                  </article>
                );
              })}
              {!subjectTasks.length && <div className="drawer-empty"><BookOpen size={28} /><h3>Territorio despejado</h3><p>No hay tareas en esta materia.</p><button onClick={() => onAdd(selectedSubject)}>Crear la primera</button></div>}
            </div>
            <button className="drawer-add" onClick={() => onAdd(selectedSubject)}><Plus size={17} /> Agregar tarea en {selectedSubject}</button>
          </>
        ) : (
          <div className="drawer-placeholder"><BookOpen size={34} /><h2>Selecciona una materia</h2><p>Su lista de tareas aparecerá aquí, ordenada de la más reciente a la más antigua.</p></div>
        )}
      </aside>
    </div>
  );
}
