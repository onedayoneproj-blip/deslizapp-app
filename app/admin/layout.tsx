import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { ProveedorAdmin } from "@/lib/data/admin/provider";
import { AdminMarco } from "@/components/admin/marco";
import { HAY_SUPABASE } from "@/lib/supabase/config";
import { COOKIE_RECUPERAR_VER_COMO, COOKIE_VER_COMO } from "@/lib/admin/ver-como";
import { cuentaDeClaims } from "@/lib/cuenta";

/** La entrada real siempre se autoriza en el servidor; cada RPC vuelve a validar soy_admin(). */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  if (!HAY_SUPABASE) notFound();
  const supabase = await createClient();
  const { data: claims, error: errorSesion } = await supabase.auth.getClaims();
  if (errorSesion || !claims?.claims?.sub) notFound();
  const { data: autorizado, error } = await supabase.rpc("soy_admin");
  if (error || autorizado !== true) notFound();
  const jar = await cookies();
  const viewCookie = jar.get(COOKIE_VER_COMO)?.value;
  const recuperacion = jar.get(COOKIE_RECUPERAR_VER_COMO)?.value;
  const { data: vistaActiva, error: errorVista } = await supabase.rpc("admin_ver_como_actual");
  if (vistaActiva) redirect("/");
  // Antes de que exista el RPC no se puede iniciar Ver como (el API falla cerrado). Si hay una cookie,
  // pero no se puede verificarla, no abrimos el panel admin hasta resolver la sesión.
  if (errorVista && (viewCookie || recuperacion)) redirect("/ver-como/recuperar");
  // La cuenta (foto, nombre y correo de Google) sale de la sesión; la tienda por defecto, de la propia cuenta (RLS por membresía).
  const cuenta = cuentaDeClaims(claims.claims);
  let miTienda: { nombre: string; logoUrl: string | null } | null = null;
  const { data: perfil } = await supabase.from("usuarios").select("tienda_id").eq("id", claims.claims.sub).maybeSingle();
  if (perfil?.tienda_id) {
    const { data: t } = await supabase.from("tiendas").select("nombre, logo_url, estado").eq("id", perfil.tienda_id).maybeSingle();
    if (t && t.estado !== "eliminada") miTienda = { nombre: t.nombre as string, logoUrl: (t.logo_url as string | null) ?? null };
  }
  return (
    <ProveedorAdmin>
      <AdminMarco cuenta={cuenta} miTienda={miTienda}>{children}</AdminMarco>
    </ProveedorAdmin>
  );
}
