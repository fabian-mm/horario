"use client";

import { ListChecks, CalendarClock, Plus, X } from "lucide-react";
import type { Mission } from "@/lib/missions";
import type { WeeklyQuest } from "@/lib/schedule";
import { planningWarnings } from "@/lib/academic";

export function MissionToolsFields({ task, onChange, missions, schedules }: { task: Mission; onChange: (task: Mission) => void; missions: Mission[]; schedules: WeeklyQuest[] }) {
  const subtasks = task.subtasks ?? [];
  const blocks = task.studyBlocks ?? [];
  const warnings = planningWarnings(task, missions, schedules);
  return <div className="mission-tools">
    <details open={subtasks.length > 0 || undefined}>
      <summary><ListChecks size={16} /> Pasos de la misión <span>{subtasks.filter(item => item.completed).length}/{subtasks.length}</span></summary>
      <p>Divide una entrega grande en pasos concretos. Marcar pasos no completa la tarea ni otorga XP adicional.</p>
      {subtasks.map((item, index) => <div className="subtask-edit" key={item.id}>
        <input type="checkbox" aria-label={`Completar paso ${index + 1}`} checked={item.completed} onChange={event => onChange({ ...task, subtasks: subtasks.map(value => value.id === item.id ? { ...value, completed: event.target.checked } : value) })} />
        <input aria-label={`Paso ${index + 1}`} required maxLength={180} value={item.title} placeholder="Ej. Revisar bibliografía" onChange={event => onChange({ ...task, subtasks: subtasks.map(value => value.id === item.id ? { ...value, title: event.target.value } : value) })} />
        <button type="button" aria-label={`Eliminar paso ${index + 1}`} onClick={() => onChange({ ...task, subtasks: subtasks.filter(value => value.id !== item.id) })}><X size={15} /></button>
      </div>)}
      <button type="button" className="academic-link" disabled={subtasks.length >= 100} onClick={() => onChange({ ...task, subtasks: [...subtasks, { id: crypto.randomUUID(), title: "", completed: false }] })}><Plus size={14} /> Añadir paso</button>
    </details>
    <details open={blocks.length > 0 || undefined}>
      <summary><CalendarClock size={16} /> Reservar tiempo de estudio <span>{blocks.length} bloques</span></summary>
      <p>Reserva uno o varios momentos para trabajar, sin cambiar la fecha de entrega. Se mostrarán en Hoy y Semana.</p>
      {blocks.map((block, index) => <div className="study-block-edit" key={block.id}>
        <label>Día de estudio<input aria-label={`Día del bloque ${index + 1}`} type="date" required value={block.date} onChange={event => onChange({ ...task, studyBlocks: blocks.map(value => value.id === block.id ? { ...value, date: event.target.value } : value) })} /></label>
        <label>Inicio<input aria-label={`Inicio del bloque ${index + 1}`} type="time" required value={block.startTime} onChange={event => onChange({ ...task, studyBlocks: blocks.map(value => value.id === block.id ? { ...value, startTime: event.target.value } : value) })} /></label>
        <label>Fin<input aria-label={`Fin del bloque ${index + 1}`} type="time" required min={block.startTime} value={block.endTime} onChange={event => onChange({ ...task, studyBlocks: blocks.map(value => value.id === block.id ? { ...value, endTime: event.target.value } : value) })} /></label>
        <button type="button" aria-label={`Eliminar bloque ${index + 1}`} onClick={() => onChange({ ...task, studyBlocks: blocks.filter(value => value.id !== block.id) })}><X size={15} /></button>
      </div>)}
      <button type="button" className="academic-link" disabled={blocks.length >= 40} onClick={() => onChange({ ...task, studyBlocks: [...blocks, { id: crypto.randomUUID(), date: task.date, startTime: "14:00", endTime: "15:00" }] })}><Plus size={14} /> Añadir bloque</button>
      {warnings.length > 0 && <div className="planning-warnings" role="status"><strong>Revisa tu planificación</strong><ul>{warnings.map(warning => <li key={warning}>{warning}</li>)}</ul><small>Puedes guardar el plan y reorganizarlo después.</small></div>}
    </details>
  </div>;
}
