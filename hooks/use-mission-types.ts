"use client";

import { useEffect, useState } from "react";
import type { MissionType } from "@/lib/mission-types";

export function useMissionTypes(enabled: boolean) {
  const [missionTypes, setMissionTypes] = useState<MissionType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          setMissionTypes(data);
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

  const upsert = (missionType: MissionType) => {
    const previous = missionTypes;
    const existing = missionTypes.find((item) => item.id === missionType.id);
    const optimistic =
      existing && existing.name !== missionType.name
        ? {
            ...missionType,
            aliases: Array.from(
              new Set([...(existing.aliases ?? []), existing.name]),
            ),
          }
        : missionType;
    setMissionTypes((current) =>
      current.some((item) => item.id === missionType.id)
        ? current.map((item) =>
            item.id === missionType.id ? optimistic : item,
          )
        : [...current, optimistic],
    );
    setError(null);
    fetch("/api/mission-types", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(missionType),
    })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok)
          throw new Error(
            body.error ?? "No se pudo guardar el tipo de misión.",
          );
        const saved = body as MissionType;
        setMissionTypes((current) =>
          current.map((item) => (item.id === saved.id ? saved : item)),
        );
      })
      .catch((requestError) => {
        setMissionTypes(previous);
        setError(
          requestError instanceof Error
            ? requestError.message
            : "No se pudo guardar el tipo de misión.",
        );
      });
  };

  const remove = (id: string) => {
    const previous = missionTypes;
    setMissionTypes((current) =>
      current.filter((missionType) => missionType.id !== id),
    );
    setError(null);
    fetch(`/api/mission-types/${encodeURIComponent(id)}`, {
      method: "DELETE",
    })
      .then(async (response) => {
        if (!response.ok) {
          const body = await response.json();
          throw new Error(
            body.error ?? "No se pudo eliminar el tipo de misión.",
          );
        }
      })
      .catch((requestError) => {
        setMissionTypes(previous);
        setError(
          requestError instanceof Error
            ? requestError.message
            : "No se pudo eliminar el tipo de misión.",
        );
      });
  };

  return { missionTypes, loading, error, upsert, remove };
}
