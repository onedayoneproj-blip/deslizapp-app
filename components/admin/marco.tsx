"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore, type ReactNode } from "react";
import { CUENTA_DEMO, inicialesDeCuenta, type CuentaVista } from "@/lib/cuenta";
import { leerDemo, suscribirDemo } from "@/lib/data/demo";
import { FotoCuenta } from "@/components/panel/cuenta";
import { HojaCuentaAdmin, type MiTienda } from "./hoja-cuenta";
import { IconoInicio, IconoCatalogo, IconoChispa, IconoMoneda, IconoMas } from "@/components/iconos";

const tabs = [
  { href: "/admin", nombre: "Hoy", Icono: IconoInicio },
  { href: "/admin/tiendas", nombre: "Tiendas", Icono: IconoCatalogo },
  { href: "/admin/trabajo", nombre: "Trabajo", Icono: IconoChispa },
  { href: "/admin/cobros", nombre: "Cobros", Icono: IconoMoneda },
  { href: "/admin/mas", nombre: "Más", Icono: IconoMas },
];

const sinServidor = () => null;

export function AdminMarco({ children, demo = false, cuenta = null, miTienda = null }: { children: ReactNode; demo?: boolean; cuenta?: CuentaVista | null; miTienda?: MiTienda | null }) {
  const pathname = usePathname();
  const [cuentaAbierta, setCuentaAbierta] = useState(false);
  // /admin-demo: la tienda del panel de la demo de este navegador (solo se lee en el navegador; nunca toca Supabase).
  const estadoDemo = useSyncExternalStore(suscribirDemo, demo ? leerDemo : sinServidor, sinServidor);
  const tiendaDemo = estadoDemo?.db.tiendas.find((t) => t.id === estadoDemo.tiendaActivaId) ?? null;
  const quien = demo ? CUENTA_DEMO : cuenta;
  const suTienda: MiTienda | null = demo ? (tiendaDemo ? { nombre: tiendaDemo.nombre, logoUrl: tiendaDemo.logoUrl } : null) : miTienda;
  return (
    <div className="mx-auto flex min-h-dvh max-w-[480px] flex-col bg-fondo pb-25 text-texto min-[481px]:shadow-[0_0_40px_rgba(23,75,58,0.08)]">
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
      <main className="flex-1 px-5 pb-8">{children}</main>
      <nav aria-label="Navegación admin" className="fixed inset-x-3 bottom-[max(12px,env(safe-area-inset-bottom))] z-30 mx-auto flex max-w-[456px] justify-around rounded-full bg-superficie px-2 py-2 shadow-hoja">
        {tabs.map(({ href, nombre, Icono }) => {
          const destino = demo ? href.replace("/admin", "/admin-demo") : href;
          const active = destino === "/admin-demo" || destino === "/admin" ? pathname === destino : pathname.startsWith(destino);
          return <Link key={href} href={destino} aria-current={active ? "page" : undefined} className={`flex min-h-14 min-w-14 flex-col items-center justify-center gap-1 rounded-full px-2 text-[11px] font-bold ${active ? "bg-marca-rosa text-bosque" : "text-texto-secundario"}`}><Icono tamano={22} /><span>{nombre}</span></Link>;
        })}
      </nav>
    </div>
  );
}
