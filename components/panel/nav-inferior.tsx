"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import { useConsulta } from "@/lib/data/consulta";
import { useData } from "@/lib/data/provider";
import { IconoCatalogo, IconoClientes, IconoInicio, IconoPedidos, IconoPromos } from "../iconos";

type Seccion = { href: string; nombre: string; Icono: ComponentType<{ tamano?: number }> };

const SECCIONES: Seccion[] = [
  { href: "/", nombre: "Inicio", Icono: IconoInicio },
  { href: "/catalogo", nombre: "Catálogo", Icono: IconoCatalogo },
  { href: "/pedidos", nombre: "Pedidos", Icono: IconoPedidos },
  { href: "/clientes", nombre: "Clientes", Icono: IconoClientes },
  { href: "/promos", nombre: "Promos", Icono: IconoPromos },
];

function estaActiva(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function NavInferior() {
  const pathname = usePathname();
  const { tiendaActivaId, getPedidos } = useData();
  const { data: pedidos } = useConsulta(`pedidos:${tiendaActivaId}`, () => getPedidos(tiendaActivaId));
  const nuevos = pedidos?.filter((p) => p.estado === "nuevo").length ?? 0;

  return (
    <nav
      aria-label="Secciones"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[480px] px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
    >
      <ul className="pointer-events-auto flex items-center justify-between gap-1 rounded-full border border-linea bg-white p-1.5 shadow-[0_12px_24px_-14px_rgba(23,75,58,0.55)]">
        {SECCIONES.map(({ href, nombre, Icono }) => {
          const activa = estaActiva(pathname, href);
          const badge = href === "/pedidos" && nuevos > 0 ? nuevos : 0;
          return (
            <li key={href} className={activa ? "shrink-0" : "flex-1"}>
              <Link
                href={href}
                aria-current={activa ? "page" : undefined}
                aria-label={badge ? `${nombre}, ${badge} ${badge === 1 ? "nuevo" : "nuevos"}` : nombre}
                className={`relative mx-auto flex h-11 items-center justify-center gap-2 rounded-full transition-all duration-200 ${
                  activa ? "bg-bosque px-4 text-papel" : "w-full text-suave hover:text-bosque"
                }`}
              >
                <span className="relative">
                  <Icono tamano={22} />
                  {badge > 0 && (
                    <span className="absolute -top-2 -right-2.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-mandarina px-1 text-[11px] font-bold leading-none text-bosque-oscuro ring-2 ring-white">
                      {badge}
                    </span>
                  )}
                </span>
                {activa && <span className="text-sm font-semibold">{nombre}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
