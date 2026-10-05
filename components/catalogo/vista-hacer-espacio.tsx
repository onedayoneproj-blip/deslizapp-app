"use client";

import { useMemo, useRef, useState } from "react";
import { useTiendaActiva } from "@/lib/data/consulta";
import { mensajeDeError } from "@/lib/data/errores";
import { useData } from "@/lib/data/provider";

import { diaMesCorto } from "@/lib/formato";
import { agotadosVisibles, candidatosAEspacio, DIAS_SIN_MOVIMIENTO, ocultarAgotadosElegibles, productoDeClave, type VentasProducto } from "@/lib/inventario-catalogo";
import type { Producto } from "@/lib/types";
import { BotonVerMas, useVerMas } from "../ver-mas";
import { Boton, Buscador, CheckSeleccion, FilaLista, ListaAgrupada, useToastUI } from "../ui";
import { MiniaturaProducto } from "./miniatura-producto";

/** Cuántos "sin moverse" se ven de entrada y por cada "Ver más". */
const PASO_SIN_MOVERSE = 5;

const lugares = (n: number) => (n === 1 ? "1 lugar" : `${n} lugares`);

/**
 * "Hacer espacio": elige qué ocultar del catálogo para liberar lugares del plan. Ocultar es reversible (activo = false; los ocultos no
 * cuentan en el plan). No hay "eliminar para siempre": los pedidos y el historial de stock apuntan a los productos.
 * `enReposicion`: lo marcado en "Por reponer" en esta sesión; esos agotados no se marcan para ocultar.
 */
export function VistaHacerEspacio({
  productos,
  ventas,
  enReposicion,
  alTerminar,
  soloAgotadosVisibles = false,
}: {
  productos: Producto[];
  ventas: Map<string, VentasProducto>;
  enReposicion: Record<string, number> | null;
  alTerminar: () => void;
  soloAgotadosVisibles?: boolean;
}) {
  const { tiendaId } = useTiendaActiva();
  const { cambiarVisibilidad } = useData();
  const { mostrarToast } = useToastUI();
  const [ahora] = useState(() => Date.now());
  const candidatos = useMemo(
    () => candidatosAEspacio(productos, ventas, ahora, new Set(Object.keys(enReposicion ?? {}).map(productoDeClave))),
    [productos, ventas, ahora, enReposicion],
  );
  const [elegidos, setElegidos] = useState<Set<string>>(() => new Set(candidatos.agotados.filter((a) => a.marcado).map((a) => a.producto.id)));
  const [ocultando, setOcultando] = useState(false);
  const quietos = useVerMas(candidatos.sinMoverse, "sin-moverse", PASO_SIN_MOVERSE);

  if (soloAgotadosVisibles) return <SeleccionarAgotadosVisibles productos={productos} alTerminar={alTerminar} />;

  const alternar = (id: string) =>
    setElegidos((actual) => {
      const nuevo = new Set(actual);
      if (!nuevo.delete(id)) nuevo.add(id);
      return nuevo;
    });

  const ids = [...elegidos];
  const n = ids.length;

  const ocultar = async () => {
    setOcultando(true);
    try {
      await cambiarVisibilidad(tiendaId, ids, false);
      mostrarToast(`Liberaste ${lugares(n)}`, {
        accion: {
          texto: "Deshacer",
          alTocar: () => void cambiarVisibilidad(tiendaId, ids, true).catch((e) => mostrarToast(mensajeDeError(e, "No se pudo deshacer."))),
        },
      });
      alTerminar();
    } catch (e) {
      mostrarToast(mensajeDeError(e, "No se pudo ocultar. Inténtalo otra vez."));
    } finally {
      setOcultando(false);
    }
  };

  const hayAlgo = candidatos.agotados.length > 0 || candidatos.sinMoverse.length > 0;

  return (
    <div className="flex flex-col gap-5">
      <p className="font-mano text-mano text-atencion-texto">Que entren los nuevos</p>

      {!hayAlgo && <p className="text-secundario text-texto-secundario">Nada por ocultar por ahora.</p>}

      {candidatos.agotados.length > 0 && (
        <section aria-labelledby="espacio-agotados" className="flex flex-col gap-2">
          <h3 id="espacio-agotados" className="text-destacado text-texto">
            Agotados a la vista
          </h3>
          <ListaAgrupada>
            {candidatos.agotados.map(({ producto: p, ultimaVenta, porReponer }) => (
              <FilaLista
                key={p.id}
                marcada={elegidos.has(p.id)}
                onClick={() => alternar(p.id)}
                inicio={
                  <span className="flex items-center gap-3">
                    <CheckSeleccion marcado={elegidos.has(p.id)} />
                    <MiniaturaProducto producto={p} atenuada />
                  </span>
                }
                titulo={p.nombre}
                detalle={porReponer ? "Lo vas a reponer" : ultimaVenta ? `Se fue volando el ${diaMesCorto(ultimaVenta)}` : "Nunca se vendió"}
              />
            ))}
          </ListaAgrupada>
        </section>
      )}

      {candidatos.sinMoverse.length > 0 && (
        <section aria-labelledby="espacio-quietos" className="flex flex-col gap-2">
          <h3 id="espacio-quietos" className="text-destacado text-texto">
            Sin moverse en {DIAS_SIN_MOVIMIENTO} días
          </h3>
          <ListaAgrupada>
            {quietos.visibles.map(({ producto: p, ultimaVenta }) => (
              <FilaLista
                key={p.id}
                marcada={elegidos.has(p.id)}
                onClick={() => alternar(p.id)}
                inicio={
                  <span className="flex items-center gap-3">
                    <CheckSeleccion marcado={elegidos.has(p.id)} />
                    <MiniaturaProducto producto={p} atenuada />
                  </span>
                }
                titulo={p.nombre}
                detalle={`${p.stock === 1 ? "Queda 1" : `Quedan ${p.stock}`} · ${ultimaVenta ? `vendido ${diaMesCorto(ultimaVenta)}` : "sin ventas"}`}
              />
            ))}
            <BotonVerMas forma="fila" quedan={quietos.quedan} mostrados={quietos.mostrados} total={candidatos.sinMoverse.length} pagina={PASO_SIN_MOVERSE} alTocar={quietos.verMas} />
          </ListaAgrupada>
        </section>
      )}

      {hayAlgo && (
        <div className="flex flex-col gap-3">
          <p className="text-center text-secundario text-texto-secundario">{n === 0 ? "Marca lo que quieras ocultar" : `Liberas ${lugares(n)} · los vuelves a mostrar cuando quieras`}</p>
          <Boton tamano="grande" anchoCompleto deshabilitado={n === 0} cargando={ocultando} onClick={() => void ocultar()}>
            {n === 0 ? "Ocultar del catálogo" : `Ocultar ${n} del catálogo`}
          </Boton>
        </div>
      )}
    </div>
  );
}


