export type AppUser = {
  id: string;
  name: string;
  email: string;
  subtitle: string;
  createdAt: string;
  updatedAt: string;
};

export type UserDocument = AppUser & {
  passwordHash: string;
};

export const getUserInitials = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map((word) => word[0]?.toUpperCase()).join("") || "NV";
