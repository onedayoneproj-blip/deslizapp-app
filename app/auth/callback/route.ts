// Vuelta de Google (flujo PKCE): cambia el `code` por la sesión (cookies) y entra al panel.
// El código solo se canjea una vez; si la petición se repite y el canje falla pero ya hay sesión, se entra igual.
// Si de verdad falla (el dueño canceló, Google no está configurado…), vuelve a la entrada con un aviso.

import { NextResponse } from "next/server";
import { resolverVuelta } from "@/lib/auth/canje";
import { HAY_SUPABASE } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  if (HAY_SUPABASE && code) {
    const supabase = await createClient();
    const resultado = await resolverVuelta(
      () => supabase.auth.exchangeCodeForSession(code),
      async () => {
        const { data, error } = await supabase.auth.getUser();
        return !error && !!data.user;
      },
    );
    if (resultado === "ok") return NextResponse.redirect(`${origin}/`);
  }
  return NextResponse.redirect(`${origin}/?error_login=1`);
}
