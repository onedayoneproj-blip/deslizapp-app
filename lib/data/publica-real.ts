// Inicialización anónima compartida; el servidor la usa directamente y el cliente bajo demanda.
import { createClient } from "@supabase/supabase-js";
import { crearOperacionesPublicas } from "./supabase-publica";
import { SUPABASE_URL, SUPABASE_LLAVE } from "../supabase/config";
import type { FuentePublica } from "./publica";
export function fuentePublicaReal(): FuentePublica {
  if (!SUPABASE_URL || !SUPABASE_LLAVE)
    throw new Error("El catálogo no está disponible ahora.");
  return crearOperacionesPublicas(
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
  );
}
