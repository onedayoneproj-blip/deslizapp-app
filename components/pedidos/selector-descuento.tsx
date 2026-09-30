"use client";

import { useRouter } from "next/navigation";
import { useLayoutEffect, useMemo } from "react";
import { pedidosConCodigo, razonNoUsable, textoUso, type ContextoCodigo } from "@/lib/promos";
import type { Promo } from "@/lib/types";
import { EstadoVacio } from "../estado-vacio";
import { HojaFijoArriba, useIrArribaHoja } from "../hoja";
import { IconoCheck } from "../iconos";
import { BotonVolver, FilaLista, ListaSeleccion } from "../selector-busqueda";

/** Estilo del campo de las hojas de pedidos (alto 50 px, borde fino). */
export const CLASE_CAMPO =
  "h-[50px] w-full min-w-0 rounded-2xl border-[1.5px] border-borde bg-white px-3.5 text-base text-bosque outline-none focus:border-bosque";

/**
 * La fila de descuento de un pedido: "Agregar descuento" (toda la fila se toca) o "Descuento: LUNA20 · 20 %" con
 * "Cambiar" / "Quitar". Una sola para "+ Pedido", "Editar pedido" y el detalle. `promo` es la promo del código si todavía
 * se puede usar; si el pedido trae un código que ya no sirve, `codigo` va sin `promo` y se avisa.
 */
export function FilaDescuento({
  codigo,
  promo,
  alAbrir,
  alQuitar,
  deshabilitado = false,
  conBorde = false,
}: {
  codigo: string;
  promo: Promo | null;
  alAbrir: () => void;
  alQuitar: () => void;
  deshabilitado?: boolean;
  conBorde?: boolean;
}) {
  const borde = conBorde ? "border-b border-arena" : "";
  if (!codigo.trim()) {
    return (
      <button
        type="button"
        onClick={alAbrir}
        disabled={deshabilitado}
        className={`tocable flex min-h-11 w-full items-center justify-between gap-3 text-left text-[14.5px] font-extrabold text-bosque disabled:opacity-60 ${borde}`}
      >
        Agregar descuento
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 6l6 6-6 6" />
        </svg>
      </button>
    );
  }
  return (
    <div className={`py-1 ${borde}`}>
      <div className="flex min-h-11 items-center justify-between gap-3">
        <span className="min-w-0 truncate text-[14.5px] font-extrabold">
          Descuento: {codigo.toUpperCase()}
          {promo?.valorPorcentaje ? ` · ${promo.valorPorcentaje} %` : ""}
        </span>
        <span className="flex shrink-0 items-center">
          <button type="button" onClick={alAbrir} disabled={deshabilitado} className="tocable h-11 px-2.5 text-[14px] font-extrabold text-bosque disabled:opacity-60">
            Cambiar
          </button>
          <button type="button" onClick={alQuitar} disabled={deshabilitado} className="tocable h-11 pl-2.5 text-[14px] font-extrabold text-[#b4432a] disabled:opacity-60">
            Quitar
          </button>
        </span>
      </div>
      {!promo && <p className="pb-1 text-[12.5px] font-semibold text-[#b4432a]">Ese descuento ya no se puede usar. Elige otro o quítalo.</p>}
    </div>
  );
}

/**
 * Vista para elegir el descuento, DENTRO de la misma hoja (con botón de volver, como los selectores de cliente y de
 * producto). Arriba "Sin descuento"; luego los códigos que se pueden usar; al final, atenuados y sin poder elegirse, los que
 * no (con su razón). La regla de "se puede usar" es `razonNoUsable` (lib/promos.ts). El pedido que ya usa un código lo
 * conserva aunque el cupo se haya llenado.
 */
