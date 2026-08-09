"use client";

import { useEffect, useState } from "react";
import { useMutationCoordinator } from "@/hooks/use-mutation-coordinator";
import type { ActivityType } from "@/lib/activity-types";
import { removeById, restoreById, upsertById } from "@/lib/optimistic";

export function useActivityTypes(enabled: boolean) {
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mutations = useMutationCoordinator();

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

  const upsert = async (activityType: ActivityType) => {
    const existing = activityTypes.find((item) => item.id === activityType.id);
    const version = mutations.begin(activityType.id);
    const optimistic = existing && existing.name !== activityType.name
      ? { ...activityType, aliases: Array.from(new Set([...(existing.aliases ?? []), existing.name])) }
      : activityType;
    setActivityTypes((current) => upsertById(current, optimistic));
    setError(null);
    try {
      const saved = await mutations.enqueue(async () => {
        const response = await fetch("/api/activity-types", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(activityType) });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "No se pudo guardar el tipo de actividad.");
        return body as ActivityType;
      });
      if (mutations.isLatest(activityType.id, version)) {
        setActivityTypes((current) => upsertById(current, saved));
      }
      return saved;
    } catch (requestError) {
      if (mutations.isLatest(activityType.id, version)) {
        setActivityTypes((current) => restoreById(current, activityType.id, existing));
      }
      setError(requestError instanceof Error ? requestError.message : "No se pudo guardar el tipo de actividad.");
      return null;
    }
  };

  const remove = async (id: string) => {
    const previous = activityTypes.find((activityType) => activityType.id === id);
    const version = mutations.begin(id);
    setActivityTypes((current) => removeById(current, id));
    setError(null);
    try {
      await mutations.enqueue(async () => {
        const response = await fetch(`/api/activity-types/${encodeURIComponent(id)}`, { method: "DELETE" });
        if (!response.ok) {
          const body = await response.json();
          throw new Error(body.error ?? "No se pudo eliminar el tipo de actividad.");
        }
      });
      return true;
    } catch (requestError) {
      if (mutations.isLatest(id, version)) {
        setActivityTypes((current) => restoreById(current, id, previous));
      }
      setError(requestError instanceof Error ? requestError.message : "No se pudo eliminar el tipo de actividad.");
      return false;
    }
  };

  return { activityTypes, loading, error, upsert, remove };
}
