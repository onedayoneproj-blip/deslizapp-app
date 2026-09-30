import type { NextConfig } from "next";

// Identifica cada despliegue (en Vercel, uno por push). Queda fijo en el código del cliente
// y lo devuelve /api/version: si no coinciden, hay una versión nueva publicada.
const ID_DESPLIEGUE = process.env.VERCEL_DEPLOYMENT_ID ?? process.env.VERCEL_GIT_COMMIT_SHA ?? `local-${Date.now()}`;

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_ID_DESPLIEGUE: ID_DESPLIEGUE,
  },
  async headers() {
    return [
      {
        // Catálogos públicos estáticos (sin sesión). Por ahora no se indexan; se revalidan cada 5 minutos.
        source: "/catalogos/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Cache-Control", value: "public, max-age=300, must-revalidate" },
        ],
      },
      {
        // El service worker nunca se guarda en caché: así cada visita trae el más reciente.
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
