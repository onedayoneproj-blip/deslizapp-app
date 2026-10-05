import type { NextConfig } from "next";

// Identifica cada despliegue (en Vercel, uno por push). Queda fijo en el código del cliente
// y lo devuelve /api/version: si no coinciden, hay una versión nueva publicada.
const ID_DESPLIEGUE = process.env.VERCEL_DEPLOYMENT_ID ?? process.env.VERCEL_GIT_COMMIT_SHA ?? `local-${Date.now()}`;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "https://euihaeyfdlpvmbtfzvnt.supabase.co").hostname, pathname: "/storage/v1/object/public/productos/**", search: "" },
      { protocol: "https", hostname: "deslizapp-app.vercel.app", pathname: "/catalogos/esencias-michel/fotos/**", search: "" },
    ],
    maximumRedirects: 0,
    deviceSizes: [360, 390, 430, 640, 750, 828, 1080, 1200, 1920],
    qualities: [75, 85],
  },
  env: {
    NEXT_PUBLIC_ID_DESPLIEGUE: ID_DESPLIEGUE,
  },
  async headers() {
    return [
      {
        // Catálogos públicos estáticos (sin sesión). Por ahora no se indexan; las páginas se revalidan en cada visita
        // para que las ediciones se vean enseguida.
        source: "/catalogos/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
        ],
      },
      {
        // Fotos del catálogo: nunca se reemplazan con el mismo nombre (si cambian, se suben con otro nombre).
        // Va después de la regla general para que su Cache-Control prevalezca.
        source: "/catalogos/esencias-michel/fotos/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
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
