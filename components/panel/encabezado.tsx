"use client";

import { useCallback, useState } from "react";
import { NOMBRE_PLAN } from "@/lib/config";
import { useTiendaActiva } from "@/lib/data/consulta";
import { useData } from "@/lib/data/provider";
import { Esqueleto } from "../esqueleto";
import { IconoChevronAbajo, IconoCreditos } from "../iconos";
import { Numero } from "../numero";
import { LogoTienda } from "./logo-tienda";
import { MenuTienda } from "./menu-tienda";
import { usePanelUI } from "./ui";

/**
 * Encabezado de todas las pantallas: logo + nombre de la tienda (abre el menú de la tienda,
 * donde está el selector de tienda activa) + botón de créditos (abre Plan y créditos).
 */
export function Encabezado() {
  const { tienda } = useTiendaActiva();
  // En la demo el menú cambia de tienda; en modo real es el menú de tu tienda (Ajustes).
  const accion = useData().modo === "demo" ? "Cambiar de tienda" : "Menú de la tienda";
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
          // Nombre accesible = el texto visible (nombre y plan) y después la acción, con comas: WCAG 2.5.3 (etiqueta en el nombre)
          aria-label={tienda ? `${tienda.nombre},${NOMBRE_PLAN[tienda.plan]} · deslizapp. ${accion}` : accion}
          className="flex min-h-11 min-w-0 items-center gap-2.5 text-left"
        >
          {tienda ? <LogoTienda tienda={tienda} tamano={42} /> : <Esqueleto className="h-[42px] w-[42px] rounded-full" />}
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

        {!tienda && <Esqueleto className="h-10 w-[118px] rounded-full" />}
        {tienda && (
          <button
            type="button"
            onClick={abrirPlan}
            aria-label={`${tienda.creditosRetoque} créditos. Ver plan y créditos`}
            className="flex h-11 shrink-0 items-center gap-1.5 rounded-full border-[1.5px] border-bosque bg-white pr-3.5 pl-[11px] text-sm font-extrabold"
          >
            <IconoCreditos tamano={18} className="text-mandarina" />
            <Numero valor={tienda.creditosRetoque} /> créditos
          </button>
        )}
      </header>
      <MenuTienda abierto={menuAbierto} alCerrar={cerrarMenu} />
    </>
  );
}
