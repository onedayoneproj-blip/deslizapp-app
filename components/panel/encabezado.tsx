"use client";

import { useCallback, useState } from "react";
import { NOMBRE_PLAN } from "@/lib/config";
import { useTiendaActiva } from "@/lib/data/consulta";
import { IconoChevronAbajo, IconoCreditos } from "../iconos";
import { LogoTienda } from "./logo-tienda";
import { MenuTienda } from "./menu-tienda";
import { usePanelUI } from "./ui";

/**
 * Encabezado de todas las pantallas: logo + nombre de la tienda (abre el menú de la tienda,
 * donde está el selector de tienda activa) + botón de créditos (abre Plan y créditos).
 */
export function Encabezado() {
  const { tienda } = useTiendaActiva();
  const { abrirPlan } = usePanelUI();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const cerrarMenu = useCallback(() => setMenuAbierto(false), []);

  return (
    <>
      <header className="flex items-center justify-between gap-3 px-5 pt-[calc(22px+env(safe-area-inset-top))] pb-1.5">
        <button
          type="button"
          onClick={() => setMenuAbierto(true)}
          aria-haspopup="dialog"
          aria-expanded={menuAbierto}
          aria-label={tienda ? `${tienda.nombre}: cambiar de tienda` : "Cambiar de tienda"}
          className="flex min-w-0 items-center gap-2.5 text-left"
        >
          {tienda ? <LogoTienda tienda={tienda} tamano={42} /> : <span className="h-[42px] w-[42px] rounded-[13px] bg-rosa" />}
          <span className="min-w-0">
            <span className="flex items-center gap-1">
              <span className="truncate text-base leading-tight font-extrabold">{tienda?.nombre ?? " "}</span>
              <IconoChevronAbajo tamano={16} className="shrink-0 text-suave" />
            </span>
            <span className="block truncate text-[12.5px] text-suave">
              {tienda ? NOMBRE_PLAN[tienda.plan] : ""} · <span className="font-display">deslizapp</span>
            </span>
          </span>
        </button>

        {tienda && (
          <button
            type="button"
            onClick={abrirPlan}
            aria-label={`${tienda.creditosRetoque} créditos. Ver plan y créditos`}
            className="flex h-10 shrink-0 items-center gap-1.5 rounded-full border-[1.5px] border-bosque bg-white pr-3.5 pl-[11px] text-sm font-extrabold"
          >
            <IconoCreditos tamano={18} className="text-mandarina" />
            <span className="tabular-nums">{tienda.creditosRetoque}</span> créditos
          </button>
        )}
      </header>
      <MenuTienda abierto={menuAbierto} alCerrar={cerrarMenu} />
    </>
  );
}
