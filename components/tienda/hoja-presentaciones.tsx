"use client";
import { useState } from "react";
import type { CSSProperties } from "react";
import type { CatalogoPublico, OpcionProducto, ProductoPublico } from "@/lib/types";
import { colorPorNombre, esEjeColor } from "@/lib/colores";
import { dinero } from "@/lib/tienda/carrito";
import {
  celda,
  desde,
  ejesDeCuadricula,
  eleccionPorDefecto,
  estadoDeEleccion,
  etiquetaCelda,
  fotoDeEleccion,
  sinStock,
  textoEleccion,
  tituloHoja,
  type EstadoCelda,
  type Eleccion,
} from "@/lib/tienda/presentaciones";
import { DialogoCatalogo } from "./dialogo";

/**
 * «Ver presentaciones» (opción B: todas juntas en una cuadrícula) y la hoja de pastillas (opción A, la que abre ♥ cuando todavía no
 * se eligió). Superficie propia del catálogo: no usa components/ui. Cada toque en una celda o pastilla CAMBIA la elección del
 * reel (la foto sigue al color); «Agregar a mi pedido» la agrega; una agotada ofrece «Avísame cuando vuelva».
 */
export function HojaPresentaciones({
  p,
  t,
  modo,
  eleccion,
  enPedido,
  alElegir,
  alAgregar,
  alQuitar,
  alAvisar,
  cerrar,
}: {
  p: ProductoPublico;
  t: CatalogoPublico["tienda"];
  /** "b": cuadrícula con todas; "a": pastillas «Elige la tuya» (la que abre ♥). */
  modo: "a" | "b";
  eleccion: Eleccion | null;
  enPedido: (varianteId: string) => boolean;
  alElegir: (valores: Eleccion) => void;
  alAgregar: (valores: Eleccion) => void;
  alQuitar: (varianteId: string) => void;
  alAvisar: (varianteId: string) => void;
  cerrar: () => void;
}) {
  const [sel, setSel] = useState<Eleccion | null>(() => eleccion ?? eleccionPorDefecto(p));
  const g = ejesDeCuadricula(p.opciones);
  const c = sel ? celda(p, sel) : null;
  const d = desde(p);
  const base = p.precioPromo ?? p.precio;
  const elegir = (v: Eleccion) => {
    setSel(v);
    alElegir(v);
  };
  const agotada = !!c && sinStock(c);
  const ya = !!c?.variante && enPedido(c.variante.id);
  const foto = (sel && fotoDeEleccion(p, sel)) || p.medios.find((m) => m.tipo === "foto")?.url || "";
  const precioActual = c?.precio ?? d?.precio ?? base;
  return (
    <DialogoCatalogo id="presBg" nombre={tituloHoja(p.opciones)} cerrar={cerrar}>
      <div className="sheet pres-sheet" data-presentaciones-hoja={modo}>
        <button className="grab" aria-label="Cerrar" onClick={cerrar} />
        <div className="shead">
          <h2>{tituloHoja(p.opciones)}</h2>
          <button className="x" aria-label="Cerrar" onClick={cerrar}>
            ×
          </button>
        </div>
        <div className="sbody pres-body">
          <div className="pres-prod">
            <span className="pres-foto" aria-hidden="true">
              {foto && <img src={foto} alt="" />}
            </span>
            <span>
              <b>{p.nombre}</b>
              <small>
                {c?.precio != null ? dinero(precioActual) : (d?.varia ? "Desde " : "") + dinero(precioActual)} · elige la tuya
              </small>
            </span>
          </div>
          {g && !g.columnas ? (
            <ListaPresentaciones p={p} eje={g.filas} sel={sel} base={base} alElegir={elegir} />
          ) : g && modo === "b" ? (
            <Cuadricula p={p} filas={g.filas} columnas={g.columnas!} sel={sel} base={base} alElegir={elegir} />
          ) : g ? (
            <Pastillas p={p} ejes={p.opciones} sel={sel} alElegir={elegir} />
          ) : null}
          {modo === "b" && g?.columnas && (
            <p className="pres-leyenda">
              <s>Tachado</s> = agotada · <b>Número</b> = quedan pocas
            </p>
          )}
          {sel && c && (
            <div className="pres-linea" role="status" aria-live="polite" data-presentaciones-eleccion="">
              <span>{textoEleccion(p.opciones, sel)}</span>
              {estadoDeEleccion(c) && <b>{estadoDeEleccion(c)}</b>}
            </div>
          )}
          {agotada && c?.variante ? (
            <button className="btn heart pres-agregar" onClick={() => alAvisar(c.variante!.id)}>
              Avísame cuando vuelva
            </button>
          ) : (
            <button
              className="btn heart pres-agregar"
              disabled={!sel || !c?.variante}
              onClick={() => (ya && c?.variante ? alQuitar(c.variante.id) : sel && alAgregar(sel))}
            >
              {ya ? "Quitar de mi pedido" : "Agregar a mi pedido"}
            </button>
          )}
          {agotada && !c?.variante && <p className="pres-leyenda">Esa combinación no la tengo. Elige otra.</p>}
        </div>
      </div>
    </DialogoCatalogo>
  );
}

