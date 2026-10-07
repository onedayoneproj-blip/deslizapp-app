"use client";

import { useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { CUENTA_DEMO, inicialesDeCuenta, type CuentaVista } from "@/lib/cuenta";
import { leerDemo, suscribirDemo } from "@/lib/data/demo";
import { FotoCuenta } from "@/components/panel/cuenta";
import { BarraPestanas, type Seccion } from "@/components/panel/nav-inferior";
import { HojaCuentaAdmin, type MiTienda } from "./hoja-cuenta";
import { IconoInicio, IconoCatalogo, IconoChispa, IconoMoneda, IconoMas } from "@/components/iconos";

const tabs: Seccion[] = [
  { href: "/admin", nombre: "Hoy", Icono: IconoInicio },
  { href: "/admin/tiendas", nombre: "Tiendas", Icono: IconoCatalogo },
  { href: "/admin/trabajo", nombre: "Trabajo", Icono: IconoChispa },
  { href: "/admin/cobros", nombre: "Cobros", Icono: IconoMoneda },
  { href: "/admin/mas", nombre: "Más", Icono: IconoMas },
];

const sinServidor = () => null;

export function AdminMarco({ children, demo = false, cuenta = null, miTienda = null }: { children: ReactNode; demo?: boolean; cuenta?: CuentaVista | null; miTienda?: MiTienda | null }) {
  const [cuentaAbierta, setCuentaAbierta] = useState(false);
  // /admin-demo: la tienda del panel de la demo de este navegador (solo se lee en el navegador; nunca toca Supabase).
  const estadoDemo = useSyncExternalStore(suscribirDemo, demo ? leerDemo : sinServidor, sinServidor);
  const tiendaDemo = estadoDemo?.db.tiendas.find((t) => t.id === estadoDemo.tiendaActivaId) ?? null;
  const quien = demo ? CUENTA_DEMO : cuenta;
  const secciones = useMemo(() => (demo ? tabs.map((t) => ({ ...t, href: t.href.replace("/admin", "/admin-demo") })) : tabs), [demo]);
  const suTienda: MiTienda | null = demo ? (tiendaDemo ? { nombre: tiendaDemo.nombre, logoUrl: tiendaDemo.logoUrl } : null) : miTienda;
  return (
    <div className="mx-auto flex min-h-dvh max-w-[480px] flex-col bg-fondo text-texto min-[481px]:shadow-[0_0_40px_rgba(23,75,58,0.08)]">
      <header className="flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2 font-display text-destacado font-extrabold text-bosque">
          deslizapp <span className="rounded-full bg-bosque px-2.5 py-1 text-[11px] text-papel">admin</span>
        </div>
        <button
          type="button"
          onClick={() => setCuentaAbierta(true)}
          aria-haspopup="dialog"
          aria-expanded={cuentaAbierta}
          aria-label={quien ? `Tu cuenta, ${quien.nombre}` : "Tu cuenta"}
          className="tocable grid size-11 place-items-center rounded-full focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco"
        >
          {quien ? <FotoCuenta cuenta={quien} tamano={40} /> : <span aria-hidden="true" className="grid size-10 place-items-center rounded-full bg-marca-rosa font-display font-bold">{inicialesDeCuenta({ nombre: "", email: "" })}</span>}
        </button>
      </header>
      <HojaCuentaAdmin abierta={cuentaAbierta} alCerrar={() => setCuentaAbierta(false)} cuenta={quien} miTienda={suTienda} demo={demo} />
      {demo && <p className="mx-4 mb-2 rounded-radio-m bg-atencion-suave px-3 py-2 text-secundario font-bold">Demo · usa la tienda demo de este navegador, nunca datos reales</p>}
      <main className="flex-1 px-5 pb-[calc(var(--nav-abajo)+32px)]">{children}</main>
      {/* La misma barra que el panel de la tienda (arrastre, resorte, toque inmediato); las pestañas se precargan. */}
      <BarraPestanas secciones={secciones} etiqueta="Navegación admin" precargar />
    </div>
  );
}
