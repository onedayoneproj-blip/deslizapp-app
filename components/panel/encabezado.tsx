"use client";

import { useCallback, useState } from "react";
import { useTiendaActiva } from "@/lib/data/consulta";
import { IconoChevronAbajo, IconoChispa } from "../iconos";
import { LogoTienda } from "./logo-tienda";
import { MenuTienda } from "./menu-tienda";

/** Encabezado de todas las pantallas: logo + nombre de la tienda (abre el menú) + créditos de retoque. */
export function Encabezado() {
  const { tienda } = useTiendaActiva();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const cerrarMenu = useCallback(() => setMenuAbierto(false), []);

  return (
    <>
      <header className="sticky top-0 z-20 bg-papel/95 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="flex h-16 items-center justify-between gap-3 px-4">
          <button
            type="button"
            onClick={() => setMenuAbierto(true)}
            aria-haspopup="dialog"
            aria-expanded={menuAbierto}
            className="-ml-1 flex min-w-0 items-center gap-2 rounded-full py-1 pr-1.5 pl-1 hover:bg-menta/50"
          >
            {tienda ? <LogoTienda tienda={tienda} tamano={38} /> : <span className="h-[38px] w-[38px] rounded-xl bg-linea" />}
            <span className="min-w-0 text-left">
              <span className="block truncate font-display text-[17px] leading-tight text-bosque">{tienda?.nombre ?? " "}</span>
              <span className="block text-xs leading-tight text-suave">Tu tienda</span>
            </span>
            <IconoChevronAbajo tamano={18} className="shrink-0 text-bosque/60" />
          </button>

          {tienda && (
            <div
              className="flex shrink-0 items-center gap-1 rounded-full border-[1.5px] border-bosque bg-white py-1 pr-3 pl-2 text-bosque"
              title="Créditos de retoque de fotos disponibles"
            >
              <IconoChispa tamano={14} className="text-mandarina" />
              <span className="text-sm font-extrabold tabular-nums">{tienda.creditosRetoque}</span>
              <span className="sr-only">créditos de retoque</span>
            </div>
          )}
        </div>
      </header>
      <MenuTienda abierto={menuAbierto} alCerrar={cerrarMenu} />
    </>
  );
}
