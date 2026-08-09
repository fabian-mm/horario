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

export const normalizeMissionTypeName = (value: string) =>
  value.trim().toLocaleLowerCase("es");

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
  );
};

export const resolveMissionTypeName = (
  missionTypes: MissionType[],
  name: string,
  missionTypeId?: string,
) => findMissionType(missionTypes, name, missionTypeId)?.name ?? name;
