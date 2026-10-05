// Entrada pública a la misma capa de datos. Sin sesión, cookies ni DataProvider del panel.
import { createClient } from "@supabase/supabase-js";
import { crearFuenteSupabase } from "./supabase";
import { SUPABASE_URL, SUPABASE_LLAVE } from "../supabase/config";
import type { FuenteDatos } from "./fuente";
export type FuentePublica = Pick<
  FuenteDatos,
  | "catalogoPublico"
  | "crearSolicitudPedido"
  | "verSolicitud"
  | "registrarAaah"
  | "pedirAviso"
>;
export function fuentePublicaReal(): FuentePublica {
  if (!SUPABASE_URL || !SUPABASE_LLAVE)
    throw new Error("El catálogo no está disponible ahora.");
  return crearFuenteSupabase(
    createClient(SUPABASE_URL, SUPABASE_LLAVE, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
      },
    }),
    () => {},
  );
}
export async function fuentePublica(demo: boolean): Promise<FuentePublica> {
  if (demo) return (await import("./demo")).fuenteDemo;
  return fuentePublicaReal();
}

export async function observarFuentePublicaDemo(): Promise<() => void> {
  const { suscribirDemo } = await import("./demo");
  return suscribirDemo(() => {});
}
