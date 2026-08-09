"use client";

import { useEffect, useState } from "react";
import { Subject } from "@/lib/subjects";

export function useSubjects(enabled: boolean) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setSubjects([]);
      setLoading(false);
      return;
    }
    let canceled = false;
    setLoading(true);
    fetch("/api/subjects")
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "No se pudieron cargar las materias.");
        return body as Subject[];
      })
      .then((data) => {
        if (!canceled) {
          setSubjects(data);
          setError(null);
        }
      })
      .catch((requestError) => {
        if (!canceled) setError(requestError instanceof Error ? requestError.message : "No se pudieron cargar las materias.");
      })
      .finally(() => { if (!canceled) setLoading(false); });
    return () => { canceled = true; };
  }, [enabled]);

  const upsert = (subject: Subject) => {
    const previous = subjects;
    const existing = subjects.find((item) => item.id === subject.id);
    const optimistic = existing && existing.name !== subject.name
      ? { ...subject, aliases: Array.from(new Set([...(existing.aliases ?? []), existing.name])) }
      : subject;
    setSubjects((current) => current.some((item) => item.id === subject.id)
      ? current.map((item) => item.id === subject.id ? optimistic : item)
      : [...current, optimistic].sort((a, b) => a.name.localeCompare(b.name, "es")));
    setError(null);
    fetch("/api/subjects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subject),
    }).then(async (response) => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "No se pudo guardar la materia.");
      const saved = body as Subject;
      setSubjects((current) => current.map((item) => item.id === saved.id ? saved : item).sort((a, b) => a.name.localeCompare(b.name, "es")));
    }).catch((requestError) => {
      setSubjects(previous);
      setError(requestError instanceof Error ? requestError.message : "No se pudo guardar la materia.");
    });
  };

  const remove = (id: string) => {
    const previous = subjects;
    setSubjects((current) => current.filter((subject) => subject.id !== id));
    setError(null);
    fetch(`/api/subjects/${encodeURIComponent(id)}`, { method: "DELETE" })
      .then(async (response) => {
        if (!response.ok) {
          const body = await response.json();
          throw new Error(body.error ?? "No se pudo eliminar la materia.");
        }
      })
      .catch((requestError) => {
        setSubjects(previous);
        setError(requestError instanceof Error ? requestError.message : "No se pudo eliminar la materia.");
      });
  };

  return { subjects, loading, error, upsert, remove };
}
