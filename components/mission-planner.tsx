"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Award, CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, Compass, Crown, Flag, Flame, Gem, Globe2, LoaderCircle, Menu, PanelLeftClose, PanelLeftOpen, Plus, Search, Settings, Shield, Sparkles, Swords, Target, Trophy, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useMissions } from "@/hooks/use-missions";
import { useTheme } from "@/hooks/use-theme";
import { calculatePlayerProgress, calculateStreak, formatLongDate, getMissionStatus, getMissionXp, Mission, Priority, priorityMeta, toISODate } from "@/lib/missions";
import { getUserInitials } from "@/lib/users";
import { AccountPanel } from "./account-panel";
import { AuthScreen } from "./auth-screen";
import { GameFeedback, RewardEvent } from "./game-feedback";
import { MissionForm } from "./mission-form";
import { WorldMissions } from "./world-missions";

const WEEK_DAYS = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];
type Filter = "all" | "pending" | "completed" | Priority;
type View = "calendar" | "world";

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
  const [reward, setReward] = useState<RewardEvent | null>(null);

  const days = useMemo(() => calendarDays(month), [month]);
  const normalizedQuery = query.trim().toLocaleLowerCase("es");
  const filtered = useMemo(() => missions.filter((mission) => {
    const status = getMissionStatus(mission);
    const matchesFilter = filter === "all" || (filter === "pending" && status === "pending") || (filter === "completed" && status === "completed") || mission.priority === filter;
    return matchesFilter && (!normalizedQuery || `${mission.title} ${mission.subject}`.toLocaleLowerCase("es").includes(normalizedQuery));
  }), [missions, filter, normalizedQuery]);
  const worldMissions = useMemo(() => {
    return missions.filter((mission) => !normalizedQuery || `${mission.title} ${mission.subject}`.toLocaleLowerCase("es").includes(normalizedQuery));
  }, [missions, normalizedQuery]);
  const missionsByDate = useMemo(() => {
    const grouped = new Map<string, Mission[]>();
    filtered.forEach((mission) => {
      const dayMissions = grouped.get(mission.date);
      if (dayMissions) dayMissions.push(mission);
      else grouped.set(mission.date, [mission]);
    });
    return grouped;
  }, [filtered]);
  const selectedIso = toISODate(selectedDate);
  const selectedMissions = missionsByDate.get(selectedIso) ?? [];

  useEffect(() => {
    if (!reward) return;
    const timeout = window.setTimeout(() => setReward(null), 3600);
    return () => window.clearTimeout(timeout);
  }, [reward]);

  const openNew = (date = selectedDate, subject?: string) => { setSelectedDate(date); setDraftSubject(subject); setEditing(null); setModalOpen(true); };
  const openEdit = (mission: Mission) => { setDraftSubject(undefined); setEditing(mission); setModalOpen(true); };
  const moveMonth = (amount: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + amount, 1));
  const player = useMemo(() => calculatePlayerProgress(missions), [missions]);
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
  const streak = useMemo(() => calculateStreak(missions), [missions]);
  const monthName = new Intl.DateTimeFormat("es-CO", { month: "long" }).format(month);
  const campaignProgress = missions.length ? Math.round((gameStats.completed / missions.length) * 100) : 0;
  const nextObjective = useMemo(() => missions
    .filter((mission) => getMissionStatus(mission) !== "completed")
    .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`))[0] ?? null, [missions]);
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

  const showReward = (mission: Mission) => setReward({ id: Date.now(), title: mission.title, xp: getMissionXp(mission), boss: mission.priority === "boss" });
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
          <div className="search-box"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={view === "world" ? "Buscar tarea o materia..." : "Buscar una misión..."} /></div>
          <div className="top-actions">
            {(missionsLoading || missionsError) && <span className={`sync-state ${missionsError ? "error" : ""}`}>{missionsError ? "Sin guardar" : "Sincronizando"}</span>}
            <span className="level-hud" title={`${player.rank} · ${player.totalXp} XP total`}><Sparkles size={14} /><b>NIV. {player.level}</b><small>{player.xpInLevel}/{player.xpPerLevel} XP</small></span>
            <span className="streak">🔥 <b>{streak}</b><small> DÍAS DE RACHA</small></span>
            <button className="primary-button compact" onClick={() => openNew(selectedDate, view === "world" ? selectedSubject ?? undefined : undefined)}><Plus size={18} /> Nueva misión</button>
          </div>
        </header>

        {missionsError && <div className="sync-alert" role="alert"><AlertTriangle size={15} /><span><strong>No se pudo sincronizar.</strong> Tus cambios seguirán visibles, pero comprueba la conexión antes de cerrar.</span></div>}

        {view === "world" ? (
          <div className="workspace world-workspace">
            <WorldMissions
              missions={worldMissions}
              selectedSubject={selectedSubject}
              onSelectSubject={setSelectedSubject}
              onEdit={openEdit}
              onAdd={(subject) => openNew(selectedDate, subject)}
              onStatusChange={setStatusWithFeedback}
            />
          </div>
        ) : <div className="workspace">
          <div className="page-heading">
            <div><span className="eyebrow">TU PRÓXIMA TRAVESÍA</span><h1>Mapa de <i>{monthName}</i></h1><p>Cada misión completada te acerca un paso más al tesoro.</p></div>
            <div className="month-controls">
              <button aria-label="Mes anterior" onClick={() => moveMonth(-1)}><ChevronLeft /></button>
              <button className="today" onClick={() => { const today = new Date(); setMonth(today); setSelectedDate(today); }}>Hoy</button>
              <button aria-label="Mes siguiente" onClick={() => moveMonth(1)}><ChevronRight /></button>
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

          <div className="planner-grid">
          <section className="map-card">
            <div className="quest-board-ribbon"><span><Compass size={14} /> TABLERO DE CAMPAÑA</span><small>CAPÍTULO · {monthName.toUpperCase()}</small></div>
            <div className="map-ornament compass-rose">✣</div>
            <div className="map-ornament ship">♜</div>
            <div className="week-row">{WEEK_DAYS.map((day) => <span key={day}>{day}</span>)}</div>
            <div className="calendar-grid">
              {days.map((date) => {
                const iso = toISODate(date);
                const dayMissions = missionsByDate.get(iso) ?? [];
                const outside = date.getMonth() !== month.getMonth();
                const selected = iso === selectedIso;
                const hasBoss = dayMissions.some((mission) => mission.priority === "boss" && getMissionStatus(mission) !== "completed");
                return (
                  <button key={iso} className={`calendar-day ${outside ? "outside" : ""} ${selected ? "selected" : ""} ${hasBoss ? "has-boss" : ""}`} onClick={() => setSelectedDate(date)} onDoubleClick={() => openNew(date)}>
                    <span className="day-number">{date.getDate()}</span>
                    <div className="day-missions">
                      {dayMissions.slice(0, 2).map((mission) => (
                        <span key={mission.id} className={`mission-chip ${mission.priority} ${mission.completed ? "done" : ""}`} onClick={(event) => { event.stopPropagation(); openEdit(mission); }}>
                          <i>{priorityMeta[mission.priority].icon}</i>{mission.title}
                        </span>
                      ))}
                      {dayMissions.length > 2 && <small>+{dayMissions.length - 2} más</small>}
                    </div>
                  </button>
                );
              })}
            </div>
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
              {selectedMissions.map((mission) => (
                <article key={mission.id} className={`mission-row ${mission.priority} ${mission.completed ? "completed" : ""}`}>
                  <button className="check-button" onClick={() => toggleWithFeedback(mission.id)} aria-label={mission.completed ? "Marcar pendiente" : "Completar misión"}>{mission.completed && <Check size={16} />}</button>
                  <div className="mission-badge">{priorityMeta[mission.priority].icon}</div>
                  <div className="mission-copy" onClick={() => openEdit(mission)}><span>{priorityMeta[mission.priority].label}</span><h3>{mission.title}</h3><small>{mission.subject} · {mission.time} <b className="xp-reward">+{getMissionXp(mission)} XP</b></small></div>
                  <div className="reward-box" aria-label={`Recompensa ${getMissionXp(mission)} puntos de experiencia`}><small>RECOMPENSA</small><strong>+{getMissionXp(mission)} XP</strong></div>
                  <button className="edit-button" onClick={() => openEdit(mission)}>Ver misión</button>
                </article>
              ))}
              {!selectedMissions.length && (
                <div className="empty-state"><CalendarDays size={32} /><h3>{missionsLoading ? "Consultando la bitácora..." : "La costa está despejada"}</h3><p>{missionsLoading ? "Buscando misiones en tu cuenta." : "No hay misiones para este día."}</p>{!missionsLoading && <button onClick={() => openNew(selectedDate)}>Crear una misión</button>}</div>
              )}
            </div>
          </section>
          </div>
        </div>}
      </section>

      <MissionForm open={modalOpen} initialDate={selectedDate} initialSubject={draftSubject} mission={editing} onClose={() => setModalOpen(false)} onSave={upsert} onDelete={remove} />
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
