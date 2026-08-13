"use client";

import { FormEvent, useMemo, useState } from "react";
import { BookOpen, Check, ChevronDown, ChevronRight, CircleDot, Clock3, FileCheck2, Flag, GraduationCap, NotebookPen, Pencil, Play, Plus, ScrollText, Target, Trash2, X } from "lucide-react";
import { calculateSubjectAverage, formatProgressDuration, getAvailableStudyMissions, getMissionProgress, getMissionStatus, getMissionXp, getSubjectStudyMinutes, getSubjectStudyMinutesForWeek, getSubjectWeeklyStudyHistory, Mission, MissionStatus, sortMissionsByDateTime, statusMeta } from "@/lib/missions";
import { isProgressMission } from "@/lib/missions";
import { MissionProgress } from "@/components/mission-progress";
import { getExpectedWeeklyStudyMinutes, type Subject } from "@/lib/subjects";
import type { WeeklyQuest } from "@/lib/schedule";
import { timeToMinutes } from "@/lib/time";

type Props = {
  subjects: Subject[];
  missions: Mission[];
  weeklyQuests: WeeklyQuest[];
  selectedSubject: string | null;
  onSelectSubject: (subject: string) => void;
  onEdit: (mission: Mission) => void;
  onAdd: (subject?: string) => void;
  onStatusChange: (id: string, status: MissionStatus) => void;
  onAddProgress: (id: string, minutes: number) => void;
  onStartTimer: (mission: Mission) => void;
  activeTimerMissionId?: string;
  onSaveSubject: (subject: Subject) => void;
  onDeleteSubject: (id: string) => void;
};

const subjectIcon = (index: number) => [BookOpen, GraduationCap, ScrollText, NotebookPen][index % 4];
const taskDateFormatter = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", year: "numeric" });
type WorldTaskFilter = "open" | "study" | "all";

