import "@fontsource-variable/fraunces";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bitácora del Navegante",
  description: "Convierte tus entregas y parciales en una aventura.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
