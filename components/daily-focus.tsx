"use client";
import { useEffect, useState, type ReactNode } from "react";
import { Flag, X } from "lucide-react";
import { getMissionStatus, type Mission } from "@/lib/missions";
import { concentrationSchema, type Concentration, type Planning } from "@/lib/planning";

function ConcentrationSettings({ value, disabled, onSave }: { value: Concentration; disabled: boolean; onSave: (patch: Partial<Planning>) => Promise<boolean> }) {
  const [draft, setDraft] = useState(value);
  const [message, setMessage] = useState("");
  useEffect(() => setDraft(value), [value]);
  const preset = draft.mode === "free" ? "free" : draft.workMinutes === 25 && draft.breakMinutes === 5 ? "25" : draft.workMinutes === 50 && draft.breakMinutes === 10 ? "50" : "custom";
  return <details className="concentration-settings"><summary>Modo de concentración</summary><div>
    <label>Modo de estudio<select disabled={disabled} value={preset} onChange={event => { const mode = event.target.value; setMessage(""); setDraft(mode === "free" ? { ...draft, mode: "free" } : mode === "25" ? { mode: "interval", workMinutes: 25, breakMinutes: 5 } : mode === "50" ? { mode: "interval", workMinutes: 50, breakMinutes: 10 } : { mode: "interval", workMinutes: 30, breakMinutes: 5 }); }}><option value="free">Cronómetro libre</option><option value="25">25 min / 5 de descanso</option><option value="50">50 min / 10 de descanso</option><option value="custom">Personalizado</option></select></label>
    {draft.mode === "interval" && <div className="form-row"><label>Estudio (min)<input disabled={disabled} type="number" min={1} max={180} value={draft.workMinutes} onChange={event => setDraft({ ...draft, workMinutes: Number(event.target.value) })} /></label><label>Descanso (min)<input disabled={disabled} type="number" min={1} max={60} value={draft.breakMinutes} onChange={event => setDraft({ ...draft, breakMinutes: Number(event.target.value) })} /></label></div>}
    <p>Se aplicará a la próxima sesión. Al terminar el descanso, tú decides cuándo iniciar el siguiente bloque; las pausas no suman estudio.</p>
    <button type="button" className="secondary-button" disabled={disabled} onClick={async () => { const parsed = concentrationSchema.safeParse(draft); if (!parsed.success) { setMessage("Estudio: 1–180 minutos. Descanso: 1–60 minutos, sin decimales."); return; } setMessage(await onSave({ concentration: parsed.data }) ? "Modo guardado para tu próxima sesión." : "No se pudo guardar. Puedes reintentar."); }}>Guardar modo</button>{message && <p role="status">{message}</p>}
  </div></details>;
}

export function DailyFocus({ tasks, date, data, ready, saving, onSave, renderTasks }: { tasks: Mission[]; date: string; data: Planning; ready: boolean; saving: boolean; onSave: (patch: Partial<Planning>) => Promise<boolean>; renderTasks: (tasks: Mission[]) => ReactNode }) {
  const selectedIds = data.dailyFocus?.date === date ? data.dailyFocus.missionIds : [];
  const selected = selectedIds.flatMap(id => tasks.find(task => task.id === id) ? [tasks.find(task => task.id === id)!] : []);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  useEffect(() => { setEditing(false); }, [date]);
  const candidates = tasks.filter(task => (getMissionStatus(task) === "pending" || draft.includes(task.id)) && `${task.title} ${task.subject} ${task.project ?? ""}`.toLocaleLowerCase("es").includes(query.trim().toLocaleLowerCase("es")));
  return <section className="academic-panel daily-focus" aria-label="Misiones principales de hoy"><header><h2><Flag size={17} /> Misiones principales</h2><button type="button" className="academic-link" disabled={!ready || saving} onClick={() => { setDraft(selected.map(task => task.id)); setQuery(""); setError(""); setEditing(true); }}>Elegir misiones · {selected.length}/3</button></header>
    {selected.length ? renderTasks(selected) : <p className="academic-empty">Elige hasta tres tareas para avanzar hoy, aunque su entrega sea otro día. Tú decides qué merece tu atención.</p>}
    <ConcentrationSettings value={data.concentration} disabled={!ready || saving} onSave={onSave} />
    {editing && <div className="modal-backdrop" onMouseDown={() => { if (!saving) setEditing(false); }}><section className="mission-modal" role="dialog" aria-modal="true" aria-labelledby="daily-focus-title" onMouseDown={event => event.stopPropagation()}><header className="modal-heading"><div><span className="eyebrow">UN PASO A LA VEZ</span><h2 id="daily-focus-title">Prioridades de hoy</h2></div><button type="button" className="icon-button" disabled={saving} aria-label="Cerrar prioridades" onClick={() => setEditing(false)}><X size={20} /></button></header>
      <form onSubmit={async event => { event.preventDefault(); if (await onSave({ dailyFocus: { date, missionIds: draft } })) setEditing(false); else setError("No se pudo guardar la selección. Puedes reintentar."); }}><fieldset className="mission-save-fields" disabled={saving}>
        <label>Buscar una misión<input value={query} onChange={event => setQuery(event.target.value)} placeholder="Tarea, materia o proyecto" /></label><p className="planning-help">{draft.length}/3 elegidas. Se guardan para {date}; mañana podrás hacer otra selección. No cambia ninguna fecha límite.</p>
        <div className="focus-candidates">{candidates.slice(0, 100).map(task => <label key={task.id}><input type="checkbox" checked={draft.includes(task.id)} disabled={!draft.includes(task.id) && draft.length >= 3} onChange={() => setDraft(draft.includes(task.id) ? draft.filter(id => id !== task.id) : [...draft, task.id])} /><span><strong>{task.title}</strong><small>{task.subject} · entrega {task.date}{getMissionStatus(task) !== "pending" && " · finalizada o entregada"}</small></span></label>)}</div>
        {!candidates.length && <p className="planning-help">No hay tareas con esa búsqueda.</p>}{candidates.length > 100 && <p className="planning-help">Mostrando 100 tareas. Busca para encontrar las demás.</p>}
        {error && <p className="planning-warnings" role="alert">{error}</p>}<div className="modal-actions"><span /><div><button type="button" className="secondary-button" onClick={() => setEditing(false)}>Cancelar</button><button type="submit" className="primary-button">{saving ? "Guardando…" : "Guardar prioridades"}</button></div></div>
      </fieldset></form></section></div>}
  </section>;
}
