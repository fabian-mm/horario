"use client";

import { FormEvent, useMemo, useState } from "react";
import { BookOpen, Check, ChevronRight, CircleDot, Clock3, FileCheck2, Flag, GraduationCap, NotebookPen, Pencil, Plus, ScrollText, Trash2, X } from "lucide-react";
import { calculateSubjectAverage, getMissionStatus, getMissionXp, Mission, MissionStatus, sortMissionsByDateTime, statusMeta } from "@/lib/missions";
import { isProgressMission } from "@/lib/missions";
import { MissionProgress } from "@/components/mission-progress";
import type { Subject } from "@/lib/subjects";
import type { WeeklyQuest } from "@/lib/schedule";

type Props = {
  subjects: Subject[];
  missions: Mission[];
  weeklyQuests: WeeklyQuest[];
  selectedSubject: string | null;
  onSelectSubject: (subject: string) => void;
  onEdit: (mission: Mission) => void;
  onAdd: (subject?: string) => void;
  onStatusChange: (id: string, status: MissionStatus) => void;
  onAddProgress: (id: string, minutes: 30 | 60) => void;
  onSaveSubject: (subject: Subject) => void;
  onDeleteSubject: (id: string) => void;
};

const subjectIcon = (index: number) => [BookOpen, GraduationCap, ScrollText, NotebookPen][index % 4];
const taskDateFormatter = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", year: "numeric" });

