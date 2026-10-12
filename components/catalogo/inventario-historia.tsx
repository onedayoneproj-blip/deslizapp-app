"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { flushSync } from "react-dom";
import { colorPorNombre, esEjeColor } from "@/lib/colores";
import { formatearPesos } from "@/lib/formato";
import { inventarioCompleto, OPCIONES_CUANDO_LLEGA, opcionDeCuandoLlega, textoCuandoLlega } from "@/lib/historia-producto";
import {
  claveVariante,
  precioDe,
  ponerATodas,
  resumenDe,
  textoCombinacion,
  tienePreciosPropios,
  unificarPrecios,
  type EstadoPresentaciones,
  type Presentacion,
} from "@/lib/presentaciones";
import type { OpcionProducto } from "@/lib/types";
import { Hoja, HojaFijoAbajo } from "../hoja";
import { IconoReloj } from "../iconos";
import { Boton, Campo, Cantidad, FilaInterruptor, GrupoEleccion } from "../ui";
import { clases, FOCO } from "../ui/comunes";
import { BotonAtras } from "./boton-atras-historia";
import { HojaPresentacion, type FotoBorrador } from "./hoja-presentacion";

/**
 * «¿Cuándo llega?» de un producto por encargo (prototipo v4, b8 e I2): «3 a 5 días», «1 a 2 semanas», «1 mes» (se guardan
 * «Llega en …») y «Otro», que abre el campo con el foco en el mismo toque. «Otro» sigue abierto mientras el texto no sea una de
 * las opciones rápidas (también al apagar y volver a prender el encargo).
 */
export function CuandoLlega({ texto, alCambiar, alEnter }: { texto: string; alCambiar: (t: string) => void; alEnter?: (e: KeyboardEvent<HTMLInputElement>) => void }) {
  const [otro, setOtro] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  const otroAbierto = otro || (texto.trim() !== "" && opcionDeCuandoLlega(texto) === null);
  return (
    <div ref={caja} className="flex flex-col gap-3" data-cuando-llega="">
      <GrupoEleccion
        etiqueta="¿Cuándo llega?" compacta
        valor={otroAbierto ? "otro" : opcionDeCuandoLlega(texto)}
        alCambiar={(id) => {
          if (id === "otro") {
            flushSync(() => setOtro(true));
            caja.current?.querySelector<HTMLInputElement>("input")?.focus();
            return;
          }
          setOtro(false);
          alCambiar(textoCuandoLlega(id));
        }}
        opciones={[...OPCIONES_CUANDO_LLEGA.map((o) => ({ id: o as string, texto: o })), { id: "otro", texto: "Otro" }]}
      />
      {otroAbierto && (
        <Campo
          etiqueta="Cuándo llega" icono={IconoReloj} value={texto} maxLength={40} onChange={(e) => alCambiar(e.target.value)}
          placeholder="Llega en 7 a 10 días" enterKeyHint="done" onKeyDown={alEnter} data-campo-paso=""
        />
      )}
    </div>
  );
}

/** Lo que dice «Listo» y la sección-resumen: «21 en total» o «por encargo». */
export const textoInventario = (enTotal: number, porEncargo: boolean) => (porEncargo ? "por encargo" : `${enTotal} en total`);

/**
 * La hoja «Inventario» (prototipo v4, I1–I3; nombre aprobado por Lewis): se abre ENCIMA de la historia de crear producto, al
 * seguir desde la última pantalla de valores. Cuántas hay de cada presentación, «Es por encargo» (con su plazo y sin
 * cantidades), «Cada una tiene su precio», «Poner a todas» y un grupo por la primera cosa (el color) con una fila por la otra.
 * Tocar una fila abre su detalle (la `HojaPresentacion` de siempre). Cerrar sin «Listo» conserva todo; «Listo» espera a que haya
 * algo en total (o a que sea por encargo con su plazo). Solo cambia el borrador de la historia: el guardado es el de siempre.
 */