export function WorldMissions({ subjects, missions, weeklyQuests, selectedSubject, onSelectSubject, onEdit, onAdd, onStatusChange, onAddProgress, onStartTimer, activeTimerMissionId, onSaveSubject, onDeleteSubject }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [selectedMissionId, setSelectedMissionId] = useState<string | null>(null);
  const [taskFilter, setTaskFilter] = useState<WorldTaskFilter>("open");
  const [subjectName, setSubjectName] = useState("");
  const [subjectCredits, setSubjectCredits] = useState(3);
  const openSubject = (subject?: Subject) => { setEditingSubject(subject ?? null); setSubjectName(subject?.name ?? ""); setSubjectCredits(subject?.credits ?? 3); setModalOpen(true); };
  const saveSubject = (event: FormEvent) => { event.preventDefault(); onSaveSubject({ ...editingSubject, id: editingSubject?.id ?? crypto.randomUUID(), name: subjectName.trim(), credits: subjectCredits }); setModalOpen(false); };
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
  const scheduledClassMinutesFor = (subjectName: string, subjectId?: string) => weeklyQuests.reduce((total, quest) => total + (quest.active ? quest.dailyMissions.reduce((subtotal, activity) => {
    const belongsToSubject = activity.subjectId ? activity.subjectId === subjectId : activity.subject === subjectName;
    if (!belongsToSubject || activity.activityCategory !== "class") return subtotal;
    const start = timeToMinutes(activity.startTime);
    const end = timeToMinutes(activity.endTime);
    return subtotal + (start !== null && end !== null ? Math.max(0, end - start) : 0);
  }, 0) : 0), 0);
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
      failed: number;
      studyMinutes: number;
      weeklyStudyMinutes: number;
      progress: number;
      average: ReturnType<typeof calculateSubjectAverage>;
    }>();
    subjectGroups.forEach((tasks, subject) => {
      let pending = 0;
      let completed = 0;
      let failed = 0;
      let impact = 0;
      tasks.forEach((mission) => {
        const status = getMissionStatus(mission);
        if (status === "pending") pending += 1;
        if (status === "completed") completed += 1;
        if (status === "failed") failed += 1;
        if (!isProgressMission(mission)) impact += mission.weight ?? 0;
      });
      summaries.set(subject, {
        tasks,
        pending,
        impact,
        completed,
        failed,
        studyMinutes: getSubjectStudyMinutes(tasks),
        weeklyStudyMinutes: getSubjectStudyMinutesForWeek(tasks),
        progress: tasks.length ? Math.round((completed / tasks.length) * 100) : 0,
        average: calculateSubjectAverage(tasks),
      });
    });
    return summaries;
  }, [subjectGroups]);
  const selectedSubjectRecord = subjects.find((subject) => subject.name === selectedSubject);
  const selectedSummary = selectedSubject ? subjectSummaries.get(selectedSubject) : undefined;
  const subjectTasks = selectedSummary?.tasks ?? [];
  const visibleSubjectTasks = subjectTasks.filter((mission) => {
    const status = getMissionStatus(mission);
    if (taskFilter === "open") return status === "pending" || status === "submitted";
    if (taskFilter === "study") return isProgressMission(mission) && status === "pending";
    return true;
  });
  const selectedMission = visibleSubjectTasks.find((mission) => mission.id === selectedMissionId)
    ?? visibleSubjectTasks.find((mission) => mission.id === activeTimerMissionId)
    ?? visibleSubjectTasks[0]
    ?? null;
  const pendingCount = selectedSummary?.pending ?? 0;
  const impact = selectedSummary?.impact ?? 0;
  const selectedAverage = selectedSummary?.average ?? calculateSubjectAverage([]);
  const selectedProgress = selectedSummary?.progress ?? 0;
  const selectedStudyMinutes = selectedSummary?.studyMinutes ?? 0;
  const selectedFailed = selectedSummary?.failed ?? 0;
  const selectedWeeklyStudyMinutes = selectedSummary?.weeklyStudyMinutes ?? 0;
  const availableStudyMissions = useMemo(() => getAvailableStudyMissions(missions), [missions]);
  const quickStudyMission = availableStudyMissions.find((mission) => mission.id === activeTimerMissionId) ?? availableStudyMissions[0] ?? null;
  const quickStudyProgress = quickStudyMission ? getMissionProgress(quickStudyMission) : null;
  const semesterStart = useMemo(() => {
    const scheduleStart = weeklyQuests.map((quest) => quest.startDate).sort()[0];
    const missionStart = missions.map((mission) => mission.date).sort()[0];
    return scheduleStart ?? missionStart ?? new Date().toISOString().slice(0, 10);
  }, [missions, weeklyQuests]);
  const selectedScheduledClassMinutes = selectedSubject ? scheduledClassMinutesFor(selectedSubject, selectedSubjectRecord?.id) : 0;
  const selectedCredits = selectedSubjectRecord?.credits ?? 3;
  const selectedTotalWeeklyLoadMinutes = Math.round(selectedCredits * 180);
  const selectedWeeklyGoalMinutes = getExpectedWeeklyStudyMinutes(selectedCredits, selectedScheduledClassMinutes);
  const selectedTrackingStartDate = selectedSubjectRecord?.weeklyStudyTrackingStartDate ?? new Date().toISOString().slice(0, 10);
  const selectedStudyHistory = getSubjectWeeklyStudyHistory(
    subjectTasks,
    semesterStart,
    selectedWeeklyGoalMinutes,
    new Date(),
    selectedTrackingStartDate,
  );
  const selectedWeeklyPercentage = selectedWeeklyGoalMinutes ? Math.min(100, Math.round((selectedWeeklyStudyMinutes / selectedWeeklyGoalMinutes) * 100)) : 0;
  const selectSubject = (subject: string) => {
    setSelectedMissionId(null);
    onSelectSubject(subject);
  };
  const openQuickStudyMission = (mission: Mission) => {
    setTaskFilter("study");
    setSelectedMissionId(mission.id);
    onSelectSubject(mission.subject);
  };
  return (
    <div className="world-layout world-hub">
      <section className="world-main">
        <div className="world-heading">
          <div><span className="eyebrow">CENTRO DE MATERIAS</span><h1>Misiones de <i>Mundo</i></h1><p>Encuentra una materia, elige una tarea y trabaja en ella sin perder el contexto.</p></div>
          <div className="world-heading-actions"><button className="secondary-button compact" onClick={() => openSubject()}><Plus size={18} /> Nueva materia</button></div>
        </div>

        {quickStudyMission && quickStudyProgress ? <section className="world-quick-start" aria-label="Continuar una tarea de estudio">
          <span className="world-quick-icon"><Target size={19} /></span>
          <div className="world-quick-copy"><small>{activeTimerMissionId === quickStudyMission.id ? "SESIÓN EN CURSO" : "CONTINUAR ESTUDIO"}</small><strong>{quickStudyMission.title}</strong><p>{quickStudyMission.subject} · {formatProgressDuration(quickStudyProgress.goalMinutes - quickStudyProgress.completedMinutes)} restantes</p></div>
          <div className="world-quick-progress"><span><i style={{ width: `${quickStudyProgress.percentage}%` }} /></span><b>{quickStudyProgress.percentage}%</b></div>
          <button type="button" className="world-quick-view" onClick={() => openQuickStudyMission(quickStudyMission)}>Ver tarea</button>
          <button type="button" className="world-quick-timer" disabled={Boolean(activeTimerMissionId)} onClick={() => onStartTimer(quickStudyMission)}><Play size={16} />{activeTimerMissionId === quickStudyMission.id ? "Cronómetro activo" : "Iniciar cronómetro"}</button>
        </section> : <section className="world-quick-start empty" aria-label="Crear una tarea de estudio"><span className="world-quick-icon"><Clock3 size={19} /></span><div className="world-quick-copy"><small>TIEMPO DE ESTUDIO</small><strong>No hay metas por horas pendientes</strong><p>Crea una tarea de estudio y podrás iniciar el cronómetro desde aquí.</p></div><button type="button" className="world-quick-timer" onClick={() => onAdd(selectedSubject ?? undefined)}><Plus size={16} /> Crear tarea</button></section>}

        <div className="subject-bar" aria-label="Materias">
          {displaySubjects.map((subject, index) => {
            const Icon = subjectIcon(index);
            const summary = subjectSummaries.get(subject);
            const tasks = summary?.tasks ?? [];
            const pending = summary?.pending ?? 0;
            const territoryProgress = summary?.progress ?? 0;
            const result = summary?.average ?? calculateSubjectAverage([]);
            const weeklyStudyMinutes = summary?.weeklyStudyMinutes ?? 0;
            const subjectRecord = subjects.find((item) => item.name === subject);
            const expectedWeeklyMinutes = getExpectedWeeklyStudyMinutes(subjectRecord?.credits ?? 3, scheduledClassMinutesFor(subject, subjectRecord?.id));
            return <button key={subject} className={selectedSubject === subject ? "active" : ""} onClick={() => selectSubject(subject)}>
              <span className="subject-icon"><Icon size={18} /><i>{index + 1}</i></span>
              <span><strong>{subject}</strong><small>{tasks.length} {tasks.length === 1 ? "tarea" : "tareas"} · {pending} pendientes</small><small className="subject-study-time"><Clock3 size={11} /> {formatProgressDuration(weeklyStudyMinutes)} / {formatProgressDuration(expectedWeeklyMinutes)} esta semana</small><span className="territory-progress"><i style={{ width: `${territoryProgress}%` }} /></span></span>
              <span className={`subject-average ${result.average === null ? "empty" : ""}`}><strong>{result.average === null ? "—" : result.average.toFixed(2)}</strong><small>{result.average === null ? "Sin notas" : `${result.coverage}% evaluado`}</small></span>
              <ChevronRight size={16} />
            </button>;
          })}
          {!displaySubjects.length && <div className="no-subjects"><BookOpen size={25} /><span>Aún no hay materias registradas.</span></div>}
        </div>

        {!displaySubjects.length && <div className="world-map-panel"><div className="world-decoration">✣</div><span className="eyebrow">CÓMO FUNCIONA</span><h2>Crea tu primer territorio</h2><p>Cada materia reunirá sus entregas, horas de estudio, notas y progreso en un mismo lugar.</p><button className="primary-button" type="button" onClick={() => openSubject()}><Plus size={16} /> Crear materia</button></div>}

        {selectedSubject ? <section className="world-subject-shell">
          <header className="world-subject-heading">
            <div><span className="eyebrow">MATERIA ACTIVA</span><div className="world-subject-title"><h2>{selectedSubject}</h2>{selectedSubjectRecord && <span><button className="icon-button" onClick={() => openSubject(selectedSubjectRecord)} title="Editar materia"><Pencil size={15} /></button><button className="icon-button" disabled={usageFor(selectedSubjectRecord) > 0} onClick={() => onDeleteSubject(selectedSubjectRecord.id)} title={usageFor(selectedSubjectRecord) > 0 ? "La materia está en uso" : "Eliminar materia"}><Trash2 size={15} /></button></span>}</div><p>{selectedCredits} créditos · {formatProgressDuration(selectedScheduledClassMinutes)} de clase por semana</p></div>
            <button type="button" className="world-add-task" onClick={() => onAdd(selectedSubject)}><Plus size={17} /> Nueva tarea</button>
          </header>

          <div className="world-subject-metrics">
            <article className="weekly"><span><Clock3 size={16} />ESTUDIO ESTA SEMANA</span><strong>{formatProgressDuration(selectedWeeklyStudyMinutes)} <small>/ {formatProgressDuration(selectedWeeklyGoalMinutes)}</small></strong><div><i style={{ width: `${selectedWeeklyPercentage}%` }} /></div><p>{selectedWeeklyPercentage}% de la meta</p></article>
            <article><span><Flag size={16} />TAREAS ABIERTAS</span><strong>{pendingCount}</strong><p>{selectedFailed ? `${selectedFailed} vencidas` : "Sin tareas vencidas"}</p></article>
            <article><span><CircleDot size={16} />PROMEDIO</span><strong>{selectedAverage.average === null ? "—" : selectedAverage.average.toFixed(2)}</strong><p>{selectedAverage.average === null ? "Aún sin notas" : `${selectedAverage.coverage}% evaluado`}</p></article>
            <article><span><Target size={16} />PROGRESO</span><strong>{selectedProgress}%</strong><p>{formatProgressDuration(selectedStudyMinutes)} estudiados · {impact}% evaluable</p></article>
          </div>

          <div className="world-mission-workspace">
            <aside className="world-mission-queue">
              <div className="world-queue-heading"><div><span>TAREAS DE LA MATERIA</span><strong>Elige en qué trabajar</strong></div><button type="button" onClick={() => onAdd(selectedSubject)} aria-label={`Agregar tarea en ${selectedSubject}`}><Plus size={16} /></button></div>
              <div className="world-task-filters" aria-label="Filtrar tareas">
                {([{ id: "open", label: "Abiertas" }, { id: "study", label: "Estudio" }, { id: "all", label: "Todas" }] as { id: WorldTaskFilter; label: string }[]).map((filter) => <button key={filter.id} type="button" className={taskFilter === filter.id ? "active" : ""} onClick={() => { setTaskFilter(filter.id); setSelectedMissionId(null); }}>{filter.label}</button>)}
              </div>
              <div className="world-task-list">
                {visibleSubjectTasks.map((mission) => {
                  const status = getMissionStatus(mission);
                  const progress = isProgressMission(mission) ? getMissionProgress(mission) : null;
                  return <button key={mission.id} type="button" className={`${selectedMission?.id === mission.id ? "active" : ""} ${status}`} onClick={() => setSelectedMissionId(mission.id)}>
                    <span className={`world-task-status ${status}`}><i />{statusMeta[status].label}</span>
                    <strong>{mission.title}</strong>
                    <small><Clock3 size={11} />{taskDateFormatter.format(new Date(`${mission.date}T12:00:00`))}</small>
                    <span className="world-task-queue-meta">{progress ? `${formatProgressDuration(progress.goalMinutes - progress.completedMinutes)} restantes` : mission.grade ? `Nota ${mission.grade}` : mission.weight !== undefined ? `${mission.weight}% de impacto` : `+${getMissionXp(mission)} XP`}</span>
                    {activeTimerMissionId === mission.id && <b>EN CURSO</b>}
                  </button>;
                })}
                {!visibleSubjectTasks.length && <div className="world-queue-empty"><BookOpen size={24} /><strong>{subjectTasks.length ? "No hay tareas en este filtro" : "Aún no hay tareas"}</strong><p>{subjectTasks.length ? "Prueba con Todas para consultar el historial." : "Crea una tarea para empezar a organizar la materia."}</p>{!subjectTasks.length && <button type="button" onClick={() => onAdd(selectedSubject)}>Crear tarea</button>}</div>}
              </div>
            </aside>

            <section className="world-mission-focus" aria-live="polite">
              {selectedMission ? (() => {
                const status = getMissionStatus(selectedMission);
                const progressMission = isProgressMission(selectedMission);
                return <article className={`world-mission-detail-card ${status}`}>
                  <div className="world-detail-topline"><span className={`status-pill ${status}`}><i />{statusMeta[status].label}</span><span>+{getMissionXp(selectedMission)} XP</span><time><Clock3 size={12} />{taskDateFormatter.format(new Date(`${selectedMission.date}T12:00:00`))}</time></div>
                  <div className="world-detail-title"><div><small>{progressMission ? "META DE ESTUDIO" : "ENTREGA ACADÉMICA"}</small><h3>{selectedMission.title}</h3><p>{selectedMission.subject}</p></div><button type="button" disabled={status === "failed"} onClick={() => onEdit(selectedMission)}><Pencil size={15} />{status === "failed" ? "Vencida" : "Editar tarea"}</button></div>
                  {progressMission && <div className="world-detail-progress"><MissionProgress mission={selectedMission} onAdd={(minutes) => onAddProgress(selectedMission.id, minutes)} onStartTimer={() => onStartTimer(selectedMission)} timerActive={activeTimerMissionId === selectedMission.id} timerBlocked={Boolean(activeTimerMissionId && activeTimerMissionId !== selectedMission.id)} /></div>}
                  {!progressMission && <div className="world-evaluation-summary"><div><small>NOTA</small><strong>{selectedMission.grade ?? "—"}</strong></div><div><small>IMPACTO</small><strong>{selectedMission.weight !== undefined ? `${selectedMission.weight}%` : "—"}</strong></div></div>}
                  {selectedMission.notes && <div className="world-detail-notes"><span>NOTAS</span><p>{selectedMission.notes}</p></div>}
                  {!progressMission && status !== "failed" && <div className="world-detail-status-actions" aria-label={`Cambiar estado de ${selectedMission.title}`}><button className={status === "pending" ? "active" : ""} onClick={() => onStatusChange(selectedMission.id, "pending")}><Flag size={15} />Pendiente</button><button className={status === "submitted" ? "active" : ""} onClick={() => onStatusChange(selectedMission.id, "submitted")}><FileCheck2 size={15} />Entregada</button><button className={status === "completed" ? "active" : ""} onClick={() => onStatusChange(selectedMission.id, "completed")}><Check size={15} />Cumplida</button></div>}
                </article>;
              })() : <div className="world-focus-empty"><BookOpen size={30} /><h3>{visibleSubjectTasks.length ? "Selecciona una tarea" : "Nada que mostrar aquí"}</h3><p>La tarea que elijas aparecerá en este espacio sin mover el resto de la pantalla.</p>{!subjectTasks.length && <button type="button" onClick={() => onAdd(selectedSubject)}><Plus size={15} /> Crear primera tarea</button>}</div>}
            </section>
          </div>

          <details className="world-history-panel">
            <summary><span><Clock3 size={18} /></span><div><small>RITMO DEL SEMESTRE</small><strong>Ver historial de estudio</strong></div><p>Esta semana: <b>{formatProgressDuration(selectedWeeklyStudyMinutes)}</b> de {formatProgressDuration(selectedWeeklyGoalMinutes)}</p><ChevronDown size={18} /></summary>
            <div className="world-history-content"><p className="weekly-study-calculation">{selectedCredits} créditos · {formatProgressDuration(selectedTotalWeeklyLoadMinutes)} de carga semanal · {formatProgressDuration(selectedScheduledClassMinutes)} en clases</p><div className="weekly-study-history-list">{[...selectedStudyHistory].reverse().map((week, index) => { const reached = week.tracked && week.minutes >= week.goalMinutes; const below = week.tracked && !week.current && !reached; return <article key={week.start} className={`${reached ? "reached" : below ? "below" : week.current ? "current" : "untracked"}`}><div><strong>{week.current ? "Esta semana" : `Semana ${selectedStudyHistory.length - index}`}</strong><small>{new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short" }).format(new Date(`${week.start}T12:00:00`))} – {new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short" }).format(new Date(`${week.end}T12:00:00`))}</small></div><div className="weekly-study-bar"><i style={{ width: `${week.percentage}%` }} /></div><span><strong>{week.tracked ? formatProgressDuration(week.minutes) : "Sin registro"}</strong><small>{week.tracked ? reached ? "Meta cumplida" : week.current ? `${week.percentage}% de la meta` : "Por debajo de la meta" : "Historial no disponible"}</small></span></article>; })}</div></div>
          </details>
        </section> : displaySubjects.length > 0 && <div className="world-select-prompt"><BookOpen size={34} /><h2>Selecciona una materia</h2><p>Verás sus tareas en una cola estable y podrás trabajar en una sin perder de vista las demás.</p></div>}
      </section>
      {modalOpen && <div className="modal-backdrop" onMouseDown={() => setModalOpen(false)}><section className="mission-modal subject-modal" role="dialog" aria-modal="true" aria-labelledby="world-subject-title" onMouseDown={(event) => event.stopPropagation()}><div className="modal-heading"><div className="modal-icon"><ScrollText size={20} /></div><div><span className="eyebrow">CATÁLOGO GLOBAL</span><h2 id="world-subject-title">{editingSubject ? "Editar materia" : "Nueva materia"}</h2></div><button className="icon-button" type="button" onClick={() => setModalOpen(false)} aria-label="Cerrar"><X size={20} /></button></div><form onSubmit={saveSubject}><label>Nombre de la materia<input required autoFocus value={subjectName} onChange={(event) => setSubjectName(event.target.value)} placeholder="Ej. Cálculo diferencial" /></label><label>Número de créditos<input required type="number" inputMode="decimal" min="0.5" max="30" step="0.5" value={subjectCredits} onChange={(event) => setSubjectCredits(Number(event.target.value))} /></label><p className="subject-form-help">Los créditos determinan la carga semanal esperada. Las horas de clase programadas se descuentan para calcular el trabajo autónomo.</p><div className="modal-actions"><span /><div><button type="button" className="secondary-button" onClick={() => setModalOpen(false)}>Cancelar</button><button type="submit" className="primary-button">Guardar materia</button></div></div></form></section></div>}
    </div>
  );
}
