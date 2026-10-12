import type { Metadata } from "next";
import { ReelSolo } from "@/components/catalogo/reel-solo";
import "../tienda/catalogo.css";
import "./reel-solo.css";

// Solo la usa el paso «Así se ve en tu catálogo» de crear producto (dentro de un iframe del mismo sitio): no es una página para compartir.
export const metadata: Metadata = { title: "Así se ve · Deslizapp", robots: { index: false, follow: false } };

export default function Pagina() {
  return <ReelSolo />;
}
