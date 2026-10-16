// Lee en el servidor los planes que se ofrecen (tabla `planes`, se_ofrece = true), con la llave pública. Se revalidan cada 5 minutos.
import { createClient } from "@supabase/supabase-js";
import { unstable_cache, unstable_noStore as noStore } from "next/cache";
import { SUPABASE_LLAVE, SUPABASE_URL } from "../supabase/config";
import { COLUMNAS_PLAN_PUBLICO, planDesdeFila, planesMostrables, type FilaPlanPublico, type PlanPublico } from "./planes";

export const SEGUNDOS_REVALIDAR_PLANES = 300;

export async function leerPlanesDeLaBase(): Promise<PlanPublico[]> {
  if (!SUPABASE_URL || !SUPABASE_LLAVE) throw new Error("Sin Supabase");
  const cliente = createClient(SUPABASE_URL, SUPABASE_LLAVE, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
  });
  const { data, error } = await cliente.from("planes").select(COLUMNAS_PLAN_PUBLICO).eq("se_ofrece", true).order("orden");
  if (error) throw new Error(error.message);
  return planesMostrables(((data ?? []) as FilaPlanPublico[]).map(planDesdeFila));
}

const planesEnCache = unstable_cache(leerPlanesDeLaBase, ["planes-publicos"], { revalidate: SEGUNDOS_REVALIDAR_PLANES, tags: ["planes"] });

/**
 * Los planes de la página. Si la base no responde, lista vacía (la página lo dice; nunca precios inventados) y esa respuesta no se
 * guarda: `unstable_cache` no guarda los errores y `noStore()` saca de la caché la página de esa vez, así el siguiente intento vuelve a leer.
 */
export async function planesPublicos(): Promise<PlanPublico[]> {
  try {
    return await planesEnCache();
  } catch {
    noStore();
    return [];
  }
}
