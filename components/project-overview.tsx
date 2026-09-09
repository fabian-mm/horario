import { Flag, Clock3 } from "lucide-react";
import type { Mission } from "@/lib/missions";
import { durationLabel, projectSummaries } from "@/lib/academic";

export function ProjectOverview({ tasks, onSelect }: { tasks: Mission[]; onSelect: (subject: string, project: string) => void }) {
  const projects = projectSummaries(tasks);
  if (!projects.length) return null;
  return <section className="project-overview" aria-label="Resumen de proyectos">{projects.map(project => <button type="button" key={project.key} onClick={() => onSelect(project.subject, project.name)} className="project-summary-card">
    <span className="academic-eyebrow"><Flag size={13} /> {project.subject}</span><strong>{project.name}</strong>
    <span>{project.completed} de {project.total} tareas completadas{project.awaiting > 0 && ` · ${project.awaiting} entregadas`}</span>
    <progress aria-label={`Avance de ${project.name}`} max={project.total} value={project.completed} />
    <small><Clock3 size={12} /> {durationLabel(project.remainingMinutes)} restantes estimados{project.unestimated > 0 && ` · ${project.unestimated} sin estimar`}</small>
    <small>{project.nextDeadline ? `Próxima entrega: ${new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short" }).format(new Date(`${project.nextDeadline}T12:00:00`))}` : "Sin entregas pendientes"}</small>
  </button>)}</section>;
}
