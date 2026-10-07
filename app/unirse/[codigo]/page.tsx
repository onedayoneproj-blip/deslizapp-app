import type { Metadata } from "next";
import { PantallaUnirse } from "@/components/unirse/pantalla-unirse";

// El enlace de invitación (docs/prompts/colaboradores-e-invitaciones.md §3). Sin índice, sin referer y sin recursos de terceros;
// la pantalla guarda el código en el navegador y lo quita de la barra al instante.
export const metadata: Metadata = { title: "Tu invitación · Deslizapp", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function UnirseConCodigoPage({ params }: PageProps<"/unirse/[codigo]">) {
  const { codigo } = await params;
  return <PantallaUnirse codigo={codigo} />;
}
