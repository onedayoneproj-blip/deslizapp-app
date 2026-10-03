import type { Metadata } from "next";
import { GuiaDiseno } from "./guia";

// Guía viva del sistema de diseño (docs/09-sistema-de-diseno.md): los componentes reales de components/ui con todas sus
// variantes. Pública (sin sesión), sin enlace desde la app y fuera de los buscadores.
export const metadata: Metadata = {
  title: "Sistema de diseño · deslizapp",
  robots: { index: false, follow: false },
};

export default function PaginaDiseno() {
  return <GuiaDiseno />;
}
