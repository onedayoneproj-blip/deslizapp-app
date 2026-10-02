"use client";

import { useEffect, useRef, useState } from "react";
import { useData } from "@/lib/data/provider";
import { useConsulta, useTiendaActiva } from "@/lib/data/consulta";
import { ErrorClaro, ErrorDeRed, InventarioCambio, mensajeDeError } from "@/lib/data/errores";
import { MOTIVOS_INVENTARIO } from "@/lib/data/inventario";
import type { CambiosProducto, MotivoAjusteInventario, Producto } from "@/lib/types";
import { Hoja } from "../hoja";
import { Chip, GrupoOpciones } from "../controles";
import { IconoMas, IconoMenos } from "../iconos";

/** Un solo borrador para ambos recorridos: tocar cantidades nunca llama a la fuente. */
export function useInventarioPendiente(producto: Producto | null, alConfirmado?: () => void) {
  const { guardarProductoConInventario, revisarGuardadoInventario } = useData();
  const { tiendaId } = useTiendaActiva();
  const [draft, setDraft] = useState({ base: producto?.stock ?? null, propuesta: producto?.stock ?? null });
  const [guardando, setGuardando] = useState(false);
  const enCurso = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [incierto, setIncierto] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const confirmacionMontada = useRef(false);
  const despuesDeConfirmar = useRef<(() => void) | null>(null);
  const finalizar = (accion: () => void) => {
    if (confirmacionMontada.current) despuesDeConfirmar.current = accion;
    else accion();
  };
  const [motivo, setMotivo] = useState<MotivoAjusteInventario | null>(null);
  const [nota, setNota] = useState("");
  const operacion = useRef<{ id: string; firma: string } | null>(null);
  const accion = useRef<((motivo: MotivoAjusteInventario, nota: string | null) => Promise<boolean>) | null>(null);
  const stockLeido = useRef(producto?.stock ?? null);
  const pendiente = draft.base !== draft.propuesta;

  useEffect(() => {
    if (stockLeido.current === (producto?.stock ?? null)) return;
    stockLeido.current = producto?.stock ?? null;
    // Sin borrador, refleja lecturas externas. Un borrador conserva su base hasta la comprobación atómica.
    setDraft(d => d.base === d.propuesta ? { base: producto?.stock ?? null, propuesta: producto?.stock ?? null } : d);
  }, [producto?.stock]);

  const recuperar = () => {
    setDraft({ base: producto?.stock ?? draft.base, propuesta: producto?.stock ?? draft.base });
    setError(null);
    setMotivo(null);
    setNota("");
    // Un resultado incierto no se desbloquea descartando: exige releer primero.
  };
  const guardar = async (cambios: Omit<CambiosProducto, "stock">, retocar: boolean, razon: MotivoAjusteInventario, anotacion: string | null) => {
    if (!producto || enCurso.current || incierto) return false;
    enCurso.current = true;
    setGuardando(true);
    setError(null);
    const firma = JSON.stringify({ cambios, retocar, base: draft.base, propuesta: draft.propuesta, razon, anotacion });
    if (!operacion.current || operacion.current.firma !== firma) operacion.current = { id: crypto.randomUUID(), firma };
    try {
      const p = await guardarProductoConInventario(tiendaId, producto.id, cambios,
        pendiente && draft.base !== null && draft.propuesta !== null ? { id: operacion.current.id, stockBase: draft.base, stockPropuesto: draft.propuesta, motivo: razon, nota: anotacion } : null, retocar);
      setDraft({ base: p.stock, propuesta: p.stock });
      setConfirmar(false);
      operacion.current = null;
      return true;
    } catch (e) {
      setError(mensajeDeError(e, "No pudimos confirmar el guardado. Revisa el producto y su historial antes de repetirlo."));
      if (e instanceof InventarioCambio) {
        try {
          const lectura = await revisarGuardadoInventario(tiendaId, producto.id, operacion.current?.id ?? null);
          if (lectura.producto) setDraft(d => ({ base: lectura.producto!.stock, propuesta: d.propuesta }));
          setConfirmar(false);
          operacion.current = null;
        } catch { setIncierto(true); }
      } else if (!(e instanceof ErrorClaro) || e instanceof ErrorDeRed) setIncierto(true);
      return false;
    } finally { enCurso.current = false; setGuardando(false); }
  };
  const revisar = async () => {
    if (!producto || enCurso.current) return false;
    enCurso.current = true; setGuardando(true);
    try {
      const lectura = await revisarGuardadoInventario(tiendaId, producto.id, operacion.current?.id ?? null);
      if (!lectura.producto) throw new Error("Producto no encontrado");
      setDraft(d => ({ base: lectura.producto!.stock, propuesta: lectura.ajuste ? lectura.producto!.stock : d.propuesta }));
      setIncierto(false); setConfirmar(false);
      setError(lectura.ajuste ? "Confirmamos el ajuste en el historial." : "Producto e historial actualizados. Revisa la propuesta antes de guardar otra vez.");
      if (lectura.ajuste && alConfirmado) finalizar(alConfirmado);
      return Boolean(lectura.ajuste);
    } catch { setError("No pudimos releer el producto y el historial. Conservamos tu propuesta."); return false; }
    finally { enCurso.current = false; setGuardando(false); }
  };
  const pedirGuardar = (alGuardar: (motivo: MotivoAjusteInventario, nota: string | null) => Promise<boolean>) => {
    if (enCurso.current || incierto) return;
    if (pendiente && draft.base !== null && draft.propuesta !== null && draft.propuesta < draft.base) {
      accion.current = alGuardar; confirmacionMontada.current = true; setConfirmar(true);
    } else void alGuardar("reposicion", null);
  };
  return {
    base: draft.base, propuesta: draft.propuesta, pendiente, guardando, error, incierto, confirmar, motivo, nota,
    recuperar, guardar, revisar, pedirGuardar, setMotivo, setNota, finalizar,
    alSalirConfirmacion: () => { confirmacionMontada.current = false; const salir = despuesDeConfirmar.current; despuesDeConfirmar.current = null; salir?.(); },
    cambiar: (delta: number) => { if (!enCurso.current && !incierto) setDraft(d => ({ ...d, propuesta: d.propuesta === null ? null : Math.min(2147483647, Math.max(0, d.propuesta + delta)) })); },
    cerrarConfirmacion: () => { if (!enCurso.current) setConfirmar(false); },
    confirmarGuardado: () => { if (motivo) void accion.current?.(motivo, motivo === "otro" ? nota : null); },
  };
}

