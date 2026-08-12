import { useEffect, useState, useCallback } from "react";
import { WeeklyQuest } from "@/lib/schedule";

export function useWeeklyQuests(enabled: boolean) {
  const [weeklyQuests, setWeeklyQuests] = useState<WeeklyQuest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWeeklyQuests = useCallback(async () => {
    if (!enabled) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch("/api/weekly-quests", { cache: "no-store" });
      const body = await response.json();
      
      if (!response.ok) {
        throw new Error(body.error ?? "No se pudieron cargar las misiones semanales.");
      }
      
      setWeeklyQuests(body as WeeklyQuest[]);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudieron cargar las misiones semanales.");
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setWeeklyQuests([]);
      setLoading(false);
      return;
    }
    
    fetchWeeklyQuests();
  }, [enabled, fetchWeeklyQuests]);

  const saveRemote = async (weeklyQuest: WeeklyQuest): Promise<WeeklyQuest> => {
    const response = await fetch("/api/weekly-quests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(weeklyQuest),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error ?? "No se pudo guardar la misión semanal.");
    return body as WeeklyQuest;
  };

  const upsert = (weeklyQuest: WeeklyQuest) => {
    const previous = weeklyQuests;
    setWeeklyQuests((current) => current.some((item) => item.id === weeklyQuest.id)
      ? current.map((item) => item.id === weeklyQuest.id ? weeklyQuest : item)
      : [...current, weeklyQuest]);
    setError(null);
    saveRemote(weeklyQuest).catch((requestError) => {
      setWeeklyQuests(previous);
      setError(requestError instanceof Error ? requestError.message : "No se pudo guardar la misión semanal.");
    });
  };

  const remove = (id: string) => {
    const previous = weeklyQuests;
    setWeeklyQuests((current) => current.filter((weeklyQuest) => weeklyQuest.id !== id));
    setError(null);
    fetch(`/api/weekly-quests/${encodeURIComponent(id)}`, { method: "DELETE" })
      .then(async (response) => {
        if (!response.ok) {
          const body = await response.json();
          throw new Error(body.error ?? "No se pudo eliminar la misión semanal.");
        }
      })
      .catch((requestError) => {
        setWeeklyQuests(previous);
        setError(requestError instanceof Error ? requestError.message : "No se pudo eliminar la misión semanal.");
      });
  };

  return { weeklyQuests, loading, error, upsert, remove, refetch: fetchWeeklyQuests };
}
