"use client";

import { FormEvent, useMemo, useState } from "react";
import { Pencil, Plus, ScrollText, Trash2, X } from "lucide-react";
import type { Mission } from "@/lib/missions";
import type { MissionType } from "@/lib/mission-types";

type Props = { open: boolean; missionTypes: MissionType[]; missions: Mission[]; onClose: () => void; onSave: (type: MissionType) => void; onDelete: (id: string) => void };

export function MissionTypesManager({ open, missionTypes, missions, onClose, onSave, onDelete }: Props) {
  const [draft, setDraft] = useState<MissionType>({ id: "", name: "" });
  const usage = useMemo(() => new Map(missionTypes.map((type) => [type.id, missions.filter((mission) => mission.missionTypeId === type.id).length])), [missionTypes, missions]);
  if (!open) return null;
  const save = (event: FormEvent) => { event.preventDefault(); onSave({ ...draft, id: draft.id || crypto.randomUUID(), name: draft.name.trim() }); setDraft({ id: "", name: "" }); };
  return <div className="modal-backdrop" onMouseDown={onClose}><section className="mission-modal mission-types-modal" role="dialog" aria-modal="true" aria-labelledby="mission-types-title" onMouseDown={(event) => event.stopPropagation()}>
    <div className="modal-heading"><div className="modal-icon"><ScrollText size={20} /></div><div><span className="eyebrow">PLANTILLAS DE OBJETIVOS</span><h2 id="mission-types-title">Trabajos, parciales y más</h2></div><button className="icon-button" type="button" onClick={onClose} aria-label="Cerrar"><X size={20} /></button></div>
    <p className="activity-types-intro">Estas tarjetas siempre estarán disponibles al crear una misión. Puedes renombrarlas o añadir las tuyas.</p>
    <div className="mission-types-grid">
      <div className="mission-types-list">{missionTypes.map((type, index) => <button key={type.id} type="button" className={`mission-type-template tone-${index % 5} ${draft.id === type.id ? "active" : ""}`} onClick={() => setDraft({ ...type })}><i>{String(index + 1).padStart(2, "0")}</i><span><strong>{type.name}</strong><small>{usage.get(type.id) ?? 0} misiones</small></span><Pencil size={14} /></button>)}<button type="button" className="new-activity-type" onClick={() => setDraft({ id: "", name: "" })}><Plus size={15} /> Nuevo tipo</button></div>
      <form className="mission-type-editor" onSubmit={save}><span className="eyebrow">{draft.id ? "EDITAR TARJETA" : "NUEVA TARJETA"}</span><label>Nombre<input required autoFocus={!draft.id} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Ej. Informe de laboratorio" /></label><div className="activity-type-actions">{draft.id && <button type="button" className="delete-button" disabled={(usage.get(draft.id) ?? 0) > 0 || missionTypes.length <= 1} onClick={() => { onDelete(draft.id); setDraft({ id: "", name: "" }); }}><Trash2 size={14} /> Eliminar</button>}<button type="submit" className="primary-button">Guardar tarjeta</button></div></form>
    </div>
  </section></div>;
}