const estilo = (hex: string | null): CSSProperties | undefined => (hex ? ({ "--muestra": hex } as CSSProperties) : undefined);

/** La foto del color como miniatura junto al nombre de la fila; sin foto asignada, un punto del color si se conoce. */
function MuestraColor({ p, eje, valor }: { p: ProductoPublico; eje: OpcionProducto; valor: string }) {
  const url = esEjeColor(eje.nombre) || p.opciones[0] === eje ? fotoDeEleccion(p, { [eje.nombre]: valor }) : null;
  const hex = esEjeColor(eje.nombre) ? colorPorNombre(valor) : null;
  if (url) return <span className="pres-mini" aria-hidden="true"><img src={url} alt="" /></span>;
  if (hex) return <span className="pres-mini punto" aria-hidden="true" style={estilo(hex)} />;
  return null;
}

/** Dos ejes: filas = el eje Color (con la foto de ese color), columnas = el otro. Desplazable si hay muchas. */
function Cuadricula({
  p,
  filas,
  columnas,
  sel,
  base,
  alElegir,
}: {
  p: ProductoPublico;
  filas: OpcionProducto;
  columnas: OpcionProducto;
  sel: Eleccion | null;
  base: number;
  alElegir: (v: Eleccion) => void;
}) {
  return (
    <div className="pres-scroll">
      <div
        className="pres-grid"
        role="radiogroup"
        aria-label={`${filas.nombre} y ${columnas.nombre.toLocaleLowerCase("es")}`}
        style={{ "--cols": columnas.valores.length } as CSSProperties}
      >
        <span className="pres-esq" aria-hidden="true" />
        {columnas.valores.map((cv) => (
          <span className="pres-col" key={cv} aria-hidden="true">
            {cv}
          </span>
        ))}
        {filas.valores.map((fv) => (
          <FilaCuadricula key={fv} p={p} filas={filas} columnas={columnas} fv={fv} sel={sel} base={base} alElegir={alElegir} />
        ))}
      </div>
    </div>
  );
}
function FilaCuadricula({ p, filas, columnas, fv, sel, base, alElegir }: { p: ProductoPublico; filas: OpcionProducto; columnas: OpcionProducto; fv: string; sel: Eleccion | null; base: number; alElegir: (v: Eleccion) => void }) {
  return (
    <>
      <span className="pres-fila">
        <MuestraColor p={p} eje={filas} valor={fv} />
        <span>{fv}</span>
      </span>
      {columnas.valores.map((cv) => {
        const e: Eleccion = { [filas.nombre]: fv, [columnas.nombre]: cv };
        const c = celda(p, e);
        const marcada = !!sel && sel[filas.nombre] === fv && sel[columnas.nombre] === cv;
        return (
          <Celda key={cv} p={p} e={e} c={c} marcada={marcada} base={base} etiqueta={cv} alTocar={() => alElegir(e)} />
        );
      })}
    </>
  );
}

