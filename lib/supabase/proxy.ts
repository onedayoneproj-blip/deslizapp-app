// Renueva la sesión de Supabase en cada petición (guía oficial: el token vence y se refresca aquí).

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { HAY_SUPABASE, SUPABASE_LLAVE, SUPABASE_URL } from "./config";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  // Sin variables (o en la demo, sin cookies de sesión) no hay nada que renovar.
  if (!HAY_SUPABASE || !request.cookies.getAll().some((c) => c.name.startsWith("sb-"))) return supabaseResponse;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_LLAVE, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
      },
    },
  });

  // No poner código entre createServerClient y getClaims(): es lo que refresca el token.
  await supabase.auth.getClaims();

  return supabaseResponse;
}
