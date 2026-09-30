// Vuelta de Google (flujo PKCE): cambia el `code` por la sesión (cookies) y entra al panel.
// Si algo falla (el dueño canceló, Google no está configurado…), vuelve a la entrada con un aviso.

import { NextResponse } from "next/server";
import { HAY_SUPABASE } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  if (HAY_SUPABASE && code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}/`);
  }
  return NextResponse.redirect(`${origin}/?error_login=1`);
}
