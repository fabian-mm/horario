import { useEffect, useState, useCallback } from "react";
import { Subject } from "@/lib/subjects";

export function useSubjects(enabled: boolean) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSubjects = useCallback(async () => {
    if (!enabled) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch("/api/subjects", { cache: "no-store" });
      const body = await response.json();
      
      if (!response.ok) {
        throw new Error(body.error ?? "No se pudieron cargar las materias.");
      }
      
      setSubjects(body as Subject[]);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudieron cargar las materias.");
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setSubjects([]);
      setLoading(false);
      return;
    }
    
    fetchSubjects();
  }, [enabled, fetchSubjects]);

  const saveRemote = async (subject: Subject): Promise<Subject> => {
    const response = await fetch("/api/subjects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subject),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error ?? "No se pudo guardar la materia.");
    return body as Subject;
  };

  const upsert = (subject: Subject) => {
    const previous = subjects;
    setSubjects((current) => current.some((item) => item.id === subject.id)
      ? current.map((item) => item.id === subject.id ? subject : item)
      : [...current, subject]);
    setError(null);
    saveRemote(subject).catch((requestError) => {
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

  return { subjects, loading, error, upsert, remove, refetch: fetchSubjects };
}
