"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowUpRight, BookOpen, CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, FolderOpen, GraduationCap, LayoutDashboard, LoaderCircle, Play, Plus, Search, Settings2, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useMissions } from "@/hooks/use-missions";
import { useSubjects } from "@/hooks/use-subjects";
import { useTheme } from "@/hooks/use-theme";
import { useWeeklyQuests } from "@/hooks/use-weekly-quests";
import { usePlanning } from "@/hooks/use-planning";
import { availableSlots, commitmentsOn } from "@/lib/planning";
import { AvailabilityDialog, WeeklyLoad } from "./time-planning";
import { DailyFocus } from "./daily-focus";
import { academicWeek, durationLabel, minuteLabel, pendingTasks, studyBlocksOn } from "@/lib/academic";
import { calculatePlayerProgress, getMissionXp, getMissionStatus, sortMissionsByDateTime, toISODate, type Mission, type MissionStatus } from "@/lib/missions";
import { getScheduledOccurrences } from "@/lib/schedule";
import { resolveSubjectName } from "@/lib/subjects";
import { AccountPanel } from "./account-panel";
import { AuthScreen } from "./auth-screen";
import { MissionForm } from "./mission-form";
import { SubjectsView } from "./subjects-view";
import { WeeklySchedule } from "./weekly-schedule";
import { StudyFocus } from "./study-focus";
import { StudyPlan } from "./study-plan";
import { ProjectOverview } from "./project-overview";
import { AdventureProgress } from "./adventure-progress";
import { GameFeedback, type RewardEvent } from "./game-feedback";

type View = "today" | "week" | "projects" | "subjects" | "routine";
const dateLabel = (date: Date) => new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short" }).format(date);
const navigation = [
  { id: "today" as View, label: "Hoy", icon: LayoutDashboard },
  { id: "week" as View, label: "Semana", icon: CalendarDays },
  { id: "projects" as View, label: "Proyectos", icon: FolderOpen },
];

function TaskList({ tasks, onEdit, onStatus, onStudy, empty }: { tasks: Mission[]; onEdit: (task: Mission) => void; onStatus: (id: string, status: MissionStatus) => void; onStudy: (task: Mission) => void; empty: string }) {
  return <div className="academic-task-list">{tasks.map(task => {
    const status = getMissionStatus(task);
    return <article className={`academic-task ${status} quest-${task.priority}`} key={task.id}>
      <button type="button" className="academic-check" aria-label={`${status === "completed" ? "Reabrir" : "Completar"} ${task.title}`} onClick={() => onStatus(task.id, status === "completed" ? "pending" : "completed")}><Check size={15} /></button>
      <button type="button" className="academic-task-copy" onClick={() => onEdit(task)}><strong>{task.title}</strong><small>{task.subject}{task.project && ` · ${task.project}`}{Boolean(task.subtasks?.length) && ` · ${task.subtasks!.filter(step => step.completed).length}/${task.subtasks!.length} pasos`} <span className="rpg-task-xp">{status === "completed" ? "✦" : "◇"} {getMissionXp(task)} XP{task.priority === "boss" && " · Desafío épico"}</span></small></button>
      <div className="academic-task-meta"><time dateTime={`${task.date}T${task.time}`}>{dateLabel(new Date(`${task.date}T12:00:00`))} · {task.time}</time><small>{task.studiedMinutes ? `${durationLabel(task.studiedMinutes)} estudiados` : task.estimatedMinutes ? `${durationLabel(task.estimatedMinutes)} estimados` : status === "submitted" ? "Entregada" : ""}</small></div>
      {status === "pending" && <button type="button" className="academic-study-action" onClick={() => onStudy(task)} aria-label={`Estudiar ${task.title}`} title="Iniciar sesión de estudio"><Play size={15} /><span>Estudiar</span></button>}
    </article>;
  })}{!tasks.length && <p className="academic-empty">{empty}</p>}</div>;
}

