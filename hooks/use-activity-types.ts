"use client";

import { useEffect, useState } from "react";
import { useMutationCoordinator } from "@/hooks/use-mutation-coordinator";
import type { ActivityType } from "@/lib/activity-types";
import { getRequestError, isAbortError, readApiResponse } from "@/lib/http";
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
      setError(null);
      return;
    }
    let canceled = false;
    const controller = new AbortController();
    setLoading(true);
    fetch("/api/activity-types", { signal: controller.signal })
      .then(async (response) => {
        return readApiResponse<ActivityType[]>(response, "No se pudieron cargar los tipos de actividad.");
      })
      .then((data) => {
        if (!canceled) {
          setActivityTypes(data);
          setError(null);
        }
      })
      .catch((requestError) => {
        if (!canceled && !isAbortError(requestError)) setError(getRequestError(requestError, "No se pudieron cargar los tipos de actividad."));
      })
      .finally(() => { if (!canceled) setLoading(false); });
    return () => { canceled = true; controller.abort(); };
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
        return readApiResponse<ActivityType>(response, "No se pudo guardar el tipo de actividad.");
      });
      if (mutations.isLatest(activityType.id, version)) {
        setActivityTypes((current) => upsertById(current, saved));
      }
      return saved;
    } catch (requestError) {
      if (mutations.isLatest(activityType.id, version)) {
        setActivityTypes((current) => restoreById(current, activityType.id, existing));
      }
      setError(getRequestError(requestError, "No se pudo guardar el tipo de actividad."));
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
        await readApiResponse(response, "No se pudo eliminar el tipo de actividad.");
      });
      return true;
    } catch (requestError) {
      if (mutations.isLatest(id, version)) {
        setActivityTypes((current) => restoreById(current, id, previous));
      }
      setError(getRequestError(requestError, "No se pudo eliminar el tipo de actividad."));
      return false;
    }
  };

  return { activityTypes, loading, error, upsert, remove };
}
