"use client";

import { usePathname } from "next/navigation";
import { Tarjeta } from "@/components/ui";

export function PantallaProximamente() {
  const pathname = usePathname();
  const nombre = pathname.includes("trabajo") ? "Trabajo" : pathname.includes("cobros") ? "Cobros" : "Más";
  return <><h1 className="font-display text-titulo-pantalla font-bold text-bosque">{nombre}</h1><Tarjeta className="mt-4 p-5"><p className="font-display text-destacado font-bold">Muy pronto</p><p className="mt-1 text-texto-secundario">Esta parte está en preparación.</p></Tarjeta></>;
}
