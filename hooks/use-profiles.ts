"use client";

import { useEffect, useMemo, useState } from "react";
import { defaultProfile, LocalProfile } from "@/lib/profiles";

const PROFILES_KEY = "bitacora-perfiles-v1";
const ACTIVE_PROFILE_KEY = "bitacora-perfil-activo-v1";

export function useProfiles() {
  const [profiles, setProfiles] = useState<LocalProfile[]>([defaultProfile]);
  const [activeProfileId, setActiveProfileId] = useState(defaultProfile.id);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const storedProfiles = localStorage.getItem(PROFILES_KEY);
      const storedActive = localStorage.getItem(ACTIVE_PROFILE_KEY);
      if (storedProfiles) {
        const parsed = JSON.parse(storedProfiles) as LocalProfile[];
        if (parsed.length) {
          setProfiles(parsed);
          setActiveProfileId(parsed.some((profile) => profile.id === storedActive) ? storedActive! : parsed[0].id);
        }
      }
    } catch {
      // The default local profile remains available if storage is malformed.
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
    localStorage.setItem(ACTIVE_PROFILE_KEY, activeProfileId);
  }, [profiles, activeProfileId, ready]);

  const activeProfile = useMemo(
    () => profiles.find((profile) => profile.id === activeProfileId) ?? profiles[0] ?? defaultProfile,
    [profiles, activeProfileId],
  );

  const createProfile = () => {
    const id = crypto.randomUUID();
    const profile: LocalProfile = {
      id,
      name: "Nuevo navegante",
      subtitle: "Explorador del semestre",
      createdAt: new Date().toISOString(),
    };
    setProfiles((current) => [...current, profile]);
    setActiveProfileId(id);
    return id;
  };

  const updateProfile = (id: string, changes: Pick<LocalProfile, "name" | "subtitle">) =>
    setProfiles((current) => current.map((profile) => profile.id === id ? { ...profile, ...changes } : profile));

  return { profiles, activeProfile, activeProfileId, setActiveProfileId, createProfile, updateProfile };
}
