import type { Metadata } from "next";
import { Landing } from "@/components/landing/landing";
import { RUTA_CONOCE, URL_SITIO } from "@/lib/landing/enlaces";

// La landing con la demo de un pedido (components/landing): se ve siempre, haya sesión o no, para compartirla y enseñarla
// (docs/prompts/pagina-principal-y-conoce.md). Conserva el título, la descripción y la imagen que tenía en `/`.
const titulo = "deslizapp · Comprar sin tanta vuelta. Vender con más orden.";
const descripcion = "Un catálogo que se desliza para comprar y una app para que la tienda organice lo que pasa después. Mira un pedido de principio a fin.";

export const metadata: Metadata = {
  metadataBase: new URL(URL_SITIO),
  title: titulo,
  description: descripcion,
  alternates: { canonical: RUTA_CONOCE },
  openGraph: {
    type: "website",
    url: RUTA_CONOCE,
    siteName: "deslizapp",
    locale: "es_DO",
    title: titulo,
    description: descripcion,
    images: [{ url: "/landing/og.png", width: 1200, height: 630, alt: "Un termo y un tote bag en el catálogo de deslizapp" }],
  },
  twitter: { card: "summary_large_image", title: titulo, description: descripcion, images: ["/landing/og.png"] },
};

export default function ConocePage() {
  return <Landing />;
}
