import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { COOKIE_RECUPERAR_VER_COMO, COOKIE_TIENDA_VER_COMO, COOKIE_VER_COMO } from "@/lib/admin/ver-como";

type SesionView = { id: string; tienda_id: string; vence_en: string; tienda_nombre: string };
const opciones = (maxAge: number) => ({ httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge });

function error(mensaje: string, status: number) { return NextResponse.json({ error: mensaje }, { status }); }

async function sesionActual(supabase: Awaited<ReturnType<typeof createClient>>, id: string | undefined) {
  if (!id) return null;
  const { data, error: fallo } = await supabase.rpc("admin_ver_como_validar", { p_sesion_id: id });
  if (fallo) throw fallo;
  return data as SesionView | null;
}

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return error("Solicitud no válida.", 403);
  const jar = await cookies();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  let payload: { accion?: string; tiendaId?: string; sesionId?: string } = {};
  try { payload = await request.json(); } catch { /* sin cuerpo en salir */ }
  if (payload.accion === "detectar" && !auth?.claims?.sub) return NextResponse.json({ activa: false });
  if (!auth?.claims?.sub) return error("Tu sesión terminó. Entra de nuevo.", 401);

  if (payload.accion === "iniciar") {
    if (!/^[0-9a-f-]{36}$/i.test(payload.tiendaId ?? "")) return error("Tienda no válida.", 400);
    const { data: admin, error: adminError } = await supabase.rpc("soy_admin");
    if (adminError || admin !== true) return error("No autorizado.", 404);
    const { error: guardError } = await supabase.rpc("admin_ver_como_actual");
    if (guardError) return error("Ver como necesita la actualización de seguridad pendiente.", 503);
    const { data, error: inicioError } = await supabase.rpc("admin_ver_como_iniciar", { p_tienda_id: payload.tiendaId });
    if (inicioError || !data?.id) return error("No pudimos abrir Ver como.", 400);
    const out = NextResponse.json({ ok: true });
    // Se conserva 1 h para poder retirar en SQL una sesión que vence a los 30 min.
    out.cookies.set(COOKIE_VER_COMO, String(data.id), opciones(60 * 60));
    out.cookies.set(COOKIE_TIENDA_VER_COMO, String(data.tienda_id), opciones(60 * 60));
    out.cookies.delete(COOKIE_RECUPERAR_VER_COMO);
    return out;
  }

  if (payload.accion === "validar") {
    try {
      const actual = await sesionActual(supabase, payload.sesionId ?? jar.get(COOKIE_VER_COMO)?.value);
      if (!actual) {
        const { data: vigente } = await supabase.rpc("admin_ver_como_actual");
        return NextResponse.json({ motivo: vigente ? "reemplazada" : "terminada" }, { status: 409 });
      }
      return NextResponse.json({ ok: true, venceEn: actual.vence_en });
    } catch { return error("No pudimos comprobar la sesión de solo mirar.", 503); }
  }

  if (payload.accion === "terminar" || payload.accion === "recuperar") {
    const cookie = payload.accion === "recuperar" ? COOKIE_RECUPERAR_VER_COMO : COOKIE_VER_COMO;
    let id = payload.sesionId ?? jar.get(cookie)?.value;
    try {
      // Si se perdió la cookie, resuelve la sesión activa del usuario desde SQL. El ID nunca autoriza por sí mismo.
      if (!id && payload.accion === "recuperar") {
        const { data, error: buscarError } = await supabase.rpc("admin_ver_como_actual");
        if (buscarError) throw buscarError;
        id = data?.id ? String(data.id) : undefined;
      }
      if (!id) {
        const out = NextResponse.json({ ok: true, sinSesion: true });
        out.cookies.delete(COOKIE_VER_COMO);
        out.cookies.delete(COOKIE_RECUPERAR_VER_COMO);
        out.cookies.delete(COOKIE_TIENDA_VER_COMO);
        return out;
      }
      // RPC limita el cierre al admin dueño del ID; también finaliza filas ya vencidas.
      const { error: cierreError } = await supabase.rpc("admin_ver_como_terminar", { p_sesion_id: id });
      if (cierreError) throw cierreError;
      if (await sesionActual(supabase, id)) throw new Error("La sesión sigue activa.");
      const out = NextResponse.json({ ok: true });
      out.cookies.delete(COOKIE_VER_COMO);
      out.cookies.delete(COOKIE_RECUPERAR_VER_COMO);
      out.cookies.delete(COOKIE_TIENDA_VER_COMO);
      return out;
    } catch {
      // Fallar cerrado: el panel queda fuera hasta completar el cierre o limpiar una sesión ya vencida.
      const out = error("No pudimos cerrar la sesión. El panel sigue bloqueado; vuelve a intentar.", 503);
      if (id) out.cookies.set(COOKIE_RECUPERAR_VER_COMO, id, opciones(60 * 60));
      else out.cookies.delete(COOKIE_RECUPERAR_VER_COMO);
      out.cookies.delete(COOKIE_VER_COMO);
      return out;
    }
  }
  if (payload.accion === "detectar") {
    try {
      const { data: admin, error: adminError } = await supabase.rpc("soy_admin");
      if (adminError) throw adminError;
      if (admin !== true) return NextResponse.json({ activa: false });
      const { data, error: buscarError } = await supabase.rpc("admin_ver_como_actual");
      if (buscarError) throw buscarError;
      return NextResponse.json({ activa: !!data });
    } catch { return error("No pudimos comprobar Ver como. El panel debe volver a cargar.", 503); }
  }
  return error("Acción no válida.", 400);
}
