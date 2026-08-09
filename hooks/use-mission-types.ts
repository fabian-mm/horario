"use client";

import { useEffect, useState } from "react";
import { useMutationCoordinator } from "@/hooks/use-mutation-coordinator";
import { sortMissionTypes, type MissionType } from "@/lib/mission-types";
import { removeById, restoreById, upsertById } from "@/lib/optimistic";

export function useMissionTypes(enabled: boolean) {
  const [missionTypes, setMissionTypes] = useState<MissionType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mutations = useMutationCoordinator();

  useEffect(() => {
    if (!enabled) {
      setMissionTypes([]);
      setLoading(false);
      return;
    }
    let canceled = false;
    setLoading(true);
    fetch("/api/mission-types")
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok)
          throw new Error(
            body.error ?? "No se pudieron cargar los tipos de misión.",
          );
        return body as MissionType[];
      })
      .then((data) => {
        if (!canceled) {
          setMissionTypes(sortMissionTypes(data));
          setError(null);
        }
      })
      .catch((requestError) => {
        if (!canceled)
          setError(
            requestError instanceof Error
              ? requestError.message
              : "No se pudieron cargar los tipos de misión.",
          );
      })
      .finally(() => {
        if (!canceled) setLoading(false);
      });
    return () => {
      canceled = true;
    };
  }, [enabled]);

  const upsert = async (missionType: MissionType) => {
    const existing = missionTypes.find((item) => item.id === missionType.id);
    const version = mutations.begin(missionType.id);
    const optimistic =
      existing && existing.name !== missionType.name
        ? {
            ...missionType,
            aliases: Array.from(
              new Set([...(existing.aliases ?? []), existing.name]),
            ),
          }
        : missionType;
    setMissionTypes((current) => sortMissionTypes(upsertById(current, optimistic)));
    setError(null);
    try {
      const saved = await mutations.enqueue(async () => {
        const response = await fetch("/api/mission-types", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(missionType),
        });
        const body = await response.json();
        if (!response.ok)
          throw new Error(
            body.error ?? "No se pudo guardar el tipo de misión.",
          );
        return body as MissionType;
      });
      if (mutations.isLatest(missionType.id, version)) {
        setMissionTypes((current) => sortMissionTypes(upsertById(current, saved)));
      }
      return saved;
    } catch (requestError) {
      if (mutations.isLatest(missionType.id, version)) {
        setMissionTypes((current) => sortMissionTypes(restoreById(current, missionType.id, existing)));
      }
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo guardar el tipo de misión.",
      );
      return null;
    }
  };

  const remove = async (id: string) => {
    const previous = missionTypes.find((missionType) => missionType.id === id);
    const version = mutations.begin(id);
    setMissionTypes((current) => removeById(current, id));
    setError(null);
    try {
      await mutations.enqueue(async () => {
        const response = await fetch(`/api/mission-types/${encodeURIComponent(id)}`, {
          method: "DELETE",
        });
        if (!response.ok) {
          const body = await response.json();
          throw new Error(
            body.error ?? "No se pudo eliminar el tipo de misión.",
          );
        }
      });
      return true;
    } catch (requestError) {
      if (mutations.isLatest(id, version)) {
        setMissionTypes((current) => sortMissionTypes(restoreById(current, id, previous)));
      }
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo eliminar el tipo de misión.",
      );
      return false;
    }
  };

  return { missionTypes, loading, error, upsert, remove };
}