type Borrador = ReturnType<typeof useInventarioPendiente>;
export function ControlInventario({ inventario, nombre }: { inventario: Borrador; nombre: string }) {
  const i = inventario;
  const delta = (i.propuesta ?? 0) - (i.base ?? 0);
  return <section aria-label="Inventario" className="rounded-[18px] border-[1.5px] border-borde bg-white p-4 text-bosque">
    <p className="text-[13px] font-bold text-suave">Inventario</p>
    {i.base === null ? <p className="mt-1 font-extrabold">Sin control de stock</p> : <>
      <p className="mt-1 text-sm text-suave">Guardado: {i.base} {i.base === 1 ? "unidad" : "unidades"}</p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <p aria-live="polite" className="min-w-0 break-all font-display text-[27px] leading-tight tabular-nums">{i.propuesta} <span className="text-base">{i.pendiente ? "propuestas" : "disponibles"}</span></p>
        <div className="flex shrink-0 gap-2">
          <button type="button" disabled={i.propuesta === 0 || i.guardando || i.incierto} onClick={() => i.cambiar(-1)} aria-label={`Disminuir stock de ${nombre}`} className="tocable grid h-11 w-11 place-items-center rounded-[14px] bg-arena disabled:opacity-45"><IconoMenos tamano={20}/></button>
          <button type="button" disabled={i.guardando || i.incierto || i.propuesta === 2147483647} onClick={() => i.cambiar(1)} aria-label={`Aumentar stock de ${nombre}`} className="tocable grid h-11 w-11 place-items-center rounded-[14px] bg-bosque text-papel disabled:opacity-45"><IconoMas tamano={20}/></button>
        </div>
      </div>
      {i.pendiente && <p className="mt-2 text-sm font-bold">{delta > 0 ? "Añadirás" : "Retirarás"} {Math.abs(delta)} {Math.abs(delta) === 1 ? "unidad" : "unidades"}. Se registra al guardar.</p>}
      {i.pendiente && <button type="button" disabled={i.guardando || i.incierto} onClick={i.recuperar} className="tocable mt-1 min-h-11 text-sm font-extrabold underline">Descartar ajuste</button>}
      <p className="mt-2 text-[12.5px] leading-snug text-suave">Los ajustes manuales no son ventas. Para vender, crea un pedido.</p>
    </>}
  </section>;
}

