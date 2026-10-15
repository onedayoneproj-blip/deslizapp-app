import type { Metadata } from "next";
import { cookies } from "next/headers";
import { VistaInicio } from "@/components/inicio/vista-inicio";
import { URL_SITIO } from "@/lib/landing/enlaces";

// Para compartir deslizapp.com (sin sesión, `/` es la página principal: components/inicio-publico; la landing con la demo tiene
// los suyos en app/conoce). Con sesión, la pestaña conserva el título del panel (app/layout.tsx); basta mirar si hay cookie de
// Supabase, sin consultar nada.
const titulo = "deslizapp · Tu catálogo para vender por WhatsApp";
const descripcion = "Comprar sin tanta vuelta. Vender con más orden. Tu catálogo para vender por WhatsApp, y una app para todo lo que pasa después.";

export async function generateMetadata(): Promise<Metadata> {
  const conSesion = (await cookies()).getAll().some((c) => c.name.startsWith("sb-") && c.name.includes("auth-token"));
  return {
    metadataBase: new URL(URL_SITIO),
    ...(conSesion ? {} : { title: titulo }),
    description: descripcion,
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      url: "/",
      siteName: "deslizapp",
      locale: "es_DO",
      title: titulo,
      description: descripcion,
      images: [{ url: "/inicio/og.png", width: 1200, height: 630, alt: "Fotos de productos de la tienda Deslizapp y el lema «Comprar sin tanta vuelta. Vender con más orden.»" }],
    },
    twitter: { card: "summary_large_image", title: titulo, description: descripcion, images: ["/inicio/og.png"] },
  };
}

// Resumen (pantalla de inicio): docs/04-pantallas.md §7.
export default function InicioPage() {
  return <VistaInicio />;
}