function Celda({ p, e, c, marcada, base, etiqueta, alTocar }: { p: ProductoPublico; e: Eleccion; c: EstadoCelda; marcada: boolean; base: number; etiqueta: string; alTocar: () => void }) {
  const propio = c.precio !== null && c.precio !== base;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={marcada}
      aria-label={etiquetaCelda(p.opciones, e, c, base)}
      className={"pres-celda" + (sinStock(c) ? " agotada" : "") + (marcada ? " on" : "")}
      onClick={alTocar}
    >
      <span className="pres-valor">{sinStock(c) ? <s>{etiqueta}</s> : etiqueta}</span>
      {c.estado === "quedan" && c.quedan !== null && <i className="pres-quedan" aria-hidden="true">{c.quedan}</i>}
      {propio && c.estado !== "agotada" && <i className="pres-precio" aria-hidden="true">{Math.round(c.precio!).toLocaleString("es-DO")}</i>}
    </button>
  );
}

/** Un solo eje (perfumes: «Tamaño»): una lista simple con el valor, su precio y su estado. */
function ListaPresentaciones({ p, eje, sel, base, alElegir }: { p: ProductoPublico; eje: OpcionProducto; sel: Eleccion | null; base: number; alElegir: (v: Eleccion) => void }) {
  return (
    <div className="pres-lista" role="radiogroup" aria-label={eje.nombre}>
      {eje.valores.map((v) => {
        const e: Eleccion = { [eje.nombre]: v };
        const c = celda(p, e);
        const marcada = !!sel && sel[eje.nombre] === v;
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={marcada}
            aria-label={etiquetaCelda(p.opciones, e, c, undefined) + (c.precio !== null ? `, ${dinero(c.precio)}` : "")}
            className={"pres-item" + (sinStock(c) ? " agotada" : "") + (marcada ? " on" : "")}
            onClick={() => alElegir(e)}
          >
            <span className="pres-valor">
              <MuestraColor p={p} eje={eje} valor={v} />
              {sinStock(c) ? <s>{v}</s> : v}
            </span>
            <span className="pres-nota">
              {estadoDeEleccion(c) && <b>{estadoDeEleccion(c)}</b>}
              {c.precio !== null && <span>{dinero(c.precio)}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** La hoja de ♥ sin elegir (opción A): una fila de pastillas por eje; una agotada (con lo demás elegido) va tachada. */
function Pastillas({ p, ejes, sel, alElegir }: { p: ProductoPublico; ejes: OpcionProducto[]; sel: Eleccion | null; alElegir: (v: Eleccion) => void }) {
  return (
    <>
      {ejes.map((eje) => (
        <div className="pres-eje" key={eje.nombre}>
          <p className="pres-rotulo">{eje.nombre}</p>
          <div className="pres-pastillas" role="radiogroup" aria-label={eje.nombre}>
            {eje.valores.map((v) => {
              const e: Eleccion = { ...(sel ?? {}), [eje.nombre]: v };
              for (const o of ejes) if (!e[o.nombre]) e[o.nombre] = (eleccionPorDefecto(p) ?? {})[o.nombre] ?? o.valores[0]!;
              const c = celda(p, e);
              const marcada = !!sel && sel[eje.nombre] === v;
              const hex = esEjeColor(eje.nombre) ? colorPorNombre(v) : null;
              return (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={marcada}
                  aria-label={etiquetaCelda(p.opciones, e, c, p.precioPromo ?? p.precio)}
                  className={"pres-pastilla" + (sinStock(c) ? " agotada" : "") + (marcada ? " on" : "")}
                  onClick={() => alElegir(e)}
                >
                  {hex && <span className="pres-mini punto" aria-hidden="true" style={estilo(hex)} />}
                  {sinStock(c) ? <s>{v}</s> : v}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}
