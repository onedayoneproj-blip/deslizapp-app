"use client";

import { formatearPesos } from "@/lib/formato";
import { montoCorto, type BarraConValor } from "@/lib/resumen";

const ALTO = 96;

/**
 * Barras de ventas del periodo (divs, sin librería ni animación de entrada). Cada barra es un botón que ocupa toda
 * la altura y el ancho de su columna. Tocar una la ELIGE (las demás se atenúan con una transición corta de
 * opacidad); tocarla otra vez o tocar fuera de las barras quita la elección. Las barras futuras o anteriores al
 * inicio de la tienda son un contorno vacío y no se eligen (`alTocarVacia`).
 */
export function GraficoVentas({
  barras,
  seleccion,
  titulo,
  alElegir,
  alLimpiar,
  alTocarVacia,
}: {
  barras: BarraConValor[];
  seleccion: number | null;
  /** "Ventas de septiembre, por día" (para lectores de pantalla). */
  titulo: string;
  alElegir: (indice: number) => void;
  alLimpiar: () => void;
  alTocarVacia: (barra: BarraConValor) => void;
}) {
  const valores = barras.map((b) => (b.ventas ?? 0) + (b.porDespachar ?? 0));
  const maximo = Math.max(0, ...valores);
  const total = valores.reduce((s, v) => s + v, 0);
  const mejor = maximo > 0 ? barras[valores.indexOf(maximo)] : null;
  const densas = barras.length > 12;
  const gap = densas ? "gap-[2px]" : barras.length > 7 ? "gap-1" : "gap-0";

  return (
    <div data-grafico className={`mt-4 ${barras.length <= 7 ? "-mx-3" : ""}`} onClick={alLimpiar}>
      <p className="sr-only">
        {titulo}. Total: {formatearPesos(total)}, suma de pedidos despachados y por despachar.
        {mejor ? ` Lo mejor: ${mejor.nombre}, con ${formatearPesos(maximo)}.` : " Sin actividad todavía."}
      </p>
      <div className="relative">
        {maximo > 0 && (
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 flex items-center gap-1.5">
            <span data-eje className="text-[10.5px] leading-none font-bold text-[#D9E6DF]">
              {montoCorto(maximo)}
            </span>
            <span className="h-px grow border-t border-dashed border-papel/20" />
          </div>
        )}
        <div role="group" aria-label={titulo} className={`flex h-[130px] items-end pt-4 ${gap}`}>
          {barras.map((b, i) => {
            const vacia = b.estado !== "normal";
            const elegida = seleccion === i;
            const atenuada = seleccion !== null && !elegida;
            const ventas = b.ventas ?? 0;
            const porDespachar = b.porDespachar ?? 0;
            const v = ventas + porDespachar;
            const alto = v > 0 && maximo > 0 ? Math.max(4, Math.round((v / maximo) * ALTO)) : 3;
            const altoPendiente = porDespachar > 0 && ventas > 0 ? Math.min(alto - 1, Math.max(1, Math.round((porDespachar / v) * alto))) : porDespachar > 0 ? alto : 0;
            const altoVentas = alto - altoPendiente;
            const aria = vacia
              ? `${b.nombre}, ${b.estado === "futura" ? "todavía no llega" : "sin datos, antes de que empezara tu tienda"}`
              : `${b.nombre}, total ${formatearPesos(v)}; ${formatearPesos(ventas)} en ${b.ventasCantidad ?? 0} pedidos despachados y ${formatearPesos(porDespachar)} en ${b.porDespacharCantidad ?? 0} por despachar`;
            return (
              <button
                key={b.desde}
                type="button"
                data-barra={i}
                data-estado={b.estado}
                aria-pressed={elegida}
                aria-label={aria}
                onClick={(e) => {
                  e.stopPropagation();
                  if (vacia) alTocarVacia(b);
                  else if (elegida) alLimpiar();
                  else alElegir(i);
                }}
                className="flex h-full min-w-0 flex-1 basis-0 flex-col items-center justify-end gap-1.5 outline-none focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-papel/70"
              >
                {/* Solo la barra se atenúa (transición corta de opacidad): la etiqueta conserva su contraste */}
                {vacia ? (
                  <span
                    className={`block h-[22px] w-full max-w-[30px] rounded-t-[6px] rounded-b-[3px] border-[1.5px] ${
                      b.estado === "futura" ? "border-dashed border-papel/45" : "border-dotted border-papel/35"
                    }`}
                  />
                ) : (
                  <span
                    data-alto={alto}
                    data-atenuada={atenuada || undefined}
                    className={`flex w-full max-w-[30px] flex-col-reverse overflow-hidden transition-opacity duration-150 ease-(--curva-salida) ${
                      densas ? "rounded-t-[3px] rounded-b-[1px]" : "rounded-t-[7px] rounded-b-[4px]"
                    } ${atenuada ? "opacity-35" : "opacity-100"}`}
                    style={{ height: alto }}
                  >
                    {altoVentas > 0 && <span className="block w-full bg-rosa" style={{ height: altoVentas }} />}
                    {altoPendiente > 0 && <span className="block w-full bg-[#FF834F]" style={{ height: altoPendiente }} />}
                    {altoVentas === 0 && altoPendiente === 0 && <span className="block h-full w-full bg-rosa/35" />}
                  </span>
                )}
                <span className={`h-[13px] text-[11px] leading-none font-bold whitespace-nowrap ${elegida || (seleccion === null && b.actual) ? "text-[#FFA07A]" : "text-[#D9E6DF]"}`}>
                  {b.etiqueta}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <div aria-hidden="true" className="mt-1.5 flex justify-center gap-3 text-[10.5px] font-semibold text-[#D9E6DF]">
        <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-sm bg-rosa" />Despachados</span>
        <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-sm bg-[#FF834F]" />Por despachar</span>
      </div>
    </div>
  );
}
