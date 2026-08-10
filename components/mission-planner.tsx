"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, AlertTriangle, Award, BookOpen, CalendarClock, CalendarDays, CalendarRange, Check, ChevronLeft, ChevronRight, Clock3, Compass, Crown, Flag, Flame, Gem, Globe2, Hourglass, LayoutGrid, List, LoaderCircle, MapPin, MapPinned, Menu, PanelLeftClose, PanelLeftOpen, Plus, Search, Settings, Shield, Sparkles, Sunrise, Swords, Target, Trophy, X } from "lucide-react";
import { useActivityTypes } from "@/hooks/use-activity-types";
import { useAuth } from "@/hooks/use-auth";
import { useMissionTypes } from "@/hooks/use-mission-types";
import { useMissions } from "@/hooks/use-missions";
import { useSubjects } from "@/hooks/use-subjects";
import { useTheme } from "@/hooks/use-theme";
import { useWeeklyQuests } from "@/hooks/use-weekly-quests";
import { addMissionProgress, calculatePlayerProgress, calculateStreak, formatLongDate, formatProgressDuration, getCrossedXpMilestone, getMissionProgress, getMissionStatus, getMissionXp, getNextXpMilestone, isProgressMission, Mission, Priority, priorityMeta, sortMissionsByDateTime, toISODate } from "@/lib/missions";
import { getScheduledActivityLabel, getScheduledActivityXp, getScheduledOccurrences, getWeekDates, getWeeklyFreeSlots, ScheduledOccurrence, sortDailyMissionsByTime, weekdayMeta } from "@/lib/schedule";
import { formatTime12Hour, formatTimeRange12Hour } from "@/lib/time";
import { resolveActivityType } from "@/lib/activity-types";
import { findMissionType, isTimedMissionType } from "@/lib/mission-types";
import { resolveSubjectName } from "@/lib/subjects";
import { getUserInitials } from "@/lib/users";
import { AccountPanel } from "./account-panel";
import { AdventureMap } from "./adventure-map";
import { AuthScreen } from "./auth-screen";
import { DayAgenda } from "./day-agenda";
import { GameFeedback, RewardEvent } from "./game-feedback";
import { MissionForm } from "./mission-form";
import { MissionProgress } from "./mission-progress";
import { MissionTypesManager } from "./mission-types-manager";
import { WeeklySchedule } from "./weekly-schedule";
import { WorldMissions } from "./world-missions";

const WEEK_DAYS = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];
type Filter = "all" | "pending" | "completed" | Priority;
type View = "calendar" | "world" | "map" | "weekly";
type CalendarMode = "month" | "week" | "day";

