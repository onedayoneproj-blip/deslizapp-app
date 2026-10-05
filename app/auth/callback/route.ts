// Vuelta de Google (flujo PKCE): cambia el `code` por la sesión (cookies) y entra al panel.
// El código solo se canjea una vez; si la petición se repite y el canje falla pero ya hay sesión, se entra igual.
// Si de verdad falla (el dueño canceló, Google no está configurado…), vuelve a la entrada con un aviso.
// Si se entró desde el link de un pedido del catálogo ("¿Eres la tienda?"), la cookie `dz_volver` dice a qué pedido
// volver (solo rutas permitidas: lib/auth/canje.ts `vueltaPermitida`); al fallar, se vuelve a ese mismo link con el aviso.

import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_VOLVER, destinoGoogle, resolverVuelta, vueltaPermitida } from "@/lib/auth/canje";
import { HAY_SUPABASE } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const volver = vueltaPermitida(searchParams.get("volver")) ?? vueltaPermitida(request.cookies.get(COOKIE_VOLVER)?.value);
  const responder = (ruta: string) => {
    const r = NextResponse.redirect(`${origin}${ruta}`);
    if (request.cookies.has(COOKIE_VOLVER)) r.cookies.delete(COOKIE_VOLVER);
    return r;
  };
  if (HAY_SUPABASE && code) {
    const supabase = await createClient();
    const resultado = await resolverVuelta(
      () => supabase.auth.exchangeCodeForSession(code),
      async () => {
        const { data, error } = await supabase.auth.getUser();
        return !error && !!data.user;
      },
    );
    if (resultado === "ok") return responder(destinoGoogle(volver, false));
  }
  return responder(destinoGoogle(volver, true));
}