export function HojaInventarioHistoria({
  abierta,
  alCerrar,
  alListo,
  estado,
  alCambiarPres,
  alElegirFoto,
  precioProducto,
  porEncargo,
  encargoTexto,
  alCambiarEncargo,
  alCambiarEncargoTexto,
  fotos,
  avisar,
}: {
  abierta: boolean;
  alCerrar: () => void;
  alListo: () => void;
  estado: EstadoPresentaciones;
  alCambiarPres: (pres: Presentacion[]) => void;
  alElegirFoto: (valor: string, id: string | null) => void;
  precioProducto: number;
  porEncargo: boolean;
  encargoTexto: string;
  alCambiarEncargo: (v: boolean) => void;
  alCambiarEncargoTexto: (t: string) => void;
  fotos: FotoBorrador[];
  avisar: (mensaje: string) => void;
}) {
  const { opciones, pres, fotosColor } = estado;
  const [precios, setPrecios] = useState(() => tienePreciosPropios(pres, precioProducto));
  const [detalle, setDetalle] = useState<string | null>(null);
  const [todas, setTodas] = useState(0);
  const primero: OpcionProducto | undefined = opciones[0];
  const segundo: OpcionProducto | undefined = opciones[1];
  const resumen = resumenDe(pres, precioProducto);
  const cambiarUna = (clave: string, cambio: Partial<Presentacion>) => alCambiarPres(pres.map((p) => (claveVariante(p.valores) === clave ? { ...p, ...cambio } : p)));
  const activas = pres.filter((p) => p.activa);
  const valorTodas = activas.length > 0 && activas.every((p) => p.stock === activas[0]!.stock) ? (activas[0]!.stock ?? 0) : todas;
  const grupos = primero && segundo
    ? primero.valores.map((v) => ({ valor: v, filas: pres.filter((p) => p.valores[primero.nombre] === v) })).filter((g) => g.filas.length > 0)
    : [{ valor: "", filas: pres }];
  const enLista = detalle ? pres.find((p) => claveVariante(p.valores) === detalle) ?? null : null;
  // Siempre hace falta al menos una presentación a la vista (si no, no hay nada que elegir en el catálogo); además, cantidades o el plazo.
  const hayVisibles = pres.some((p) => p.activa);
  const listo = inventarioCompleto(pres, porEncargo, encargoTexto);

  const cambiarPrecios = (encender: boolean) => {
    setPrecios(encender);
    if (!encender && tienePreciosPropios(pres, precioProducto)) {
      alCambiarPres(unificarPrecios(pres));
      avisar(`Todas vuelven al precio del producto: ${formatearPesos(precioProducto)}.`);
    }
  };

  const fila = (p: Presentacion, agrupada: boolean) => {
    const clave = claveVariante(p.valores);
    const texto = agrupada && segundo ? (p.valores[segundo.nombre] ?? "") : textoCombinacion(opciones, p.valores);
    const nombre = textoCombinacion(opciones, p.valores);
    return (
      <li key={clave} className={clases("flex min-h-[46px] items-center gap-2.5 border-t border-linea pr-3 pl-3.5 first:border-t-0", !p.activa && "opacity-50")} data-fila-inventario={nombre}>
        <button
          type="button" onClick={() => setDetalle(clave)} aria-label={`${nombre}: ${porEncargo ? "por encargo" : `${p.stock ?? 0}`}. Ver detalle`}
          className={clases("tocable flex min-h-11 min-w-0 flex-1 flex-col items-start justify-center text-left", FOCO)}
        >
          <span className="truncate text-cuerpo font-extrabold text-texto">{texto}</span>
          {(precios || p.precio !== null) && <span className="text-[0.8125rem] text-texto-secundario">{formatearPesos(precioDe(p, precioProducto))}{p.precio !== null ? " · propio" : ""}</span>}
          {!p.activa && <span className="text-[0.8125rem] text-texto-secundario">Oculta</span>}
        </button>
        {!porEncargo && (
          <Cantidad redonda valor={p.stock ?? 0} max={2147483647} alCambiar={(v) => cambiarUna(clave, { stock: v })} etiquetaQuitar={`Quitar uno de ${nombre}`} etiquetaAgregar={`Agregar uno de ${nombre}`} />
        )}
      </li>
    );
  };

  return (
    <Hoja abierta={abierta} alCerrar={alCerrar} titulo="Inventario" altura="grande" hueco={118}>
      <div className="flex flex-col gap-2" data-inventario-historia="">
        <p className="-mt-1 mb-1 text-secundario text-texto-secundario">Cuántas tienes de cada una. Al despachar, baja solito.</p>
        <FilaInterruptor texto="Es por encargo, no llevo stock" encendido={porEncargo} alCambiar={alCambiarEncargo} />
        {porEncargo && (
          <div className="mt-0.5">
            <CuandoLlega texto={encargoTexto} alCambiar={alCambiarEncargoTexto} />
          </div>
        )}
        <FilaInterruptor
          texto="Cada una tiene su precio" detalle={precios ? "Toca una para ponerle el suyo." : "Todas valen lo mismo"}
          encendido={precios} alCambiar={cambiarPrecios}
        />
        {porEncargo ? (
          <p className="mx-0.5 mt-1.5 text-secundario text-texto-secundario" data-nota-encargo="">
            No tienes que llevar la cuenta de cuántas hay: se avisa de «{encargoTexto.trim() || "Llega en …"}».
          </p>
        ) : (
          <>
            {pres.length > 1 && (
              <div className="flex h-13 items-center gap-2.5 rounded-radio-m border border-linea bg-superficie pr-3 pl-3.5" data-poner-a-todas="">
                <span className="min-w-0 flex-1 text-cuerpo font-extrabold text-texto">Poner a todas</span>
                <Cantidad
                  redonda valor={valorTodas} max={2147483647} etiquetaQuitar="Quitar uno a todas" etiquetaAgregar="Agregar uno a todas"
                  alCambiar={(v) => { setTodas(v); alCambiarPres(ponerATodas(pres, v)); }}
                />
              </div>
            )}
            <div className="mt-0.5 flex flex-col gap-2.5">
              {grupos.map((g) => {
                const agrupado = g.valor !== "";
                const enGrupo = g.filas.filter((p) => p.activa).reduce((t, p) => t + (p.stock ?? 0), 0);
                const c = agrupado && primero && esEjeColor(primero.nombre) ? colorPorNombre(g.valor) : null;
                return (
                  <section key={g.valor || "todas"} aria-label={agrupado ? `${primero!.nombre} ${g.valor}` : "Presentaciones"} className="overflow-hidden rounded-[18px] border border-linea bg-superficie" data-grupo-inventario={g.valor}>
                    {agrupado && (
                      <div className="flex h-9 items-center gap-2 bg-superficie-hundida px-3.5">
                        {c && <span aria-hidden="true" className="size-[18px] shrink-0 rounded-full border-[1.5px] border-borde-pastilla" style={{ background: c }} />}
                        <span className="min-w-0 flex-1 truncate text-secundario font-extrabold text-texto">{g.valor}</span>
                        <span className="text-[0.8125rem] text-texto-secundario" data-grupo-total="">{enGrupo} en total</span>
                      </div>
                    )}
                    <ul className={agrupado ? "border-t border-linea" : undefined}>{g.filas.map((p) => fila(p, agrupado))}</ul>
                  </section>
                );
              })}
            </div>
          </>
        )}
      </div>

      <HojaFijoAbajo>
        {!hayVisibles && (
          <p role="status" className="pointer-events-auto bg-fondo px-5 pt-2.5 text-center text-secundario font-bold text-atencion-texto" data-sin-visibles="">
            Deja al menos una presentación a la vista.
          </p>
        )}
        <div className="pointer-events-auto flex items-center gap-2.5 bg-fondo px-5 pt-2.5 pb-[max(1.5rem,var(--safe-abajo))]" data-pie-inventario="">
          <BotonAtras alTocar={alCerrar} />
          <Boton tamano="grande" className="flex-1" deshabilitado={!listo} onClick={alListo}>
            {`Listo · ${textoInventario(resumen.enTotal, porEncargo)}`}
          </Boton>
        </div>
      </HojaFijoAbajo>

      <HojaPresentacion
        atras
        abierta={enLista !== null}
        presentacion={enLista}
        opciones={opciones}
        precioProducto={precioProducto}
        fotos={fotos}
        fotosColor={fotosColor}
        alCerrar={() => setDetalle(null)}
        alCambiar={(cambio) => {
          if (!enLista) return;
          if (cambio.precio !== undefined && cambio.precio !== null) setPrecios(true);
          cambiarUna(claveVariante(enLista.valores), cambio);
        }}
        alCompletar={() => {}}
        alElegirFoto={alElegirFoto}
        // Al crear, nada tiene pedidos: quitarla la saca de la lista (vuelve si se elige otra vez el valor).
        alQuitar={async () =>
          enLista
            ? { con: false, hacer: () => { alCambiarPres(pres.filter((p) => claveVariante(p.valores) !== claveVariante(enLista.valores))); setDetalle(null); } }
            : null
        }
      />
    </Hoja>
  );
}
