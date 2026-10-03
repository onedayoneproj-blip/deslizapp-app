"use client";

import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { datosCupon } from "@/lib/cupon";
import { CURVA, menosMovimiento } from "@/lib/movimiento";
import { pedidosConCodigo, razonNoUsable, textoUso, type ContextoCodigo } from "@/lib/promos";
import type { Promo } from "@/lib/types";
import { EstadoVacio } from "../estado-vacio";
import { HojaFijoArriba, useIrArribaHoja } from "../hoja";
import { IconoCheck, IconoPromos } from "../iconos";
import { TicketPromo } from "../promos/ticket-promo";
import { BotonVolver } from "../selector-busqueda";
import { Boton, FilaAgregar, FilaLista } from "../ui";

/** Etiqueta corta de por qué un cupón no se puede usar. */
const ETIQUETA_RAZON = { terminada: "Vencido", pausada: "Pausado", programada: "Programado", agotada: "Agotado", otro_cliente: "De otro cliente" } as const;

/** El círculo con el check de lo elegido. */
function Check({ nuevo = false, sobreVerde = false }: { nuevo?: boolean; sobreVerde?: boolean }) {
  return (
    <span className={`grid size-6 shrink-0 place-items-center rounded-full ${sobreVerde ? "bg-marca-papel text-marca-bosque" : "bg-accion text-sobre-accion"} ${nuevo ? "mov-pop-aparece" : ""}`}>
      <IconoCheck tamano={15} strokeWidth={2.8} />
    </span>
  );
}

/** "15 %" (o "RD$200" si algún día hay cupones de monto fijo): el valor del descuento de un cupón. */
export function valorCupon(promo: Pick<Promo, "valorPorcentaje">): string {
  return promo.valorPorcentaje !== null ? `${promo.valorPorcentaje} %` : "";
}

/**
 * La fila de descuento de un pedido ("+ Pedido", "Editar pedido" y el detalle), dentro de la misma lista agrupada: es un `<li>`.
 * Sin cupón: la fila "Agregar cupón". Con cupón: una FilaLista con la etiqueta de precio en `accion-suave`, "Cupón" y "AHHH · 15 %";
 * toda la fila abre el selector (donde el aplicado sale marcado: tocarlo lo quita, tocar otro lo cambia). Sin el nombre de la promo
 * ni sus usos: eso es de Promos. Con `deshabilitado`, la fila no se toca y no lleva chevron.
 */
export function FilaDescuento({
  codigo,
  promo,
  alAbrir,
  deshabilitado = false,
}: {
  codigo: string;
  promo: Promo | null;
  alAbrir: () => void;
  deshabilitado?: boolean;
}) {
  const actual = codigo.trim().toUpperCase();
  if (!actual) {
    return (
      <li className="border-t border-linea px-4 first:border-t-0">
        <FilaAgregar texto="Agregar cupón" alTocar={alAbrir} deshabilitado={deshabilitado} />
      </li>
    );
  }
  const valor = promo ? valorCupon(promo) : "";
  const detalle = valor ? `${actual} · ${valor}` : actual;
  return (
    <FilaLista
      onClick={deshabilitado ? undefined : alAbrir}
      etiqueta={`Cupón ${actual} aplicado${valor ? `, ${valor}` : ""}. Cambiar o quitar`}
      inicio={
        <IconoPromos tamano={24} className="text-texto" />
      }
      titulo="Cupón"
      detalle={detalle}
      pie={promo ? undefined : <span className="text-etiqueta text-peligro">Ese cupón ya no se puede usar. Elige otro o quítalo.</span>}
    />
  );
}

/**
 * Vista para elegir el cupón, DENTRO de la misma hoja (con botón de volver, como los selectores de cliente y de producto). Arriba
 * "Sin descuento"; luego los cupones que se pueden usar, como ticket compacto; al final, atenuados y sin poder tocarse, los que
 * no (con su etiqueta). La regla de "se puede usar" es `razonNoUsable` (lib/promos.ts). El pedido que ya usa un cupón lo conserva
 * aunque el cupo se haya llenado.
 *
 * Al elegir: el ticket hace un "pop", aparece su check, los demás se atenúan y, pasado el pop, se llama a `alElegir` (la vista se
 * cierra). Con movimiento reducido no hay escala: solo el cambio de opacidad, sin espera.
 */
