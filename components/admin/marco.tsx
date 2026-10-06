"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { IconoInicio, IconoCatalogo, IconoChispa, IconoMoneda, IconoMas } from "@/components/iconos";

const tabs = [
  { href: "/admin", nombre: "Hoy", Icono: IconoInicio },
  { href: "/admin/tiendas", nombre: "Tiendas", Icono: IconoCatalogo },
  { href: "/admin/trabajo", nombre: "Trabajo", Icono: IconoChispa },
  { href: "/admin/cobros", nombre: "Cobros", Icono: IconoMoneda },
  { href: "/admin/mas", nombre: "Más", Icono: IconoMas },
];

export function AdminMarco({ children, demo = false }: { children: ReactNode; demo?: boolean }) {
  const pathname = usePathname();
  return (
    <div className="mx-auto flex min-h-dvh max-w-[480px] flex-col bg-fondo pb-25 text-texto min-[481px]:shadow-[0_0_40px_rgba(23,75,58,0.08)]">
      <header className="flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2 font-display text-destacado font-extrabold text-bosque">
          deslizapp <span className="rounded-full bg-bosque px-2.5 py-1 text-[11px] text-papel">admin</span>
        </div>
        <div className="grid size-10 place-items-center rounded-full bg-marca-rosa font-display font-bold" aria-label="Lewis">LE</div>
      </header>
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