export function ConfirmacionInventario({ inventario }: { inventario: Borrador }) {
  const i = inventario;
  return <Hoja abierta={i.confirmar} alCerrar={i.cerrarConfirmacion} alSalir={i.alSalirConfirmacion} titulo="Ajustar inventario" altura="grande">
    <div className="flex flex-col gap-4 text-bosque">
      <div><h2 className="font-display text-[23px]">¿Por qué baja el stock?</h2><p className="mt-1 text-sm text-suave">Retirarás {(i.base ?? 0) - (i.propuesta ?? 0)} unidades. Se guardará como ajuste, no como venta.</p></div>
      <GrupoOpciones etiqueta="Motivo del ajuste">{(["dano","perdida","correccion_inventario","otro"] as const).map(m => <Chip key={m} elegido={i.motivo === m} tono="opcion" onClick={() => i.setMotivo(m)}>{MOTIVOS_INVENTARIO[m]}</Chip>)}</GrupoOpciones>
      {i.motivo === "otro" && <label className="flex flex-col gap-1.5 text-sm font-bold">Cuéntanos el motivo<textarea value={i.nota} onChange={e => i.setNota(e.target.value)} maxLength={200} rows={3} className="w-full rounded-2xl border-[1.5px] border-borde bg-white px-3.5 py-3 text-base font-normal outline-none focus:border-bosque"/></label>}
      {i.error && <p role="alert" className="rounded-2xl bg-rosa p-4 text-sm">{i.error}</p>}
      {i.incierto && <button type="button" disabled={i.guardando} onClick={() => void i.revisar()} className="tocable min-h-11 font-bold underline">Revisar producto e historial</button>}
      <button type="button" disabled={i.guardando || i.incierto || !i.motivo || (i.motivo === "otro" && !i.nota.trim())} onClick={i.confirmarGuardado} className="tocable h-14 rounded-full bg-bosque font-extrabold text-papel disabled:opacity-55">{i.guardando ? "Guardando…" : "Guardar ajuste"}</button>
      <button type="button" disabled={i.guardando} onClick={i.cerrarConfirmacion} className="tocable h-12 rounded-full border-[1.5px] border-bosque bg-white font-extrabold">Cancelar</button>
    </div>
  </Hoja>;
}

export function HistorialInventario({ productoId }: { productoId: string }) {
  const { getAjustesInventario } = useData();
  const { tiendaId } = useTiendaActiva();
  const [limite, setLimite] = useState(10);
  const { data, cargando, error, reintentar } = useConsulta(`ajustes:${tiendaId}:${productoId}:${limite}`, () => getAjustesInventario(tiendaId, productoId, 0, limite), true);
  return <section aria-label="Ajustes de inventario" className="flex flex-col gap-2 text-bosque">
    <h3 className="font-display text-xl">Ajustes de inventario</h3>
    <p className="text-[12.5px] text-suave">Solo ajustes manuales. Las ventas siguen en Pedidos.</p>
    {error ? <div role="alert"><p>No pudimos cargar los ajustes.</p><button type="button" onClick={reintentar} className="tocable min-h-11 font-bold underline">Reintentar historial</button></div> : data === undefined ? <p role="status">Cargando ajustes…</p> : <>
      {data.ajustes.length === 0 ? <p className="py-3 text-sm">Todavía no hay ajustes.</p> : <ul className="divide-y divide-borde">{data.ajustes.map(a => <li key={a.id} className="py-3 text-sm">
        <div className="flex items-baseline justify-between gap-3"><b className="text-base">{a.variacion > 0 ? "+" : "−"}{Math.abs(a.variacion)}</b><span>{a.stockAnterior} → {a.stockNuevo}</span></div>
        <p className="font-bold">{MOTIVOS_INVENTARIO[a.motivo]}</p>{a.nota && <p className="break-words">{a.nota}</p>}
        <p className="mt-1 break-words text-[12px] text-suave">{new Intl.DateTimeFormat("es-DO", { timeZone: "America/Santo_Domingo", dateStyle: "medium", timeStyle: "short" }).format(new Date(a.creadoEn))} · {a.actorNombre}</p>
      </li>)}</ul>}
      {data.hayMas && <button type="button" disabled={cargando} onClick={() => setLimite(n => n + 10)} className="tocable min-h-11 rounded-full border-[1.5px] border-bosque font-bold">Ver más ajustes</button>}
    </>}
  </section>;
}
