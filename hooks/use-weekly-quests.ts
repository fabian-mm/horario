"use client";

import { useEffect, useState } from "react";
import { useMutationCoordinator } from "@/hooks/use-mutation-coordinator";
import { getRequestError, isAbortError, readApiResponse } from "@/lib/http";
import { removeById, restoreById, upsertById } from "@/lib/optimistic";
import { normalizeWeeklyQuest, type WeeklyQuest } from "@/lib/schedule";

export function useWeeklyQuests(enabled: boolean) {
  const [weeklyQuests, setWeeklyQuests] = useState<WeeklyQuest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mutations = useMutationCoordinator();

  useEffect(() => {
    if (!enabled) {
      setWeeklyQuests([]);
      setLoading(false);
      setError(null);
      return;
    }
    let canceled = false;
    const controller = new AbortController();
    setLoading(true);
    fetch("/api/weekly-quests", { signal: controller.signal })
      .then(async (response) => {
        return readApiResponse<WeeklyQuest[]>(response, "No se pudo cargar el horario.");
      })
      .then((data) => {
        if (!canceled) {
          setWeeklyQuests((data as WeeklyQuest[]).map(normalizeWeeklyQuest));
          setError(null);
        }
      })
      .catch((requestError) => {
        if (!canceled && !isAbortError(requestError)) setError(getRequestError(requestError, "No se pudo cargar el horario."));
      })
      .finally(() => { if (!canceled) setLoading(false); });
    return () => { canceled = true; controller.abort(); };
  }, [enabled]);

  const saveRemote = async (weeklyQuest: WeeklyQuest) => {
    const response = await fetch("/api/weekly-quests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(normalizeWeeklyQuest(weeklyQuest)),
    });
    return readApiResponse<WeeklyQuest>(response, "No se pudo guardar la misión semanal.");
  };

  const upsert = async (weeklyQuest: WeeklyQuest) => {
    const normalizedWeeklyQuest = normalizeWeeklyQuest(weeklyQuest);
    const previous = weeklyQuests.find((item) => item.id === normalizedWeeklyQuest.id);
    const version = mutations.begin(normalizedWeeklyQuest.id);
    setWeeklyQuests((current) => upsertById(current, normalizedWeeklyQuest));
    setError(null);
    try {
      const saved = normalizeWeeklyQuest(await mutations.enqueue(() => saveRemote(normalizedWeeklyQuest)));
      if (mutations.isLatest(normalizedWeeklyQuest.id, version)) {
        setWeeklyQuests((current) => upsertById(current, saved));
      }
      return saved;
    } catch (requestError) {
      if (mutations.isLatest(normalizedWeeklyQuest.id, version)) {
        setWeeklyQuests((current) => restoreById(current, normalizedWeeklyQuest.id, previous));
      }
      setError(getRequestError(requestError, "No se pudo guardar la misión semanal."));
      return null;
    }
  };

  const remove = async (id: string) => {
    const previous = weeklyQuests.find((item) => item.id === id);
    const version = mutations.begin(id);
    setWeeklyQuests((current) => removeById(current, id));
    setError(null);
    try {
      await mutations.enqueue(async () => {
        const response = await fetch(`/api/weekly-quests/${encodeURIComponent(id)}`, { method: "DELETE" });
        await readApiResponse(response, "No se pudo eliminar la misión semanal.");
      });
      return true;
    } catch (requestError) {
      if (mutations.isLatest(id, version)) {
        setWeeklyQuests((current) => restoreById(current, id, previous));
      }
      setError(getRequestError(requestError, "No se pudo eliminar la misión semanal."));
      return false;
    }
  };

  return { weeklyQuests, loading, error, upsert, remove };
}
