"use client";

import { useEffect, useRef, useState } from "react";
import { useMutationCoordinator } from "@/hooks/use-mutation-coordinator";
import { getRequestError, isAbortError, readApiResponse } from "@/lib/http";
import { getMissionStatus, Mission, MissionStatus, sortMissionsByDateTime, toISODate } from "@/lib/missions";
import { removeById, restoreById, upsertById } from "@/lib/optimistic";

export function useMissions(enabled: boolean) {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const missionsRef = useRef<Mission[]>([]);
  const mutations = useMutationCoordinator();

  useEffect(() => {
    if (!enabled) {
      missionsRef.current = [];
      setMissions([]);
      setLoading(false);
      setError(null);
      return;
    }
    let canceled = false;
    const controller = new AbortController();
    setLoading(true);
    fetch("/api/missions", {
      signal: controller.signal,
      headers: { "X-Client-Date": toISODate(new Date()) },
    })
      .then(async (response) => {
        return readApiResponse<Mission[]>(response, "No se pudieron cargar las misiones.");
      })
      .then((data) => {
        if (!canceled) {
          const normalized = sortMissionsByDateTime(data.map((mission) => ({ ...mission, status: getMissionStatus(mission) })));
          missionsRef.current = normalized;
          setMissions(normalized);
          setError(null);
        }
      })
      .catch((requestError) => {
        if (!canceled && !isAbortError(requestError)) setError(getRequestError(requestError, "No se pudieron cargar las misiones."));
      })
      .finally(() => { if (!canceled) setLoading(false); });
    return () => { canceled = true; controller.abort(); };
  }, [enabled]);

  const saveRemote = async (mission: Mission) => {
    const response = await fetch("/api/missions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Client-Date": toISODate(new Date()),
      },
      body: JSON.stringify(mission),
    });
    return readApiResponse<Mission>(response, "No se pudo guardar la misión.");
  };

  const upsert = async (mission: Mission) => {
    const normalizedMission = sortMissionsByDateTime([mission])[0];
    const previous = missionsRef.current.find((item) => item.id === normalizedMission.id);
    const version = mutations.begin(normalizedMission.id);
    missionsRef.current = sortMissionsByDateTime(upsertById(missionsRef.current, normalizedMission));
    setMissions(missionsRef.current);
    setError(null);
    try {
      const saved = await mutations.enqueue(() => saveRemote(normalizedMission));
      if (mutations.isLatest(normalizedMission.id, version)) {
        missionsRef.current = sortMissionsByDateTime(upsertById(missionsRef.current, saved));
        setMissions(missionsRef.current);
      }
      return saved;
    } catch (requestError) {
      if (mutations.isLatest(normalizedMission.id, version)) {
        missionsRef.current = sortMissionsByDateTime(restoreById(missionsRef.current, normalizedMission.id, previous));
        setMissions(missionsRef.current);
      }
      setError(getRequestError(requestError, "No se pudo guardar la misión."));
      return null;
    }
  };

  const updateMission = (id: string, transform: (mission: Mission) => Mission) => {
    const current = missionsRef.current.find((mission) => mission.id === id);
    if (!current) return null;
    const updated = sortMissionsByDateTime([transform(current)])[0];
    void upsert(updated);
    return updated;
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
    const previous = missionsRef.current.find((mission) => mission.id === id);
    const version = mutations.begin(id);
    missionsRef.current = removeById(missionsRef.current, id);
    setMissions(missionsRef.current);
    setError(null);
    try {
      await mutations.enqueue(async () => {
        const response = await fetch(`/api/missions/${encodeURIComponent(id)}`, {
          method: "DELETE",
          headers: { "X-Client-Date": toISODate(new Date()) },
        });
        await readApiResponse(response, "No se pudo eliminar la misión.");
      });
      return true;
    } catch (requestError) {
      if (mutations.isLatest(id, version)) {
        missionsRef.current = sortMissionsByDateTime(restoreById(missionsRef.current, id, previous));
        setMissions(missionsRef.current);
      }
      setError(getRequestError(requestError, "No se pudo eliminar la misión."));
      return false;
    }
  };

  return { missions, loading, error, upsert, updateMission, toggle, setStatus, remove };
}
