import type { Metadata } from "next";
import { PantallaUnirse } from "@/components/unirse/pantalla-unirse";

// Vuelta de Google o recarga: el código ya está guardado en el navegador (nunca en esta dirección).
export const metadata: Metadata = { title: "Tu invitación · Deslizapp", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default function UnirsePage() {
  return <PantallaUnirse />;
}
