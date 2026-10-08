import type { Metadata } from "next";
import { VistaPreviaReel } from "@/components/tienda/vista-previa-reel";
import "../tienda/catalogo.css";

// Solo la usa «Cómo se ve» de la hoja de producto (dentro de un iframe del mismo sitio): no es una página para compartir.
export const metadata: Metadata = { title: "Cómo se ve · Deslizapp", robots: { index: false, follow: false } };

export default function Pagina() {
  return <VistaPreviaReel />;
}
