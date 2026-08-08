export type LocalProfile = {
  id: string;
  name: string;
  subtitle: string;
  createdAt: string;
};

export const DEFAULT_PROFILE_ID = "device-owner";

export const defaultProfile: LocalProfile = {
  id: DEFAULT_PROFILE_ID,
  name: "Stiven Navegante",
  subtitle: "Capitán de su destino",
  createdAt: "2026-08-08T00:00:00.000Z",
};

export const getInitials = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map((word) => word[0]?.toUpperCase()).join("") || "NV";
