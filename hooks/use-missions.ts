"use client";

import { useEffect, useState } from "react";
import { useMutationCoordinator } from "@/hooks/use-mutation-coordinator";
import { getMissionStatus, Mission, MissionStatus, sortMissionsByDateTime } from "@/lib/missions";
import { removeById, restoreById, upsertById } from "@/lib/optimistic";

export function useMissions(enabled: boolean) {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mutations = useMutationCoordinator();

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

  const upsert = async (mission: Mission) => {
    const normalizedMission = sortMissionsByDateTime([mission])[0];
    const previous = missions.find((item) => item.id === normalizedMission.id);
    const version = mutations.begin(normalizedMission.id);
    setMissions((current) => sortMissionsByDateTime(upsertById(current, normalizedMission)));
    setError(null);
    try {
      const saved = await mutations.enqueue(() => saveRemote(normalizedMission));
      if (mutations.isLatest(normalizedMission.id, version)) {
        setMissions((current) => sortMissionsByDateTime(upsertById(current, saved)));
      }
      return saved;
    } catch (requestError) {
      if (mutations.isLatest(normalizedMission.id, version)) {
        setMissions((current) => sortMissionsByDateTime(restoreById(current, normalizedMission.id, previous)));
      }
      setError(requestError instanceof Error ? requestError.message : "No se pudo guardar la misión.");
      return null;
    }
  };

  const updateMission = (id: string, transform: (mission: Mission) => Mission) => {
    const current = missions.find((mission) => mission.id === id);
    if (!current) return;
    const updated = sortMissionsByDateTime([transform(current)])[0];
    void upsert(updated);
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

  const remove = async (id: string) => {
    const previous = missions.find((mission) => mission.id === id);
    const version = mutations.begin(id);
    setMissions((current) => removeById(current, id));
    setError(null);
    try {
      await mutations.enqueue(async () => {
        const response = await fetch(`/api/missions/${encodeURIComponent(id)}`, { method: "DELETE" });
        if (!response.ok) {
          const body = await response.json();
          throw new Error(body.error ?? "No se pudo eliminar la misión.");
        }
      });
      return true;
    } catch (requestError) {
      if (mutations.isLatest(id, version)) {
        setMissions((current) => sortMissionsByDateTime(restoreById(current, id, previous)));
      }
      setError(requestError instanceof Error ? requestError.message : "No se pudo eliminar la misión.");
      return false;
    }
  };

  return { missions, loading, error, upsert, toggle, setStatus, remove };
}
