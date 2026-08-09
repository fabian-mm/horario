export type ActivityCategory = "class" | "activity";
export type ActivityTone = "gold" | "sage" | "coral" | "ocean" | "violet";

export type ActivityType = {
  id: string;
  name: string;
  category: ActivityCategory;
  points: number;
  tone: ActivityTone;
  aliases?: string[];
  createdAt?: string;
  updatedAt?: string;
};

export const defaultActivityTypes: ActivityType[] = [
  { id: "preset-class", name: "Clase", category: "class", points: 10, tone: "ocean" },
  { id: "preset-study", name: "Sesión de estudio", category: "activity", points: 15, tone: "violet" },
  { id: "preset-project", name: "Proyecto o trabajo", category: "activity", points: 25, tone: "gold" },
  { id: "preset-exercise", name: "Ejercicio", category: "activity", points: 20, tone: "sage" },
  { id: "preset-personal", name: "Rutina personal", category: "activity", points: 10, tone: "coral" },
];

export const normalizeActivityTypeName = (value: string) => value.trim().toLocaleLowerCase("es");

export const findActivityType = (activityTypes: ActivityType[], activityTypeId?: string, name?: string) => {
  if (activityTypeId) {
    const byId = activityTypes.find((activityType) => activityType.id === activityTypeId);
    if (byId) return byId;
  }
  if (!name) return undefined;
  const normalized = normalizeActivityTypeName(name);
  return activityTypes.find((activityType) => normalizeActivityTypeName(activityType.name) === normalized || activityType.aliases?.some((alias) => normalizeActivityTypeName(alias) === normalized));
};

export const resolveActivityType = (activityTypes: ActivityType[], activityTypeId?: string, name?: string) =>
  findActivityType(activityTypes, activityTypeId, name) ?? activityTypes[0] ?? defaultActivityTypes[0];
