import { Play, CalendarClock } from "lucide-react";
import type { Mission } from "@/lib/missions";
import { studyBlocksOn } from "@/lib/academic";

export function StudyPlan({ tasks, date, onEdit, onStudy }: { tasks: Mission[]; date: string; onEdit: (task: Mission) => void; onStudy: (task: Mission) => void }) {
  const blocks = studyBlocksOn(tasks, date);
  if (!blocks.length) return null;
  return <section className="academic-panel study-plan"><header><h2><CalendarClock size={17} /> Tu plan de estudio</h2><small>Tiempo reservado</small></header>{blocks.map(block => {
    const task = tasks.find(item => item.id === block.taskId)!;
    return <div className="study-plan-row" key={`${block.taskId}:${block.id}`}><time>{block.startTime}<small>{block.endTime}</small></time><button type="button" onClick={() => onEdit(task)}><strong>{block.title}</strong><small>{block.subject}</small></button><button type="button" className="academic-study-action" aria-label={`Estudiar bloque: ${block.title}`} title="Iniciar estudio" onClick={() => onStudy(task)}><Play size={15} /></button></div>;
  })}</section>;
}
