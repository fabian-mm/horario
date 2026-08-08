"use client";

import { FormEvent, useEffect, useState } from "react";
import { Flag, Swords, X } from "lucide-react";
import { Mission, MissionStatus, Priority, priorityMeta, statusMeta, toISODate } from "@/lib/missions";

type Props = {
  open: boolean;
  initialDate: Date;
  initialSubject?: string;
  mission?: Mission | null;
  onClose: () => void;
  onSave: (mission: Mission) => void;
  onDelete?: (id: string) => void;
};

const emptyForm = (date: Date, subject = ""): Mission => ({
  id: "",
  title: "",
  subject,
  date: toISODate(date),
  time: "08:00",
  priority: "normal",
  completed: false,
  status: "pending",
  notes: "",
  grade: "",
  weight: undefined,
});

export function MissionForm({ open, initialDate, initialSubject, mission, onClose, onSave, onDelete }: Props) {
  const [form, setForm] = useState<Mission>(emptyForm(initialDate));

  useEffect(() => {
    if (open) setForm(mission ?? emptyForm(initialDate, initialSubject));
  }, [open, mission, initialDate, initialSubject]);

  if (!open) return null;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSave({ ...form, id: form.id || crypto.randomUUID(), title: form.title.trim(), subject: form.subject.trim(), completed: form.status === "completed" });
    onClose();
  };

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section className="mission-modal" role="dialog" aria-modal="true" aria-labelledby="mission-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-heading">
          <div className="modal-icon"><Swords size={20} /></div>
          <div>
            <span className="eyebrow">Registro de aventura</span>
            <h2 id="mission-title">{mission ? "Editar misión" : "Nueva misión"}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Cerrar"><X size={20} /></button>
        </div>

        <form onSubmit={submit}>
          <label>
            Nombre de la misión
            <input required autoFocus value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Ej. Parcial de Termodinámica" />
          </label>
          <label>
            Materia o curso
            <input required value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} placeholder="Ej. Física" />
          </label>
          <div className="form-row">
            <label>Fecha<input required type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></label>
            <label>Hora<input required type="time" value={form.time} onChange={(event) => setForm({ ...form, time: event.target.value })} /></label>
          </div>
          <fieldset>
            <legend>Nivel de importancia</legend>
            <div className="priority-options">
              {(Object.keys(priorityMeta) as Priority[]).map((priority) => (
                <label className={`priority-option ${form.priority === priority ? "selected" : ""}`} key={priority}>
                  <input type="radio" name="priority" value={priority} checked={form.priority === priority} onChange={() => setForm({ ...form, priority })} />
                  <span className={`priority-symbol ${priority}`}><Flag size={16} /></span>
                  <span>{priorityMeta[priority].shortLabel}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="form-row form-row-metrics">
            <label>
              Estado
              <select value={form.status ?? "pending"} onChange={(event) => setForm({ ...form, status: event.target.value as MissionStatus })}>
                {(Object.keys(statusMeta) as MissionStatus[]).map((status) => <option key={status} value={status}>{statusMeta[status].label}</option>)}
              </select>
            </label>
            <label>Impacto en la materia (%)<input type="number" min="0" max="100" value={form.weight ?? ""} onChange={(event) => setForm({ ...form, weight: event.target.value ? Number(event.target.value) : undefined })} placeholder="Ej. 20" /></label>
            <label>Nota obtenida<input inputMode="decimal" value={form.grade ?? ""} onChange={(event) => setForm({ ...form, grade: event.target.value })} placeholder="Ej. 4.5" /></label>
          </div>
          <label>
            Notas <span className="optional">(opcional)</span>
            <textarea rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Pistas, temas o recordatorios..." />
          </label>
          <div className="modal-actions">
            {mission && onDelete ? <button type="button" className="delete-button" onClick={() => { onDelete(mission.id); onClose(); }}>Eliminar</button> : <span />}
            <div>
              <button type="button" className="secondary-button" onClick={onClose}>Cancelar</button>
              <button type="submit" className="primary-button">Guardar misión</button>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}
