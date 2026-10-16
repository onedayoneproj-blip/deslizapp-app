"use client";

import Link from "next/link";
import { useEffect, useRef, type ComponentProps } from "react";
import type { Evento } from "@/lib/medicion/eventos";
import { registrarEvento } from "@/lib/medicion/registrar-evento";

/** Medición de la portada (docs/18-medicion.md): en la página principal cuenta `inicio_visto`; en el reel final del catálogo, `catalogo_reel_deslizapp` al llegar a él. */
export function MedirPortada({ modo, activo }: { modo: "pagina" | "reel"; activo: boolean }) {
  const contado = useRef(false);
  useEffect(() => {
    if (contado.current) return;
    if (modo === "pagina") {
      // Quien ya eligió la demo no está viendo esta página (ANTES_DE_PINTAR en portada-inicio.tsx).
      if (document.documentElement.hasAttribute("data-dz-demo")) return;
      contado.current = true;
      registrarEvento("inicio_visto");
    } else if (activo) {
      contado.current = true;
      registrarEvento("catalogo_reel_deslizapp");
    }
  }, [modo, activo]);
  return null;
}

/** Un enlace de la portada que cuenta su toque. Con `target`, es un <a>; sin él, un <Link> de Next. */
export function EnlaceMedido({ evento, href, ...resto }: { evento: Evento; href: string } & Omit<ComponentProps<"a">, "href">) {
  const alTocar = () => registrarEvento(evento);
  if (resto.target) return <a href={href} onClick={alTocar} {...resto} />;
  return <Link href={href} onClick={alTocar} {...resto} />;
}
