"use client";

import { FormEvent, useMemo, useState } from "react";
import { Activity, BookOpen, CalendarRange, Check, Clock3, MapPin, Pencil, Plus, Power, ScrollText, Settings2, Sparkles, Trash2, X } from "lucide-react";
import { ActivityTypesManager } from "@/components/activity-types-manager";
import type { ActivityType } from "@/lib/activity-types";
import { resolveActivityType } from "@/lib/activity-types";
import { DailyClassQuest, getMondayIso, sortDailyMissionsByTime, Weekday, WeeklyQuest, weekdayMeta } from "@/lib/schedule";
import { findSubject, Subject } from "@/lib/subjects";
import { TimeField } from "@/components/time-field";

type Props = {
  weeklyQuests: WeeklyQuest[];
  loading: boolean;
  focusedWeeklyQuestId?: string | null;
  subjects: Subject[];
  activityTypes: ActivityType[];
  onManageSubjects: () => void;
  onSave: (weeklyQuest: WeeklyQuest) => void;
  onDelete: (id: string) => void;
  onSaveActivityType: (activityType: ActivityType) => void;
  onDeleteActivityType: (id: string) => void;
};

type WeeklyDraft = { title: string; startDate: string; endDate: string };

const emptyDailyQuest = (dayOfWeek: Weekday = 1, subjects: Subject[] = [], activityTypes: ActivityType[] = []): DailyClassQuest => {
  const type = activityTypes[0];
  const isClass = type?.category === "class";
  return ({
  id: "",
  title: "",
  subject: isClass ? subjects[0]?.name ?? "" : undefined,
  subjectId: isClass ? subjects[0]?.id : undefined,
  activityTypeId: type?.id,
  activityTypeName: type?.name,
  activityCategory: type?.category,
  activityPoints: type?.points,
  dayOfWeek,
  startTime: "08:00",
  endTime: "09:30",
  location: "",
  notes: "",
  completedDates: [],
  });
};

