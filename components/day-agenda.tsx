"use client";

import { Activity, BookOpen, Check, Clock3, Flag, MapPin } from "lucide-react";
import type { ActivityType } from "@/lib/activity-types";
import { resolveActivityType } from "@/lib/activity-types";
import type { Mission } from "@/lib/missions";
import { priorityMeta } from "@/lib/missions";
import { getScheduledActivityLabel, type ScheduledOccurrence } from "@/lib/schedule";
import { formatTime12Hour, formatTimeRange12Hour, minutesToTime, timeToMinutes } from "@/lib/time";

type Props = {
  missions: Mission[];
  activities: ScheduledOccurrence[];
  activityTypes: ActivityType[];
  onEditMission: (mission: Mission) => void;
  onToggleMission: (id: string) => void;
  onOpenActivity: (activity: ScheduledOccurrence) => void;
  onToggleActivity: (activity: ScheduledOccurrence) => void;
};

const DAY_START = 7 * 60;
const DAY_END = 22 * 60;
const HOUR_HEIGHT = 68;

export function DayAgenda({ missions, activities, activityTypes, onEditMission, onToggleMission, onOpenActivity, onToggleActivity }: Props) {
  const hours = Array.from({ length: (DAY_END - DAY_START) / 60 + 1 }, (_, index) => DAY_START + index * 60);
  const events = [
    ...activities.map((activity) => ({
      id: activity.occurrenceId,
      kind: "activity" as const,
      start: timeToMinutes(activity.startTime) ?? DAY_START,
      end: timeToMinutes(activity.endTime) ?? DAY_START + 60,
      activity,
    })),
    ...missions.map((mission) => {
      const start = timeToMinutes(mission.time) ?? DAY_START;
      return { id: mission.id, kind: "mission" as const, start, end: start + (mission.durationMinutes ?? 60), mission };
    }),
  ].filter((event) => event.end > DAY_START && event.start < DAY_END).sort((a, b) => a.start - b.start || a.end - b.end);

  return <div className="day-agenda" aria-label="Agenda del día por horas">
    <div className="day-agenda-hours" aria-hidden="true">
      {hours.map((minute) => <div key={minute} style={{ top: `${((minute - DAY_START) / 60) * HOUR_HEIGHT}px` }}><time>{formatTime12Hour(minutesToTime(minute))}</time><span /></div>)}
    </div>
    <div className="day-agenda-events" style={{ height: `${((DAY_END - DAY_START) / 60) * HOUR_HEIGHT}px` }}>
      {events.map((event) => {
        const clippedStart = Math.max(DAY_START, event.start);
        const clippedEnd = Math.min(DAY_END, event.end);
        const style = { top: `${((clippedStart - DAY_START) / 60) * HOUR_HEIGHT + 4}px`, height: `${Math.max(48, ((clippedEnd - clippedStart) / 60) * HOUR_HEIGHT - 8)}px` };
        if (event.kind === "activity") {
          const activity = event.activity;
          const type = resolveActivityType(activityTypes, activity.activityTypeId, activity.activityTypeName);
          return <article key={event.id} style={style} className={`day-agenda-event activity-event activity-tone-${type.tone} ${activity.completed ? "completed" : ""}`} onClick={() => onOpenActivity(activity)}>
            <button type="button" onClick={(click) => { click.stopPropagation(); onToggleActivity(activity); }} aria-label={activity.completed ? "Marcar actividad pendiente" : "Completar actividad"}>{activity.completed ? <Check size={13} /> : activity.activityCategory === "class" ? <BookOpen size={13} /> : <Activity size={13} />}</button>
            <div><time><Clock3 size={11} />{formatTimeRange12Hour(activity.startTime, activity.endTime)}</time><strong>{getScheduledActivityLabel(activity)}</strong><small>{activity.activityTypeName ?? "Actividad"}{activity.location ? <><MapPin size={10} />{activity.location}</> : null}</small></div>
          </article>;
        }
        const mission = event.mission;
        const endTime = minutesToTime(event.end);
        return <article key={event.id} style={style} className={`day-agenda-event mission-event ${mission.priority} ${mission.completed ? "completed" : ""}`} onClick={() => onEditMission(mission)}>
          <button type="button" onClick={(click) => { click.stopPropagation(); onToggleMission(mission.id); }} aria-label={mission.completed ? "Marcar misión pendiente" : "Completar misión"}>{mission.completed ? <Check size={13} /> : <Flag size={13} />}</button>
          <div><time><Clock3 size={11} />{formatTimeRange12Hour(mission.time, endTime)}</time><strong>{mission.subject} · {mission.title}</strong><small>{priorityMeta[mission.priority].label}{mission.durationMinutes ? ` · ${mission.durationMinutes / 60} h` : ""}</small></div>
        </article>;
      })}
      {!events.length && <div className="day-agenda-empty"><Clock3 size={22} /><strong>Día completamente libre</strong><span>No hay bloques entre 7:00 AM y 10:00 PM.</span></div>}
    </div>
  </div>;
}
