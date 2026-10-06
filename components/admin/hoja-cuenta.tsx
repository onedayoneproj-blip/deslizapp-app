"use client";

import Link from "next/link";
import { CUENTA_DEMO, RUTA_PANEL, type CuentaVista } from "@/lib/cuenta";
import { salir, salirDeLaDemo } from "@/lib/data/sesion";
import { Hoja } from "../hoja";
import { IconoChevronDerecha } from "../iconos";
import { FilaCuenta } from "../panel/cuenta";
import { LogoTienda } from "../panel/logo-tienda";

/** La tienda por defecto de la cuenta (la que abre el panel). */
export type MiTienda = { nombre: string; logoUrl: string | null };

/**
 * La cuenta dentro del admin (§2b): «Ir a mi tienda» vuelve al panel de la tienda por defecto de la cuenta (`/`), y debajo la
 * cuenta con «Cerrar sesión». Sin tienda, la fila no aparece. En /admin-demo, el panel de la demo de este navegador y la
 * «Cuenta de demo».
 */
export function HojaCuentaAdmin({
  abierta,
  alCerrar,
  cuenta,
  miTienda,
  demo,
}: {
  abierta: boolean;
  alCerrar: () => void;
  cuenta: CuentaVista | null;
  miTienda: MiTienda | null;
  demo: boolean;
}) {
  const quien = cuenta ?? (demo ? CUENTA_DEMO : null);
  const alSalir = () => {
    alCerrar();
    // La entrada está en `/`: después de cerrar la sesión se va ahí (sin dejar el admin a medio cargar).
    if (demo) {
      salirDeLaDemo();
      window.location.href = RUTA_PANEL;
    } else void salir().finally(() => window.location.href = RUTA_PANEL);
  };
  return (
    <Hoja abierta={abierta} alCerrar={alCerrar} titulo="Tu cuenta" altura="auto">
      {miTienda && (
        <Link
          href="/"
          onClick={alCerrar}
          aria-label={`Ir a mi tienda, ${miTienda.nombre}`}
          className="tocable flex min-h-14 w-full items-center gap-3 rounded-radio-l border-[1.5px] border-linea bg-superficie px-3.5 py-2.5 text-left"
        >
          <LogoTienda tienda={miTienda} tamano={44} />
          <span className="min-w-0 flex-1">
            <span className="block font-extrabold">Ir a mi tienda</span>
            <span className="block truncate text-secundario text-texto-secundario">{miTienda.nombre}</span>
          </span>
          <IconoChevronDerecha tamano={18} className="shrink-0 text-texto-secundario" />
        </Link>
      )}
      {quien && (
        <div className={miTienda ? "mt-4 border-t border-linea pt-4" : ""}>
          <FilaCuenta cuenta={quien} etiquetaSalir={demo ? "Salir de la demo" : "Cerrar sesión"} alSalir={alSalir} />
        </div>
      )}
    </Hoja>
  );
}
