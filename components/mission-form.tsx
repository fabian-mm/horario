"use client";

import { FormEvent, useEffect, useState } from "react";
import { Flag, ScrollText, Swords, X } from "lucide-react";
import { Mission, MissionStatus, Priority, priorityMeta, statusMeta, toISODate } from "@/lib/missions";
import { findSubject, Subject } from "@/lib/subjects";
import type { MissionType } from "@/lib/mission-types";
import { findMissionType, isTimedMissionType } from "@/lib/mission-types";
import { TimeField } from "@/components/time-field";
import { QuestTypeCards } from "@/components/quest-type-cards";

type Props = {
  open: boolean;
  initialDate: Date;
  initialSubject?: string;
  mission?: Mission | null;
  onClose: () => void;
  onSave: (mission: Mission) => void;
  onDelete?: (id: string) => void;
  subjects: Subject[];
  missionTypes: MissionType[];
  onManageSubjects: () => void;
  onManageMissionTypes: () => void;
};

const emptyForm = (date: Date, subject = "", subjects: Subject[] = [], missionTypes: MissionType[] = []): Mission => {
  const selectedSubject = findSubject(subjects, subject) ?? subjects[0];
  const firstType = missionTypes[0];
  return {
    id: "",
    title: "",
    missionTypeId: firstType?.id,
    subject: selectedSubject?.name ?? subject,
    subjectId: selectedSubject?.id,
    date: toISODate(date),
    time: "08:00",
    durationMinutes: undefined,
    priority: "normal",
    completed: false,
    status: "pending",
    notes: "",
    grade: "",
    weight: undefined,
  };
};

export function MissionForm({ open, initialDate, initialSubject, mission, onClose, onSave, onDelete, subjects, missionTypes, onManageSubjects, onManageMissionTypes }: Props) {
  const [form, setForm] = useState<Mission>(emptyForm(initialDate));

  useEffect(() => {
    if (!open) return;
    if (mission) {
      const selectedSubject = findSubject(subjects, mission.subject, mission.subjectId);
      setForm({ ...mission, subject: selectedSubject?.name ?? mission.subject, subjectId: selectedSubject?.id ?? mission.subjectId });
    } else setForm(emptyForm(initialDate, initialSubject, subjects, missionTypes));
  }, [open, mission, initialDate, initialSubject, subjects, missionTypes]);

  if (!open) return null;
  const selectedSubject = findSubject(subjects, form.subject, form.subjectId);
  const selectedMissionType = findMissionType(missionTypes, form.title, form.missionTypeId) ?? missionTypes[0];
  const usesTimeBlock = isTimedMissionType(selectedMissionType);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSave({
      ...form,
      id: form.id || crypto.randomUUID(),
      title: form.title.trim(),
      missionTypeId: selectedMissionType?.id,
      subject: form.subject.trim(),
      completed: form.status === "completed",
      durationMinutes: usesTimeBlock ? form.durationMinutes ?? 120 : undefined,
    });
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
          <QuestTypeCards label="¿Qué clase de objetivo es?" options={missionTypes.map((type) => ({ id: type.id, label: type.name, detail: "Plantilla editable" }))} selectedId={selectedMissionType?.id} onSelect={(missionTypeId) => { const nextType = missionTypes.find((type) => type.id === missionTypeId); setForm({ ...form, missionTypeId, durationMinutes: isTimedMissionType(nextType) ? form.durationMinutes ?? 120 : undefined }); }} onManage={() => { onClose(); onManageMissionTypes(); }} />
          <label>Nombre del objetivo<input required autoFocus value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder={selectedMissionType ? `Ej. ${selectedMissionType.name} de la unidad 2` : "Ej. Entrega del informe final"} /></label>

          {/* Subject selector */}
          <div className="subject-select-field">
            <label>
              Materia o curso
              <select required value={selectedSubject?.id ?? ""} onChange={(event) => { const subject = subjects.find((item) => item.id === event.target.value); if (subject) setForm({ ...form, subject: subject.name, subjectId: subject.id }); }}>
                <option value="" disabled>{subjects.length ? "Selecciona una materia" : "Primero crea una materia"}</option>
                {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
              </select>
            </label>
            <button type="button" onClick={() => { onClose(); onManageSubjects(); }}>{subjects.length ? "Administrar materias" : "+ Crear materia"}</button>
          </div>

          <div className="form-row">
            <label>Fecha<input required type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></label>
            <TimeField label="Hora" required value={form.time} onChange={(time) => setForm((current) => ({ ...current, time }))} />
          </div>
          {usesTimeBlock && <fieldset className="duration-fieldset">
            <legend>Duración del parcial</legend>
            <div className="duration-options" role="group" aria-label="Duración del parcial">
              {([60, 120] as const).map((duration) => <button key={duration} type="button" className={(form.durationMinutes ?? 120) === duration ? "selected" : ""} onClick={() => setForm({ ...form, durationMinutes: duration })}><strong>{duration / 60} {duration === 60 ? "hora" : "horas"}</strong><small>{duration === 60 ? "Bloque corto" : "Bloque habitual"}</small></button>)}
            </div>
          </fieldset>}
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
