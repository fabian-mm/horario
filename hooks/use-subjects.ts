"use client";

import { useEffect, useState } from "react";
import { useMutationCoordinator } from "@/hooks/use-mutation-coordinator";
import { removeById, restoreById, upsertById } from "@/lib/optimistic";
import { Subject } from "@/lib/subjects";

const sortSubjects = (subjects: Subject[]) =>
  [...subjects].sort((a, b) => a.name.localeCompare(b.name, "es"));

export function useSubjects(enabled: boolean) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mutations = useMutationCoordinator();

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

  const upsert = async (subject: Subject) => {
    const existing = subjects.find((item) => item.id === subject.id);
    const version = mutations.begin(subject.id);
    const optimistic = existing && existing.name !== subject.name
      ? { ...subject, aliases: Array.from(new Set([...(existing.aliases ?? []), existing.name])) }
      : subject;
    setSubjects((current) => sortSubjects(upsertById(current, optimistic)));
    setError(null);
    try {
      const saved = await mutations.enqueue(async () => {
        const response = await fetch("/api/subjects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(subject),
        });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "No se pudo guardar la materia.");
        return body as Subject;
      });
      if (mutations.isLatest(subject.id, version)) {
        setSubjects((current) => sortSubjects(upsertById(current, saved)));
      }
      return saved;
    } catch (requestError) {
      if (mutations.isLatest(subject.id, version)) {
        setSubjects((current) => sortSubjects(restoreById(current, subject.id, existing)));
      }
      setError(requestError instanceof Error ? requestError.message : "No se pudo guardar la materia.");
      return null;
    }
  };

  const remove = async (id: string) => {
    const previous = subjects.find((subject) => subject.id === id);
    const version = mutations.begin(id);
    setSubjects((current) => removeById(current, id));
    setError(null);
    try {
      await mutations.enqueue(async () => {
        const response = await fetch(`/api/subjects/${encodeURIComponent(id)}`, { method: "DELETE" });
        if (!response.ok) {
          const body = await response.json();
          throw new Error(body.error ?? "No se pudo eliminar la materia.");
        }
      });
      return true;
    } catch (requestError) {
      if (mutations.isLatest(id, version)) {
        setSubjects((current) => sortSubjects(restoreById(current, id, previous)));
      }
      setError(requestError instanceof Error ? requestError.message : "No se pudo eliminar la materia.");
      return false;
    }
  };

  return { subjects, loading, error, upsert, remove };
}
