import type { Metadata } from "next";
import { TelefonoTienda } from "@/components/landing/telefono-tienda";
import "../../tienda/catalogo.css";
import "../demo-landing.css";

// El teléfono de la tienda en la demo de la landing (solo dentro de su iframe; no es una página para compartir).
export const metadata: Metadata = { title: "Demo · Deslizapp", robots: { index: false, follow: false } };

export default function Pagina() {
  return <TelefonoTienda />;
}
