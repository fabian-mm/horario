export const appThemes = [
  {
    id: "guild",
    name: "Bosque Esmeralda",
    description: "La apariencia clásica del gremio.",
    colors: ["#173f38", "#bc8a35", "#f4eddb"],
  },
  {
    id: "rose",
    name: "Reino Rosa",
    description: "Rosas antiguas, ciruela y cristal.",
    colors: ["#8f3f63", "#db719d", "#f8e8ef"],
  },
  {
    id: "ocean",
    name: "Océano Abisal",
    description: "Azules profundos y tesoros turquesa.",
    colors: ["#184c62", "#3c9b9d", "#e6f1ef"],
  },
  {
    id: "arcane",
    name: "Arcano Violeta",
    description: "Magia púrpura con detalles dorados.",
    colors: ["#513968", "#9a70bb", "#eee6f2"],
  },
  {
    id: "ember",
    name: "Forja Carmesí",
    description: "Cobre, brasas y pergamino cálido.",
    colors: ["#673629", "#d06b3f", "#f3e3ce"],
  },
] as const;

export type ThemeId = typeof appThemes[number]["id"];

export const DEFAULT_THEME: ThemeId = "guild";

export const isThemeId = (value: string): value is ThemeId =>
  appThemes.some((theme) => theme.id === value);
