"use client";

import { useEffect, useState } from "react";
import { getMissionStatus, initialMissions, Mission, MissionStatus } from "@/lib/missions";

const STORAGE_KEY = "bitacora-misiones-v1";

export function useMissions() {
  const [missions, setMissions] = useState<Mission[]>(initialMissions);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Mission[];
        setMissions(parsed.map((mission) => ({ ...mission, status: getMissionStatus(mission) })));
      }
    } catch {
      // Keep the starter missions if local storage is unavailable or malformed.
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem(STORAGE_KEY, JSON.stringify(missions));
  }, [missions, ready]);

  const upsert = (mission: Mission) =>
    setMissions((current) => {
      const exists = current.some((item) => item.id === mission.id);
      return exists ? current.map((item) => (item.id === mission.id ? mission : item)) : [...current, mission];
    });

  const toggle = (id: string) =>
    setMissions((current) =>
      current.map((mission) => mission.id === id
        ? { ...mission, completed: !mission.completed, status: mission.completed ? "pending" : "completed" }
        : mission),
    );

  const setStatus = (id: string, status: MissionStatus) =>
    setMissions((current) => current.map((mission) =>
      mission.id === id ? { ...mission, status, completed: status === "completed" } : mission,
    ));

  const remove = (id: string) => setMissions((current) => current.filter((mission) => mission.id !== id));

  return { missions, upsert, toggle, setStatus, remove };
}