export function WeeklySchedule({ weeklyQuests, loading, focusedWeeklyQuestId, subjects, activityTypes, onManageSubjects, onSave, onDelete, onSaveActivityType, onDeleteActivityType }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [weeklyModalOpen, setWeeklyModalOpen] = useState(false);
  const [weeklyEditing, setWeeklyEditing] = useState<WeeklyQuest | null>(null);
  const [weeklyDraft, setWeeklyDraft] = useState<WeeklyDraft>({ title: "Mi horario semanal", startDate: getMondayIso(), endDate: "" });
  const [dailyModalOpen, setDailyModalOpen] = useState(false);
  const [dailyDraft, setDailyDraft] = useState<DailyClassQuest>(emptyDailyQuest(1, subjects, activityTypes));
  const [typesModalOpen, setTypesModalOpen] = useState(false);
  const selectedWeeklyQuest = weeklyQuests.find((weeklyQuest) => weeklyQuest.id === selectedId) ?? weeklyQuests.find((weeklyQuest) => weeklyQuest.id === focusedWeeklyQuestId) ?? weeklyQuests[0] ?? null;
  const orderedDailyMissions = selectedWeeklyQuest ? sortDailyMissionsByTime(selectedWeeklyQuest.dailyMissions) : [];

  const classesByDay = useMemo(() => {
    const grouped = new Map<Weekday, DailyClassQuest[]>();
    ([1, 2, 3, 4, 5, 6, 7] as Weekday[]).forEach((day) => grouped.set(day, []));
    orderedDailyMissions.forEach((dailyMission) => grouped.get(dailyMission.dayOfWeek)?.push(dailyMission));
    grouped.forEach((classes, day) => grouped.set(day, sortDailyMissionsByTime(classes)));
    return grouped;
  }, [orderedDailyMissions]);

  const openNewWeekly = () => {
    setWeeklyEditing(null);
    setWeeklyDraft({ title: "Mi horario semanal", startDate: getMondayIso(), endDate: "" });
    setWeeklyModalOpen(true);
  };
  const openEditWeekly = (weeklyQuest: WeeklyQuest) => {
    setWeeklyEditing(weeklyQuest);
    setWeeklyDraft({ title: weeklyQuest.title, startDate: weeklyQuest.startDate, endDate: weeklyQuest.endDate ?? "" });
    setWeeklyModalOpen(true);
  };
  const saveWeekly = (event: FormEvent) => {
    event.preventDefault();
    const weeklyQuest: WeeklyQuest = weeklyEditing ? {
      ...weeklyEditing,
      title: weeklyDraft.title.trim(),
      startDate: weeklyDraft.startDate,
      endDate: weeklyDraft.endDate || undefined,
    } : {
      id: crypto.randomUUID(),
      title: weeklyDraft.title.trim(),
      startDate: weeklyDraft.startDate,
      endDate: weeklyDraft.endDate || undefined,
      active: true,
      dailyMissions: [],
    };
    onSave(weeklyQuest);
    setSelectedId(weeklyQuest.id);
    setWeeklyModalOpen(false);
  };

  const openNewDaily = (dayOfWeek: Weekday) => {
    setDailyDraft(emptyDailyQuest(dayOfWeek, subjects, activityTypes));
    setDailyModalOpen(true);
  };
  const openEditDaily = (dailyMission: DailyClassQuest) => {
    setDailyDraft(dailyMission);
    setDailyModalOpen(true);
  };
  const saveDaily = (event: FormEvent) => {
    event.preventDefault();
    if (!selectedWeeklyQuest) return;
    const activityType = resolveActivityType(activityTypes, dailyDraft.activityTypeId, dailyDraft.activityTypeName);
    if (!activityType) return;
    const isClass = activityType.category === "class";
    const dailyMission = { ...dailyDraft, id: dailyDraft.id || crypto.randomUUID(), title: dailyDraft.title.trim(), subject: isClass ? dailyDraft.subject?.trim() : undefined, subjectId: isClass ? dailyDraft.subjectId : undefined, activityTypeId: activityType.id, activityTypeName: activityType.name, activityCategory: activityType.category, activityPoints: activityType.points, location: dailyDraft.location?.trim(), notes: dailyDraft.notes?.trim() };
    const dailyMissions = sortDailyMissionsByTime(
      selectedWeeklyQuest.dailyMissions.some((item) => item.id === dailyMission.id)
        ? selectedWeeklyQuest.dailyMissions.map((item) => item.id === dailyMission.id ? dailyMission : item)
        : [...selectedWeeklyQuest.dailyMissions, dailyMission],
    );
    onSave({ ...selectedWeeklyQuest, dailyMissions });
    setDailyModalOpen(false);
  };
  const deleteDaily = () => {
    if (!selectedWeeklyQuest || !dailyDraft.id) return;
    onSave({ ...selectedWeeklyQuest, dailyMissions: sortDailyMissionsByTime(selectedWeeklyQuest.dailyMissions.filter((item) => item.id !== dailyDraft.id)) });
    setDailyModalOpen(false);
  };
  const selectedDailySubject = findSubject(subjects, dailyDraft.subject, dailyDraft.subjectId);
  const selectedActivityType = resolveActivityType(activityTypes, dailyDraft.activityTypeId, dailyDraft.activityTypeName);

  return (
    <div className="weekly-schedule-view">
      <header className="weekly-heading">
        <div><span className="eyebrow">RUTINAS DEL GREMIO</span><h1>Misiones <i>Semanales</i></h1><p>Convierte clases, estudio, deporte y tus rutinas en una campaña recurrente.</p></div>
        <div className="weekly-heading-actions"><button className="secondary-button compact" type="button" onClick={() => setTypesModalOpen(true)}><Settings2 size={16} /> Tipos y XP</button><button className="primary-button compact" type="button" onClick={openNewWeekly}><Plus size={18} /> Nueva semana</button></div>
      </header>

      <div className="weekly-quest-tabs" aria-label="Misiones semanales">
        {weeklyQuests.map((weeklyQuest) => (
          <button key={weeklyQuest.id} type="button" className={selectedWeeklyQuest?.id === weeklyQuest.id ? "active" : ""} onClick={() => setSelectedId(weeklyQuest.id)}>
            <span><CalendarRange size={17} /></span>
            <span><strong>{weeklyQuest.title}</strong><small>{weeklyQuest.dailyMissions.length} actividades · {weeklyQuest.active ? "Activa" : "En pausa"}</small></span>
            {selectedWeeklyQuest?.id === weeklyQuest.id && <Check size={14} />}
          </button>
        ))}
        <button className="add-week-tab" type="button" onClick={openNewWeekly}><Plus size={17} /><span>Crear misión semanal</span></button>
      </div>

      {selectedWeeklyQuest ? (
        <>
          <section className="weekly-command-bar">
            <div><span className={`weekly-status ${selectedWeeklyQuest.active ? "active" : "paused"}`}><i />{selectedWeeklyQuest.active ? "PROYECTANDO EN EL CALENDARIO" : "RUTINA EN PAUSA"}</span><h2>{selectedWeeklyQuest.title}</h2><p>Desde {selectedWeeklyQuest.startDate}{selectedWeeklyQuest.endDate ? ` hasta ${selectedWeeklyQuest.endDate}` : " · sin fecha final"}</p></div>
            <div className="weekly-command-actions">
              <button type="button" onClick={() => onSave({ ...selectedWeeklyQuest, active: !selectedWeeklyQuest.active })}><Power size={15} /> {selectedWeeklyQuest.active ? "Pausar" : "Activar"}</button>
              <button type="button" onClick={() => openEditWeekly(selectedWeeklyQuest)}><Pencil size={15} /> Editar</button>
            </div>
          </section>

          <section className="weekly-board" aria-label={`Horario de ${selectedWeeklyQuest.title}`}>
            {([1, 2, 3, 4, 5, 6, 7] as Weekday[]).map((day) => {
              const dayClasses = classesByDay.get(day) ?? [];
              return (
                <div className={`schedule-day ${day > 5 ? "weekend" : ""}`} key={day}>
                  <header><div><span>{weekdayMeta[day].short}</span><strong>{weekdayMeta[day].label}</strong></div><button type="button" onClick={() => openNewDaily(day)} aria-label={`Agregar clase el ${weekdayMeta[day].label}`}><Plus size={15} /></button></header>
                  <div className="schedule-day-list">
                    {dayClasses.map((dailyMission) => (
                      <button key={dailyMission.id} type="button" className={`daily-class-card activity-tone-${resolveActivityType(activityTypes, dailyMission.activityTypeId, dailyMission.activityTypeName).tone}`} onClick={() => openEditDaily(dailyMission)}>
                        <span className="class-time"><Clock3 size={11} />{dailyMission.startTime}</span>
                        <strong>{dailyMission.title}</strong>
                        <small>{dailyMission.activityCategory === "class" ? dailyMission.subject : dailyMission.activityTypeName ?? "Actividad"}</small>
                        <b className="schedule-xp"><Sparkles size={10} />+{dailyMission.activityPoints ?? 10} XP</b>
                        {dailyMission.location && <span className="class-location"><MapPin size={10} />{dailyMission.location}</span>}
                      </button>
                    ))}
                    {!dayClasses.length && <button className="empty-class-slot" type="button" onClick={() => openNewDaily(day)}><Plus size={13} /> Agregar actividad</button>}
                  </div>
                </div>
              );
            })}
          </section>
          <div className="weekly-calendar-note"><CalendarRange size={16} /><span><strong>Sincronizado con el mapa principal.</strong> Cada actividad aparecerá automáticamente y podrás completarla por separado cada día.</span></div>
        </>
      ) : (
        <div className="weekly-empty"><CalendarRange size={42} /><h2>{loading ? "Consultando tus rutinas..." : "Crea tu primera misión semanal"}</h2><p>Define desde cuándo se repite y añade las clases que corresponden a cada día.</p>{!loading && <button type="button" onClick={openNewWeekly}>Crear mi horario</button>}</div>
      )}

      {weeklyModalOpen && (
        <div className="modal-backdrop" onMouseDown={() => setWeeklyModalOpen(false)}>
          <section className="mission-modal schedule-modal" role="dialog" aria-modal="true" aria-labelledby="weekly-modal-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-heading"><div className="modal-icon"><CalendarRange size={20} /></div><div><span className="eyebrow">MISIÓN SEMANAL</span><h2 id="weekly-modal-title">{weeklyEditing ? "Editar horario" : "Nueva rutina"}</h2></div><button className="icon-button" type="button" onClick={() => setWeeklyModalOpen(false)} aria-label="Cerrar"><X size={20} /></button></div>
            <form onSubmit={saveWeekly}>
              <label>Nombre de la misión semanal<input required autoFocus value={weeklyDraft.title} onChange={(event) => setWeeklyDraft({ ...weeklyDraft, title: event.target.value })} placeholder="Ej. Horario del semestre" /></label>
              <div className="form-row"><label>Comienza<input required type="date" value={weeklyDraft.startDate} onChange={(event) => setWeeklyDraft({ ...weeklyDraft, startDate: event.target.value })} /></label><label>Termina <span className="optional">(opcional)</span><input type="date" min={weeklyDraft.startDate} value={weeklyDraft.endDate} onChange={(event) => setWeeklyDraft({ ...weeklyDraft, endDate: event.target.value })} /></label></div>
              <p className="schedule-form-help">Las clases se repetirán cada semana dentro de este intervalo.</p>
              <div className="modal-actions">
                {weeklyEditing ? <button type="button" className="delete-button" onClick={() => { onDelete(weeklyEditing.id); setWeeklyModalOpen(false); }}>Eliminar horario</button> : <span />}
                <div><button type="button" className="secondary-button" onClick={() => setWeeklyModalOpen(false)}>Cancelar</button><button type="submit" className="primary-button">Guardar semana</button></div>
              </div>
            </form>
          </section>
        </div>
      )}

      {dailyModalOpen && selectedWeeklyQuest && (
        <div className="modal-backdrop" onMouseDown={() => setDailyModalOpen(false)}>
          <section className="mission-modal schedule-modal" role="dialog" aria-modal="true" aria-labelledby="daily-modal-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-heading"><div className="modal-icon">{selectedActivityType?.category === "class" ? <BookOpen size={20} /> : <Activity size={20} />}</div><div><span className="eyebrow">MISIÓN DIARIA</span><h2 id="daily-modal-title">{dailyDraft.id ? "Editar actividad" : "Nueva actividad"}</h2></div><button className="icon-button" type="button" onClick={() => setDailyModalOpen(false)} aria-label="Cerrar"><X size={20} /></button></div>
            <form onSubmit={saveDaily}>
              <label>Nombre de la actividad<input required autoFocus value={dailyDraft.title} onChange={(event) => setDailyDraft({ ...dailyDraft, title: event.target.value })} placeholder="Ej. Laboratorio, gimnasio o lectura" /></label>
              <div className="activity-type-select-field">
                <label>Tipo de actividad<select required value={selectedActivityType?.id ?? ""} onChange={(event) => { const type = activityTypes.find((item) => item.id === event.target.value); if (type) setDailyDraft({ ...dailyDraft, activityTypeId: type.id, activityTypeName: type.name, activityCategory: type.category, activityPoints: type.points, subject: type.category === "class" ? dailyDraft.subject ?? subjects[0]?.name : undefined, subjectId: type.category === "class" ? dailyDraft.subjectId ?? subjects[0]?.id : undefined }); }}><option value="" disabled>{activityTypes.length ? "Selecciona un tipo" : "Configura un tipo"}</option>{activityTypes.map((type) => <option key={type.id} value={type.id}>{type.name} · +{type.points} XP</option>)}</select></label>
                <button type="button" onClick={() => setTypesModalOpen(true)}>Configurar tipos</button>
              </div>
              {selectedActivityType && <div className={`activity-reward-preview activity-tone-${selectedActivityType.tone}`}><span>{selectedActivityType.category === "class" ? <BookOpen size={15} /> : <Activity size={15} />}{selectedActivityType.category === "class" ? "Se vincula a una materia" : "Actividad general"}</span><strong><Sparkles size={13} /> +{selectedActivityType.points} XP</strong></div>}
              {selectedActivityType?.category === "class" && <div className="subject-select-field">
                <label>Materia<select required value={selectedDailySubject?.id ?? ""} onChange={(event) => { const subject = subjects.find((item) => item.id === event.target.value); if (subject) setDailyDraft({ ...dailyDraft, subject: subject.name, subjectId: subject.id }); }}><option value="" disabled>{subjects.length ? "Selecciona una materia" : "Primero crea una materia"}</option>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label>
                <button type="button" onClick={() => { setDailyModalOpen(false); onManageSubjects(); }}>{subjects.length ? "Administrar materias" : "+ Crear materia"}</button>
              </div>}
              <div className="form-row"><label>Día<select value={dailyDraft.dayOfWeek} onChange={(event) => setDailyDraft({ ...dailyDraft, dayOfWeek: Number(event.target.value) as Weekday })}>{([1, 2, 3, 4, 5, 6, 7] as Weekday[]).map((day) => <option key={day} value={day}>{weekdayMeta[day].label}</option>)}</select></label><label>Lugar<input value={dailyDraft.location ?? ""} onChange={(event) => setDailyDraft({ ...dailyDraft, location: event.target.value })} placeholder="Aula 204" /></label></div>
              <div className="form-row time-range-row">
                <TimeField label="Comienza" required value={dailyDraft.startTime} onChange={(startTime) => setDailyDraft((current) => ({ ...current, startTime }))} />
                <TimeField label="Termina" required after={dailyDraft.startTime} value={dailyDraft.endTime} onChange={(endTime) => setDailyDraft((current) => ({ ...current, endTime }))} />
              </div>
              <label>Notas <span className="optional">(opcional)</span><textarea rows={3} value={dailyDraft.notes ?? ""} onChange={(event) => setDailyDraft({ ...dailyDraft, notes: event.target.value })} placeholder="Profesor, materiales o recordatorios..." /></label>
              <div className="modal-actions">
                {dailyDraft.id ? <button type="button" className="delete-button" onClick={deleteDaily}><Trash2 size={14} /> Eliminar actividad</button> : <span />}
                <div><button type="button" className="secondary-button" onClick={() => setDailyModalOpen(false)}>Cancelar</button><button type="submit" className="primary-button"><ScrollText size={14} /> Guardar actividad</button></div>
              </div>
            </form>
          </section>
        </div>
      )}
      <ActivityTypesManager open={typesModalOpen} activityTypes={activityTypes} weeklyQuests={weeklyQuests} onClose={() => setTypesModalOpen(false)} onSave={onSaveActivityType} onDelete={onDeleteActivityType} />
    </div>
  );
}
