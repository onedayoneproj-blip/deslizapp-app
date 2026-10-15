import type { Metadata } from "next";
import { cookies } from "next/headers";
import { VistaInicio } from "@/components/inicio/vista-inicio";
import { URL_SITIO } from "@/lib/landing/enlaces";

// Para compartir deslizapp.com (sin sesión, `/` es la landing: components/landing). Con sesión, la pestaña conserva el título del
// panel (app/layout.tsx); basta mirar si hay cookie de Supabase, sin consultar nada.
const titulo = "deslizapp · Comprar sin tanta vuelta. Vender con más orden.";
const descripcion = "Un catálogo que se desliza para comprar y una app para que la tienda organice lo que pasa después. Mira un pedido de principio a fin.";

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
      images: [{ url: "/landing/og.png", width: 1200, height: 630, alt: "Un termo y un tote bag en el catálogo de deslizapp" }],
    },
    twitter: { card: "summary_large_image", title: titulo, description: descripcion, images: ["/landing/og.png"] },
  };
}

// Resumen (pantalla de inicio): docs/04-pantallas.md §7.
export default function InicioPage() {
  return <VistaInicio />;
}