function calendarDays(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const mondayOffset = (first.getDay() + 6) % 7;
  const start = new Date(month.getFullYear(), month.getMonth(), 1 - mondayOffset);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

export function MissionPlanner() {
  const auth = useAuth();
  const { theme, setTheme } = useTheme();
  const { missions, loading: missionsLoading, error: missionsError, upsert, toggle, setStatus, remove } = useMissions(Boolean(auth.user));
  const { weeklyQuests, loading: scheduleLoading, error: scheduleError, upsert: upsertWeeklyQuest, remove: removeWeeklyQuest } = useWeeklyQuests(Boolean(auth.user));
  const { subjects, loading: subjectsLoading, error: subjectsError, upsert: upsertSubject, remove: removeSubject } = useSubjects(Boolean(auth.user));
  const { activityTypes, loading: activityTypesLoading, error: activityTypesError, upsert: upsertActivityType, remove: removeActivityType } = useActivityTypes(Boolean(auth.user));
  const { missionTypes, loading: missionTypesLoading, error: missionTypesError, upsert: upsertMissionType, remove: removeMissionType } = useMissionTypes(Boolean(auth.user));
  const [month, setMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [editing, setEditing] = useState<Mission | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [view, setView] = useState<View>("calendar");
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [draftSubject, setDraftSubject] = useState<string | undefined>();
  const [query, setQuery] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [focusedWeeklyQuestId, setFocusedWeeklyQuestId] = useState<string | null>(null);
  const [reward, setReward] = useState<RewardEvent | null>(null);
  const rewardSequence = useRef(0);
  const [missionTypesOpen, setMissionTypesOpen] = useState(false);
  const [calendarMode, setCalendarMode] = useState<CalendarMode>("month");
  const [freeTimeOpen, setFreeTimeOpen] = useState(false);

  const days = useMemo(() => calendarMode === "month" ? calendarDays(month) : calendarMode === "week" ? getWeekDates(selectedDate) : [selectedDate], [calendarMode, month, selectedDate]);
  const normalizedQuery = query.trim().toLocaleLowerCase("es");
  const catalogMissions = useMemo(() => sortMissionsByDateTime(missions.map((mission) => {
    const missionType = findMissionType(missionTypes, mission.title, mission.missionTypeId);
    return { ...mission, subject: resolveSubjectName(subjects, mission.subject, mission.subjectId), durationMinutes: mission.durationMinutes ?? (isTimedMissionType(missionType) ? 120 : undefined) };
  })), [missions, subjects, missionTypes]);
  const catalogWeeklyQuests = useMemo(() => weeklyQuests.map((weeklyQuest) => ({
    ...weeklyQuest,
    dailyMissions: sortDailyMissionsByTime(weeklyQuest.dailyMissions.map((dailyMission) => ({
      ...dailyMission,
      ...(dailyMission.activityCategory === "activity" ? { subject: undefined, subjectId: undefined } : { subject: resolveSubjectName(subjects, dailyMission.subject ?? "", dailyMission.subjectId) }),
      ...(() => { const type = resolveActivityType(activityTypes, dailyMission.activityTypeId, dailyMission.activityTypeName); return { activityTypeId: type.id, activityTypeName: type.name, activityCategory: type.category, activityPoints: type.points }; })(),
    }))),
  })), [weeklyQuests, subjects, activityTypes]);
  const filtered = useMemo(() => catalogMissions.filter((mission) => {
    const status = getMissionStatus(mission);
    const matchesFilter = filter === "all" || (filter === "pending" && status === "pending") || (filter === "completed" && status === "completed") || mission.priority === filter;
    return matchesFilter && (!normalizedQuery || `${mission.title} ${mission.subject}`.toLocaleLowerCase("es").includes(normalizedQuery));
  }), [catalogMissions, filter, normalizedQuery]);
  const worldMissions = useMemo(() => {
    return catalogMissions.filter((mission) => !normalizedQuery || `${mission.title} ${mission.subject}`.toLocaleLowerCase("es").includes(normalizedQuery));
  }, [catalogMissions, normalizedQuery]);
  const missionsByDate = useMemo(() => {
    const grouped = new Map<string, Mission[]>();
    filtered.forEach((mission) => {
      const dayMissions = grouped.get(mission.date);
      if (dayMissions) dayMissions.push(mission);
      else grouped.set(mission.date, [mission]);
    });
    return new Map(Array.from(grouped.entries()).map(([date, dayMissions]) => [date, sortMissionsByDateTime(dayMissions)]));
  }, [filtered]);
  const scheduleByDate = useMemo(() => {
    const grouped = new Map<string, ReturnType<typeof getScheduledOccurrences>>();
    if (filter === "normal" || filter === "important" || filter === "boss") return grouped;
    days.forEach((date) => {
      const occurrences = getScheduledOccurrences(date, catalogWeeklyQuests).filter((dailyMission) => { const matchesStatus = filter === "all" || (filter === "pending" && !dailyMission.completed) || (filter === "completed" && dailyMission.completed); return matchesStatus && (!normalizedQuery || `${dailyMission.title} ${dailyMission.subject ?? ""} ${dailyMission.activityTypeName ?? ""} ${dailyMission.location ?? ""}`.toLocaleLowerCase("es").includes(normalizedQuery)); });
      if (occurrences.length) grouped.set(toISODate(date), occurrences);
    });
    return grouped;
  }, [days, filter, catalogWeeklyQuests, normalizedQuery]);
  const selectedIso = toISODate(selectedDate);
  const selectedMissions = missionsByDate.get(selectedIso) ?? [];
  const selectedClasses = scheduleByDate.get(selectedIso) ?? [];
  const freeTimeSlots = useMemo(() => getWeeklyFreeSlots(selectedDate, catalogWeeklyQuests, catalogMissions.filter((mission) => !isProgressMission(mission))), [selectedDate, catalogWeeklyQuests, catalogMissions]);

  useEffect(() => {
    if (!reward) return;
    const timeout = window.setTimeout(() => setReward(null), 3600);
    return () => window.clearTimeout(timeout);
  }, [reward]);

  const openNew = (date = selectedDate, subject?: string) => { setSelectedDate(date); setDraftSubject(subject); setEditing(null); setModalOpen(true); };
  const openEdit = (mission: Mission) => { setDraftSubject(undefined); setEditing(mission); setModalOpen(true); };
  const movePeriod = (amount: number) => {
    if (calendarMode === "month") {
      const next = new Date(month.getFullYear(), month.getMonth() + amount, 1);
      setMonth(next);
      setSelectedDate(next);
      return;
    }
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + amount * (calendarMode === "week" ? 7 : 1));
    setSelectedDate(next);
    setMonth(new Date(next.getFullYear(), next.getMonth(), 1));
  };
  const player = useMemo(() => calculatePlayerProgress(missions, catalogWeeklyQuests), [missions, catalogWeeklyQuests]);
  const nextMilestone = useMemo(() => getNextXpMilestone(player.totalXp), [player.totalXp]);
  const gameStats = useMemo(() => missions.reduce((stats, mission) => {
    const status = getMissionStatus(mission);
    if (status === "pending") stats.pending += 1;
    if (status === "completed") stats.completed += 1;
    if (mission.priority === "boss") {
      stats.bosses += 1;
      if (status === "completed") stats.bossesDefeated += 1;
    }
    return stats;
  }, { pending: 0, completed: 0, bosses: 0, bossesDefeated: 0 }), [missions]);
  const pending = gameStats.pending;
  const streak = useMemo(() => calculateStreak(missions, catalogWeeklyQuests), [missions, catalogWeeklyQuests]);
  const monthName = new Intl.DateTimeFormat("es-CO", { month: "long" }).format(month);
  const calendarTitle = calendarMode === "month" ? monthName : calendarMode === "week" ? `semana del ${formatLongDate(toISODate(getWeekDates(selectedDate)[0]))}` : formatLongDate(selectedIso);
  const campaignProgress = missions.length ? Math.round((gameStats.completed / missions.length) * 100) : 0;
  const nextObjective = useMemo(() => sortMissionsByDateTime(catalogMissions.filter((mission) => getMissionStatus(mission) !== "completed"))[0] ?? null, [catalogMissions]);
  const objectiveTiming = useMemo(() => {
    if (!nextObjective) return "Campaña completada";
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const target = new Date(`${nextObjective.date}T12:00:00`);
    const daysAway = Math.round((target.getTime() - today.getTime()) / 86_400_000);
    if (daysAway < 0) return `Venció hace ${Math.abs(daysAway)} ${Math.abs(daysAway) === 1 ? "día" : "días"}`;
    if (daysAway === 0) return "Objetivo de hoy";
    if (daysAway === 1) return "Objetivo de mañana";
    return `Faltan ${daysAway} días`;
  }, [nextObjective]);

  const nextRewardId = () => {
    rewardSequence.current += 1;
    return rewardSequence.current;
  };
  const showReward = (mission: Mission) => { const xp = getMissionXp(mission); setReward({ id: nextRewardId(), title: mission.title, xp, boss: mission.priority === "boss", milestone: getCrossedXpMilestone(player.totalXp, player.totalXp + xp) }); };
  const toggleWithFeedback = (id: string) => {
    const mission = missions.find((item) => item.id === id);
    if (mission && getMissionStatus(mission) !== "completed") showReward(mission);
    toggle(id);
  };
  const setStatusWithFeedback = (id: string, status: Parameters<typeof setStatus>[1]) => {
    const mission = missions.find((item) => item.id === id);
    if (mission && status === "completed" && getMissionStatus(mission) !== "completed") showReward(mission);
    setStatus(id, status);
  };
  const addProgressWithFeedback = (id: string, minutes: 30 | 60) => {
    const mission = missions.find((item) => item.id === id);
    if (!mission || !isProgressMission(mission)) return;
    const wasComplete = getMissionProgress(mission).complete;
    const updated = addMissionProgress(mission, minutes);
    if (!wasComplete && getMissionProgress(updated).complete) showReward(updated);
    void upsert(updated);
  };
  const toggleScheduledActivity = (occurrence: ScheduledOccurrence) => {
    const weeklyQuest = weeklyQuests.find((item) => item.id === occurrence.weeklyQuestId);
    if (!weeklyQuest) return;
    const completing = !occurrence.completed;
    const xp = getScheduledActivityXp(occurrence);
    upsertWeeklyQuest({ ...weeklyQuest, dailyMissions: weeklyQuest.dailyMissions.map((activity) => { if (activity.id !== occurrence.id) return activity; const completedDates = new Set(activity.completedDates ?? []); if (completing) completedDates.add(occurrence.date); else completedDates.delete(occurrence.date); return { ...activity, completedDates: [...completedDates].sort() }; }) });
    if (completing) setReward({ id: nextRewardId(), title: occurrence.title, xp, boss: false, activity: true, milestone: getCrossedXpMilestone(player.totalXp, player.totalXp + xp) });
  };
  const openObjective = (mission: Mission) => {
    const objectiveDate = new Date(`${mission.date}T12:00:00`);
    setSelectedDate(objectiveDate);
    setMonth(new Date(objectiveDate.getFullYear(), objectiveDate.getMonth(), 1));
    openEdit(mission);
  };
  const relics = [
    { label: "Primera victoria", unlocked: gameStats.completed >= 1, icon: <Trophy size={13} /> },
    { label: "Cazajefes", unlocked: gameStats.bossesDefeated >= 1, icon: <Swords size={13} /> },
    { label: "Racha de 3 días", unlocked: streak >= 3, icon: <Flame size={13} /> },
    { label: "Coleccionista", unlocked: missions.length >= 5, icon: <Gem size={13} /> },
  ];

  const filters: { id: Filter; label: string; icon: React.ReactNode }[] = [
    { id: "all", label: "Todas las misiones", icon: <Compass size={18} /> },
    { id: "pending", label: "Por conquistar", icon: <Flag size={18} /> },
    { id: "boss", label: "Jefes finales", icon: <Swords size={18} /> },
    { id: "completed", label: "Completadas", icon: <Check size={18} /> },
  ];

  if (auth.loading) {
    return <main className="app-loading"><Compass size={38} /><LoaderCircle className="spin" size={22} /><span>Abriendo tu bitácora...</span></main>;
  }

  if (!auth.user) {
    return <AuthScreen connectionError={auth.error} onRegister={auth.register} onLogin={auth.login} />;
  }

  return (
    <main className="app-shell" data-theme={theme}>
      <aside className={`sidebar ${mobileNav ? "open" : ""} ${sidebarCollapsed ? "collapsed" : ""}`}>
        <button className="mobile-close" onClick={() => setMobileNav(false)} aria-label="Cerrar menú"><X /></button>
        <button className="sidebar-collapse" onClick={() => setSidebarCollapsed((current) => !current)} aria-label={sidebarCollapsed ? "Mostrar barra lateral" : "Ocultar barra lateral"} title={sidebarCollapsed ? "Mostrar menú" : "Ocultar menú"}>
          {sidebarCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
        </button>
        <div className="brand">
          <span className="brand-mark"><Compass size={26} strokeWidth={1.7} /></span>
          <div><strong>BITÁCORA</strong><small>DEL NAVEGANTE</small></div>
        </div>

        <nav>
          <span className="nav-label">MAPA DE AVENTURA</span>
          <button className={view === "world" ? "active" : ""} onClick={() => { setView("world"); setMobileNav(false); }}>
            <Globe2 size={18} /><span>Misiones de Mundo</span>
          </button>
          <button className={view === "map" ? "active" : ""} onClick={() => { setView("map"); setFilter("all"); setMobileNav(false); }}>
            <MapPinned size={18} /><span>Mapa de campaña</span>
          </button>
          <button className={view === "weekly" ? "active" : ""} onClick={() => { setFocusedWeeklyQuestId(null); setView("weekly"); setMobileNav(false); }}>
            <CalendarRange size={18} /><span>Misiones semanales</span>
          </button>
          {filters.map((item) => (
            <button key={item.id} className={view === "calendar" && filter === item.id ? "active" : ""} onClick={() => { setView("calendar"); setFilter(item.id); setMobileNav(false); }}>
              {item.icon}<span>{item.label}</span>
              {item.id === "pending" && <em>{pending}</em>}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="rank-card">
            <div className="rank-top"><span>RANGO ACTUAL</span><b><Shield size={11} /> NIV. {player.level}</b></div>
            <div className="rank-identity"><span>{player.level}</span><div><strong>{player.rank}</strong><small>{player.totalXp} XP acumulada</small></div></div>
            <div className="progress-track"><i style={{ width: `${player.progress}%` }} /></div>
            <small>{player.xpInLevel}/{player.xpPerLevel} XP · faltan {player.xpToNextLevel} para subir</small>
            <div className="relic-strip" aria-label="Reliquias de aventura">
              {relics.map((relic) => <span key={relic.label} className={relic.unlocked ? "unlocked" : "locked"} title={`${relic.label}: ${relic.unlocked ? "desbloqueada" : "bloqueada"}`}>{relic.icon}</span>)}
            </div>
          </div>
          {nextMilestone && <div className="next-milestone-card"><span><Award size={13} /> PRÓXIMO LOGRO</span><strong>{nextMilestone.title}</strong><div className="progress-track"><i style={{ width: `${Math.min(100, (player.totalXp / nextMilestone.threshold) * 100)}%` }} /></div><small>{player.totalXp}/{nextMilestone.threshold} XP · faltan {nextMilestone.threshold - player.totalXp}</small></div>}
          <button className="settings" onClick={() => setAccountOpen(true)}><Settings size={18} /> <span>Ajustes</span></button>
          <button className="profile" onClick={() => setAccountOpen(true)} aria-label="Administrar mi cuenta">
            <span>{getUserInitials(auth.user.name)}</span><div><b>{auth.user.name}</b><small>{auth.user.email}</small></div>
          </button>
        </div>
      </aside>
      {mobileNav && <div className="nav-backdrop" onClick={() => setMobileNav(false)} />}

      <section className={`content ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMobileNav(true)} aria-label="Abrir menú"><Menu /></button>
          <div className="search-box"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={view === "world" ? "Buscar tarea o materia..." : view === "map" ? "Buscar un destino..." : view === "weekly" ? "Buscar una actividad..." : "Buscar una misión..."} /></div>
          <div className="top-actions">
            {(missionsLoading || scheduleLoading || subjectsLoading || activityTypesLoading || missionTypesLoading || missionsError || scheduleError || subjectsError || activityTypesError || missionTypesError) && <span className={`sync-state ${missionsError || scheduleError || subjectsError || activityTypesError || missionTypesError ? "error" : ""}`}>{missionsError || scheduleError || subjectsError || activityTypesError || missionTypesError ? "Sin guardar" : "Sincronizando"}</span>}
            <span className="level-hud" title={`${player.rank} · ${player.totalXp} XP total`}><Sparkles size={14} /><b>NIV. {player.level}</b><small>{player.xpInLevel}/{player.xpPerLevel} XP</small></span>
            <span className="streak">🔥 <b>{streak}</b><small> DÍAS DE RACHA</small></span>
            <button className="primary-button compact" onClick={() => openNew(selectedDate, view === "world" ? selectedSubject ?? undefined : undefined)}><Plus size={18} /> Nueva misión</button>
          </div>
        </header>

        {(missionsError || scheduleError || subjectsError || activityTypesError || missionTypesError) && <div className="sync-alert" role="alert"><AlertTriangle size={15} /><span><strong>No se pudo sincronizar.</strong> {missionsError ?? scheduleError ?? subjectsError ?? activityTypesError ?? missionTypesError}</span></div>}

        {view === "world" ? (
          <div className="workspace world-workspace">
            <WorldMissions
              subjects={subjects.filter((subject) => !normalizedQuery || subject.name.toLocaleLowerCase("es").includes(normalizedQuery))}
              missions={worldMissions}
              weeklyQuests={catalogWeeklyQuests}
              selectedSubject={selectedSubject}
              onSelectSubject={setSelectedSubject}
              onEdit={openEdit}
              onAdd={(subject) => openNew(selectedDate, subject)}
              onStatusChange={setStatusWithFeedback}
              onAddProgress={addProgressWithFeedback}
              onSaveSubject={upsertSubject}
              onDeleteSubject={removeSubject}
            />
          </div>
        ) : view === "map" ? (
          <div className="workspace adventure-map-workspace">
            <AdventureMap missions={filtered} onAdd={() => openNew(selectedDate)} onEdit={openEdit} onStatusChange={setStatusWithFeedback} onAddProgress={addProgressWithFeedback} />
          </div>
        ) : view === "weekly" ? (
          <div className="workspace weekly-workspace">
            <WeeklySchedule weeklyQuests={catalogWeeklyQuests.filter((weeklyQuest) => !normalizedQuery || weeklyQuest.dailyMissions.some((dailyMission) => `${dailyMission.title} ${dailyMission.subject ?? ""} ${dailyMission.activityTypeName ?? ""} ${dailyMission.location ?? ""}`.toLocaleLowerCase("es").includes(normalizedQuery)) || weeklyQuest.title.toLocaleLowerCase("es").includes(normalizedQuery))} loading={scheduleLoading || activityTypesLoading} focusedWeeklyQuestId={focusedWeeklyQuestId} subjects={subjects} activityTypes={activityTypes} onManageSubjects={() => setView("world")} onSave={upsertWeeklyQuest} onDelete={removeWeeklyQuest} onSaveActivityType={upsertActivityType} onDeleteActivityType={removeActivityType} />
          </div>
        ) : <div className="workspace">
          <div className="page-heading">
            <div><span className="eyebrow">TU PRÓXIMA TRAVESÍA</span><h1>Mapa de <i>{calendarTitle}</i></h1><p>Alterna entre mes, semana o día y encuentra tus espacios disponibles.</p></div>
            <div className="calendar-heading-tools">
              <div className="calendar-view-switch" aria-label="Vista del calendario">{([{ id: "month", label: "Mes", icon: <LayoutGrid size={14} /> }, { id: "week", label: "Semana", icon: <CalendarRange size={14} /> }, { id: "day", label: "Día", icon: <List size={14} /> }] as { id: CalendarMode; label: string; icon: React.ReactNode }[]).map((option) => <button key={option.id} className={calendarMode === option.id ? "active" : ""} type="button" onClick={() => setCalendarMode(option.id)}>{option.icon}{option.label}</button>)}</div>
              <button className={`free-time-toggle ${freeTimeOpen ? "active" : ""}`} type="button" onClick={() => setFreeTimeOpen((current) => !current)}><Sunrise size={15} /> Huecos libres</button>
              <div className="month-controls">
                <button aria-label="Periodo anterior" onClick={() => movePeriod(-1)}><ChevronLeft /></button>
                <button className="today" onClick={() => { const today = new Date(); setMonth(new Date(today.getFullYear(), today.getMonth(), 1)); setSelectedDate(today); }}>Hoy</button>
                <button aria-label="Periodo siguiente" onClick={() => movePeriod(1)}><ChevronRight /></button>
              </div>
            </div>
          </div>

          <div className="campaign-dashboard">
            <section className={`quest-focus ${nextObjective?.priority ?? "cleared"}`} aria-labelledby="active-quest-title">
              <div className="quest-route" aria-hidden="true"><i /><i /><i /><span>✦</span></div>
              <div className="quest-focus-copy">
                <span className="quest-kicker"><Target size={13} /> {nextObjective ? "OBJETIVO ACTIVO" : "MAPA DESPEJADO"}</span>
                <h2 id="active-quest-title">{nextObjective?.title ?? "¡Campaña completada!"}</h2>
                <p>{nextObjective ? `${nextObjective.subject} · ${formatLongDate(nextObjective.date)}` : "No quedan misiones pendientes. Puedes preparar la siguiente aventura."}</p>
                <div className="quest-tags">
                  <span><Clock3 size={12} /> {objectiveTiming}</span>
                  {nextObjective && <span><Award size={12} /> {priorityMeta[nextObjective.priority].label}</span>}
                  {nextObjective && <span className="quest-xp"><Sparkles size={12} /> +{getMissionXp(nextObjective)} XP</span>}
                </div>
              </div>
              <div className="quest-focus-action">
                <div className="campaign-ring" style={{ "--campaign-progress": `${campaignProgress * 3.6}deg` } as React.CSSProperties}><span><strong>{campaignProgress}%</strong><small>CAMPAÑA</small></span></div>
                <button type="button" onClick={() => nextObjective ? openObjective(nextObjective) : openNew(selectedDate)}>{nextObjective ? "Abrir objetivo" : "Nueva aventura"}<ChevronRight size={15} /></button>
              </div>
            </section>

            <div className="campaign-hud" aria-label="Filtros rápidos de campaña">
              <button type="button" className={filter === "pending" ? "active" : ""} onClick={() => setFilter("pending")}><Flag size={15} /><small>MISIONES ACTIVAS</small><strong>{gameStats.pending}</strong></button>
              <button type="button" className={filter === "completed" ? "active" : ""} onClick={() => setFilter("completed")}><Trophy size={15} /><small>VICTORIAS</small><strong>{gameStats.completed}</strong></button>
              <button type="button" className={`boss-stat ${filter === "boss" ? "active" : ""}`} onClick={() => setFilter("boss")}><Crown size={15} /><small>JEFES DERROTADOS</small><strong>{gameStats.bossesDefeated}/{gameStats.bosses}</strong></button>
              <button type="button" className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}><Sparkles size={15} /><small>XP TOTAL</small><strong>{player.totalXp}</strong></button>
            </div>
          </div>

          {freeTimeOpen && <section className="free-time-panel" aria-labelledby="free-time-title"><div className="free-time-heading"><span><CalendarClock size={20} /></span><div><small>RUTA SIN OBSTÁCULOS</small><h2 id="free-time-title">Momentos libres de esta semana</h2><p>Entre 7:00 AM y 10:00 PM. Los trabajos acumulables no bloquean horas; las demás actividades usan su duración real.</p></div><button type="button" onClick={() => setFreeTimeOpen(false)} aria-label="Cerrar huecos libres"><X size={16} /></button></div><div className="free-time-days">{getWeekDates(selectedDate).map((date) => { const iso = toISODate(date); const slots = freeTimeSlots.filter((slot) => slot.date === iso); return <article key={iso}><header><strong>{weekdayMeta[(((date.getDay() + 6) % 7) + 1) as keyof typeof weekdayMeta].label}</strong><small>{date.getDate()}</small></header><div>{slots.length ? slots.map((slot) => <button type="button" key={`${slot.startTime}-${slot.endTime}`} onClick={() => { setSelectedDate(date); setCalendarMode("day"); }}><span>{formatTimeRange12Hour(slot.startTime, slot.endTime)}</span><small>{Math.floor(slot.durationMinutes / 60) ? `${Math.floor(slot.durationMinutes / 60)} h ` : ""}{slot.durationMinutes % 60 ? `${slot.durationMinutes % 60} min` : ""}</small></button>) : <p>Sin huecos de 30 min</p>}</div></article>; })}</div></section>}

          <div className="planner-grid">
          <section className={`map-card calendar-mode-${calendarMode}`}>
            <div className="quest-board-ribbon"><span><Compass size={14} /> TABLERO DE CAMPAÑA</span><small>VISTA · {calendarMode === "month" ? "MES" : calendarMode === "week" ? "SEMANA" : "DÍA"}</small></div>
            <div className="map-ornament compass-rose">✣</div>
            <div className="map-ornament ship">♜</div>
            {calendarMode === "day" ? <DayAgenda missions={selectedMissions} activities={selectedClasses} activityTypes={activityTypes} onEditMission={openEdit} onToggleMission={toggleWithFeedback} onAddProgress={addProgressWithFeedback} onOpenActivity={(activity) => { setFocusedWeeklyQuestId(activity.weeklyQuestId); setView("weekly"); }} onToggleActivity={toggleScheduledActivity} /> : <><div className="week-row">{WEEK_DAYS.map((day) => <span key={day}>{day}</span>)}</div>
            <div className="calendar-grid">
              {days.map((date) => {
                const iso = toISODate(date);
                const dayMissions = missionsByDate.get(iso) ?? [];
                const dayClasses = scheduleByDate.get(iso) ?? [];
                const outside = calendarMode === "month" && date.getMonth() !== month.getMonth();
                const selected = iso === selectedIso;
                const hasBoss = dayMissions.some((mission) => mission.priority === "boss" && getMissionStatus(mission) !== "completed");
                const visibleClassCount = Math.min(dayClasses.length, 1);
                const visibleMissionCount = Math.min(dayMissions.length, dayClasses.length ? 1 : 2);
                const hiddenItems = dayClasses.length + dayMissions.length - visibleClassCount - visibleMissionCount;
                return (
                  <button key={iso} className={`calendar-day ${outside ? "outside" : ""} ${selected ? "selected" : ""} ${hasBoss ? "has-boss" : ""} ${dayClasses.length ? "has-class" : ""}`} onClick={() => setSelectedDate(date)} onDoubleClick={() => openNew(date)}>
                    <span className="day-number">{date.getDate()}</span>
                    <div className="day-missions">
                      {dayClasses.slice(0, calendarMode === "month" ? 1 : dayClasses.length).map((dailyClass) => <span key={dailyClass.occurrenceId} className={`mission-chip class-chip activity-tone-${resolveActivityType(activityTypes, dailyClass.activityTypeId, dailyClass.activityTypeName).tone} ${dailyClass.completed ? "done" : ""}`} onClick={(event) => { event.stopPropagation(); toggleScheduledActivity(dailyClass); }}><i>{dailyClass.activityCategory === "class" ? <BookOpen size={9} /> : <Activity size={9} />}</i>{formatTime12Hour(dailyClass.startTime)} {getScheduledActivityLabel(dailyClass)}</span>)}
                      {dayMissions.slice(0, calendarMode === "month" ? (dayClasses.length ? 1 : 2) : dayMissions.length).map((mission) => (
                        <span key={mission.id} className={`mission-chip ${mission.priority} ${mission.completed ? "done" : ""}`} onClick={(event) => { event.stopPropagation(); openEdit(mission); }}>
                          <i>{priorityMeta[mission.priority].icon}</i>{mission.title} · {mission.subject}{isProgressMission(mission) ? ` · ${getMissionProgress(mission).percentage}%` : ""}
                        </span>
                      ))}
                      {calendarMode === "month" && hiddenItems > 0 && <small>+{hiddenItems} más</small>}
                    </div>
                  </button>
                );
              })}
            </div></>}
            <div className="map-legend">
              {(Object.keys(priorityMeta) as Priority[]).map((priority) => <span key={priority}><i className={priority} />{priorityMeta[priority].shortLabel}</span>)}
              <small>Doble clic en un día para crear una misión</small>
            </div>
          </section>

          <section className="mission-log">
            <div className="section-heading">
              <div><span className="eyebrow">REGISTRO DE AVENTURA</span><h2>Misiones del {formatLongDate(toISODate(selectedDate))}</h2></div>
              <button className="text-button" onClick={() => openNew(selectedDate)}><Plus size={17} /> Agregar en este día</button>
            </div>
            <div className="mission-list">
              {selectedClasses.map((dailyClass) => (
                <article key={dailyClass.occurrenceId} className={`mission-row schedule-row activity-tone-${resolveActivityType(activityTypes, dailyClass.activityTypeId, dailyClass.activityTypeName).tone} ${dailyClass.completed ? "completed" : ""}`}>
                  <button className="check-button" onClick={() => toggleScheduledActivity(dailyClass)} aria-label={dailyClass.completed ? "Marcar actividad pendiente" : "Completar actividad"}>{dailyClass.completed && <Check size={16} />}</button>
                  <span className="schedule-class-icon">{dailyClass.activityCategory === "class" ? <BookOpen size={16} /> : <Activity size={16} />}</span>
                  <div className="mission-copy" onClick={() => { setFocusedWeeklyQuestId(dailyClass.weeklyQuestId); setView("weekly"); }}><span>{dailyClass.activityCategory === "class" ? "CLASE" : (dailyClass.activityTypeName ?? "ACTIVIDAD").toUpperCase()} · {dailyClass.weeklyQuestTitle}</span><h3>{getScheduledActivityLabel(dailyClass)}</h3><small>{formatTimeRange12Hour(dailyClass.startTime, dailyClass.endTime)}{dailyClass.location && <> · <MapPin size={10} /> {dailyClass.location}</>} <b className="xp-reward">+{getScheduledActivityXp(dailyClass)} XP</b></small></div>
                  <button className="edit-button" onClick={() => { setFocusedWeeklyQuestId(dailyClass.weeklyQuestId); setView("weekly"); }}>Ver horario</button>
                </article>
              ))}
              {selectedMissions.map((mission) => (
                <article key={mission.id} className={`mission-row ${mission.priority} ${isProgressMission(mission) ? "progress-mission" : ""} ${mission.completed ? "completed" : ""}`}>
                  {isProgressMission(mission) ? <span className="progress-mission-icon"><Hourglass size={16} /></span> : <button className="check-button" onClick={() => toggleWithFeedback(mission.id)} aria-label={mission.completed ? "Marcar pendiente" : "Completar misión"}>{mission.completed && <Check size={16} />}</button>}
                  <div className="mission-badge">{priorityMeta[mission.priority].icon}</div>
                  <div className="mission-copy" onClick={() => openEdit(mission)}><span>{isProgressMission(mission) ? "TRABAJO · META ACUMULABLE" : priorityMeta[mission.priority].label}</span><h3>{mission.title} · {mission.subject}</h3><small>{isProgressMission(mission) ? `Meta ${formatProgressDuration(mission.progressGoalMinutes ?? 0)}` : formatTime12Hour(mission.time)} <b className="xp-reward">+{getMissionXp(mission)} XP</b></small></div>
                  {isProgressMission(mission) && <MissionProgress mission={mission} onAdd={(minutes) => addProgressWithFeedback(mission.id, minutes)} compact />}
                  <div className="reward-box" aria-label={`Recompensa ${getMissionXp(mission)} puntos de experiencia`}><small>RECOMPENSA</small><strong>+{getMissionXp(mission)} XP</strong></div>
                  <button className="edit-button" onClick={() => openEdit(mission)}>Ver misión</button>
                </article>
              ))}
              {!selectedMissions.length && !selectedClasses.length && (
                <div className="empty-state"><CalendarDays size={32} /><h3>{missionsLoading ? "Consultando la bitácora..." : "La costa está despejada"}</h3><p>{missionsLoading ? "Buscando misiones en tu cuenta." : "No hay misiones para este día."}</p>{!missionsLoading && <button onClick={() => openNew(selectedDate)}>Crear una misión</button>}</div>
              )}
            </div>
          </section>
          </div>
        </div>}
      </section>

      <MissionForm open={modalOpen} initialDate={selectedDate} initialSubject={draftSubject} mission={editing} onClose={() => setModalOpen(false)} onSave={upsert} onDelete={remove} subjects={subjects} missionTypes={missionTypes} onManageSubjects={() => setView("world")} onManageMissionTypes={() => setMissionTypesOpen(true)} />
      <MissionTypesManager open={missionTypesOpen} missionTypes={missionTypes} missions={missions} onClose={() => { setMissionTypesOpen(false); setModalOpen(true); }} onSave={upsertMissionType} onDelete={removeMissionType} />
      <AccountPanel
        open={accountOpen}
        user={auth.user}
        onClose={() => setAccountOpen(false)}
        onLogout={auth.logout}
        onUpdate={auth.updateAccount}
        theme={theme}
        onThemeChange={setTheme}
      />
      <GameFeedback reward={reward} onDismiss={() => setReward(null)} />
    </main>
  );
}
