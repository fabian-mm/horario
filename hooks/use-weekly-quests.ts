"use client";

import { useEffect, useState } from "react";
import { useMutationCoordinator } from "@/hooks/use-mutation-coordinator";
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
      return;
    }
    let canceled = false;
    setLoading(true);
    fetch("/api/weekly-quests")
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "No se pudo cargar el horario.");
        return body as WeeklyQuest[];
      })
      .then((data) => {
        if (!canceled) {
          setWeeklyQuests((data as WeeklyQuest[]).map(normalizeWeeklyQuest));
          setError(null);
        }
      })
      .catch((requestError) => {
        if (!canceled) setError(requestError instanceof Error ? requestError.message : "No se pudo cargar el horario.");
      })
      .finally(() => { if (!canceled) setLoading(false); });
    return () => { canceled = true; };
  }, [enabled]);

  const saveRemote = async (weeklyQuest: WeeklyQuest) => {
    const response = await fetch("/api/weekly-quests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(normalizeWeeklyQuest(weeklyQuest)),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error ?? "No se pudo guardar la misión semanal.");
    return body as WeeklyQuest;
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
      setError(requestError instanceof Error ? requestError.message : "No se pudo guardar la misión semanal.");
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
        if (!response.ok) {
          const body = await response.json();
          throw new Error(body.error ?? "No se pudo eliminar la misión semanal.");
        }
      });
      return true;
    } catch (requestError) {
      if (mutations.isLatest(id, version)) {
        setWeeklyQuests((current) => restoreById(current, id, previous));
      }
      setError(requestError instanceof Error ? requestError.message : "No se pudo eliminar la misión semanal.");
      return false;
    }
  };

  return { weeklyQuests, loading, error, upsert, remove };
}
