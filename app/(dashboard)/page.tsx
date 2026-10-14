import type { Metadata } from "next";
import { VistaInicio } from "@/components/inicio/vista-inicio";
import { URL_SITIO } from "@/lib/landing/enlaces";

// Para compartir deslizapp.com (sin sesión, `/` es la landing: components/landing). Con sesión el título sigue siendo el del panel.
const titulo = "deslizapp · Comprar sin tanta vuelta. Vender con más orden.";
const descripcion = "Un catálogo que se desliza para comprar y una app para que la tienda organice lo que pasa después. Mira un pedido de principio a fin.";

export const metadata: Metadata = {
  metadataBase: new URL(URL_SITIO),
  title: titulo,
  description: descripcion,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "deslizapp",
    locale: "es_DO",
    title: titulo,
    description: descripcion,
    images: [{ url: "/landing/og.png", width: 1200, height: 630, alt: "Una gorra, un termo y un tote bag en el catálogo de deslizapp" }],
  },
  twitter: { card: "summary_large_image", title: titulo, description: descripcion, images: ["/landing/og.png"] },
};

// Resumen (pantalla de inicio): docs/04-pantallas.md §7.
export default function InicioPage() {
  return <VistaInicio />;
}
