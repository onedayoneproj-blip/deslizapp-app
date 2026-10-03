"use client";

import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { datosCupon } from "@/lib/cupon";
import { CURVA, DURACION, menosMovimiento } from "@/lib/movimiento";
import { pedidosConCodigo, razonNoUsable, textoUso, type ContextoCodigo } from "@/lib/promos";
import type { Pedido, Promo } from "@/lib/types";
import { EstadoVacio } from "../estado-vacio";
import { HojaFijoArriba, useIrArribaHoja } from "../hoja";
import { IconoCheck, IconoMas } from "../iconos";
import { TicketPromo } from "../promos/ticket-promo";
import { BotonVolver } from "../selector-busqueda";
import { Boton } from "../ui";

/** Etiqueta corta de por qué un cupón no se puede usar. */
const ETIQUETA_RAZON = { terminada: "Vencido", pausada: "Pausado", programada: "Programado", agotada: "Agotado" } as const;

/** El círculo con el check de lo elegido. */
function Check({ nuevo = false, sobreVerde = false }: { nuevo?: boolean; sobreVerde?: boolean }) {
  return (
    <span className={`grid size-6 shrink-0 place-items-center rounded-full ${sobreVerde ? "bg-marca-papel text-marca-bosque" : "bg-accion text-sobre-accion"} ${nuevo ? "mov-pop-aparece" : ""}`}>
      <IconoCheck tamano={15} strokeWidth={2.8} />
    </span>
  );
}

/**
 * La fila de descuento de un pedido, en "+ Pedido", "Editar pedido" y el detalle. Sin cupón: el botón "+ Agregar cupón". Con cupón
 * (que todavía se puede usar): el ticket compacto con "Cambiar" y "Quitar". Al cambiar de uno a otro, el contenido aparece con
 * un fundido y un desplazamiento corto (la altura de la fila cambia de una vez: nada anima el layout, regla de movimiento).
 * `desde` = el cupón que había al abrir el selector (para animar al volver, cuando la fila se vuelve a montar).
 */
export function FilaDescuento({
  codigo,
  promo,
  pedidos,
  desde = null,
  alAbrir,
  alQuitar,
  deshabilitado = false,
  conBorde = false,
}: {
  codigo: string;
  promo: Promo | null;
  pedidos: Pedido[];
  desde?: string | null;
  alAbrir: () => void;
  alQuitar: () => void;
  deshabilitado?: boolean;
  conBorde?: boolean;
}) {
  const contenido = useRef<HTMLDivElement>(null);
  const primera = useRef(true);
  const actual = codigo.trim().toUpperCase();
  useEffect(() => {
    const cambioAlVolver = primera.current && desde !== null && desde.trim().toUpperCase() !== actual;
    const cambioAhora = !primera.current;
    primera.current = false;
    if (!cambioAlVolver && !cambioAhora) return;
    const el = contenido.current;
    if (!el?.animate) return;
    const corto = menosMovimiento();
    el.animate(
      corto
        ? [{ opacity: 0 }, { opacity: 1 }]
        : [
            { opacity: 0, transform: "translateY(8px)" },
            { opacity: 1, transform: "none" },
          ],
      {
        duration: corto ? DURACION.rapida : DURACION.normal,
        easing: CURVA.salida,
      },
    );
  }, [actual, desde]);

  const borde = conBorde ? "border-b border-linea" : "";
  if (!actual) {
    return (
      <div className={borde}>
        <div ref={contenido}>
          <Boton jerarquia="terciario" icono={<IconoMas tamano={18} strokeWidth={2.4} />} onClick={alAbrir} deshabilitado={deshabilitado} className="-ml-2">
            Agregar cupón
          </Boton>
        </div>
      </div>
    );
  }
  const usos = promo ? pedidosConCodigo(pedidos, promo) : 0;
  return (
    <div className={`py-2 ${borde}`}>
      <div ref={contenido}>
        {promo ? (
          <TicketPromo
            tamano="compacto"
            apagado={false}
            d={datosCupon(promo, "activa", { usos })}
            compacto={{ nombre: promo.nombre, codigo: promo.codigo ?? actual, uso: textoUso(usos, promo.limiteUsos) }}
          />
        ) : (
          <div className="flex min-h-11 items-center">
            <span className="min-w-0 truncate text-cuerpo font-extrabold">Cupón: {actual}</span>
          </div>
        )}
        <div className="flex items-center justify-between gap-3">
          <p className="min-w-0 text-etiqueta text-peligro">{promo ? "" : "Ese cupón ya no se puede usar. Elige otro o quítalo."}</p>
          <span className="flex shrink-0 items-center">
            <Boton jerarquia="terciario" tamano="compacto" onClick={alAbrir} deshabilitado={deshabilitado}>
              Cambiar
            </Boton>
            <Boton jerarquia="terciario" tamano="compacto" onClick={alQuitar} deshabilitado={deshabilitado} className="-mr-2">
              Quitar
            </Boton>
          </span>
        </div>
      </div>
    </div>
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
          const uso = textoUso(usos, promo.limiteUsos);
          return (
            <li key={promo.id}>
              <button
                type="button"
                onClick={(e) => elegir(promo.codigo!, e)}
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
