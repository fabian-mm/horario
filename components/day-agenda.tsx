"use client";

import { Activity, BookOpen, Check, Clock3, Flag, MapPin } from "lucide-react";
import type { ActivityType } from "@/lib/activity-types";
import { resolveActivityType } from "@/lib/activity-types";
import { getAgendaBounds, layoutAgendaEvents } from "@/lib/agenda";
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

const DEFAULT_DAY_START = 7 * 60;
const DEFAULT_DAY_END = 22 * 60;
const HOUR_HEIGHT = 68;

export function DayAgenda({ missions, activities, activityTypes, onEditMission, onToggleMission, onOpenActivity, onToggleActivity }: Props) {
  const rawEvents = [
    ...activities.map((activity) => ({
      id: activity.occurrenceId,
      kind: "activity" as const,
      start: timeToMinutes(activity.startTime) ?? DEFAULT_DAY_START,
      end: timeToMinutes(activity.endTime) ?? DEFAULT_DAY_START + 60,
      activity,
    })),
    ...missions.map((mission) => {
      const start = timeToMinutes(mission.time) ?? DEFAULT_DAY_START;
      return { id: mission.id, kind: "mission" as const, start, end: start + (mission.durationMinutes ?? 60), mission };
    }),
  ].filter((event) => event.end > 0 && event.start < 24 * 60);
  const { start: dayStart, end: dayEnd } = getAgendaBounds(rawEvents, DEFAULT_DAY_START, DEFAULT_DAY_END);
  const hours = Array.from({ length: (dayEnd - dayStart) / 60 + 1 }, (_, index) => dayStart + index * 60);
  const events = layoutAgendaEvents(rawEvents, 45);

  return <div className="day-agenda" aria-label="Agenda del día por horas">
    <div className="day-agenda-hours" aria-hidden="true">
      {hours.map((minute) => <div key={minute} style={{ top: `${((minute - dayStart) / 60) * HOUR_HEIGHT}px` }}><time>{minute === 24 * 60 ? "12:00 AM" : formatTime12Hour(minutesToTime(minute))}</time><span /></div>)}
    </div>
    <div className="day-agenda-events" style={{ height: `${((dayEnd - dayStart) / 60) * HOUR_HEIGHT}px` }}>
      {events.map((event) => {
        const clippedStart = Math.max(dayStart, event.start);
        const clippedEnd = Math.min(dayEnd, event.end);
        const laneWidth = 100 / event.laneCount;
        const style = {
          top: `${((clippedStart - dayStart) / 60) * HOUR_HEIGHT + 4}px`,
          height: `${Math.max(48, ((clippedEnd - clippedStart) / 60) * HOUR_HEIGHT - 8)}px`,
          left: `calc(${event.lane * laneWidth}% + ${event.lane > 0 ? 3 : 0}px)`,
          right: "auto",
          width: `calc(${laneWidth}% - ${event.laneCount > 1 ? 3 : 0}px)`,
          zIndex: event.lane + 1,
        };
        if (event.kind === "activity") {
          const activity = event.activity;
          const type = resolveActivityType(activityTypes, activity.activityTypeId, activity.activityTypeName);
          return <article key={event.id} style={style} className={`day-agenda-event activity-event activity-tone-${type.tone} ${activity.completed ? "completed" : ""}`} onClick={() => onOpenActivity(activity)}>
            <button type="button" onClick={(click) => { click.stopPropagation(); onToggleActivity(activity); }} aria-label={activity.completed ? "Marcar actividad pendiente" : "Completar actividad"}>{activity.completed ? <Check size={13} /> : activity.activityCategory === "class" ? <BookOpen size={13} /> : <Activity size={13} />}</button>
            <div><time><Clock3 size={11} />{formatTimeRange12Hour(activity.startTime, activity.endTime)}</time><strong>{getScheduledActivityLabel(activity)}</strong><small>{activity.activityTypeName ?? "Actividad"}{activity.location ? <><MapPin size={10} />{activity.location}</> : null}</small></div>
          </article>;
        }
        const mission = event.mission;
        const endTime = minutesToTime(Math.min(event.end, 24 * 60 - 1));
        return <article key={event.id} style={style} className={`day-agenda-event mission-event ${mission.priority} ${mission.completed ? "completed" : ""}`} onClick={() => onEditMission(mission)}>
          <button type="button" onClick={(click) => { click.stopPropagation(); onToggleMission(mission.id); }} aria-label={mission.completed ? "Marcar misión pendiente" : "Completar misión"}>{mission.completed ? <Check size={13} /> : <Flag size={13} />}</button>
          <div><time><Clock3 size={11} />{formatTimeRange12Hour(mission.time, endTime)}</time><strong>{mission.subject} · {mission.title}</strong><small>{priorityMeta[mission.priority].label}{mission.durationMinutes ? ` · ${mission.durationMinutes / 60} h` : ""}</small></div>
        </article>;
      })}
      {!events.length && <div className="day-agenda-empty"><Clock3 size={22} /><strong>Día completamente libre</strong><span>No hay actividades programadas para este día.</span></div>}
    </div>
  </div>;
}
