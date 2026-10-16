import type { Metadata } from "next";
import { PaginaPlanes } from "@/components/planes/pagina-planes";
import { fotosInicio } from "@/lib/inicio/fotos-servidor";
import { URL_SITIO } from "@/lib/landing/enlaces";
import { planesPublicos } from "@/lib/planes/servidor";

// Next lee esta constante al compilar: tiene que ser un número escrito aquí (5 minutos, como en lib/planes/servidor.ts).
export const revalidate = 300;

const titulo = "Planes · deslizapp";
const descripcion = "Paga por lo que vendes, no por lo que guardas. Elige tu plan y prueba 30 días gratis.";

export const metadata: Metadata = {
  metadataBase: new URL(URL_SITIO),
  title: titulo,
  description: descripcion,
  alternates: { canonical: "/planes" },
  openGraph: { type: "website", url: "/planes", siteName: "deslizapp", locale: "es_DO", title: titulo, description: descripcion, images: [{ url: "/inicio/og.png", width: 1200, height: 630, alt: "deslizapp" }] },
  twitter: { card: "summary_large_image", title: titulo, description: descripcion, images: ["/inicio/og.png"] },
};

export default async function PlanesPage() {
  const [planes, { fotos }] = await Promise.all([planesPublicos(), fotosInicio()]);
  return <PaginaPlanes planes={planes} fotos={fotos} />;
}
