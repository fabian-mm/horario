"use client";

import { useEffect, useState } from "react";
import { getMissionStatus, initialMissions, Mission, MissionStatus } from "@/lib/missions";
import { DEFAULT_PROFILE_ID } from "@/lib/profiles";

const LEGACY_STORAGE_KEY = "bitacora-misiones-v1";
const storageKey = (profileId: string) => `bitacora-misiones-v2:${profileId}`;

export function useMissions(profileId: string) {
  const [missions, setMissions] = useState<Mission[]>(initialMissions);
  const [loadedProfileId, setLoadedProfileId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const profileKey = storageKey(profileId);
      const stored = localStorage.getItem(profileKey)
        ?? (profileId === DEFAULT_PROFILE_ID ? localStorage.getItem(LEGACY_STORAGE_KEY) : null);
      if (stored) {
        const parsed = JSON.parse(stored) as Mission[];
        setMissions(parsed.map((mission) => ({ ...mission, status: getMissionStatus(mission) })));
      } else setMissions(profileId === DEFAULT_PROFILE_ID ? initialMissions : []);
    } catch {
      setMissions(profileId === DEFAULT_PROFILE_ID ? initialMissions : []);
    } finally {
      setLoadedProfileId(profileId);
    }
  }, [profileId]);

  useEffect(() => {
    if (loadedProfileId === profileId) localStorage.setItem(storageKey(profileId), JSON.stringify(missions));
  }, [missions, profileId, loadedProfileId]);

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
