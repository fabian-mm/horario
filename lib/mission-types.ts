export type MissionType = {
  id: string;
  name: string;
  aliases?: string[];
  createdAt?: string;
  updatedAt?: string;
};

export const defaultMissionTypes: MissionType[] = [
  { id: "preset-trabajo", name: "Trabajo" },
  { id: "preset-parcial", name: "Parcial" },
  { id: "preset-quiz", name: "Quiz" },
  { id: "preset-taller", name: "Taller" },
  { id: "preset-exposicion", name: "Exposición" },
  { id: "preset-proyecto", name: "Proyecto" },
  { id: "preset-entrega", name: "Entrega" },
  { id: "preset-final", name: "Examen final" },
  { id: "preset-recuperatorio", name: "Recuperatorio" },
];

const presetOrder = new Map(defaultMissionTypes.map((type, index) => [type.id, index]));

export const sortMissionTypes = (missionTypes: MissionType[]) => [...missionTypes].sort((a, b) => {
  const aOrder = presetOrder.get(a.id);
  const bOrder = presetOrder.get(b.id);
  if (aOrder !== undefined || bOrder !== undefined) return (aOrder ?? Number.MAX_SAFE_INTEGER) - (bOrder ?? Number.MAX_SAFE_INTEGER);
  return a.name.localeCompare(b.name, "es", { sensitivity: "base" });
});

export const normalizeMissionTypeName = (value: string) =>
  value.trim().toLocaleLowerCase("es");

export const isTimedMissionType = (missionType?: MissionType) => {
  if (!missionType) return false;
  if (["preset-parcial", "preset-final", "preset-recuperatorio"].includes(missionType.id)) return true;
  const name = normalizeMissionTypeName(missionType.name);
  return ["parcial", "examen", "recuperatorio"].some((keyword) => name.includes(keyword));
};

export const findMissionType = (
  missionTypes: MissionType[],
  name?: string,
  missionTypeId?: string,
) => {
  if (missionTypeId) {
    const byId = missionTypes.find(
      (missionType) => missionType.id === missionTypeId,
    );
    if (byId) return byId;
  }
  if (!name) return undefined;
  const normalized = normalizeMissionTypeName(name);
  return missionTypes.find(
    (missionType) =>
      normalizeMissionTypeName(missionType.name) === normalized ||
      missionType.aliases?.some(
        (alias) => normalizeMissionTypeName(alias) === normalized,
      ),
  ) ?? missionTypes.find((missionType) => {
    const candidates = [missionType.name, ...(missionType.aliases ?? [])].map(normalizeMissionTypeName);
    return candidates.some((candidate) => candidate.length >= 4 && normalized.includes(candidate));
  });
};

export const resolveMissionTypeName = (
  missionTypes: MissionType[],
  name: string,
  missionTypeId?: string,
) => findMissionType(missionTypes, name, missionTypeId)?.name ?? name;
