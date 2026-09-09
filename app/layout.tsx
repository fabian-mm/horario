import "@fontsource-variable/fraunces";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "./globals.css";
import "./academic.css";
import "./rpg.css";
import "./planning.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bitácora · Tu espacio de estudio",
  description: "Organiza tus clases, proyectos y tiempo de estudio en un solo lugar.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
