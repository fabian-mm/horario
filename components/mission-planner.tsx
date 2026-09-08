"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ArrowUpRight, BookOpen, CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, FolderOpen, GraduationCap, LayoutDashboard, LoaderCircle, Play, Plus, Search, Settings2, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useMissions } from "@/hooks/use-missions";
import { useSubjects } from "@/hooks/use-subjects";
import { useTheme } from "@/hooks/use-theme";
import { useWeeklyQuests } from "@/hooks/use-weekly-quests";
import { academicWeek, durationLabel, freeStudySlots, minuteLabel, pendingTasks } from "@/lib/academic";
import { getMissionStatus, sortMissionsByDateTime, toISODate, type Mission, type MissionStatus } from "@/lib/missions";
import { getScheduledOccurrences } from "@/lib/schedule";
import { resolveSubjectName } from "@/lib/subjects";
import { AccountPanel } from "./account-panel";
import { AuthScreen } from "./auth-screen";
import { MissionForm } from "./mission-form";
import { SubjectsView } from "./subjects-view";
import { WeeklySchedule } from "./weekly-schedule";
import { StudyFocus } from "./study-focus";

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
    return <article className={`academic-task ${status}`} key={task.id}>
      <button type="button" className="academic-check" aria-label={`${status === "completed" ? "Reabrir" : "Completar"} ${task.title}`} onClick={() => onStatus(task.id, status === "completed" ? "pending" : "completed")}><Check size={15} /></button>
      <button type="button" className="academic-task-copy" onClick={() => onEdit(task)}><strong>{task.title}</strong><small>{task.subject}{task.project && ` · ${task.project}`}</small></button>
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
  const tasks = useMemo(() => sortMissionsByDateTime(missions.map(task => ({ ...task, subject: resolveSubjectName(catalog.subjects, task.subject, task.subjectId) }))), [missions, catalog.subjects]);
  const search = query.trim().toLocaleLowerCase("es");
  const matching = tasks.filter(task => !search || `${task.title} ${task.subject} ${task.project ?? ""}`.toLocaleLowerCase("es").includes(search));
  const priorities = pendingTasks(matching);
  const week = academicWeek(anchor);
  const today = new Date();
  const todayIso = toISODate(today);
  const classesToday = getScheduledOccurrences(today, schedule.weeklyQuests);
  const slots = freeStudySlots(classesToday);
  const projects = Array.from(new Set(tasks.map(task => task.project?.trim()).filter((name): name is string => Boolean(name))));
  const projectTasks = matching.filter(task => (!subject || task.subject === subject) && (!project || task.project === project) && (taskFilter === "all" || (taskFilter === "pending" ? getMissionStatus(task) !== "completed" : getMissionStatus(task) === "completed")));
  const openNew = (date = new Date()) => { setSelectedDate(date); setEditing(null); setFormOpen(true); };
  const openEdit = (task: Mission) => { setEditing(task); setFormOpen(true); };
  const openRoutine = (id?: string) => { setFocusedRoutine(id ?? null); setView("routine"); };
  const errors = error ?? schedule.error ?? catalog.error;
  const activeNav = view === "routine" ? "week" : view === "subjects" ? "projects" : view;
  const taskList = (items: Mission[], empty: string) => <TaskList tasks={items} onEdit={openEdit} onStatus={setStatus} onStudy={setStudyTask} empty={empty} />;

  if (auth.loading) return <main className="app-loading"><LoaderCircle className="spin" size={24} /><span>Abriendo tu espacio de estudio…</span></main>;
  if (!auth.user) return <AuthScreen connectionError={auth.error} onRegister={auth.register} onLogin={auth.login} />;

  return <main className="academic-app" data-theme={theme}>
    <aside className="academic-sidebar">
      <a className="academic-brand" href="#" onClick={event => { event.preventDefault(); setView("today"); }}><span><GraduationCap size={24} /></span><div><strong>bitácora</strong><small>Tu espacio de estudio</small></div></a>
      <nav aria-label="Navegación principal">{navigation.map(item => <button key={item.id} type="button" className={activeNav === item.id ? "active" : ""} aria-current={activeNav === item.id ? "page" : undefined} onClick={() => setView(item.id)}><item.icon size={19} /><span>{item.label}</span></button>)}</nav>
      <div className="academic-sidebar-note"><span>UN PASO A LA VEZ</span><p>Haz espacio para lo importante.</p><small>Clases, entregas y tiempo para ti.</small></div>
      <button type="button" className="academic-account" onClick={() => setAccountOpen(true)}><span>{auth.user.name.slice(0, 1).toUpperCase()}</span><strong>{auth.user.name}</strong><Settings2 size={17} /></button>
    </aside>
    <section className="academic-content">
      <header className="academic-topbar"><span>Mi semestre <ChevronRight size={13} /> {view === "today" ? "Hoy" : view === "week" ? "Semana" : view === "routine" ? "Horario recurrente" : view === "subjects" ? "Materias" : "Proyectos"}</span><label className="academic-search"><Search size={16} /><input aria-label="Buscar tareas" placeholder="Buscar tareas, materias o proyectos" value={query} onChange={event => setQuery(event.target.value)} />{query && <button type="button" aria-label="Limpiar búsqueda" onClick={() => setQuery("")}><X size={14} /></button>}</label></header>
      {errors && <div className="sync-alert" role="alert"><AlertTriangle size={16} />{errors}</div>}
      <div className="academic-workspace">
        {view === "today" && <>
          <header className="academic-heading"><div><span className="academic-eyebrow">{new Intl.DateTimeFormat("es-CO", { weekday: "long", day: "numeric", month: "long" }).format(today)}</span><h1>Tu día, con claridad.</h1><p>Elige una tarea. Dale un espacio. Avanza a tu ritmo.</p></div><button type="button" className="primary-button" onClick={() => openNew()}><Plus size={17} /> Nueva tarea</button></header>
          <div className="academic-summary"><span><b>{priorities.today.length}</b> {priorities.today.length === 1 ? "entrega hoy" : "entregas hoy"}</span><span><b>{classesToday.length}</b> {classesToday.length === 1 ? "clase" : "clases"}</span><span><b>{priorities.upcoming.length}</b> {priorities.upcoming.length === 1 ? "tarea próxima" : "tareas próximas"}</span></div>
          <div className="academic-today-grid">
            <div>
              <section className="academic-panel"><header><div><span className="academic-eyebrow">LO IMPORTANTE PRIMERO</span><h2>Para hoy</h2></div><small>{priorities.today.length} tareas</small></header>{taskList(priorities.today, loading ? "Cargando tus tareas…" : search ? "No hay coincidencias para hoy." : "No tienes entregas para hoy. Puedes adelantar una tarea próxima.")}</section>
              <section className="academic-panel"><header><h2>Próximas entregas</h2><button type="button" className="academic-link" onClick={() => setView("projects")}>Ver todas <ArrowUpRight size={15} /></button></header>{taskList(priorities.upcoming.slice(0, 5), "No hay próximas entregas.")}</section>
              {priorities.overdue.length > 0 && <details className="academic-overdue"><summary><AlertTriangle size={15} /> {priorities.overdue.length} tareas con fecha pasada <span>Revisar</span></summary>{taskList(priorities.overdue, "")}</details>}
            </div>
            <aside className="academic-day-plan"><section className="academic-panel"><header><h2>Tu horario de hoy</h2><CalendarDays size={18} /></header><div className="academic-timeline">{classesToday.map(activity => <button key={activity.occurrenceId} type="button" onClick={() => openRoutine(activity.weeklyQuestId)}><time>{activity.startTime}<small>{activity.endTime}</small></time><span><strong>{activity.title}</strong><small>{activity.subject}{activity.location && ` · ${activity.location}`}</small></span></button>)}{!classesToday.length && <p className="academic-empty">Hoy no tienes clases programadas.</p>}</div><button type="button" className="academic-panel-footer" onClick={() => { setAnchor(new Date()); setView("week"); }}>Ver mi semana <ArrowUpRight size={15} /></button></section>
              <section className="academic-free-time"><Clock3 size={21} /><h3>Espacio para estudiar</h3><p>Según tus clases, entre las 8:00 y las 20:00.</p>{slots.slice(0, 3).map(slot => <div key={slot.start}><strong>{minuteLabel(slot.start)} — {minuteLabel(slot.end)}</strong><span>{durationLabel(slot.end - slot.start)}</span></div>)}{!slots.length && <p>No hay huecos de al menos 30 minutos.</p>}<small>Las fechas de entrega no se cuentan como tiempo ocupado.</small></section>
            </aside>
          </div>
        </>}
        {view === "week" && <>
          <header className="academic-heading"><div><span className="academic-eyebrow">PLANIFICA TU TIEMPO</span><h1>Tu semana</h1><p>Clases y entregas juntas, con espacio para organizarte.</p></div><button type="button" className="secondary-button" onClick={() => openRoutine()}><Settings2 size={16} /> Organizar horario</button></header>
          <div className="academic-week-toolbar"><div><button type="button" aria-label="Semana anterior" onClick={() => { const next = new Date(anchor); next.setDate(next.getDate() - 7); setAnchor(next); }}><ChevronLeft size={18} /></button><strong>{dateLabel(week[0])} — {dateLabel(week[6])}, {week[6].getFullYear()}</strong><button type="button" aria-label="Semana siguiente" onClick={() => { const next = new Date(anchor); next.setDate(next.getDate() + 7); setAnchor(next); }}><ChevronRight size={18} /></button></div><button type="button" onClick={() => setAnchor(new Date())}>Esta semana</button></div>
          <div className="academic-week-scroll"><div className="academic-week">{week.map(date => {
            const iso = toISODate(date);
            const classes = getScheduledOccurrences(date, schedule.weeklyQuests).filter(item => !search || `${item.title} ${item.subject}`.toLocaleLowerCase("es").includes(search));
            const due = matching.filter(task => task.date === iso);
            return <section className={iso === todayIso ? "is-today" : ""} key={iso}><header><small>{new Intl.DateTimeFormat("es-CO", { weekday: "short" }).format(date)}</small><strong>{date.getDate()}</strong><button type="button" className="academic-reveal" aria-label={`Añadir tarea el ${iso}`} onClick={() => openNew(date)}><Plus size={16} /></button></header><div>{classes.map(item => <button type="button" className="academic-week-class" key={item.occurrenceId} onClick={() => openRoutine(item.weeklyQuestId)}><small>{item.startTime} — {item.endTime}</small><strong>{item.title}</strong><span>{item.subject}</span></button>)}{due.map(task => <button type="button" className={`academic-week-task ${getMissionStatus(task)}`} key={task.id} onClick={() => openEdit(task)}><small>ENTREGA · {task.time}</small><strong>{task.title}</strong><span>{task.subject}</span></button>)}{!classes.length && !due.length && <span className="academic-week-empty">Sin actividades</span>}</div></section>;
          })}</div></div><p className="academic-caption"><span className="class-dot" /> Clases <span className="task-dot" /> Entregas · Abre una tarjeta para editar sus detalles.</p>
        </>}
        {view === "projects" && <>
          <header className="academic-heading"><div><span className="academic-eyebrow">DEL OBJETIVO A LA ENTREGA</span><h1>Proyectos y tareas</h1><p>Reúne los pasos de cada proyecto y sigue su avance.</p></div><button type="button" className="primary-button" onClick={() => openNew()}><Plus size={17} /> Nueva tarea</button></header>
          <div className="academic-project-filters">
            <label>Materia<select aria-label="Filtrar por materia" value={subject} onChange={event => setSubject(event.target.value)}><option value="">Todas las materias</option>{Array.from(new Set([...catalog.subjects.map(item => item.name), ...tasks.map(task => task.subject)])).sort().map(name => <option key={name}>{name}</option>)}</select></label>
            <label>Proyecto<select aria-label="Filtrar por proyecto" value={project} onChange={event => setProject(event.target.value)}><option value="">Todos los proyectos</option>{projects.map(name => <option key={name}>{name}</option>)}</select></label>
            <button type="button" className="academic-link" onClick={() => setView("subjects")}><BookOpen size={16} /> Administrar materias</button>
          </div>
          {project && <div className="academic-project-progress"><FolderOpen size={24} /><div><strong>{project}</strong><span>{tasks.filter(t => t.project === project && getMissionStatus(t) === "completed").length} de {tasks.filter(t => t.project === project).length} tareas completadas</span></div></div>}
          <section className="academic-panel"><header className="academic-list-tabs"><div role="group" aria-label="Estado de las tareas">{([['pending', 'En curso'], ['all', 'Todas'], ['completed', 'Completadas']] as const).map(([id, label]) => <button type="button" key={id} aria-pressed={taskFilter === id} className={taskFilter === id ? "active" : ""} onClick={() => setTaskFilter(id)}>{label}</button>)}</div><small>{projectTasks.length} tareas</small></header>{taskList(projectTasks, search || subject || project ? "No hay tareas con estos filtros." : "Crea una tarea y asígnale un proyecto para comenzar.")}</section>
        </>}
        {view === "subjects" && <><button className="academic-back" type="button" onClick={() => setView("projects")}><ChevronLeft size={16} /> Volver a proyectos</button><SubjectsView subjects={catalog.subjects} missions={tasks} weeklyQuests={schedule.weeklyQuests} loading={catalog.loading} onSave={catalog.upsert} onDelete={catalog.remove} /></>}
        {view === "routine" && <><button className="academic-back" type="button" onClick={() => setView("week")}><ChevronLeft size={16} /> Volver a mi semana</button><WeeklySchedule weeklyQuests={schedule.weeklyQuests} loading={schedule.loading} focusedWeeklyQuestId={focusedRoutine} subjects={catalog.subjects} onManageSubjects={() => setView("subjects")} onSave={schedule.upsert} onDelete={schedule.remove} /></>}
      </div>
    </section>
    <nav className="academic-mobile-nav" aria-label="Navegación móvil">{navigation.map(item => <button type="button" key={item.id} className={activeNav === item.id ? "active" : ""} aria-current={activeNav === item.id ? "page" : undefined} onClick={() => setView(item.id)}><item.icon size={20} />{item.label}</button>)}<button type="button" aria-label="Mi cuenta" onClick={() => setAccountOpen(true)}><Settings2 size={20} />Cuenta</button></nav>
    <MissionForm open={formOpen} initialDate={selectedDate} initialSubject={subject || undefined} initialProject={view === "projects" ? project : undefined} mission={editing} onClose={() => setFormOpen(false)} onSave={upsert} onDelete={remove} subjects={catalog.subjects} onManageSubjects={() => setView("subjects")} />
    <AccountPanel open={accountOpen} user={auth.user} onClose={() => setAccountOpen(false)} onLogout={auth.logout} onUpdate={auth.updateAccount} theme={theme} onThemeChange={setTheme} />
    <StudyFocus key={auth.user.id} userId={auth.user.id} requestedTask={studyTask} onRequestHandled={() => setStudyTask(null)} onSave={recordStudy} />
  </main>;
}