export function WorldMissions({ subjects, missions, weeklyQuests, selectedSubject, onSelectSubject, onEdit, onAdd, onStatusChange, onAddProgress, onSaveSubject, onDeleteSubject }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [subjectName, setSubjectName] = useState("");
  const openSubject = (subject?: Subject) => { setEditingSubject(subject ?? null); setSubjectName(subject?.name ?? ""); setModalOpen(true); };
  const saveSubject = (event: FormEvent) => { event.preventDefault(); onSaveSubject({ ...editingSubject, id: editingSubject?.id ?? crypto.randomUUID(), name: subjectName.trim() }); setModalOpen(false); };
  const usageBySubjectId = useMemo(() => {
    const usage = new Map(subjects.map((subject) => [subject.id, 0]));
    const idByName = new Map<string, string>();
    subjects.forEach((subject) => {
      idByName.set(subject.name, subject.id);
      subject.aliases?.forEach((alias) => idByName.set(alias, subject.id));
    });
    const registerUsage = (subjectId?: string, subjectName?: string) => {
      const resolvedId = subjectId && usage.has(subjectId) ? subjectId : subjectName ? idByName.get(subjectName) : undefined;
      if (resolvedId) usage.set(resolvedId, (usage.get(resolvedId) ?? 0) + 1);
    };
    missions.forEach((mission) => registerUsage(mission.subjectId, mission.subject));
    weeklyQuests.forEach((week) => week.dailyMissions.forEach((activity) => registerUsage(activity.subjectId, activity.subject)));
    return usage;
  }, [missions, subjects, weeklyQuests]);
  const usageFor = (subject: Subject) => usageBySubjectId.get(subject.id) ?? 0;
  const subjectGroups = useMemo(() => {
    const grouped = new Map<string, Mission[]>();
    subjects.forEach((subject) => grouped.set(subject.name, []));
    missions.forEach((mission) => {
      const subjectMissions = grouped.get(mission.subject);
      if (subjectMissions) subjectMissions.push(mission);
      else grouped.set(mission.subject, [mission]);
    });
    grouped.forEach((tasks, subject) => grouped.set(subject, sortMissionsByDateTime(tasks)));
    return grouped;
  }, [missions, subjects]);
  const displaySubjects = useMemo(() => Array.from(subjectGroups.keys()).sort((a, b) => a.localeCompare(b, "es")), [subjectGroups]);
  const subjectSummaries = useMemo(() => {
    const summaries = new Map<string, {
      tasks: Mission[];
      pending: number;
      impact: number;
      completed: number;
      progress: number;
      average: ReturnType<typeof calculateSubjectAverage>;
    }>();
    subjectGroups.forEach((tasks, subject) => {
      let pending = 0;
      let completed = 0;
      let impact = 0;
      tasks.forEach((mission) => {
        const status = getMissionStatus(mission);
        if (status === "pending") pending += 1;
        if (status === "completed") completed += 1;
        impact += mission.weight ?? 0;
      });
      summaries.set(subject, {
        tasks,
        pending,
        impact,
        completed,
        progress: tasks.length ? Math.round((completed / tasks.length) * 100) : 0,
        average: calculateSubjectAverage(tasks),
      });
    });
    return summaries;
  }, [subjectGroups]);
  const selectedSubjectRecord = subjects.find((subject) => subject.name === selectedSubject);
  const selectedSummary = selectedSubject ? subjectSummaries.get(selectedSubject) : undefined;
  const subjectTasks = selectedSummary?.tasks ?? [];
  const pendingCount = selectedSummary?.pending ?? 0;
  const impact = selectedSummary?.impact ?? 0;
  const selectedAverage = selectedSummary?.average ?? calculateSubjectAverage([]);
  const selectedProgress = selectedSummary?.progress ?? 0;
  return (
    <div className="world-layout">
      <section className="world-main">
        <div className="world-heading">
          <div><span className="eyebrow">TERRITORIOS DEL SEMESTRE</span><h1>Misiones de <i>Mundo</i></h1><p>Explora cada materia y consulta las tareas de ese territorio.</p></div>
          <div className="world-heading-actions"><button className="secondary-button compact" onClick={() => openSubject()}><Plus size={18} /> Nueva materia</button></div>
        </div>

        <div className="subject-bar" aria-label="Materias">
          {displaySubjects.map((subject, index) => {
            const Icon = subjectIcon(index);
            const summary = subjectSummaries.get(subject);
            const tasks = summary?.tasks ?? [];
            const pending = summary?.pending ?? 0;
            const territoryProgress = summary?.progress ?? 0;
            const result = summary?.average ?? calculateSubjectAverage([]);
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
          {!displaySubjects.length && <div className="no-subjects"><BookOpen size={25} /><span>Aún no hay materias registradas.</span></div>}
        </div>

        {!subjects.length && <div className="world-map-panel">
          <div className="world-decoration">✣</div>
          <span className="eyebrow">CÓMO FUNCIONA</span>
          <h2>Elige un territorio para abrir su diario</h2>
          <p>Cada materia reúne sus entregas, notas y porcentaje de impacto en un solo lugar. Puedes cambiar el estado de una tarea directamente desde el panel.</p>
          <div className="status-guide">
            {(Object.keys(statusMeta) as MissionStatus[]).map((status) => <span key={status} className={status}><i />{statusMeta[status].label}</span>)}
          </div>
        </div>}
      </section>

      <aside className={`task-drawer ${selectedSubject ? "visible" : ""}`}>
        {selectedSubject ? (
          <>
            <div className="drawer-heading">
              <span className="eyebrow">DIARIO DE MISIONES</span>
              <div className="drawer-title-actions"><h2>{selectedSubject}</h2>{selectedSubjectRecord && <span><button className="icon-button" onClick={() => openSubject(selectedSubjectRecord)} title="Editar materia"><Pencil size={15} /></button><button className="icon-button" disabled={usageFor(selectedSubjectRecord) > 0} onClick={() => onDeleteSubject(selectedSubjectRecord.id)} title={usageFor(selectedSubjectRecord) > 0 ? "La materia está en uso" : "Eliminar materia"}><Trash2 size={15} /></button></span>}</div>
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
                    <button className="task-title" onClick={() => onEdit(mission)}><h3>{mission.title} · {mission.subject}</h3><ChevronRight size={16} /></button>
                    {isProgressMission(mission) && <MissionProgress mission={mission} onAdd={(minutes) => onAddProgress(mission.id, minutes)} />}
                    {(mission.notes || mission.grade || mission.weight) && (
                      <div className="task-details">
                        {mission.notes && <p>{mission.notes}</p>}
                        <div>{mission.grade && <span><strong>{mission.grade}</strong> Nota</span>}{mission.weight !== undefined && <span><strong>{mission.weight}%</strong> Impacto</span>}</div>
                      </div>
                    )}
                    {!isProgressMission(mission) && <div className="task-status-actions" aria-label={`Cambiar estado de ${mission.title}`}>
                      <button className={status === "pending" ? "active" : ""} onClick={() => onStatusChange(mission.id, "pending")} title="Marcar pendiente"><Flag size={14} /></button>
                      <button className={status === "submitted" ? "active" : ""} onClick={() => onStatusChange(mission.id, "submitted")} title="Marcar entregada"><FileCheck2 size={14} /></button>
                      <button className={status === "completed" ? "active" : ""} onClick={() => onStatusChange(mission.id, "completed")} title="Marcar cumplida"><Check size={14} /></button>
                    </div>}
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
      {modalOpen && <div className="modal-backdrop" onMouseDown={() => setModalOpen(false)}><section className="mission-modal subject-modal" role="dialog" aria-modal="true" aria-labelledby="world-subject-title" onMouseDown={(event) => event.stopPropagation()}><div className="modal-heading"><div className="modal-icon"><ScrollText size={20} /></div><div><span className="eyebrow">CATÁLOGO GLOBAL</span><h2 id="world-subject-title">{editingSubject ? "Editar materia" : "Nueva materia"}</h2></div><button className="icon-button" type="button" onClick={() => setModalOpen(false)} aria-label="Cerrar"><X size={20} /></button></div><form onSubmit={saveSubject}><label>Nombre de la materia<input required autoFocus value={subjectName} onChange={(event) => setSubjectName(event.target.value)} placeholder="Ej. Cálculo diferencial" /></label><p className="subject-form-help">Esta materia quedará disponible en todas las clases y misiones.</p><div className="modal-actions"><span /><div><button type="button" className="secondary-button" onClick={() => setModalOpen(false)}>Cancelar</button><button type="submit" className="primary-button">Guardar materia</button></div></div></form></section></div>}
    </div>
  );
}
