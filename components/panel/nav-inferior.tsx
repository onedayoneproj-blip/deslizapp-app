"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import { useConsulta } from "@/lib/data/consulta";
import { useData } from "@/lib/data/provider";
import { IconoCatalogo, IconoClientes, IconoInicio, IconoPedidos, IconoPromos } from "../iconos";

type Seccion = { href: string; nombre: string; Icono: ComponentType<{ tamano?: number; strokeWidth?: number }> };

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

/** Barra inferior flotante: el ícono activo se expande en píldora verde con su nombre. */
export function NavInferior() {
  const pathname = usePathname();
  const { tiendaActivaId, getPedidos } = useData();
  const { data: pedidos } = useConsulta(`pedidos:${tiendaActivaId}`, () => getPedidos(tiendaActivaId));
  const nuevos = pedidos?.filter((p) => p.estado === "nuevo").length ?? 0;

  return (
    <nav
      aria-label="Secciones"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[480px] px-3 pb-[calc(14px+env(safe-area-inset-bottom))]"
    >
      <ul className="pointer-events-auto flex h-[68px] items-center gap-1 rounded-full border border-linea bg-white p-1.5 shadow-[0_14px_30px_-14px_rgba(23,75,58,0.5)]">
        {SECCIONES.map(({ href, nombre, Icono }) => {
          const activa = estaActiva(pathname, href);
          const badge = href === "/pedidos" && nuevos > 0 ? nuevos : 0;
          return (
            <li key={href} className={activa ? "flex-none" : "min-w-11 flex-1 basis-0"}>
              <Link
                href={href}
                aria-current={activa ? "page" : undefined}
                aria-label={badge ? `${nombre}, ${badge} ${badge === 1 ? "nuevo" : "nuevos"}` : nombre}
                className={`relative flex h-[54px] items-center justify-center gap-[7px] rounded-full text-sm font-extrabold whitespace-nowrap transition-[background-color,padding] duration-300 ${
                  activa ? "bg-bosque pr-[18px] pl-[15px] text-papel" : "text-suave hover:text-bosque"
                }`}
              >
                <Icono tamano={22} strokeWidth={2.1} />
                {activa && <span>{nombre}</span>}
                {badge > 0 && (
                  <span className="absolute top-1 right-1.5 grid h-5 min-w-5 place-items-center rounded-full border-2 border-white bg-mandarina px-[5px] text-[11.5px] leading-none font-extrabold text-bosque-oscuro">
                    {badge}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
