"use client";

import { FormEvent, useState } from "react";
import { BookMarked, Check, Library, Pencil, Plus, ScrollText, Trash2, X } from "lucide-react";
import type { Mission } from "@/lib/missions";
import type { WeeklyQuest } from "@/lib/schedule";
import type { Subject } from "@/lib/subjects";

type Props = {
  subjects: Subject[];
  missions: Mission[];
  weeklyQuests: WeeklyQuest[];
  loading: boolean;
  onSave: (subject: Subject) => void;
  onDelete: (id: string) => void;
};

export function SubjectsView({ subjects, missions, weeklyQuests, loading, onSave, onDelete }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [name, setName] = useState("");

  const openNew = () => { setEditing(null); setName(""); setModalOpen(true); };
  const openEdit = (subject: Subject) => { setEditing(subject); setName(subject.name); setModalOpen(true); };
  const save = (event: FormEvent) => {
    event.preventDefault();
    onSave({ ...editing, id: editing?.id ?? crypto.randomUUID(), name: name.trim() });
    setModalOpen(false);
  };

  const usageFor = (subject: Subject) => {
    const missionCount = missions.filter((mission) => mission.subjectId === subject.id || mission.subject === subject.name || subject.aliases?.includes(mission.subject)).length;
    const classCount = weeklyQuests.reduce((count, weeklyQuest) => count + weeklyQuest.dailyMissions.filter((dailyMission) => dailyMission.subjectId === subject.id || dailyMission.subject === subject.name || subject.aliases?.includes(dailyMission.subject)).length, 0);
    return { missionCount, classCount, total: missionCount + classCount };
  };

  return (
    <div className="subjects-view">
      <header className="subjects-heading">
        <div><span className="eyebrow">ARCHIVO DEL GREMIO</span><h1>Mis <i>Materias</i></h1><p>Define cada materia una sola vez y úsala en toda la aventura.</p></div>
        <button className="primary-button compact" type="button" onClick={openNew}><Plus size={18} /> Nueva materia</button>
      </header>

      <section className="subject-library-intro">
        <span><Library size={24} /></span>
        <div><strong>Catálogo global</strong><p>Las materias de este archivo aparecen automáticamente como opciones en misiones, clases semanales, territorios, mapas y promedios.</p></div>
        <small>{subjects.length} {subjects.length === 1 ? "materia registrada" : "materias registradas"}</small>
      </section>

      <section className="subject-library-grid" aria-label="Catálogo de materias">
        {subjects.map((subject, index) => {
          const usage = usageFor(subject);
          return (
            <article key={subject.id} className={`global-subject-card subject-tone-${index % 5}`}>
              <span className="global-subject-icon"><BookMarked size={21} /><i>{index + 1}</i></span>
              <div className="global-subject-copy"><small>MATERIA GLOBAL</small><h2>{subject.name}</h2><p>{usage.missionCount} misiones · {usage.classCount} clases semanales</p></div>
              <div className="global-subject-actions"><button type="button" onClick={() => openEdit(subject)}><Pencil size={14} /> Editar</button><button type="button" disabled={usage.total > 0} onClick={() => onDelete(subject.id)} title={usage.total > 0 ? "La materia está en uso" : "Eliminar materia"}><Trash2 size={14} /> Eliminar</button></div>
              {usage.total > 0 && <span className="subject-in-use"><Check size={11} /> EN USO</span>}
            </article>
          );
        })}
        {!subjects.length && <div className="subjects-empty"><Library size={40} /><h2>{loading ? "Buscando materias usadas..." : "Tu archivo está vacío"}</h2><p>Registra una materia para que aparezca como opción al crear misiones y clases.</p>{!loading && <button type="button" onClick={openNew}>Crear primera materia</button>}</div>}
      </section>

      {modalOpen && (
        <div className="modal-backdrop" onMouseDown={() => setModalOpen(false)}>
          <section className="mission-modal subject-modal" role="dialog" aria-modal="true" aria-labelledby="subject-modal-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-heading"><div className="modal-icon"><ScrollText size={20} /></div><div><span className="eyebrow">CATÁLOGO GLOBAL</span><h2 id="subject-modal-title">{editing ? "Editar materia" : "Nueva materia"}</h2></div><button className="icon-button" type="button" onClick={() => setModalOpen(false)} aria-label="Cerrar"><X size={20} /></button></div>
            <form onSubmit={save}>
              <label>Nombre de la materia<input required autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Ej. Cálculo diferencial" /></label>
              <p className="subject-form-help">Al renombrarla, el cambio se aplicará también a las misiones y clases que ya la utilizan.</p>
              <div className="modal-actions"><span /><div><button type="button" className="secondary-button" onClick={() => setModalOpen(false)}>Cancelar</button><button type="submit" className="primary-button">Guardar materia</button></div></div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
