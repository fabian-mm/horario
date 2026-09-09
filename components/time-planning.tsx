"use client";
import { useState } from "react";
import { Plus, X, Settings2, Clock3 } from "lucide-react";
import { availabilitySchema, weeklyCapacity, type Availability } from "@/lib/planning";
import { durationLabel } from "@/lib/academic";
import type { Mission } from "@/lib/missions";
import type { WeeklyQuest } from "@/lib/schedule";

const dayNames = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
function Days({ value, onChange, label }: { value: number[]; onChange: (days: number[]) => void; label: string }) {
  return <div className="availability-days" role="group" aria-label={label}>{dayNames.map((name, index) => <button type="button" key={name} aria-pressed={value.includes(index + 1)} onClick={() => onChange(value.includes(index + 1) ? value.filter(day => day !== index + 1) : [...value, index + 1])}>{name}</button>)}</div>;
}
export function AvailabilityDialog({ value, saving, onSave, onClose }: { value: Availability; saving: boolean; onSave: (value: Availability) => Promise<boolean>; onClose: () => void }) {
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState("");
  return <div className="modal-backdrop" onMouseDown={() => { if (!saving) onClose(); }}><section className="mission-modal" role="dialog" aria-modal="true" aria-labelledby="availability-title" onMouseDown={event => event.stopPropagation()}>
    <header className="modal-heading"><div><span className="eyebrow">TIEMPO PARA TU AVENTURA</span><h2 id="availability-title">Mi disponibilidad</h2></div><button className="icon-button" disabled={saving} type="button" aria-label="Cerrar disponibilidad" onClick={onClose}><X size={20} /></button></header>
    <form onSubmit={async event => { event.preventDefault(); const parsed = availabilitySchema.safeParse(draft); if (!parsed.success) { setError("Revisa los horarios: el fin debe ser posterior al inicio y cada compromiso necesita un nombre."); return; } setError(""); if (await onSave(parsed.data)) onClose(); else setError("No se pudo guardar. Conservamos tus cambios para reintentar."); }}>
      <fieldset disabled={saving} className="mission-save-fields">
        <p className="planning-help">Elige cuándo puedes estudiar. Fuera de esta ventana no contaremos horas disponibles. Los compromisos se repiten cada semana; las clases se descuentan automáticamente.</p>
        <Days label="Días disponibles para estudiar" value={draft.days} onChange={days => setDraft({ ...draft, days })} />
        <div className="form-row"><label>Disponible desde<input required type="time" value={draft.startTime} onChange={event => setDraft({ ...draft, startTime: event.target.value })} /></label><label>Disponible hasta<input required type="time" value={draft.endTime} onChange={event => setDraft({ ...draft, endTime: event.target.value })} /></label></div>
        <h3 className="planning-section-title">Compromisos personales</h3>
        {draft.commitments.map((item, index) => <div className="commitment-editor" key={item.id}>
          <div className="commitment-heading"><label>Compromiso {index + 1}<input required maxLength={100} value={item.title} placeholder="Transporte, almuerzo, trabajo…" onChange={event => setDraft({ ...draft, commitments: draft.commitments.map(current => current.id === item.id ? { ...current, title: event.target.value } : current) })} /></label><button type="button" className="icon-button" aria-label={`Eliminar compromiso ${index + 1}`} onClick={() => setDraft({ ...draft, commitments: draft.commitments.filter(current => current.id !== item.id) })}><X size={16} /></button></div>
          <Days label={`Días del compromiso ${index + 1}`} value={item.days} onChange={days => setDraft({ ...draft, commitments: draft.commitments.map(current => current.id === item.id ? { ...current, days } : current) })} />
          <div className="form-row"><label>Inicio<input aria-label={`Inicio del compromiso ${index + 1}`} required type="time" value={item.startTime} onChange={event => setDraft({ ...draft, commitments: draft.commitments.map(current => current.id === item.id ? { ...current, startTime: event.target.value } : current) })} /></label><label>Fin<input aria-label={`Fin del compromiso ${index + 1}`} required type="time" value={item.endTime} onChange={event => setDraft({ ...draft, commitments: draft.commitments.map(current => current.id === item.id ? { ...current, endTime: event.target.value } : current) })} /></label></div>
        </div>)}
        <button type="button" className="academic-link" disabled={draft.commitments.length >= 50} onClick={() => setDraft({ ...draft, commitments: [...draft.commitments, { id: crypto.randomUUID(), title: "", days: [1,2,3,4,5], startTime: "12:00", endTime: "13:00" }] })}><Plus size={14} /> Añadir compromiso</button>
        <p className="planning-help">Los intervalos son del mismo día. Para un compromiso nocturno, divide el horario antes y después de medianoche. No hace falta reservar el sueño si ya queda fuera de tu ventana.</p>
        {error && <p role="alert" className="planning-warnings">{error}</p>}
        <div className="modal-actions"><span /><div><button className="secondary-button" type="button" onClick={onClose}>Cancelar</button><button className="primary-button" type="submit">{saving ? "Guardando…" : "Guardar disponibilidad"}</button></div></div>
      </fieldset>
    </form>
  </section></div>;
}

export function WeeklyLoad({ anchor, reference, availability, tasks, schedules, onConfigure }: { anchor: Date; reference: Date; availability: Availability; tasks: Mission[]; schedules: WeeklyQuest[]; onConfigure: () => void }) {
  const load = weeklyCapacity(anchor, availability, tasks, schedules, reference);
  return <section className="weekly-load" aria-label="Carga semanal"><header><h2><Clock3 size={16} /> Carga semanal</h2><button type="button" className="academic-link" onClick={onConfigure}><Settings2 size={14} /> Mi disponibilidad</button></header>
    <div className="load-metrics"><span><strong>{durationLabel(load.capacity)}</strong> disponibles para estudiar</span><span><strong>{durationLabel(load.workload)}</strong> pendientes estimados</span><span><strong>{durationLabel(load.reserved)}</strong> ya reservados</span></div>
    {load.shortage > 0 && <p className="load-warning" role="status">Tu carga supera el tiempo disponible por {durationLabel(load.shortage)}. Revisa estimaciones, prioridades o fechas.</p>}
    <details><summary>Cómo se calcula</summary><p>Solo cuenta tiempo futuro de la semana visible, dentro de tu disponibilidad, descontando clases y compromisos. Los bloques de estudio son parte de esa capacidad, no se restan dos veces.</p><p>La carga incluye tareas pendientes con entrega esta semana o bloques en ella; en la semana actual incluye atrasadas. Las horas estudiadas se restan de la estimación, pero no garantizan que la tarea esté terminada.</p></details>
    {load.unestimated > 0 && <small>{load.unestimated} {load.unestimated === 1 ? "tarea sin estimar: no está incluida" : "tareas sin estimar: no están incluidas"} en las horas pendientes.</small>}
  </section>;
}