const normalizarBusqueda = (texto: string) => texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

/** Selección reversible hasta la acción final; vuelve a comprobar la elegibilidad justo antes de cada cambio. */
function SeleccionarAgotadosVisibles({ productos, alTerminar }: { productos: Producto[]; alTerminar: () => void }) {
  const { tiendaId } = useTiendaActiva();
  const { getProducto, actualizarProducto } = useData();
  const [busqueda, setBusqueda] = useState("");
  const [elegidos, setElegidos] = useState<Set<string>>(() => new Set());
  const [ocupado, setOcupado] = useState(false);
  const enCurso = useRef(false);
  const [fallidos, setFallidos] = useState<{ id: string; nombre: string; error: string }[]>([]);
  const [omitidos, setOmitidos] = useState<Set<string>>(() => new Set());
  const [mensaje, setMensaje] = useState("");
  const elegiblesBase = useMemo(() => agotadosVisibles(productos), [productos]);
  const elegibles = elegiblesBase.filter(p => !omitidos.has(p.id));
  const q = normalizarBusqueda(busqueda);
  const resultados = elegibles.filter(p => !q || normalizarBusqueda(p.nombre).includes(q));
  const todoElegido = resultados.length > 0 && resultados.every(p => elegidos.has(p.id));

  const alternar = (id: string) => {
    setMensaje("");
    setElegidos(actual => { const siguiente = new Set(actual); if (siguiente.has(id)) siguiente.delete(id); else siguiente.add(id); return siguiente; });
  };
  const alternarResultados = () => {
    const ids = resultados.map(p => p.id);
    setMensaje("");
    setElegidos(actual => { const siguiente = new Set(actual); if (ids.every(id => siguiente.has(id))) ids.forEach(id => siguiente.delete(id)); else ids.forEach(id => siguiente.add(id)); return siguiente; });
  };
  const ocultar = async (ids: string[]) => {
    if (enCurso.current || ids.length === 0) return;
    enCurso.current = true; setOcupado(true); setMensaje("");
    const intento = await ocultarAgotadosElegibles(tiendaId, ids, getProducto, actualizarProducto);
    const ocultados = intento.ocultados.map(id => elegibles.find(p => p.id === id)?.nombre ?? "Producto");
    const obsoletos = intento.yaNoElegibles.map(id => elegibles.find(p => p.id === id)?.nombre ?? "Producto");
    const pendientes = intento.fallidos.map(f => ({ id: f.id, nombre: elegibles.find(p => p.id === f.id)?.nombre ?? "Producto", error: mensajeDeError(f.error, "No se pudo actualizar.") }));
    setFallidos(pendientes);
    setOmitidos(actual => new Set([...actual, ...intento.yaNoElegibles]));
    setElegidos(new Set(pendientes.map(p => p.id)));
    if (pendientes.length) {
      setMensaje(`${ocultados.length ? `Se ocultaron ${ocultados.length}. ` : ""}No se pudieron ocultar ${pendientes.length === 1 ? "1 producto" : `${pendientes.length} productos`}: ${pendientes.map(p => p.nombre).join(", ")}.`);
    } else if (obsoletos.length) {
      setMensaje(`${ocultados.length ? `Se ocultaron ${ocultados.length}. ` : ""}Ya no están agotados y visibles: ${obsoletos.join(", ")}.`);
    } else {
      alTerminar();
    }
    enCurso.current = false; setOcupado(false);
  };

  return <div className="flex flex-col gap-4">
    <p className="text-secundario text-texto-secundario">Elige qué productos agotados ocultar. No se cambiarán hasta confirmar.</p>
    <Buscador valor={busqueda} alCambiar={setBusqueda} etiqueta="Buscar agotados visibles" placeholder="Buscar producto" />
    {resultados.length > 0 && <ListaAgrupada etiqueta="Productos agotados visibles">
      <FilaLista titulo={todoElegido ? "Quitar selección de resultados" : "Seleccionar todos los resultados"} detalle={`${resultados.length} ${resultados.length === 1 ? "producto" : "productos"} de esta búsqueda`} inicio={<CheckSeleccion marcado={todoElegido}/>} onClick={alternarResultados} marcada={todoElegido} />
      {resultados.map(p => <FilaLista key={p.id} marcada={elegidos.has(p.id)} onClick={() => alternar(p.id)} inicio={<span className="flex items-center gap-3"><CheckSeleccion marcado={elegidos.has(p.id)}/><MiniaturaProducto producto={p} atenuada/></span>} titulo={p.nombre} detalle="Agotado · Visible" />)}
    </ListaAgrupada>}
    {resultados.length === 0 && <p className="py-5 text-center text-secundario text-texto-secundario">{elegibles.length ? "No encontramos productos con ese nombre." : "Ya no hay productos agotados a la vista."}</p>}
    <p role="status" aria-live="polite" className="text-center text-secundario text-texto-secundario">{elegidos.size ? `${elegidos.size} ${elegidos.size === 1 ? "producto seleccionado" : "productos seleccionados"}` : "Ningún producto seleccionado"}</p>
    {mensaje && <div role="alert" className="flex flex-col gap-2 rounded-radio-m bg-atencion-suave p-4 text-secundario text-texto"><p>{mensaje}</p>{fallidos.length > 0 && <ul className="list-disc pl-5">{fallidos.map(f => <li key={f.id}><span className="font-bold">{f.nombre}:</span> {f.error}</li>)}</ul>}<div className="flex flex-col gap-2">{fallidos.length > 0 && <Boton jerarquia="secundario" tamano="normal" onClick={() => void ocultar(fallidos.map(f => f.id))} deshabilitado={ocupado}>Reintentar solo los {fallidos.length} pendientes</Boton>}<Boton jerarquia="terciario" tamano="compacto" onClick={() => {setMensaje("");setFallidos([]);setElegidos(new Set());}}>Seguir eligiendo</Boton></div></div>}
    {!mensaje && <Boton tamano="grande" anchoCompleto deshabilitado={!elegidos.size || ocupado} cargando={ocupado} onClick={() => void ocultar([...elegidos])}>{elegidos.size === 0 ? "Ocultar del catálogo" : elegidos.size === 1 ? "Ocultar 1 producto" : `Ocultar ${elegidos.size} productos`}</Boton>}
  </div>;
}