export function MissionPlanner() {
  const auth = useAuth();
  const { theme, setTheme } = useTheme();
  const { missions, loading, error, upsert, setStatus, remove, recordStudy } = useMissions(Boolean(auth.user));
  const schedule = useWeeklyQuests(Boolean(auth.user));
  const catalog = useSubjects(Boolean(auth.user));
  const planning = usePlanning(auth.user?.id);
  const [availabilityOpen, setAvailabilityOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 60000); return () => window.clearInterval(timer); }, []);
  const [view, setView] = useState<View>("today");
  const [anchor, setAnchor] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState("");
  const [project, setProject] = useState("");
  const [taskFilter, setTaskFilter] = useState<"pending" | "all" | "completed">("pending");
  const [editing, setEditing] = useState<Mission | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [studyTask, setStudyTask] = useState<Mission | null>(null);
  const [focusedRoutine, setFocusedRoutine] = useState<string | null>(null);
  const [reward, setReward] = useState<(RewardEvent & { missionId: string }) | null>(null);
  useEffect(() => {
    if (!reward) return;
    const timeout = window.setTimeout(() => setReward(null), 5500);
    return () => window.clearTimeout(timeout);
  }, [reward]);
  const tasks = useMemo(() => sortMissionsByDateTime(missions.map(task => ({ ...task, subject: resolveSubjectName(catalog.subjects, task.subject, task.subjectId) }))), [missions, catalog.subjects]);
  const search = query.trim().toLocaleLowerCase("es");
  const matching = tasks.filter(task => !search || `${task.title} ${task.subject} ${task.project ?? ""}`.toLocaleLowerCase("es").includes(search));
  const priorities = pendingTasks(matching);
  const week = academicWeek(anchor);
  const today = now;
  const todayIso = toISODate(today);
  const classesToday = getScheduledOccurrences(today, schedule.weeklyQuests);
  const slots = availableSlots(today, planning.data.availability, [...classesToday, ...studyBlocksOn(tasks, todayIso)], today).filter(slot => slot.end - slot.start >= 30);
  const dailyIds = planning.data.dailyFocus?.date === todayIso ? planning.data.dailyFocus.missionIds : [];
  const notHighlighted = (items: Mission[]) => items.filter(task => !dailyIds.includes(task.id));
  const projects = Array.from(new Set(tasks.map(task => task.project?.trim()).filter((name): name is string => Boolean(name))));
  const projectTasks = matching.filter(task => (!subject || task.subject === subject) && (!project || task.project === project) && (taskFilter === "all" || (taskFilter === "pending" ? getMissionStatus(task) !== "completed" : getMissionStatus(task) === "completed")));
  const openNew = (date = new Date()) => { setSelectedDate(date); setEditing(null); setFormOpen(true); };
  const openEdit = (task: Mission) => { setEditing(task); setFormOpen(true); };
  const openRoutine = (id?: string) => { setFocusedRoutine(id ?? null); setView("routine"); };
  const errors = error ?? schedule.error ?? catalog.error;
  const activeNav = view === "routine" ? "week" : view === "subjects" ? "projects" : view;
  const player = calculatePlayerProgress(tasks);
  const changeTaskStatus = (id: string, status: MissionStatus) => {
    const task = tasks.find(item => item.id === id);
    if (task && status === "completed" && getMissionStatus(task) !== "completed") setReward({ id: Date.now(), missionId: id, title: task.title, xp: getMissionXp(task), boss: task.priority === "boss" });
    else setReward(null);
    setStatus(id, status);
  };
  const taskList = (items: Mission[], empty: string) => <TaskList tasks={items} onEdit={openEdit} onStatus={changeTaskStatus} onStudy={setStudyTask} empty={empty} />;

  if (auth.loading) return <main className="app-loading"><LoaderCircle className="spin" size={24} /><span>Abriendo tu espacio de estudio…</span></main>;
  if (!auth.user) return <AuthScreen connectionError={auth.error} onRegister={auth.register} onLogin={auth.login} />;

  return <main className="academic-app rpg-app" data-theme={theme}>
    <aside className="academic-sidebar">
      <a className="academic-brand" href="#" onClick={event => { event.preventDefault(); setView("today"); }}><span><GraduationCap size={24} /></span><div><strong>bitácora</strong><small>Gremio del conocimiento</small></div></a>
      <nav aria-label="Navegación principal">{navigation.map(item => <button key={item.id} type="button" className={activeNav === item.id ? "active" : ""} aria-current={activeNav === item.id ? "page" : undefined} onClick={() => setView(item.id)}><item.icon size={19} /><span>{item.label}</span></button>)}</nav>
      <div className="academic-sidebar-note"><span>DIARIO DE EXPLORACIÓN</span><p>Tu próxima conquista empieza aquí.</p><small>Sin prisas. Descansar también es parte del viaje.</small><div className="rpg-sidebar-rank">✦ NIVEL {player.level}<span>{player.rank}</span></div></div>
      <button type="button" className="academic-account" onClick={() => setAccountOpen(true)}><span>{auth.user.name.slice(0, 1).toUpperCase()}</span><strong>{auth.user.name}</strong><Settings2 size={17} /></button>
    </aside>
    <section className="academic-content">
      <header className="academic-topbar"><span>Mi semestre <ChevronRight size={13} /> {view === "today" ? "Hoy" : view === "week" ? "Semana" : view === "routine" ? "Horario recurrente" : view === "subjects" ? "Materias" : "Proyectos"}</span><label className="academic-search"><Search size={16} /><input aria-label="Buscar tareas" placeholder="Buscar tareas, materias o proyectos" value={query} onChange={event => setQuery(event.target.value)} />{query && <button type="button" aria-label="Limpiar búsqueda" onClick={() => setQuery("")}><X size={14} /></button>}</label></header>
      {errors && <div className="sync-alert" role="alert"><AlertTriangle size={16} />{errors}</div>}
      {planning.error && <div className="sync-alert" role="alert">{planning.error}{!planning.ready && <button type="button" onClick={planning.retry}>Reintentar planificación</button>}</div>}
      <div className="academic-workspace">
        {view === "today" && <>
          <header className="academic-heading"><div><span className="academic-eyebrow">{new Intl.DateTimeFormat("es-CO", { weekday: "long", day: "numeric", month: "long" }).format(today)}</span><h1>Tu aventura de hoy.</h1><p>Prepara tu equipo. Elige una misión. Avanza a tu ritmo.</p></div><button type="button" className="primary-button" onClick={() => openNew()}><Plus size={17} /> Nueva tarea</button></header>
          <AdventureProgress missions={tasks} />
          <div className="academic-summary"><span><b>{priorities.today.length}</b> {priorities.today.length === 1 ? "entrega hoy" : "entregas hoy"}</span><span><b>{classesToday.length}</b> {classesToday.length === 1 ? "clase" : "clases"}</span><span><b>{priorities.upcoming.length}</b> {priorities.upcoming.length === 1 ? "tarea próxima" : "tareas próximas"}</span></div>
          <DailyFocus key={auth.user.id} tasks={tasks} date={todayIso} data={planning.data} ready={planning.ready && !loading} saving={planning.saving} onSave={planning.save} renderTasks={items => taskList(items, "")} />
          <StudyPlan tasks={tasks} date={todayIso} onEdit={openEdit} onStudy={setStudyTask} />
          <div className="academic-today-grid">
            <div>
              <section className="academic-panel"><header><div><span className="academic-eyebrow">TABLÓN DE MISIONES</span><h2>Para hoy</h2></div><small>{priorities.today.length} {priorities.today.length === 1 ? "tarea" : "tareas"}</small></header>{taskList(notHighlighted(priorities.today), loading ? "Cargando tus tareas…" : search ? "No hay coincidencias para hoy." : "No hay otras entregas para hoy. Revisa tus misiones principales o toma un descanso.")}</section>
              <section className="academic-panel"><header><h2>Próximas entregas</h2><button type="button" className="academic-link" onClick={() => setView("projects")}>Ver todas <ArrowUpRight size={15} /></button></header>{taskList(notHighlighted(priorities.upcoming).slice(0, 5), "No hay próximas entregas.")}</section>
              {priorities.overdue.length > 0 && <details className="academic-overdue"><summary><AlertTriangle size={15} /> {priorities.overdue.length} tareas con fecha pasada <span>Revisar</span></summary>{taskList(notHighlighted(priorities.overdue), "")}</details>}
            </div>
            <aside className="academic-day-plan"><section className="academic-panel"><header><h2>Tu horario de hoy</h2><CalendarDays size={18} /></header><div className="academic-timeline">{classesToday.map(activity => <button key={activity.occurrenceId} type="button" onClick={() => openRoutine(activity.weeklyQuestId)}><time>{activity.startTime}<small>{activity.endTime}</small></time><span><strong>{activity.title}</strong><small>{activity.subject}{activity.location && ` · ${activity.location}`}</small></span></button>)}{!classesToday.length && <p className="academic-empty">Hoy no tienes clases programadas.</p>}</div><button type="button" className="academic-panel-footer" onClick={() => { setAnchor(new Date()); setView("week"); }}>Ver mi semana <ArrowUpRight size={15} /></button></section>
              <section className="academic-free-time"><Clock3 size={21} /><h3>Espacio para estudiar</h3><p>Desde ahora, dentro de tu disponibilidad. Se descuentan clases, compromisos y bloques reservados.</p>{slots.slice(0, 3).map(slot => <div key={slot.start}><strong>{minuteLabel(slot.start)} — {minuteLabel(slot.end)}</strong><span>{durationLabel(slot.end - slot.start)}</span></div>)}{!slots.length && <p>No hay huecos de al menos 30 minutos.</p>}<small>Las fechas de entrega no se cuentan como tiempo ocupado.</small><button type="button" className="academic-link" disabled={!planning.ready} onClick={() => setAvailabilityOpen(true)}>Configurar disponibilidad</button></section>
            </aside>
          </div>
        </>}
        {view === "week" && <>
          <header className="academic-heading"><div><span className="academic-eyebrow">PLANIFICA TU TIEMPO</span><h1>Tu semana</h1><p>Clases y entregas juntas, con espacio para organizarte.</p></div><button type="button" className="secondary-button" onClick={() => openRoutine()}><Settings2 size={16} /> Organizar horario</button></header>
          <div className="academic-week-toolbar"><div><button type="button" aria-label="Semana anterior" onClick={() => { const next = new Date(anchor); next.setDate(next.getDate() - 7); setAnchor(next); }}><ChevronLeft size={18} /></button><strong>{dateLabel(week[0])} — {dateLabel(week[6])}, {week[6].getFullYear()}</strong><button type="button" aria-label="Semana siguiente" onClick={() => { const next = new Date(anchor); next.setDate(next.getDate() + 7); setAnchor(next); }}><ChevronRight size={18} /></button></div><button type="button" onClick={() => setAnchor(new Date())}>Esta semana</button></div>
          {planning.ready && !loading && !schedule.loading && <WeeklyLoad anchor={anchor} reference={today} availability={planning.data.availability} tasks={tasks} schedules={schedule.weeklyQuests} onConfigure={() => setAvailabilityOpen(true)} />}
          <div className="academic-week-scroll"><div className="academic-week">{week.map(date => {
            const iso = toISODate(date);
            const classes = getScheduledOccurrences(date, schedule.weeklyQuests).filter(item => !search || `${item.title} ${item.subject}`.toLocaleLowerCase("es").includes(search));
            const due = matching.filter(task => task.date === iso);
            const study = studyBlocksOn(matching, iso);
            const personal = commitmentsOn(planning.data.availability, date).filter(item => !search || item.title.toLocaleLowerCase("es").includes(search));
            return <section className={iso === todayIso ? "is-today" : ""} key={iso}><header><small>{new Intl.DateTimeFormat("es-CO", { weekday: "short" }).format(date)}</small><strong>{date.getDate()}</strong><button type="button" className="academic-reveal" aria-label={`Añadir tarea el ${iso}`} onClick={() => openNew(date)}><Plus size={16} /></button></header><div>{classes.map(item => <button type="button" className="academic-week-class" key={item.occurrenceId} onClick={() => openRoutine(item.weeklyQuestId)}><small>{item.startTime} — {item.endTime}</small><strong>{item.title}</strong><span>{item.subject}</span></button>)}{due.map(task => <button type="button" className={`academic-week-task ${getMissionStatus(task)}`} key={task.id} onClick={() => openEdit(task)}><small>ENTREGA · {task.time}</small><strong>{task.title}</strong><span>{task.subject}</span></button>)}{study.map(block => <button type="button" className="academic-week-study" key={`${block.taskId}:${block.id}`} onClick={() => openEdit(tasks.find(task => task.id === block.taskId)!)}><small>ESTUDIO · {block.startTime} — {block.endTime}</small><strong>{block.title}</strong><span>{block.subject}</span></button>)}{personal.map(item => <button type="button" className="academic-week-personal" key={item.id} onClick={() => setAvailabilityOpen(true)}><small>PERSONAL · {item.startTime} — {item.endTime}</small><strong>{item.title}</strong></button>)}{!classes.length && !due.length && !study.length && !personal.length && <span className="academic-week-empty">Sin actividades</span>}</div></section>;
          })}</div></div><p className="academic-caption"><span className="class-dot" /> Clases <span className="task-dot" /> Entregas · Borde discontinuo: estudio · Abre una tarjeta para editar sus detalles.</p>
        </>}
        {view === "projects" && <>
          <header className="academic-heading"><div><span className="academic-eyebrow">DEL OBJETIVO A LA ENTREGA</span><h1>Proyectos y tareas</h1><p>Reúne los pasos de cada proyecto y sigue su avance.</p></div><button type="button" className="primary-button" onClick={() => openNew()}><Plus size={17} /> Nueva tarea</button></header>
          <div className="academic-project-filters">
            <label>Materia<select aria-label="Filtrar por materia" value={subject} onChange={event => setSubject(event.target.value)}><option value="">Todas las materias</option>{Array.from(new Set([...catalog.subjects.map(item => item.name), ...tasks.map(task => task.subject)])).sort().map(name => <option key={name}>{name}</option>)}</select></label>
            <label>Proyecto<select aria-label="Filtrar por proyecto" value={project} onChange={event => setProject(event.target.value)}><option value="">Todos los proyectos</option>{projects.map(name => <option key={name}>{name}</option>)}</select></label>
            <button type="button" className="academic-link" onClick={() => setView("subjects")}><BookOpen size={16} /> Administrar materias</button>
          </div>
          <ProjectOverview tasks={tasks.filter(task => (!subject || task.subject === subject) && (!project || task.project === project))} onSelect={(subjectName, projectName) => { setSubject(subjectName); setProject(projectName); }} />
          <section className="academic-panel"><header className="academic-list-tabs"><div role="group" aria-label="Estado de las tareas">{([['pending', 'En curso'], ['all', 'Todas'], ['completed', 'Completadas']] as const).map(([id, label]) => <button type="button" key={id} aria-pressed={taskFilter === id} className={taskFilter === id ? "active" : ""} onClick={() => setTaskFilter(id)}>{label}</button>)}</div><small>{projectTasks.length} tareas</small></header>{taskList(projectTasks, search || subject || project ? "No hay tareas con estos filtros." : "Crea una tarea y asígnale un proyecto para comenzar.")}</section>
        </>}
        {view === "subjects" && <><button className="academic-back" type="button" onClick={() => setView("projects")}><ChevronLeft size={16} /> Volver a proyectos</button><SubjectsView subjects={catalog.subjects} missions={tasks} weeklyQuests={schedule.weeklyQuests} loading={catalog.loading} onSave={catalog.upsert} onDelete={catalog.remove} /></>}
        {view === "routine" && <><button className="academic-back" type="button" onClick={() => setView("week")}><ChevronLeft size={16} /> Volver a mi semana</button><WeeklySchedule weeklyQuests={schedule.weeklyQuests} loading={schedule.loading} focusedWeeklyQuestId={focusedRoutine} subjects={catalog.subjects} onManageSubjects={() => setView("subjects")} onSave={schedule.upsert} onDelete={schedule.remove} /></>}
      </div>
    </section>
    <nav className="academic-mobile-nav" aria-label="Navegación móvil">{navigation.map(item => <button type="button" key={item.id} className={activeNav === item.id ? "active" : ""} aria-current={activeNav === item.id ? "page" : undefined} onClick={() => setView(item.id)}><item.icon size={20} />{item.label}</button>)}<button type="button" aria-label="Mi cuenta" onClick={() => setAccountOpen(true)}><Settings2 size={20} />Cuenta</button></nav>
    <MissionForm open={formOpen} initialDate={selectedDate} initialSubject={subject || undefined} initialProject={view === "projects" ? project : undefined} missions={tasks} schedules={schedule.weeklyQuests} mission={editing} onClose={() => setFormOpen(false)} onSave={upsert} onDelete={remove} subjects={catalog.subjects} onManageSubjects={() => setView("subjects")} />
    {availabilityOpen && planning.ready && <AvailabilityDialog key={`availability:${auth.user.id}`} value={planning.data.availability} saving={planning.saving} onSave={availability => planning.save({ availability })} onClose={() => setAvailabilityOpen(false)} />}
    <AccountPanel open={accountOpen} user={auth.user} onClose={() => setAccountOpen(false)} onLogout={auth.logout} onUpdate={auth.updateAccount} theme={theme} onThemeChange={setTheme} />
    <StudyFocus key={auth.user.id} userId={auth.user.id} requestedTask={studyTask} configuration={planning.data.concentration} onRequestHandled={() => setStudyTask(null)} onSave={recordStudy} />
    <GameFeedback reward={!errors && reward && tasks.some(task => task.id === reward.missionId && getMissionStatus(task) === "completed") ? reward : null} onDismiss={() => setReward(null)} />
  </main>;
}
