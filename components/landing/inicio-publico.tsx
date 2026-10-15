"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSesion } from "@/lib/data/provider";
import { PantallaCarga } from "../panel/pantalla-carga";
import { PantallaEntrada } from "../panel/pantalla-entrada";

/**
 * Lo que ve quien no tiene sesión en el panel (va en los dos huecos del DataProvider: `cargando` y `entrada`, para que React
 * no la vuelva a montar al leer la sesión):
 * - En `/`, la página principal (`principal`, pintada en el servidor; components/inicio-publico). Quien ya eligió «Ver demo»
 *   pasa directo a su panel de prueba, como antes. La landing con la demo está en /conoce.
 * - La pantalla de entrada de siempre en `/entrar`, en cualquier otra ruta del panel, cuando la vuelta de Google trae un
 *   aviso (`/?error_login=1`), con la cuenta sin tienda o si no se pudo comprobar la sesión.
 * - Comprobando una sesión (cookie de Supabase), la pantalla de carga.
 */
export function InicioPublico({ principal }: { principal: ReactNode | null }) {
  const sesion = useSesion();
  const ruta = usePathname();
  const enRaiz = ruta === "/";
  // Aún sin leer la sesión (servidor y primer render): en `/` va la página principal; en el resto, la carga de siempre.
  const verPrincipal = enRaiz && (sesion === null || (sesion.tipo === "entrada" && !sesion.aviso));
  if (verPrincipal) return principal ? <PrincipalVisible confirmada={sesion !== null}>{principal}</PrincipalVisible> : <PedirPrincipal />;
  if (!sesion || sesion.tipo === "cargando" || sesion.tipo === "demo" || sesion.tipo === "lista") return <PantallaCarga />;
  return <PantallaEntrada />;
}

/** Se llegó a `/` navegando dentro del panel: el servidor no mandó la página principal (solo la manda en `/`). Se le pide. */
function PedirPrincipal() {
  const router = useRouter();
  useEffect(() => router.refresh(), [router]);
  return <PantallaCarga />;
}

function PrincipalVisible({ confirmada, children }: { confirmada: boolean; children: ReactNode }) {
  // Ya se leyó la sesión y no es la demo (o salió de ella en esta pestaña): la marca de «demo» ya no aplica.
  useEffect(() => {
    if (confirmada) document.documentElement.removeAttribute("data-dz-demo");
  }, [confirmada]);
  return children;
}
