"use client";
import { useRef, useState } from "react";
import { durationLabel } from "@/lib/academic";
import { rescheduleError, weeklyReview } from "@/lib/semester";
import { getMissionStatus, statusMeta, toISODate, type Mission, type StudyBlock } from "@/lib/missions";
import type { Availability } from "@/lib/planning";
import type { WeeklyQuest } from "@/lib/schedule";

function ReviewBlock({ task, block, tasks, schedules, availability, onSave }: { task: Mission; block: StudyBlock; tasks: Mission[]; schedules: WeeklyQuest[]; availability?: Availability; onSave: (task: Mission) => Promise<boolean> }) {
  const [draft, setDraft] = useState<StudyBlock | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const save = async (next: StudyBlock) => {
    setSaving(true); setMessage("");
    try {
      const ok = await onSave({ ...task, studyBlocks: task.studyBlocks?.map(item => item.id === block.id ? next : item) });
      if (ok) { setDraft(null); setMessage(next.status === "done" ? "Bloque marcado como realizado. No se añadieron minutos ni se completó la tarea." : "Bloque reprogramado. La entrega no cambió."); }
      else setMessage("No se pudo guardar. Conservamos la propuesta para reintentar.");
    } catch { setMessage("No se pudo guardar. Puedes reintentar."); }
    finally { setSaving(false); }
  };
  return <article className="review-block"><strong>{task.title}{block.topic && ` · ${block.topic}`}</strong><p>{block.date} · {block.startTime}–{block.endTime} · {block.status === "done" ? "Realizado" : "Sin confirmar"}</p>
    {block.status !== "done" && <div className="review-block-actions"><button type="button" className="academic-link" disabled={saving} onClick={() => save({ ...block, status: "done" })}>Marcar realizado</button>{getMissionStatus(task) === "pending" && <button type="button" className="academic-link" disabled={saving || !availability} onClick={() => { setDraft({ ...block, date: toISODate(new Date()), status: "planned" }); setMessage(""); }}>Reprogramar bloque</button>}</div>}
    {draft && <form onSubmit={event => { event.preventDefault(); if (saving || !availability) return; const error = rescheduleError(task, draft, tasks, schedules, availability, new Date()); if (error) { setMessage(error); return; } void save(draft); }}><fieldset disabled={saving}><div className="semester-controls"><label>Nueva fecha<input required type="date" value={draft.date} onChange={event => setDraft({ ...draft, date: event.target.value })} /></label><label>Nuevo inicio<input required type="time" value={draft.startTime} onChange={event => setDraft({ ...draft, startTime: event.target.value })} /></label><label>Nuevo fin<input required type="time" value={draft.endTime} onChange={event => setDraft({ ...draft, endTime: event.target.value })} /></label></div><p className="planning-help">Se moverá solo este bloque. La fecha de entrega, el tiempo registrado y el estado de la tarea se conservan.</p><div className="review-block-actions"><button type="button" className="secondary-button" onClick={() => setDraft(null)}>Cancelar cambio</button><button type="submit" className="primary-button">{saving ? "Guardando…" : "Confirmar nueva fecha"}</button></div></fieldset></form>}
    {message && <p role="status" className="planning-help">{message}</p>}
  </article>;
}

export function WeeklyReview({ tasks, anchor, now, schedules, availability, onSave, onEdit }: { tasks: Mission[]; anchor: Date; now: Date; schedules: WeeklyQuest[]; availability?: Availability; onSave: (task: Mission) => Promise<boolean>; onEdit: (task: Mission) => void }) {
  const saving = useRef(false);
  const saveOne = async (task: Mission) => { if (saving.current) return false; saving.current = true; try { return await onSave(task); } finally { saving.current = false; } };
  const review = weeklyReview(tasks, anchor, now);
  return <section className="weekly-review" aria-label="Revisión semanal"><h2>Cierre de la semana</h2><p>Unos minutos para revisar tu plan, reconocer lo realizado y decidir qué sigue.</p>
    <div className="load-metrics"><span><strong>{durationLabel(review.studied)}</strong> registrados esta semana</span><span><strong>{review.pending.length}</strong> tareas pendientes hasta el domingo</span><span><strong>{review.pastBlocks.filter(item => item.block.status !== "done").length}</strong> bloques pasados sin confirmar</span></div>
    {review.undated > 0 && <p className="planning-help">Hay {durationLabel(review.undated)} históricos sin fecha desglosada. No se atribuyen a esta semana.</p>}
    <details open><summary>1. Tiempo y avance son cosas distintas</summary><p className="planning-help">En las tareas vinculadas a esta semana: {durationLabel(review.estimated)} de estimación inicial frente a {durationLabel(review.accumulated)} de estudio acumulado (incluye otras semanas). La cifra semanal usa la fecha de fin de cada sesión. Ninguna de estas horas descuenta automáticamente trabajo pendiente.</p>
      {review.relevant.length ? review.relevant.map(task => <button className="review-task" key={task.id} type="button" onClick={() => onEdit(task)}><strong>{task.title}</strong><span>{task.estimatedMinutes == null ? "Sin estimar" : `${durationLabel(task.estimatedMinutes)} estimados`} · {durationLabel(task.studiedMinutes ?? 0)} estudiados acumulados · {statusMeta[getMissionStatus(task)].label}</span><small>Revisar tarea o reestimar lo que falta</small></button>) : <p className="academic-empty">No hay tareas, bloques ni sesiones vinculados a esta semana.</p>}
    </details>
    <details><summary>2. Revisar pendientes ({review.pending.length})</summary>{review.pending.map(task => <button type="button" className="review-task" key={task.id} onClick={() => onEdit(task)}><strong>{task.title}</strong><span>Entrega: {task.date} · {task.subject}</span></button>)}{!review.pending.length && <p>No hay pendientes con entrega hasta esta semana.</p>}</details>
    <details open><summary>3. Confirmar o reprogramar bloques</summary><p className="planning-help">Un bloque pasado no demuestra que lo hayas realizado. Confírmalo manualmente o elige un horario futuro. Marcarlo realizado no añade tiempo al cronómetro.</p>{review.pastBlocks.map(({ task, block }) => <ReviewBlock key={`${task.id}:${block.id}`} task={task} block={block} tasks={tasks} schedules={schedules} availability={availability} onSave={saveOne} />)}{!review.pastBlocks.length && <p className="academic-empty">No hay bloques pasados en la semana seleccionada.</p>}</details>
  </section>;
}
