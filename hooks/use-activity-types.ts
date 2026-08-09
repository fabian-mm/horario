"use client";

import { useEffect, useState } from "react";
import type { ActivityType } from "@/lib/activity-types";

export function useActivityTypes(enabled: boolean) {
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setActivityTypes([]);
      setLoading(false);
      return;
    }
    let canceled = false;
    setLoading(true);
    fetch("/api/activity-types")
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "No se pudieron cargar los tipos de actividad.");
        return body as ActivityType[];
      })
      .then((data) => {
        if (!canceled) {
          setActivityTypes(data);
          setError(null);
        }
      })
      .catch((requestError) => {
        if (!canceled) setError(requestError instanceof Error ? requestError.message : "No se pudieron cargar los tipos de actividad.");
      })
      .finally(() => { if (!canceled) setLoading(false); });
    return () => { canceled = true; };
  }, [enabled]);

  const upsert = (activityType: ActivityType) => {
    const previous = activityTypes;
    const existing = activityTypes.find((item) => item.id === activityType.id);
    const optimistic = existing && existing.name !== activityType.name
      ? { ...activityType, aliases: Array.from(new Set([...(existing.aliases ?? []), existing.name])) }
      : activityType;
    setActivityTypes((current) => current.some((item) => item.id === activityType.id)
      ? current.map((item) => item.id === activityType.id ? optimistic : item)
      : [...current, optimistic]);
    setError(null);
    fetch("/api/activity-types", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(activityType) })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "No se pudo guardar el tipo de actividad.");
        const saved = body as ActivityType;
        setActivityTypes((current) => current.map((item) => item.id === saved.id ? saved : item));
      })
      .catch((requestError) => {
        setActivityTypes(previous);
        setError(requestError instanceof Error ? requestError.message : "No se pudo guardar el tipo de actividad.");
      });
  };

  const remove = (id: string) => {
    const previous = activityTypes;
    setActivityTypes((current) => current.filter((activityType) => activityType.id !== id));
    setError(null);
    fetch(`/api/activity-types/${encodeURIComponent(id)}`, { method: "DELETE" })
      .then(async (response) => {
        if (!response.ok) {
          const body = await response.json();
          throw new Error(body.error ?? "No se pudo eliminar el tipo de actividad.");
        }
      })
      .catch((requestError) => {
        setActivityTypes(previous);
        setError(requestError instanceof Error ? requestError.message : "No se pudo eliminar el tipo de actividad.");
      });
  };

  return { activityTypes, loading, error, upsert, remove };
}
