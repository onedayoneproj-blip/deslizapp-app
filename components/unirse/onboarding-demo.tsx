"use client";

import { CLAVE_BORRADOR_DEMO, slugDemo } from "@/lib/onboarding";
import { RecorridoOnboarding, type FuenteOnboarding } from "./recorrido-onboarding";

/** Las tiendas de la demo (lib/data/seed/tiendas.json): con ellas se ve el «-2» si se repite un nombre. */
const SLUGS_DEMO = ["esencias-michel", "luna-bisuteria", "lino-y-algodon"];
const esperar = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

const FUENTE: FuenteOnboarding = {
  claveBorrador: CLAVE_BORRADOR_DEMO,
  enlaceId: "demo",
  nombreCuenta: "Michel Rosario",
  vistaSlug: async (nombre) => {
    await esperar(150);
    return slugDemo(nombre, SLUGS_DEMO);
  },
  // Nada real: la tienda de la demo no se crea; se simula la espera.
  crear: () => esperar(700),
  // El logo tampoco se sube: se muestra el que eligió (data URL) después de una espera corta.
  ponerLogo: async (logo) => {
    await esperar(600);
    return logo;
  },
  alTerminar: () => window.location.assign(new URL("/", window.location.origin).href),
};

/** `/unirse/demo`: el onboarding entero para mirarlo sin cuenta ni base. */
export function OnboardingDemo() {
  return (
    <main data-unirse="crear" data-demo>
      <RecorridoOnboarding fuente={FUENTE} />
    </main>
  );
}
