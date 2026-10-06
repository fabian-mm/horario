"use client";
import { useState } from "react";
import { semesterWeeks } from "@/lib/semester";
import { getMissionStatus, statusMeta, toISODate, type Mission } from "@/lib/missions";

export function SemesterView({ tasks, anchor, onWeek, onEdit, onNew }: { tasks: Mission[]; anchor: Date; onWeek: (date: Date) => void; onEdit: (task: Mission) => void; onNew: () => void }) {
  const month = anchor.getMonth() < 6 ? 0 : 6;
  const [start, setStart] = useState(toISODate(new Date(anchor.getFullYear(), month, 1)));
  const [end, setEnd] = useState(toISODate(new Date(anchor.getFullYear(), month + 6, 0)));
  const weeks = semesterWeeks(start, end, tasks);
  const invalid = !start || !end || end < start || new Date(end).getTime() - new Date(start).getTime() > 366 * 86400000;
  return <section className="semester-view" aria-label="Vista del semestre"><header><h2>Mapa del semestre</h2><p>Exámenes y grandes entregas, juntos. Tres o más hitos señalan una semana concentrada; no es un cálculo automático de esfuerzo.</p></header>
    <div className="semester-controls"><label>Inicio del semestre<input type="date" value={start} onChange={event => setStart(event.target.value)} /></label><label>Fin del semestre<input type="date" value={end} onChange={event => setEnd(event.target.value)} /></label><button className="secondary-button" type="button" onClick={onNew}>Añadir actividad</button></div>
    {invalid ? <p role="alert">Elige un rango válido de hasta un año.</p> : <>
      {!weeks.some(week => week.tasks.length) && <p className="academic-empty">No hay hitos en este rango. Crea una actividad de tipo Examen / parcial o Gran entrega. También aparecen las tareas urgentes existentes.</p>}
      <div className="semester-grid">{weeks.map(week => <section className={"semester-week " + (week.crowded ? "crowded" : "")} key={week.start}><button className="semester-week-title" type="button" onClick={() => onWeek(new Date(`${week.start}T12:00:00`))}>{week.start} — {week.end.slice(5)}<small>{week.tasks.length} hitos{week.crowded ? " · Semana concentrada" : ""}</small></button>{week.tasks.map(task => <button className="semester-event" key={task.id} type="button" onClick={() => onEdit(task)}><small>{task.kind === "exam" ? "EXAMEN" : "ENTREGA"} · {task.date.slice(5)} · {task.time}</small><strong>{task.title}</strong><span>{task.subject} · {statusMeta[getMissionStatus(task)].label}</span></button>)}</section>)}</div>
    </>}
    <p className="academic-caption">Abre un examen para distribuir sus temas en sesiones previas. <a href="https://lsc.cornell.edu/semester-calendar/" target="_blank" rel="noreferrer">Calendario semestral y semanal · Cornell</a></p>
  </section>;
}
