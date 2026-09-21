"use client";
import { useState } from "react";
import { dependencyError, getMissionStatus, stageMeta, workStateMeta, unresolvedDependencies, type Mission } from "@/lib/missions";

export function ProjectWorkFields({ task, tasks, onChange }: { task: Mission; tasks: Mission[]; onChange: (task: Mission) => void }) {
  const [query, setQuery] = useState("");
  const ids = task.dependsOn ?? [];
  const unresolved = unresolvedDependencies(task, tasks);
  const candidates = tasks.filter(item => item.id !== task.id && !ids.includes(item.id) && `${item.title} ${item.project ?? ""} ${item.subject}`.toLocaleLowerCase("es").includes(query.toLocaleLowerCase("es")));
  return <details className="project-work-fields" open={Boolean(task.stage || task.workState || ids.length)}><summary>Etapas y bloqueos</summary>
    <div className="form-row"><label>Etapa del proyecto<select aria-label="Etapa del proyecto" value={task.stage ?? ""} onChange={event => onChange({ ...task, stage: event.target.value ? event.target.value as Mission["stage"] : null })}><option value="">Sin etapa</option>{Object.entries(stageMeta).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
    <label>Estado de trabajo<select aria-label="Estado de trabajo" value={task.workState ?? "todo"} onChange={event => onChange({ ...task, workState: event.target.value as Mission["workState"] })}>{Object.entries(workStateMeta).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label></div>
    {task.workState === "blocked" && <label>Motivo del bloqueo<textarea maxLength={500} value={task.blockedReason ?? ""} onChange={event => onChange({ ...task, blockedReason: event.target.value })} placeholder="Ej. Esperando datos del equipo" /></label>}
    <p className="planning-help">Las dependencias pendientes muestran la tarea como bloqueada. Al completarlas recupera su estado de trabajo. Un bloqueo manual se quita cambiando el estado. No modifican las entregas ni impiden registrar estudio.</p>
    <ul className="dependency-list">{ids.map(id => { const item = tasks.find(candidate => candidate.id === id); return <li key={id}><span>{item?.title ?? "Dependencia eliminada o no disponible"} · {item && getMissionStatus(item) === "completed" ? "Completada" : "Pendiente"}</span><button className="academic-link" type="button" aria-label={`Quitar dependencia ${item?.title ?? id}`} onClick={() => onChange({ ...task, dependsOn: ids.filter(value => value !== id) })}>Quitar</button></li>; })}</ul>
    <label>Buscar dependencia<input value={query} onChange={event => setQuery(event.target.value)} placeholder="Tarea, proyecto o materia" /></label>
    <label>Depende de terminar<select aria-label="Añadir dependencia" value="" disabled={ids.length >= 100} onChange={event => { if (event.target.value) onChange({ ...task, dependsOn: [...ids, event.target.value] }); }}><option value="">Selecciona una tarea</option>{candidates.slice(0, 100).map(item => <option key={item.id} value={item.id} disabled={Boolean(dependencyError({ ...task, dependsOn: [...ids, item.id] }, tasks))}>{item.title} · {item.project || item.subject}</option>)}</select></label>
    {unresolved.length > 0 && <p className="planning-warnings">Espera a {unresolved.length} {unresolved.length === 1 ? "dependencia" : "dependencias"}. Puedes estudiar o marcar una entrega manualmente si corresponde.</p>}
  </details>;
}