export function SelectorDescuento({
  promos,
  tiendaId,
  contexto,
  elegido,
  alElegir,
  alVolver,
}: {
  promos: Promo[];
  tiendaId: string;
  contexto: ContextoCodigo;
  /** El código aplicado ahora ("" = sin descuento). */
  elegido: string;
  /** null = sin descuento. */
  alElegir: (codigo: string | null) => void;
  alVolver: () => void;
}) {
  const router = useRouter();
  const irArriba = useIrArribaHoja();
  useLayoutEffect(() => irArriba(), [irArriba]);

  const ahora = useMemo(() => new Date(), []);
  const filas = useMemo(() => {
    const codigos = promos.filter((p) => p.tiendaId === tiendaId && p.tipo === "codigo" && p.codigo);
    const con = codigos.map((p) => ({ promo: p, razon: razonNoUsable(p, contexto, ahora), usos: pedidosConCodigo(contexto.pedidos, p) }));
    return { usables: con.filter((f) => !f.razon), noUsables: con.filter((f) => f.razon), hay: codigos.length > 0 };
  }, [promos, tiendaId, contexto, ahora]);
  const actual = elegido.trim().toUpperCase();

  return (
    <div className="flex flex-col gap-3">
      <HojaFijoArriba>
        <div className="flex items-center gap-2">
          <BotonVolver onClick={alVolver} />
          <p className="min-w-0 flex-1 truncate font-display text-xl">Elige un descuento</p>
        </div>
      </HojaFijoArriba>

      <ListaSeleccion>
        <FilaLista>
          <button type="button" onClick={() => alElegir(null)} aria-pressed={actual === ""} className="tocable flex min-h-[56px] w-full items-center gap-3 py-2.5 text-left text-bosque">
            <span className="min-w-0 flex-1 text-[15px] font-extrabold">Sin descuento</span>
            {actual === "" && <IconoCheck tamano={20} className="shrink-0 text-bosque" />}
          </button>
        </FilaLista>
        {filas.usables.map(({ promo, usos }) => (
          <FilaLista key={promo.id}>
            <button
              type="button"
              onClick={() => alElegir(promo.codigo!)}
              aria-pressed={actual === promo.codigo!.toUpperCase()}
              className="tocable flex w-full items-center gap-3 py-3 text-left text-bosque"
            >
              <Contenido promo={promo} usos={usos} />
              {actual === promo.codigo!.toUpperCase() && <IconoCheck tamano={20} className="shrink-0 text-bosque" />}
            </button>
          </FilaLista>
        ))}
        {filas.noUsables.map(({ promo, razon, usos }) => (
          <FilaLista key={promo.id}>
            <div aria-disabled="true" className="flex w-full items-center gap-3 py-3 text-left text-bosque opacity-55">
              <Contenido promo={promo} usos={usos} razon={razon!.texto} />
            </div>
          </FilaLista>
        ))}
      </ListaSeleccion>

      {!filas.hay && (
        <EstadoVacio
          pequeno
          ilustracion="promos"
          titulo="Aún no tienes descuentos."
          remate="Crea un código en Promos y aquí aparece para elegirlo."
        />
      )}
      {!filas.hay && (
        <button
          type="button"
          onClick={() => router.push("/promos/nueva", { scroll: false })}
          className="tocable flex h-12 items-center justify-center rounded-full bg-mandarina text-[15px] font-extrabold text-bosque-oscuro"
        >
          Crear un código en Promos
        </button>
      )}
    </div>
  );
}

function Contenido({ promo, usos, razon }: { promo: Promo; usos: number; razon?: string }) {
  return (
    <span className="min-w-0 flex-1">
      <span className="block truncate text-[15px] font-extrabold">{promo.nombre}</span>
      <span className="block truncate text-[13px] text-suave">
        {promo.codigo} · {promo.valorPorcentaje} % · {textoUso(usos, promo.limiteUsos)}
      </span>
      {razon && <span className="mt-0.5 inline-block rounded-full bg-arena px-2 py-[2px] text-[12px] font-extrabold">{razon}</span>}
    </span>
  );
}
