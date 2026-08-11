"use client";

import { DragEvent, FormEvent, PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { Activity, BookOpen, CalendarRange, Check, ChevronLeft, ChevronRight, ClipboardPaste, Clock3, Copy, GripVertical, MapPin, Pencil, Plus, Power, ScrollText, Settings2, Sparkles, Trash2, X } from "lucide-react";
import { ActivityTypesManager } from "@/components/activity-types-manager";
import type { ActivityType } from "@/lib/activity-types";
import { findActivityType, resolveActivityType } from "@/lib/activity-types";
import { DailyClassQuest, duplicateScheduledActivity, getMondayIso, getScheduledActivityLabel, moveScheduledActivity, sortDailyMissionsByTime, Weekday, WeeklyQuest, weekdayMeta } from "@/lib/schedule";
import { findSubject, Subject } from "@/lib/subjects";
import { TimeField } from "@/components/time-field";
import { formatTimeRange12Hour, isTimeBlockWithinDay, shiftTime, timeToMinutes } from "@/lib/time";
import { QuestTypeCards } from "@/components/quest-type-cards";

type Props = {
  weeklyQuests: WeeklyQuest[];
  loading: boolean;
  focusedWeeklyQuestId?: string | null;
  subjects: Subject[];
  activityTypes: ActivityType[];
  onManageSubjects: () => void;
  onSave: (weeklyQuest: WeeklyQuest) => void;
  onDelete: (id: string) => void;
  onSaveActivityType: (activityType: ActivityType) => Promise<ActivityType | null>;
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
  endTime: "10:00",
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
  const [dailyFormError, setDailyFormError] = useState<string | null>(null);
  const [copiedDailyMission, setCopiedDailyMission] = useState<DailyClassQuest | null>(null);
  const [draggedDailyMissionId, setDraggedDailyMissionId] = useState<string | null>(null);
  const [dragOverDay, setDragOverDay] = useState<Weekday | null>(null);
  const [openBubbleActionsId, setOpenBubbleActionsId] = useState<string | null>(null);
  const [weeklyActionFeedback, setWeeklyActionFeedback] = useState<string | null>(null);
  const pointerDragIdRef = useRef<string | null>(null);
  const pointerDragTargetRef = useRef<Weekday | null>(null);
  const pointerDragStartRef = useRef<{ x: number; y: number } | null>(null);
  const pointerDragMovedRef = useRef(false);
  const selectedWeeklyQuest = weeklyQuests.find((weeklyQuest) => weeklyQuest.id === selectedId) ?? weeklyQuests.find((weeklyQuest) => weeklyQuest.id === focusedWeeklyQuestId) ?? weeklyQuests[0] ?? null;
  const classesByDay = useMemo(() => {
    const grouped = new Map<Weekday, DailyClassQuest[]>();
    ([1, 2, 3, 4, 5, 6, 7] as Weekday[]).forEach((day) => grouped.set(day, []));
    const orderedDailyMissions = selectedWeeklyQuest ? sortDailyMissionsByTime(selectedWeeklyQuest.dailyMissions) : [];
    orderedDailyMissions.forEach((dailyMission) => grouped.get(dailyMission.dayOfWeek)?.push(dailyMission));
    grouped.forEach((classes, day) => grouped.set(day, sortDailyMissionsByTime(classes)));
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
    setDailyFormError(null);
    setDailyDraft(emptyDailyQuest(dayOfWeek, subjects, activityTypes));
    setDailyModalOpen(true);
  };
  const openEditDaily = (dailyMission: DailyClassQuest) => {
    setOpenBubbleActionsId(null);
    setDailyFormError(null);
    setDailyDraft({ ...dailyMission, title: "" });
    setDailyModalOpen(true);
  };
  const saveDaily = (event: FormEvent) => {
    event.preventDefault();
    if (!selectedWeeklyQuest) return;
    const activityType = findActivityType(activityTypes, dailyDraft.activityTypeId, dailyDraft.activityTypeName);
    if (!activityType) {
      setDailyFormError("Ese tipo de actividad ya no existe. Selecciona otro antes de guardar.");
      return;
    }
    const isClass = activityType.category === "class";
    const subject = isClass ? dailyDraft.subject?.trim() : undefined;
    const automaticTitle = subject ? `${activityType.name} · ${subject}` : activityType.name;
    const dailyMission = { ...dailyDraft, id: dailyDraft.id || crypto.randomUUID(), title: automaticTitle, subject, subjectId: isClass ? dailyDraft.subjectId : undefined, activityTypeId: activityType.id, activityTypeName: activityType.name, activityCategory: activityType.category, activityPoints: activityType.points, location: dailyDraft.location?.trim(), notes: dailyDraft.notes?.trim() };
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
  const copyDaily = (dailyMission: DailyClassQuest) => {
    setOpenBubbleActionsId(null);
    setCopiedDailyMission({ ...dailyMission });
    setWeeklyActionFeedback(`${getScheduledActivityLabel(dailyMission)} copiada. Elige un día para pegarla.`);
  };
  const pasteDaily = (dayOfWeek: Weekday) => {
    if (!selectedWeeklyQuest || !copiedDailyMission) return;
    const duplicate = duplicateScheduledActivity(copiedDailyMission, dayOfWeek, crypto.randomUUID());
    onSave({ ...selectedWeeklyQuest, dailyMissions: sortDailyMissionsByTime([...selectedWeeklyQuest.dailyMissions, duplicate]) });
    setWeeklyActionFeedback(`${getScheduledActivityLabel(duplicate)} pegada en ${weekdayMeta[dayOfWeek].label}.`);
  };
  const moveDaily = (activityId: string, dayOfWeek: Weekday) => {
    setOpenBubbleActionsId(null);
    if (!selectedWeeklyQuest) return;
    const activity = selectedWeeklyQuest.dailyMissions.find((item) => item.id === activityId);
    if (!activity || activity.dayOfWeek === dayOfWeek) return;
    onSave({ ...selectedWeeklyQuest, dailyMissions: moveScheduledActivity(selectedWeeklyQuest.dailyMissions, activityId, dayOfWeek) });
    setWeeklyActionFeedback(`${getScheduledActivityLabel(activity)} movida a ${weekdayMeta[dayOfWeek].label}.`);
  };
  const startDraggingDaily = (event: DragEvent<HTMLElement>, dailyMission: DailyClassQuest) => {
    setOpenBubbleActionsId(null);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", dailyMission.id);
    setDraggedDailyMissionId(dailyMission.id);
    setDragOverDay(dailyMission.dayOfWeek);
  };
  const dropDaily = (event: DragEvent<HTMLElement>, dayOfWeek: Weekday) => {
    event.preventDefault();
    const activityId = event.dataTransfer.getData("text/plain") || draggedDailyMissionId;
    if (activityId) moveDaily(activityId, dayOfWeek);
    setDraggedDailyMissionId(null);
    setDragOverDay(null);
  };
  const startPointerDragging = (event: ReactPointerEvent<HTMLButtonElement>, dailyMission: DailyClassQuest) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    pointerDragIdRef.current = dailyMission.id;
    pointerDragTargetRef.current = dailyMission.dayOfWeek;
    pointerDragStartRef.current = { x: event.clientX, y: event.clientY };
    pointerDragMovedRef.current = false;
    setDraggedDailyMissionId(dailyMission.id);
    setDragOverDay(dailyMission.dayOfWeek);
  };
  const updatePointerDragging = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!pointerDragIdRef.current) return;
    event.preventDefault();
    const start = pointerDragStartRef.current;
    if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 8) pointerDragMovedRef.current = true;
    const dayElement = document.elementFromPoint(event.clientX, event.clientY)?.closest("[data-weekday]") as HTMLElement | null;
    const day = Number(dayElement?.dataset.weekday) as Weekday;
    if (day >= 1 && day <= 7) {
      pointerDragTargetRef.current = day;
      setDragOverDay(day);
    }
  };
  const finishPointerDragging = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    const activityId = pointerDragIdRef.current;
    if (activityId && pointerDragMovedRef.current && pointerDragTargetRef.current) moveDaily(activityId, pointerDragTargetRef.current);
    if (activityId && !pointerDragMovedRef.current) setOpenBubbleActionsId((current) => current === activityId ? null : activityId);
    pointerDragIdRef.current = null;
    pointerDragTargetRef.current = null;
    pointerDragStartRef.current = null;
    pointerDragMovedRef.current = false;
    setDraggedDailyMissionId(null);
    setDragOverDay(null);
  };
  const cancelPointerDragging = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    pointerDragIdRef.current = null;
    pointerDragTargetRef.current = null;
    pointerDragStartRef.current = null;
    pointerDragMovedRef.current = false;
    setDraggedDailyMissionId(null);
    setDragOverDay(null);
  };

  useEffect(() => {
    if (!weeklyActionFeedback) return;
    const timer = window.setTimeout(() => setWeeklyActionFeedback(null), 4200);
    return () => window.clearTimeout(timer);
  }, [weeklyActionFeedback]);
  const selectedDailySubject = findSubject(subjects, dailyDraft.subject, dailyDraft.subjectId);
  const selectedActivityType = resolveActivityType(activityTypes, dailyDraft.activityTypeId, dailyDraft.activityTypeName);
  const selectActivityType = (type: ActivityType) => {
    setDailyFormError(null);
    setDailyDraft((current) => ({ ...current, activityTypeId: type.id, activityTypeName: type.name, activityCategory: type.category, activityPoints: type.points, subject: type.category === "class" ? current.subject ?? subjects[0]?.name : undefined, subjectId: type.category === "class" ? current.subjectId ?? subjects[0]?.id : undefined }));
  };
  const saveAndSelectActivityType = async (type: ActivityType) => {
    const saved = await onSaveActivityType(type);
    if (saved && dailyModalOpen) selectActivityType(saved);
    return saved;
  };
  const currentDuration = Math.max(0, (timeToMinutes(dailyDraft.endTime) ?? 0) - (timeToMinutes(dailyDraft.startTime) ?? 0));
  const setDuration = (durationMinutes: 60 | 120) => {
    const endTime = shiftTime(dailyDraft.startTime, durationMinutes);
    if (!endTime) {
      setDailyFormError("Ese bloque terminaría después de medianoche. Elige una hora más temprana.");
      return;
    }
    setDailyFormError(null);
    setDailyDraft((current) => ({ ...current, endTime }));
  };
  const setStartTime = (startTime: string) => {
    const duration = currentDuration === 60 ? 60 : 120;
    const endTime = shiftTime(startTime, duration);
    if (!endTime) {
      setDailyFormError("La hora elegida no permite completar el bloque antes de medianoche.");
      return;
    }
    setDailyFormError(null);
    setDailyDraft((current) => ({ ...current, startTime, endTime }));
  };

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

          {(copiedDailyMission || weeklyActionFeedback) && (
            <div className="weekly-clipboard-bar" role="status" aria-live="polite">
              <span className="weekly-clipboard-icon"><Copy size={17} /></span>
              <div>
                <strong>{copiedDailyMission ? `${getScheduledActivityLabel(copiedDailyMission)} lista para pegar` : "Horario actualizado"}</strong>
                <small>{weeklyActionFeedback ?? "Usa Pegar en el día que quieras. La actividad original no cambiará."}</small>
              </div>
              {copiedDailyMission && <button type="button" onClick={() => setCopiedDailyMission(null)} aria-label="Vaciar actividad copiada"><X size={16} /></button>}
            </div>
          )}

          <section className="weekly-board" aria-label={`Horario de ${selectedWeeklyQuest.title}`}>
            {([1, 2, 3, 4, 5, 6, 7] as Weekday[]).map((day) => {
              const dayClasses = sortDailyMissionsByTime(classesByDay.get(day) ?? []);
              return (
                <div
                  className={`schedule-day ${day > 5 ? "weekend" : ""} ${dragOverDay === day ? "drag-over" : ""}`}
                  key={day}
                  data-weekday={day}
                  onDragEnter={() => draggedDailyMissionId && setDragOverDay(day)}
                  onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }}
                  onDrop={(event) => dropDaily(event, day)}
                >
                  <header>
                    <div><span>{weekdayMeta[day].short}</span><strong>{weekdayMeta[day].label}</strong></div>
                    <div className="schedule-day-actions">
                      {copiedDailyMission && <button className="paste-day-button" type="button" onClick={() => pasteDaily(day)} aria-label={`Pegar ${getScheduledActivityLabel(copiedDailyMission)} el ${weekdayMeta[day].label}`} title="Pegar actividad"><ClipboardPaste size={15} /><span>Pegar</span></button>}
                      {!!dayClasses.length && <button type="button" onClick={() => openNewDaily(day)} aria-label={`Agregar actividad el ${weekdayMeta[day].label}`} title="Agregar actividad"><Plus size={15} /></button>}
                    </div>
                  </header>
                  <div className="schedule-day-list chronological">
                    {dayClasses.map((dailyMission) => (
                      <article
                        key={dailyMission.id}
                        className={`weekly-activity-bubble ${draggedDailyMissionId === dailyMission.id ? "dragging" : ""} ${openBubbleActionsId === dailyMission.id ? "actions-open" : ""}`}
                        draggable
                        onDragStart={(event) => startDraggingDaily(event, dailyMission)}
                        onDragEnd={() => { setDraggedDailyMissionId(null); setDragOverDay(null); }}
                      >
                        <button type="button" className={`daily-class-card activity-tone-${resolveActivityType(activityTypes, dailyMission.activityTypeId, dailyMission.activityTypeName).tone}`} onClick={() => openEditDaily(dailyMission)}>
                          <span className="class-time"><Clock3 size={11} />{formatTimeRange12Hour(dailyMission.startTime, dailyMission.endTime)}</span>
                          <strong className="scheduled-activity-name">{getScheduledActivityLabel(dailyMission)}</strong>
                          <small className="scheduled-activity-caption">{dailyMission.activityCategory === "class" ? "ACTIVIDAD · MATERIA" : "ACTIVIDAD GENERAL"}</small>
                          <b className="schedule-xp"><Sparkles size={10} />+{dailyMission.activityPoints ?? 10} XP</b>
                          {dailyMission.location && <span className="class-location"><MapPin size={10} />{dailyMission.location}</span>}
                        </button>
                        <button
                          type="button"
                          className="bubble-drag-handle"
                          draggable={false}
                          onPointerDown={(event) => startPointerDragging(event, dailyMission)}
                          onPointerMove={updatePointerDragging}
                          onPointerUp={finishPointerDragging}
                          onPointerCancel={cancelPointerDragging}
                          onKeyDown={(event) => {
                            if (event.key !== "Enter" && event.key !== " ") return;
                            event.preventDefault();
                            setOpenBubbleActionsId((current) => current === dailyMission.id ? null : dailyMission.id);
                          }}
                          aria-expanded={openBubbleActionsId === dailyMission.id}
                          aria-controls={`bubble-actions-${dailyMission.id}`}
                          aria-label={`Mover o mostrar opciones de ${getScheduledActivityLabel(dailyMission)}`}
                          title="Arrastra para mover · pulsa para ver opciones"
                        ><GripVertical size={17} /></button>
                        <div id={`bubble-actions-${dailyMission.id}`} className="bubble-actions" aria-label={`Acciones para ${getScheduledActivityLabel(dailyMission)}`}>
                          <button type="button" onClick={() => copyDaily(dailyMission)} aria-label={`Copiar ${getScheduledActivityLabel(dailyMission)}`} title="Copiar"><Copy size={14} /><span>Copiar</span></button>
                          <button type="button" disabled={dailyMission.dayOfWeek === 1} onClick={() => moveDaily(dailyMission.id, (dailyMission.dayOfWeek - 1) as Weekday)} aria-label={`Mover ${getScheduledActivityLabel(dailyMission)} al día anterior`} title="Mover al día anterior"><ChevronLeft size={15} /></button>
                          <button type="button" disabled={dailyMission.dayOfWeek === 7} onClick={() => moveDaily(dailyMission.id, (dailyMission.dayOfWeek + 1) as Weekday)} aria-label={`Mover ${getScheduledActivityLabel(dailyMission)} al día siguiente`} title="Mover al día siguiente"><ChevronRight size={15} /></button>
                        </div>
                      </article>
                    ))}
                    {!dayClasses.length && <button className="empty-class-slot" type="button" onClick={() => openNewDaily(day)}><Plus size={13} /> Agregar actividad</button>}
                  </div>
                </div>
              );
            })}
          </section>
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
              <QuestTypeCards variant="large" label="¿Qué actividad se repite?" options={activityTypes.map((type) => ({ id: type.id, label: type.name, detail: `${type.category === "class" ? "Se mostrará junto a la materia" : "Actividad general"} · +${type.points} XP`, tone: type.tone }))} selectedId={selectedActivityType?.id} onSelect={(activityTypeId) => { const type = activityTypes.find((item) => item.id === activityTypeId); if (type) selectActivityType(type); }} onManage={() => setTypesModalOpen(true)} />
              <div className={`automatic-schedule-name activity-tone-${selectedActivityType?.tone ?? "sage"}`}>
                <span>NOMBRE EN EL HORARIO</span>
                <strong>{getScheduledActivityLabel({ ...dailyDraft, activityTypeName: selectedActivityType?.name, activityCategory: selectedActivityType?.category })}</strong>
                <small>Se genera automáticamente y no necesitas escribir otro nombre.</small>
              </div>
              {selectedActivityType && <div className={`activity-reward-preview activity-tone-${selectedActivityType.tone}`}><span>{selectedActivityType.category === "class" ? <BookOpen size={15} /> : <Activity size={15} />}{selectedActivityType.category === "class" ? "Se vincula a una materia" : "Actividad general"}</span><strong><Sparkles size={13} /> +{selectedActivityType.points} XP</strong></div>}
              {selectedActivityType?.category === "class" && <div className="subject-select-field">
                <label>Materia<select required value={selectedDailySubject?.id ?? ""} onChange={(event) => { const subject = subjects.find((item) => item.id === event.target.value); if (subject) setDailyDraft({ ...dailyDraft, subject: subject.name, subjectId: subject.id }); }}><option value="" disabled>{subjects.length ? "Selecciona una materia" : "Primero crea una materia"}</option>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label>
                <button type="button" onClick={() => { setDailyModalOpen(false); onManageSubjects(); }}>{subjects.length ? "Administrar materias" : "+ Crear materia"}</button>
              </div>}
              <div className="form-row"><label>Día<select value={dailyDraft.dayOfWeek} onChange={(event) => setDailyDraft({ ...dailyDraft, dayOfWeek: Number(event.target.value) as Weekday })}>{([1, 2, 3, 4, 5, 6, 7] as Weekday[]).map((day) => <option key={day} value={day}>{weekdayMeta[day].label}</option>)}</select></label><label>Lugar<input value={dailyDraft.location ?? ""} onChange={(event) => setDailyDraft({ ...dailyDraft, location: event.target.value })} placeholder="Aula 204" /></label></div>
              {selectedActivityType?.category === "class" ? <div className="class-time-block">
                <TimeField label="Hora de inicio" required value={dailyDraft.startTime} onChange={setStartTime} />
                <fieldset className="duration-fieldset"><legend>Duración de la clase</legend><div className="duration-options" role="group" aria-label="Duración de la clase">
                  {([60, 120] as const).map((duration) => {
                    const endTime = shiftTime(dailyDraft.startTime, duration);
                    return <button key={duration} type="button" disabled={!isTimeBlockWithinDay(dailyDraft.startTime, duration)} className={currentDuration === duration ? "selected" : ""} onClick={() => setDuration(duration)}><strong>{duration / 60} {duration === 60 ? "hora" : "horas"}</strong><small>{endTime ? `Hasta ${formatTimeRange12Hour(dailyDraft.startTime, endTime).split(" – ")[1]}` : "No disponible"}</small></button>;
                  })}
                </div></fieldset>
              </div> : <div className="form-row time-range-row">
                <TimeField label="Comienza" required value={dailyDraft.startTime} onChange={(startTime) => setDailyDraft((current) => ({ ...current, startTime }))} />
                <TimeField label="Termina" required after={dailyDraft.startTime} value={dailyDraft.endTime} onChange={(endTime) => setDailyDraft((current) => ({ ...current, endTime }))} />
              </div>}
              <label>Notas <span className="optional">(opcional)</span><textarea rows={3} value={dailyDraft.notes ?? ""} onChange={(event) => setDailyDraft({ ...dailyDraft, notes: event.target.value })} placeholder="Profesor, materiales o recordatorios..." /></label>
              {dailyFormError && <p className="form-error" role="alert">{dailyFormError}</p>}
              <div className="modal-actions">
                {dailyDraft.id ? <button type="button" className="delete-button" onClick={deleteDaily}><Trash2 size={14} /> Eliminar actividad</button> : <span />}
                <div><button type="button" className="secondary-button" onClick={() => setDailyModalOpen(false)}>Cancelar</button><button type="submit" className="primary-button"><ScrollText size={14} /> Guardar actividad</button></div>
              </div>
            </form>
          </section>
        </div>
      )}
      <ActivityTypesManager open={typesModalOpen} activityTypes={activityTypes} weeklyQuests={weeklyQuests} onClose={() => setTypesModalOpen(false)} onSave={saveAndSelectActivityType} onDelete={onDeleteActivityType} selectOnSave={dailyModalOpen} />
    </div>
  );
}
