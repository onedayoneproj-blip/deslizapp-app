import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ProveedorAdmin } from "@/lib/data/admin/provider";
import { AdminMarco } from "@/components/admin/marco";
import { COOKIE_RECUPERAR_VER_COMO, COOKIE_VER_COMO } from "@/lib/admin/ver-como";

/** Ruta explícita de demo: fuente local solamente, sin cliente de Supabase. */
export default async function AdminDemoLayout({ children }: { children: ReactNode }) {
  // Lee únicamente cookies locales; no consulta Supabase ni usa sus datos para servir Demo.
  const jar = await cookies();
  if (jar.get(COOKIE_VER_COMO)?.value || jar.get(COOKIE_RECUPERAR_VER_COMO)?.value) redirect("/");
  return <ProveedorAdmin demo><AdminMarco demo>{children}</AdminMarco></ProveedorAdmin>;
}
