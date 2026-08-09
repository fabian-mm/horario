"use client";

import { useEffect, useState } from "react";
import { getMissionStatus, Mission, MissionStatus, sortMissionsByDateTime } from "@/lib/missions";

export function useMissions(enabled: boolean) {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setMissions([]);
      setLoading(false);
      return;
    }
    let canceled = false;
    setLoading(true);
    fetch("/api/missions")
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "No se pudieron cargar las misiones.");
        return body as Mission[];
      })
      .then((data) => {
        if (!canceled) {
          setMissions(sortMissionsByDateTime(data.map((mission) => ({ ...mission, status: getMissionStatus(mission) }))));
          setError(null);
        }
      })
      .catch((requestError) => {
        if (!canceled) setError(requestError instanceof Error ? requestError.message : "No se pudieron cargar las misiones.");
      })
      .finally(() => { if (!canceled) setLoading(false); });
    return () => { canceled = true; };
  }, [enabled]);

  const saveRemote = async (mission: Mission) => {
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
    const normalizedMission = sortMissionsByDateTime([mission])[0];
    const previous = missions;
    setMissions((current) => sortMissionsByDateTime(current.some((item) => item.id === normalizedMission.id)
      ? current.map((item) => item.id === normalizedMission.id ? normalizedMission : item)
      : [...current, normalizedMission]));
    setError(null);
    saveRemote(normalizedMission).catch((requestError) => {
      setMissions(previous);
      setError(requestError instanceof Error ? requestError.message : "No se pudo guardar la misión.");
    });
  };

  const updateMission = (id: string, transform: (mission: Mission) => Mission) => {
    const previous = missions;
    const current = missions.find((mission) => mission.id === id);
    if (!current) return;
    const updated = sortMissionsByDateTime([transform(current)])[0];
    setMissions((items) => sortMissionsByDateTime(items.map((mission) => mission.id === id ? updated : mission)));
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

  return { missions, loading, error, upsert, toggle, setStatus, remove };
}
