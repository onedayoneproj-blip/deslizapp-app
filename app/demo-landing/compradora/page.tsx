import type { Metadata } from "next";
import { TelefonoCompradora } from "@/components/landing/telefono-compradora";
import "../../tienda/catalogo.css";
import "../demo-landing.css";

// El teléfono de Ana en la demo de la landing (solo dentro de su iframe; no es una página para compartir).
export const metadata: Metadata = { title: "Demo · Deslizapp", robots: { index: false, follow: false } };

export default function Pagina() {
  return <TelefonoCompradora />;
}
