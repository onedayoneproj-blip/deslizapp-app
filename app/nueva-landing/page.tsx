import type { Metadata } from "next";
import { PaginaNuevaLanding } from "@/components/nueva-landing/pagina";
import { URL_SITIO } from "@/lib/landing/enlaces";
import { SUBTITULAR, TITULAR } from "@/lib/nueva-landing/datos";

const titulo = "deslizapp · Tus conversaciones, en pedidos";

// Mockup para revisar. No reemplaza la página principal ni /conoce, y no se indexa.
export const metadata: Metadata = {
  metadataBase: new URL(URL_SITIO),
  title: titulo,
  description: SUBTITULAR,
  robots: { index: false, follow: false },
  alternates: { canonical: "/nueva-landing" },
  openGraph: {
    type: "website",
    url: "/nueva-landing",
    siteName: "deslizapp",
    locale: "es_DO",
    title: TITULAR,
    description: SUBTITULAR,
    images: [{ url: "/landing/og.png", width: 1200, height: 630, alt: "Un termo y un tote bag en el catálogo de deslizapp" }],
  },
  twitter: { card: "summary_large_image", title: titulo, description: SUBTITULAR, images: ["/landing/og.png"] },
};

export default function NuevaLandingPage() {
  return <PaginaNuevaLanding />;
}
