// Las dos variables PÚBLICAS de Supabase (van en .env.local y en Vercel; ver .env.example).
// Nunca una llave secreta ni service_role: el navegador solo usa la publicable, y el RLS protege los datos.

import { supabaseConfigurado } from "../data/modo";

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_LLAVE = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

/** false si faltan las variables: la app sigue funcionando en demo y avisa al intentar entrar con Google. */
export const HAY_SUPABASE = supabaseConfigurado(SUPABASE_URL, SUPABASE_LLAVE);
