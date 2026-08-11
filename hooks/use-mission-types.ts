"use client";

import { useEffect, useState } from "react";
import { useMutationCoordinator } from "@/hooks/use-mutation-coordinator";
import { getRequestError, isAbortError, readApiResponse } from "@/lib/http";
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
      setError(null);
      return;
    }
    let canceled = false;
    const controller = new AbortController();
    setLoading(true);
    fetch("/api/mission-types", { signal: controller.signal })
      .then(async (response) => {
        return readApiResponse<MissionType[]>(response, "No se pudieron cargar los tipos de misión.");
      })
      .then((data) => {
        if (!canceled) {
          setMissionTypes(sortMissionTypes(data));
          setError(null);
        }
      })
      .catch((requestError) => {
        if (!canceled && !isAbortError(requestError))
          setError(
            getRequestError(requestError, "No se pudieron cargar los tipos de misión."),
          );
      })
      .finally(() => {
        if (!canceled) setLoading(false);
      });
    return () => {
      canceled = true;
      controller.abort();
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
        return readApiResponse<MissionType>(response, "No se pudo guardar el tipo de misión.");
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
        getRequestError(requestError, "No se pudo guardar el tipo de misión."),
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
        await readApiResponse(response, "No se pudo eliminar el tipo de misión.");
      });
      return true;
    } catch (requestError) {
      if (mutations.isLatest(id, version)) {
        setMissionTypes((current) => sortMissionTypes(restoreById(current, id, previous)));
      }
      setError(
        getRequestError(requestError, "No se pudo eliminar el tipo de misión."),
      );
      return false;
    }
  };

  return { missionTypes, loading, error, upsert, remove };
}
