import { effectiveWorkState, getMissionStatus, stageMeta, unresolvedDependencies, workStateMeta, type Mission } from "@/lib/missions";

export function TaskWorkSummary({ task, tasks }: { task: Mission; tasks: Mission[] }) {
  const waiting = unresolvedDependencies(task, tasks);
  const active = getMissionStatus(task) === "pending";
  const state = effectiveWorkState(task, tasks);
  if (!task.stage && !task.workState && !waiting.length) return null;
  return <span className="task-work-summary">
    {task.stage && <span>{stageMeta[task.stage]}</span>}
    {active && <span className={state === "blocked" ? "work-blocked" : ""}>{workStateMeta[state]}{state === "blocked" && task.workState === "blocked" && task.blockedReason && ` · ${task.blockedReason}`}</span>}
    {active && waiting.length > 0 && <span className="work-blocked">Depende de: {waiting.map(id => tasks.find(item => item.id === id)?.title ?? "tarea no disponible (revisar)").join(", ")}</span>}
  </span>;
}