export function SelectorDescuento({
  promos,
  tiendaId,
  contexto,
  elegido,
  alElegir,
  alVolver,
  nombreCliente,
}: {
  promos: Promo[];
  tiendaId: string;
  contexto: ContextoCodigo;
  /** Nombre del cliente del pedido: su código personal sale primero con "Solo para {nombre}". */
  nombreCliente?: string | null;
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
    // Los códigos personales de otros clientes ni aparecen; el del cliente del pedido va primero
    const codigos = promos
      .filter((p) => p.tiendaId === tiendaId && p.tipo === "codigo" && p.codigo && (!p.clienteId || p.clienteId === contexto.clienteId))
      .sort((a, b) => Number(Boolean(b.clienteId)) - Number(Boolean(a.clienteId)));
    const con = codigos.map((p) => ({ promo: p, razon: razonNoUsable(p, contexto, ahora), usos: pedidosConCodigo(contexto.pedidos, p) }));
    return { usables: con.filter((f) => !f.razon), noUsables: con.filter((f) => f.razon), hay: codigos.length > 0 };
  }, [promos, tiendaId, contexto, ahora]);
  const actual = elegido.trim().toUpperCase();

  // Lo que se acaba de tocar ("" = sin descuento): marca el check y atenúa el resto mientras dura el pop.
  const [tocado, setTocado] = useState<string | null>(null);
  const espera = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => void (espera.current && clearTimeout(espera.current)), []);
  const elegir = (codigo: string | null, e: MouseEvent<HTMLElement>) => {
    if (tocado !== null) return;
    setTocado(codigo ?? "");
    if (menosMovimiento()) return alElegir(codigo);
    e.currentTarget.animate?.([{ transform: "scale(1)" }, { transform: "scale(1.03)", offset: 0.5 }, { transform: "scale(1)" }], {
      duration: 200,
      easing: CURVA.salida,
    });
    espera.current = setTimeout(() => alElegir(codigo), 220);
  };
  const marcado = tocado ?? actual;
  const atenuar = (cod: string) => (tocado !== null && tocado !== cod ? "opacity-50" : "");

  return (
    <div className="flex flex-col gap-3">
      <HojaFijoArriba>
        <div className="flex items-center gap-2">
          <BotonVolver onClick={alVolver} />
          <p className="min-w-0 flex-1 truncate font-display text-titulo-seccion">Elige un cupón</p>
        </div>
      </HojaFijoArriba>

      <ul className="flex flex-col gap-2.5">
        <li>
          {/* Sin descuento: fila simple, borde punteado y sin muescas */}
          <button
            type="button"
            onClick={(e) => elegir(null, e)}
            aria-pressed={marcado === ""}
            className={`tocable flex min-h-14 w-full items-center gap-3 rounded-radio-m border-2 px-4 text-left text-texto outline-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco transition-opacity duration-(--mov-rapida) ${
              marcado === "" ? "border-solid border-accion" : "border-dashed border-accion/35"
            } ${atenuar("")}`}
          >
            <span className="min-w-0 flex-1 text-cuerpo font-extrabold">Sin descuento</span>
            {marcado === "" && <Check nuevo={tocado === ""} />}
          </button>
        </li>
        {filas.usables.map(({ promo, usos }) => {
          const cod = promo.codigo!.toUpperCase();
          const sel = marcado === cod;
          const uso = promo.clienteId ? `Solo para ${nombreCliente?.trim().split(/\s+/)[0] || "este cliente"}` : textoUso(usos, promo.limiteUsos);
          return (
            <li key={promo.id}>
              <button
                type="button"
                // Tocar el cupón aplicado lo QUITA; tocar otro lo CAMBIA
                onClick={(e) => elegir(cod === actual ? null : promo.codigo!, e)}
                aria-pressed={sel}
                aria-label={`Descuento ${promo.nombre}, ${promo.valorPorcentaje} por ciento, ${uso}`}
                className={`tocable block w-full rounded-radio-l border-2 p-[3px] text-left outline-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco transition-opacity duration-(--mov-rapida) ${sel ? "border-accion" : "border-transparent"} ${atenuar(cod)}`}
              >
                <TicketPromo
                  tamano="compacto"
                  apagado={false}
                  d={datosCupon(promo, "activa", { usos })}
                  compacto={{ nombre: promo.nombre, codigo: promo.codigo!, uso, extra: sel ? <Check sobreVerde nuevo={tocado === cod} /> : undefined }}
                />
              </button>
            </li>
          );
        })}
        {filas.noUsables.map(({ promo, razon, usos }) => {
          const uso = textoUso(usos, promo.limiteUsos);
          return (
            <li key={promo.id}>
              <div
                role="group"
                aria-disabled="true"
                aria-label={`Descuento ${promo.nombre}, ${promo.valorPorcentaje} por ciento, ${uso}, ${ETIQUETA_RAZON[razon!.razon].toLowerCase()}, no se puede elegir`}
                className={`rounded-radio-l border-2 border-transparent p-[3px] opacity-55 ${tocado !== null ? "opacity-35" : ""}`}
              >
                <TicketPromo
                  tamano="compacto"
                  apagado
                  d={datosCupon(promo, "terminada", { usos })}
                  compacto={{ nombre: promo.nombre, codigo: promo.codigo!, uso, razon: ETIQUETA_RAZON[razon!.razon] }}
                />
              </div>
            </li>
          );
        })}
      </ul>

      {!filas.hay && (
        <EstadoVacio pequeno ilustracion="promos" titulo="Aún no tienes cupones." remate="Crea un código en Promos y aquí aparece para elegirlo." />
      )}
      {!filas.hay && (
        <Boton anchoCompleto onClick={() => router.push("/promos/nueva", { scroll: false })}>
          Crear un código en Promos
        </Boton>
      )}
    </div>
  );
}
