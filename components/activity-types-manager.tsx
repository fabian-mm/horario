"use client";

import { FormEvent, useMemo, useState } from "react";
import { Activity, BookOpen, Pencil, Plus, Sparkles, Trash2, X } from "lucide-react";
import type { ActivityType, ActivityTone } from "@/lib/activity-types";
import type { WeeklyQuest } from "@/lib/schedule";

type Props = {
  open: boolean;
  activityTypes: ActivityType[];
  weeklyQuests: WeeklyQuest[];
  onClose: () => void;
  onSave: (activityType: ActivityType) => void;
  onDelete: (id: string) => void;
  selectOnSave?: boolean;
};

const tones: { id: ActivityTone; label: string }[] = [
  { id: "gold", label: "Oro" }, { id: "sage", label: "Bosque" }, { id: "coral", label: "Coral" },
  { id: "ocean", label: "Océano" }, { id: "violet", label: "Arcano" },
];

const blankType = (): ActivityType => ({ id: "", name: "", category: "activity", points: 10, tone: "sage" });

export function ActivityTypesManager({ open, activityTypes, weeklyQuests, onClose, onSave, onDelete, selectOnSave = false }: Props) {
  const [draft, setDraft] = useState<ActivityType>(blankType());
  const usage = useMemo(() => new Map(activityTypes.map((type) => [type.id, weeklyQuests.reduce(
    (count, week) => count + week.dailyMissions.filter((activity) => activity.activityTypeId === type.id).length,
    0,
  )])), [activityTypes, weeklyQuests]);
  if (!open) return null;

  const save = (event: FormEvent) => {
    event.preventDefault();
    const savedType = { ...draft, id: draft.id || crypto.randomUUID(), name: draft.name.trim(), points: Number(draft.points) };
    onSave(savedType);
    setDraft(savedType);
  };

  return <div className="modal-backdrop" onMouseDown={onClose}>
    <section className="mission-modal activity-types-modal" role="dialog" aria-modal="true" aria-labelledby="activity-types-title" onMouseDown={(event) => event.stopPropagation()}>
      <div className="modal-heading"><div className="modal-icon"><Sparkles size={20} /></div><div><span className="eyebrow">REGLAS DE TU CAMPAÑA</span><h2 id="activity-types-title">Tipos de actividad</h2></div><button className="icon-button" type="button" onClick={onClose} aria-label="Cerrar"><X size={20} /></button></div>
      <p className="activity-types-intro">Elige qué actividades puedes usar y cuántos puntos entrega cada una al completarla.</p>
      <div className="activity-types-layout">
        <div className="activity-types-list">
          {activityTypes.map((type) => <button key={type.id} type="button" className={`activity-type-item tone-${type.tone} ${draft.id === type.id ? "active" : ""}`} onClick={() => setDraft({ ...type })}>
            <span>{type.category === "class" ? <BookOpen size={16} /> : <Activity size={16} />}</span>
            <div><strong>{type.name}</strong><small>{type.category === "class" ? "Clase" : "Actividad"} · {usage.get(type.id) ?? 0} en uso</small></div>
            <b>+{type.points} XP</b><Pencil size={13} />
          </button>)}
          <button className="new-activity-type" type="button" onClick={() => setDraft(blankType())}><Plus size={15} /> Crear otro tipo</button>
        </div>
        <form className="activity-type-editor" onSubmit={save}>
          <span className="eyebrow">{draft.id ? "EDITAR TIPO" : "NUEVO TIPO"}</span>
          <label>Nombre<input required autoFocus={!draft.id} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Ej. Entrenamiento" /></label>
          <label>Comportamiento<select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value as ActivityType["category"] })}><option value="activity">Actividad general</option><option value="class">Clase (usa materia)</option></select></label>
          <label>Puntos por completar<input required type="number" inputMode="numeric" min={0} max={500} value={draft.points} onChange={(event) => setDraft({ ...draft, points: Number(event.target.value) })} /></label>
          <fieldset className="tone-picker"><legend>Color en el mapa</legend>{tones.map((tone) => <button key={tone.id} type="button" className={`tone-${tone.id} ${draft.tone === tone.id ? "selected" : ""}`} onClick={() => setDraft({ ...draft, tone: tone.id })}><i />{tone.label}</button>)}</fieldset>
          <div className="activity-type-actions">
            {draft.id && <button type="button" className="delete-button" disabled={(usage.get(draft.id) ?? 0) > 0 || activityTypes.length <= 1} title={(usage.get(draft.id) ?? 0) > 0 ? "Está en uso en el horario" : undefined} onClick={() => { onDelete(draft.id); setDraft(blankType()); }}><Trash2 size={14} /> Eliminar</button>}
            <button type="submit" className="primary-button">{draft.id ? "Guardar cambios" : selectOnSave ? "Crear y seleccionar" : "Crear tipo"}</button>
          </div>
        </form>
      </div>
    </section>
  </div>;
}
