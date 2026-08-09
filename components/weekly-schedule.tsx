"use client";

import { FormEvent, useMemo, useState } from "react";
import { BookOpen, CalendarRange, Check, Clock3, MapPin, Pencil, Plus, Power, ScrollText, Trash2, X } from "lucide-react";
import { DailyClassQuest, getMondayIso, Weekday, WeeklyQuest, weekdayMeta } from "@/lib/schedule";

type Props = {
  weeklyQuests: WeeklyQuest[];
  loading: boolean;
  focusedWeeklyQuestId?: string | null;
  onSave: (weeklyQuest: WeeklyQuest) => void;
  onDelete: (id: string) => void;
};

type WeeklyDraft = { title: string; startDate: string; endDate: string };

const emptyDailyQuest = (dayOfWeek: Weekday = 1): DailyClassQuest => ({
  id: "",
  title: "",
  subject: "",
  dayOfWeek,
  startTime: "08:00",
  endTime: "09:30",
  location: "",
  notes: "",
});

export function WeeklySchedule({ weeklyQuests, loading, focusedWeeklyQuestId, onSave, onDelete }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [weeklyModalOpen, setWeeklyModalOpen] = useState(false);
  const [weeklyEditing, setWeeklyEditing] = useState<WeeklyQuest | null>(null);
  const [weeklyDraft, setWeeklyDraft] = useState<WeeklyDraft>({ title: "Mi horario semanal", startDate: getMondayIso(), endDate: "" });
  const [dailyModalOpen, setDailyModalOpen] = useState(false);
  const [dailyDraft, setDailyDraft] = useState<DailyClassQuest>(emptyDailyQuest());
  const selectedWeeklyQuest = weeklyQuests.find((weeklyQuest) => weeklyQuest.id === selectedId) ?? weeklyQuests.find((weeklyQuest) => weeklyQuest.id === focusedWeeklyQuestId) ?? weeklyQuests[0] ?? null;

  const classesByDay = useMemo(() => {
    const grouped = new Map<Weekday, DailyClassQuest[]>();
    ([1, 2, 3, 4, 5, 6, 7] as Weekday[]).forEach((day) => grouped.set(day, []));
    selectedWeeklyQuest?.dailyMissions.forEach((dailyMission) => grouped.get(dailyMission.dayOfWeek)?.push(dailyMission));
    grouped.forEach((classes, day) => grouped.set(day, [...classes].sort((a, b) => a.startTime.localeCompare(b.startTime))));
    return grouped;
  }, [selectedWeeklyQuest]);

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
    setDailyDraft(emptyDailyQuest(dayOfWeek));
    setDailyModalOpen(true);
  };
  const openEditDaily = (dailyMission: DailyClassQuest) => {
    setDailyDraft(dailyMission);
    setDailyModalOpen(true);
  };
  const saveDaily = (event: FormEvent) => {
    event.preventDefault();
    if (!selectedWeeklyQuest) return;
    const dailyMission = { ...dailyDraft, id: dailyDraft.id || crypto.randomUUID(), title: dailyDraft.title.trim(), subject: dailyDraft.subject.trim(), location: dailyDraft.location?.trim(), notes: dailyDraft.notes?.trim() };
    const dailyMissions = selectedWeeklyQuest.dailyMissions.some((item) => item.id === dailyMission.id)
      ? selectedWeeklyQuest.dailyMissions.map((item) => item.id === dailyMission.id ? dailyMission : item)
      : [...selectedWeeklyQuest.dailyMissions, dailyMission];
    onSave({ ...selectedWeeklyQuest, dailyMissions });
    setDailyModalOpen(false);
  };
  const deleteDaily = () => {
    if (!selectedWeeklyQuest || !dailyDraft.id) return;
    onSave({ ...selectedWeeklyQuest, dailyMissions: selectedWeeklyQuest.dailyMissions.filter((item) => item.id !== dailyDraft.id) });
    setDailyModalOpen(false);
  };

  return (
    <div className="weekly-schedule-view">
      <header className="weekly-heading">
        <div><span className="eyebrow">RUTINAS DEL GREMIO</span><h1>Misiones <i>Semanales</i></h1><p>Convierte tu horario en una campaña recurrente de clases diarias.</p></div>
        <button className="primary-button compact" type="button" onClick={openNewWeekly}><Plus size={18} /> Nueva semana</button>
      </header>

      <div className="weekly-quest-tabs" aria-label="Misiones semanales">
        {weeklyQuests.map((weeklyQuest) => (
          <button key={weeklyQuest.id} type="button" className={selectedWeeklyQuest?.id === weeklyQuest.id ? "active" : ""} onClick={() => setSelectedId(weeklyQuest.id)}>
            <span><CalendarRange size={17} /></span>
            <span><strong>{weeklyQuest.title}</strong><small>{weeklyQuest.dailyMissions.length} clases · {weeklyQuest.active ? "Activa" : "En pausa"}</small></span>
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
                    {dayClasses.map((dailyMission, index) => (
                      <button key={dailyMission.id} type="button" className={`daily-class-card tone-${index % 4}`} onClick={() => openEditDaily(dailyMission)}>
                        <span className="class-time"><Clock3 size={11} />{dailyMission.startTime}</span>
                        <strong>{dailyMission.title}</strong>
                        <small>{dailyMission.subject}</small>
                        {dailyMission.location && <span className="class-location"><MapPin size={10} />{dailyMission.location}</span>}
                      </button>
                    ))}
                    {!dayClasses.length && <button className="empty-class-slot" type="button" onClick={() => openNewDaily(day)}><Plus size={13} /> Agregar clase</button>}
                  </div>
                </div>
              );
            })}
          </section>
          <div className="weekly-calendar-note"><CalendarRange size={16} /><span><strong>Sincronizado con el mapa principal.</strong> Cada clase aparecerá automáticamente en las fechas correspondientes mientras esta rutina esté activa.</span></div>
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
            <div className="modal-heading"><div className="modal-icon"><BookOpen size={20} /></div><div><span className="eyebrow">MISIÓN DIARIA</span><h2 id="daily-modal-title">{dailyDraft.id ? "Editar clase" : "Nueva clase"}</h2></div><button className="icon-button" type="button" onClick={() => setDailyModalOpen(false)} aria-label="Cerrar"><X size={20} /></button></div>
            <form onSubmit={saveDaily}>
              <label>Nombre de la clase<input required autoFocus value={dailyDraft.title} onChange={(event) => setDailyDraft({ ...dailyDraft, title: event.target.value })} placeholder="Ej. Laboratorio de Física" /></label>
              <label>Materia<input required value={dailyDraft.subject} onChange={(event) => setDailyDraft({ ...dailyDraft, subject: event.target.value })} placeholder="Ej. Física" /></label>
              <div className="form-row"><label>Día<select value={dailyDraft.dayOfWeek} onChange={(event) => setDailyDraft({ ...dailyDraft, dayOfWeek: Number(event.target.value) as Weekday })}>{([1, 2, 3, 4, 5, 6, 7] as Weekday[]).map((day) => <option key={day} value={day}>{weekdayMeta[day].label}</option>)}</select></label><label>Lugar<input value={dailyDraft.location ?? ""} onChange={(event) => setDailyDraft({ ...dailyDraft, location: event.target.value })} placeholder="Aula 204" /></label></div>
              <div className="form-row"><label>Comienza<input required type="time" value={dailyDraft.startTime} onChange={(event) => setDailyDraft({ ...dailyDraft, startTime: event.target.value })} /></label><label>Termina<input required type="time" min={dailyDraft.startTime} value={dailyDraft.endTime} onChange={(event) => setDailyDraft({ ...dailyDraft, endTime: event.target.value })} /></label></div>
              <label>Notas <span className="optional">(opcional)</span><textarea rows={3} value={dailyDraft.notes ?? ""} onChange={(event) => setDailyDraft({ ...dailyDraft, notes: event.target.value })} placeholder="Profesor, materiales o recordatorios..." /></label>
              <div className="modal-actions">
                {dailyDraft.id ? <button type="button" className="delete-button" onClick={deleteDaily}><Trash2 size={14} /> Eliminar clase</button> : <span />}
                <div><button type="button" className="secondary-button" onClick={() => setDailyModalOpen(false)}>Cancelar</button><button type="submit" className="primary-button"><ScrollText size={14} /> Guardar clase</button></div>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
