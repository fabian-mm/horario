import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimización de imágenes (si se usan)
  images: {
    formats: ["image/avif", "image/webp"],
  },
  
  // Reducir tamaño del bundle
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error"] } : undefined,
  },
  
  // Optimizaciones de producción
  productionBrowserSourceMaps: false,
  
  // Power by header para seguridad
  poweredByHeader: false,
  
  // Headers de seguridad y caché
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

export default nextConfig;
