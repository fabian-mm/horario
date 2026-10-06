"use client";
import { useEffect, useState } from "react";
import { prepareExam } from "@/lib/semester";
import { toISODate, type Mission, type StudyBlock } from "@/lib/missions";
import type { Availability } from "@/lib/planning";
import type { WeeklyQuest } from "@/lib/schedule";

export function ExamPreparation({ task, tasks, schedules, availability, onChange }: { task: Mission; tasks: Mission[]; schedules: WeeklyQuest[]; availability?: Availability; onChange: (task: Mission) => void }) {
  const [from, setFrom] = useState(toISODate(new Date()));
  const [minutes, setMinutes] = useState(45);
  const [preview, setPreview] = useState<StudyBlock[] | null>(null);
  const [message, setMessage] = useState("");
  useEffect(() => { setPreview(null); }, [task.studyBlocks, availability, tasks, schedules]);
  return <details className="project-work-fields"><summary>Preparar este examen</summary>
    <p className="planning-help">Escribe un tema por línea. Se propone una sesión por tema, en días distintos anteriores al examen y sin ocupar clases, compromisos ni otros bloques. No se reemplaza tu plan existente.</p>
    <label>Temas del examen<textarea rows={4} maxLength={7200} value={(task.examTopics ?? []).join("\n")} onChange={event => { onChange({ ...task, examTopics: event.target.value.split("\n") }); setPreview(null); }} placeholder={"Límites\nDerivadas\nProblemas de práctica"} /></label>
    <div className="form-row"><label>Preparar desde<input type="date" value={from} onChange={event => { setFrom(event.target.value); setPreview(null); }} /></label><label>Minutos por tema<input type="number" min={15} max={180} step={5} value={minutes} onChange={event => { setMinutes(Number(event.target.value)); setPreview(null); }} /></label></div>
    <button type="button" className="secondary-button" disabled={!availability} onClick={() => {
      const topics = [...new Set((task.examTopics ?? []).map(topic => topic.trim()).filter(Boolean))];
      if (!topics.length || topics.length > 40 || topics.some(topic => topic.length > 180) || !from || minutes < 15 || minutes > 180 || !Number.isInteger(minutes)) { setMessage("Añade de 1 a 40 temas (máximo 180 caracteres cada uno) y una duración entre 15 y 180 minutos."); return; }
      const proposed = prepareExam(task, topics, minutes, from, availability!, tasks, schedules, new Date()).map(block => ({ ...block, id: crypto.randomUUID() }));
      setPreview(proposed); setMessage(`${proposed.length} sesiones propuestas. Los temas ya reservados no se repiten. Si faltan temas, amplía el rango o reduce la duración.`);
    }}>Proponer sesiones</button>
    {!availability && <p className="planning-help">Espera a que cargue tu disponibilidad para proponer sesiones.</p>}
    {message && <p role="status" className="planning-help">{message}</p>}
    {preview && preview.length > 0 && <><ul className="exam-preview">{preview.map(block => <li key={block.id}><strong>{block.topic}</strong><span>{block.date} · {block.startTime}–{block.endTime}</span></li>)}</ul><button type="button" className="secondary-button" onClick={() => { onChange({ ...task, studyBlocks: [...(task.studyBlocks ?? []), ...preview] }); setPreview(null); setMessage("Sesiones añadidas al borrador. Revisa los bloques y pulsa Guardar tarea para confirmarlas."); }}>Añadir sesiones al borrador</button></>}
  </details>;
}
