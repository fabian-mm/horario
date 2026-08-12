import { useEffect, useState, useCallback } from "react";
import { getMissionStatus, Mission, MissionStatus } from "@/lib/missions";

export function useMissions(enabled: boolean) {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMissions = useCallback(async () => {
    if (!enabled) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch("/api/missions", { cache: "no-store" });
      const body = await response.json();
      
      if (!response.ok) {
        throw new Error(body.error ?? "No se pudieron cargar las misiones.");
      }
      
      setMissions((body as Mission[]).map((mission) => ({ 
        ...mission, 
        status: getMissionStatus(mission) 
      })));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudieron cargar las misiones.");
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setMissions([]);
      setLoading(false);
      return;
    }
    
    fetchMissions();
  }, [enabled, fetchMissions]);

  const saveRemote = async (mission: Mission): Promise<Mission> => {
    const response = await fetch("/api/missions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mission),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error ?? "No se pudo guardar la misión.");
    return body as Mission;
  };

  const upsert = (mission: Mission) => {
    const previous = missions;
    setMissions((current) => current.some((item) => item.id === mission.id)
      ? current.map((item) => item.id === mission.id ? mission : item)
      : [...current, mission]);
    setError(null);
    saveRemote(mission).catch((requestError) => {
      setMissions(previous);
      setError(requestError instanceof Error ? requestError.message : "No se pudo guardar la misión.");
    });
  };

  const updateMission = (id: string, transform: (mission: Mission) => Mission) => {
    const previous = missions;
    const current = missions.find((mission) => mission.id === id);
    if (!current) return;
    const updated = transform(current);
    setMissions((items) => items.map((mission) => mission.id === id ? updated : mission));
    setError(null);
    saveRemote(updated).catch((requestError) => {
      setMissions(previous);
      setError(requestError instanceof Error ? requestError.message : "No se pudo actualizar la misión.");
    });
  };

  const toggle = (id: string) => updateMission(id, (mission) => ({
    ...mission,
    completed: !mission.completed,
    status: mission.completed ? "pending" : "completed",
  }));

  const setStatus = (id: string, status: MissionStatus) => updateMission(id, (mission) => ({
    ...mission,
    status,
    completed: status === "completed",
  }));

  const remove = (id: string) => {
    const previous = missions;
    setMissions((current) => current.filter((mission) => mission.id !== id));
    setError(null);
    fetch(`/api/missions/${encodeURIComponent(id)}`, { method: "DELETE" })
      .then(async (response) => {
        if (!response.ok) {
          const body = await response.json();
          throw new Error(body.error ?? "No se pudo eliminar la misión.");
        }
      })
      .catch((requestError) => {
        setMissions(previous);
        setError(requestError instanceof Error ? requestError.message : "No se pudo eliminar la misión.");
      });
  };

  return { missions, loading, error, upsert, toggle, setStatus, remove, refetch: fetchMissions };
}
