import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Bitácora del Navegante",
    short_name: "Bitácora",
    description: "Horario, misiones y objetivos académicos con estética de aventura RPG.",
    start_url: "/",
    display: "standalone",
    background_color: "#eee6d5",
    theme_color: "#244d43",
    categories: ["education", "productivity"],
    icons: [
      {
        src: "/favicon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
