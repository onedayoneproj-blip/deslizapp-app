// Cliente de Supabase para el navegador (guía oficial de Next.js + @supabase/ssr).
// La sesión vive en cookies, así el servidor (proxy y /auth/callback) también la ve.

import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_LLAVE, SUPABASE_URL } from "./config";

export function createClient() {
  // En el navegador, createBrowserClient devuelve siempre la misma instancia.
  return createBrowserClient(SUPABASE_URL, SUPABASE_LLAVE);
}
