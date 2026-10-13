"use client";

import { usePermisos } from "@/lib/data/permisos";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal, flushSync } from "react-dom";
import { useConsulta, useTiendaActiva } from "@/lib/data/consulta";
import { mensajeDeError } from "@/lib/data/errores";
import { useData } from "@/lib/data/provider";
import { colorPorNombre, esEjeColor } from "@/lib/colores";
import { textoCombinacion } from "@/lib/presentaciones";
import type { MotivoAjusteInventario, Producto, Variante } from "@/lib/types";
import { ListaEsperaProducto } from "./hoja-espera";
import { Foto } from "../foto";
import { Hoja, HojaFijoAbajo, PieFlotante, useAvisarAlSalir, useConfirmarSalida } from "../hoja";
import { useToast } from "../toast";
import { usePanelUI } from "../panel/ui";
import { CuerpoConError, CuerpoCargando } from "../hoja-estado";
import { formatearPesos } from "@/lib/formato";
import { IconoChevronAbajo, IconoChevronArriba, IconoChevronDerecha, IconoEtiqueta, IconoHistoria, IconoReloj } from "../iconos";
import { resumenDelPlan } from "@/lib/plan-catalogo";
import { precioConPromo, type PrecioConPromo } from "@/lib/promos";
import { textoPersonasLoEsperan } from "@/lib/hoja-producto";
import { Boton, Campo, Cantidad, Etiqueta, FilaAgregar, FilaLista, GrupoOpciones, Interruptor, ListaAgrupada, useToastUI } from "../ui";
import { clases, FOCO } from "../ui/comunes";
import { EditarProducto } from "./editar-producto";
import { HojaMotivoVariantes } from "./ficha-presentaciones";
import { HojaHistoria } from "./hoja-historia";
import { ConfirmacionInventario, HistorialInventario, useHistorialInventario, useInventarioPendiente } from "./inventario-producto";

/** Las pantallas internas de una hoja de producto: el historial de ajustes o la lista de espera. */
function usePantallaInterna() {
  const historial = useHistorialInventario();
  const [vista, setVista] = useState<"historial" | "espera">("historial");
  const ver = (boton: HTMLButtonElement, v: "historial" | "espera") => {
    flushSync(() => setVista(v));
    historial.abrir(boton);
  };
  return { ...historial, vista, ver, titulo: vista === "espera" ? "Lista de espera" : "Historial de ajustes" };
}

/**
 * Editar producto (docs/prompts/editar-producto-2-resumen.md): la hoja grande con la cabecera de la historia sin barras (✕, «Editar
 * producto» y el selector de catálogo) y el resumen (`EditarProducto`). Al cerrar vuelve a la vista del producto si se entró desde
 * ahí, o a /catalogo sin perder la búsqueda ni el filtro (los guarda el layout). Crear es la historia (`historia-producto.tsx`).
 */
export function HojaProducto({ productoId, desdeVistaPrevia = false, abrirStock = false }: { productoId: string; desdeVistaPrevia?: boolean; abrirStock?: boolean }) {
  const router = useRouter();
  const interna = usePantallaInterna();
  const { getProducto, getProductos } = useData();
  const { tiendaId } = useTiendaActiva();
  const [abierta, setAbierta] = useState(true);
  const cerrar = useCallback(() => setAbierta(false), []);
  const eliminado = useRef(false);
  const [retirando, setRetirando] = useState(false);
  const [ranuraCatalogo, setRanuraCatalogo] = useState<HTMLSpanElement | null>(null);
  const alSalir = useCallback(() => router.push(!eliminado.current && desdeVistaPrevia ? `/catalogo/${productoId}` : "/catalogo", { scroll: false }), [router, desdeVistaPrevia, productoId]);

  const { data: producto, cargando, error, reintentar } = useConsulta(`producto:${tiendaId}:${productoId}`, () => getProducto(tiendaId, productoId));
  const { data: productos, error: errorProductos, reintentar: reintentarProductos } = useConsulta(`productos:${tiendaId}`, () => getProductos(tiendaId));

  const hoja = (contenido: ReactNode, conRanura = false) => (
    <Hoja
      abierta={abierta} alCerrar={cerrar} alSalir={alSalir} protegerAtras altura="grande" alVolverInterno={interna.volver}
      titulo={interna.abierto ? interna.titulo : "Editar producto"}
      historia={{ alLadoDelTitulo: conRanura ? <span ref={setRanuraCatalogo} className="flex min-w-0 flex-1 justify-end" /> : undefined, volver: interna.abierto ? interna.volver : undefined }}
    >
      {contenido}
    </Hoja>
  );

  // Esperar a tener el producto (y avisar si no es de esta tienda).
  if (producto === undefined && cargando) return hoja(<CuerpoCargando titulo="producto" />);
  if (error) return hoja(<CuerpoConError alCerrar={alSalir} alReintentar={reintentar} textoVolver="Volver al catálogo" />);
  if (errorProductos) return hoja(<CuerpoConError alCerrar={alSalir} alReintentar={reintentarProductos} textoVolver={desdeVistaPrevia ? "Volver al producto" : "Volver al catálogo"} />);
  if (!producto || (producto.eliminadoEn && !retirando)) {
    return hoja(
      <div className="py-6 text-center">
        <p className="font-display text-xl">{producto?.eliminadoEn ? "Producto eliminado. Su historial se conserva." : "Este producto no vive aquí."}</p>
        {!producto?.eliminadoEn && <p className="mt-1 text-suave">Quizá es de otra tienda. Los productos no se mezclan.</p>}
        <button type="button" onClick={() => { eliminado.current = Boolean(producto?.eliminadoEn); cerrar(); }} className="mt-5 h-12 w-full rounded-full bg-bosque font-extrabold text-papel">
          {!producto?.eliminadoEn && desdeVistaPrevia ? "Volver al producto" : "Volver al catálogo"}
        </button>
      </div>,
    );
  }
  if (!productos) return hoja(<CuerpoCargando titulo="productos" />);

  return hoja(
    <>
      <div className={interna.abierto ? "hidden" : "contents"}>
        <EditarProducto
          key={`${tiendaId}:${producto.id}`} producto={producto} productos={productos} ranuraCatalogo={ranuraCatalogo} internaAbierta={interna.abierto} abrirStock={abrirStock}
          alTerminar={cerrar} alEliminar={() => { eliminado.current = true; cerrar(); }} alIniciarEliminacion={() => setRetirando(true)}
          alVerHistorial={(b) => interna.ver(b, "historial")} alVerEspera={(b) => interna.ver(b, "espera")}
        />
      </div>
      {interna.visitado && (
        <div className={interna.abierto ? "" : "hidden"}>
          {interna.vista === "espera" ? <ListaEsperaProducto key={`${tiendaId}:${productoId}`} producto={producto} /> : <HistorialInventario key={`${tiendaId}:${productoId}`} productoId={productoId} />}
        </div>
      )}
    </>,
    true,
  );
}

/**
 * Ver producto (referencia `referencias/editar-producto/Vista-A.dc.html`): la cabecera con ✕, el nombre y «Editar»; la vista previa
 * grande con todas las fotos; la lista de espera si hay; Visible, el Stock plegable y el Historial. Mide lo que mide su contenido.
 */
export function HojaVistaProducto({ productoId }: { productoId: string }) {
  const router = useRouter();
  const interna = usePantallaInterna();
  const { getProducto, getPromos, getProductos } = useData();
  const { tiendaId } = useTiendaActiva();
  const [abierta, setAbierta] = useState(true);
  const destino = useRef("/catalogo");
  const cerrar = useCallback(() => setAbierta(false), []);
  const alSalir = useCallback(() => router.push(destino.current, { scroll: false }), [router]);
  const navegar = (ruta: string) => { destino.current = ruta; setAbierta(false); };
  const [ranura, setRanura] = useState<HTMLSpanElement | null>(null);
  const { data: producto, error, reintentar } = useConsulta(`producto:${tiendaId}:${productoId}`, () => getProducto(tiendaId, productoId));
  const { data: promos, error: errorPromos, reintentar: reintentarPromos } = useConsulta(`promos:${tiendaId}`, () => getPromos(tiendaId));
  const lista = useConsulta(`productos:${tiendaId}`, () => getProductos(tiendaId), true);
  return (
    <Hoja
      abierta={abierta} alCerrar={cerrar} alSalir={alSalir} protegerAtras alVolverInterno={interna.volver} altura="auto"
      titulo={interna.abierto ? interna.titulo : producto?.nombre ?? "Producto"}
      historia={{ tituloElipsis: true, alLadoDelTitulo: <span ref={setRanura} className="flex shrink-0 justify-end" />, volver: interna.abierto ? interna.volver : undefined }}
    >
      <div className={interna.abierto ? "hidden" : "contents"}>
        {error || errorPromos ? (
          <CuerpoConError alCerrar={cerrar} alReintentar={() => { reintentar(); reintentarPromos(); }} textoVolver="Volver al catálogo" />
        ) : producto === undefined || promos === undefined ? (
          <CuerpoCargando titulo="producto" />
        ) : !producto || producto.eliminadoEn ? (
          <div className="py-6 text-center">
            <p className="font-display text-xl">{producto?.eliminadoEn ? "Producto eliminado. Su historial se conserva." : "Este producto no vive aquí."}</p>
            <button type="button" onClick={cerrar} className="tocable mt-4 min-h-11 font-bold">Volver al catálogo</button>
          </div>
        ) : (
          <ContenidoVistaProducto
            key={`${tiendaId}:${productoId}`} producto={producto} precio={precioConPromo(producto, promos)} promos={promos} productos={lista.data}
            cargandoProductos={lista.cargando || lista.error} alNavegar={navegar} ranuraEditar={interna.abierto ? null : ranura} internaAbierta={interna.abierto}
            alVerHistorial={(b) => interna.ver(b, "historial")} alVerEspera={(b) => interna.ver(b, "espera")}
          />
        )}
      </div>
      {interna.visitado && (
        <div className={interna.abierto ? "" : "hidden"}>
          {interna.vista === "espera" && producto ? <ListaEsperaProducto key={`${tiendaId}:${productoId}`} producto={producto} /> : <HistorialInventario key={`${tiendaId}:${productoId}`} productoId={productoId} />}
        </div>
      )}
    </Hoja>
  );
}

/** Con más presentaciones que estas, abrir el Stock lleva al Inventario de editar. */
const MAX_STOCK_EN_VISTA = 3;

/**
 * El borrador del stock de las presentaciones en la vista (hasta 3): tocar − / + no llama a la fuente; «Guardar cambios» ajusta cada
 * una con su motivo (subir es reposición; bajar pide motivo), con las mismas llamadas que editar.
 */
function useStockPresentaciones(producto: Producto) {
  const { ajustarStock } = useData();
  const { tiendaId } = useTiendaActiva();
  const activas = (producto.variantes ?? []).filter((v) => v.activa);
  const [propuesta, setPropuesta] = useState<Record<string, number>>({});
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Cada ajuste se confirma por separado: si uno falla después de otro que sí entró, el que entró pasa a ser la base de esa
  // presentación (hasta que llegue la relectura del producto), así que reintentar nunca lo aplica dos veces.
  const [confirmados, setConfirmados] = useState<{ de: Producto; stock: Record<string, number> }>({ de: producto, stock: {} });
  const yaConfirmado = confirmados.de === producto ? confirmados.stock : {};
  const base = (v: Variante) => yaConfirmado[v.id] ?? v.stock;
  const valor = (v: Variante) => propuesta[v.id] ?? base(v) ?? 0;
  const cambiadas = activas.filter((v) => base(v) !== null && valor(v) !== base(v));
  const bajan = cambiadas.reduce((t, v) => t + Math.max(0, (base(v) ?? 0) - valor(v)), 0);
  const guardar = async (motivo: MotivoAjusteInventario, nota: string | null) => {
    if (guardando) return false;
    setGuardando(true);
    setError(null);
    try {
      for (const v of cambiadas) {
        const quiere = valor(v);
        const delta = quiere - (base(v) ?? 0);
        await ajustarStock(tiendaId, producto.id, delta, delta > 0 ? "reposicion" : motivo, delta > 0 ? null : nota, v.id);
        setConfirmados((c) => ({ de: producto, stock: { ...(c.de === producto ? c.stock : {}), [v.id]: quiere } }));
      }
      setPropuesta({});
      return true;
    } catch (e) {
      setError(mensajeDeError(e, "No pudimos guardar el ajuste. Revisa el producto y su historial antes de repetirlo."));
      return false;
    } finally {
      setGuardando(false);
    }
  };
  return { activas, valor, pendiente: cambiadas.length > 0, bajan, guardando, error, poner: (id: string, n: number) => setPropuesta((p) => ({ ...p, [id]: n })), descartar: () => setPropuesta({}), guardar };
}

function ContenidoVistaProducto({ producto, precio, promos, productos, cargandoProductos, alNavegar, alVerHistorial, alVerEspera, ranuraEditar, internaAbierta }: {
  productos: Producto[] | undefined; cargandoProductos: boolean; producto: Producto; precio: PrecioConPromo; promos: Parameters<typeof HojaHistoria>[0]["promos"];
  alNavegar: (ruta: string) => void; alVerEspera: (boton: HTMLButtonElement) => void; alVerHistorial: (boton: HTMLButtonElement) => void;
  ranuraEditar: HTMLElement | null; internaAbierta: boolean;
}) {
  const toast = useToast();
  const { actualizarProducto } = useData();
  const { puede, porque } = usePermisos();
  const sinCatalogo = !puede("catalogo");
  const { tiendaId, tienda } = useTiendaActiva();
  const { abrirInventario, espera } = usePanelUI();
  const { mostrarToast: mostrarToastUI } = useToastUI();
  const [guardandoVisible, setGuardandoVisible] = useState(false);
  const enviandoVisible = useRef(false);
  // La confirmación local cubre solo la breve espera de la relectura del proveedor.
  const [confirmado, setConfirmado] = useState<{ base: Producto; activo: boolean } | null>(null);
  const visible = confirmado?.base === producto ? confirmado.activo : producto.activo;
  const bloqueaVisible = !visible && tienda != null && productos != null && resumenDelPlan(productos, tienda.limiteProductos).estado === "lleno";
  const avisarLleno = () => mostrarToastUI("Tu catálogo está lleno", { accion: { texto: "Hacer espacio", alTocar: () => abrirInventario("espacio") } });
  const cambiarVisible = async (activo: boolean) => {
    if (enviandoVisible.current || cargandoProductos || !tienda) return;
    if (activo && bloqueaVisible) { avisarLleno(); return; }
    enviandoVisible.current = true; setGuardandoVisible(true);
    try {
      const p = await actualizarProducto(tiendaId, producto.id, { activo });
      setConfirmado({ base: producto, activo: p.activo });
    } catch (e) { toast(mensajeDeError(e, "No se pudo cambiar la visibilidad. Inténtalo otra vez.")); }
    finally { enviandoVisible.current = false; setGuardandoVisible(false); }
  };
  const inventario = useInventarioPendiente(producto);
  const variantes = useStockPresentaciones(producto);
  const [motivoVariantes, setMotivoVariantes] = useState(false);
  const pendiente = inventario.pendiente || variantes.pendiente;
  const guardandoStock = inventario.guardando || variantes.guardando;
  useAvisarAlSalir(pendiente || inventario.incierto);
  const confirmarSalida = useConfirmarSalida();
  const navegar = (ruta: string) => confirmarSalida(() => alNavegar(ruta));
  // El stock siempre empieza cerrado (Lewis, 13 oct): no se recuerda el último estado.
  const [stockAbierto, setStockAbierto] = useState(false);
  const [enHistoria, setEnHistoria] = useState(false);
  const activas = variantes.activas;
  const conPresentaciones = activas.length > 0;
  const personas = !espera.error && !espera.cargando ? (espera.resumen?.personasPorProducto.get(producto.id) ?? 0) : 0;
  // Mientras se guarda el stock no se sale a editar: el ajuste en camino podría entrar después de descartar el borrador.
  const editar = () => (sinCatalogo ? toast(porque) : guardandoStock ? undefined : navegar(`/catalogo/${producto.id}/editar`));
  const abrirStock = () => {
    // Con más de 3 presentaciones, el stock se cambia en el Inventario de editar.
    if (conPresentaciones && activas.length > MAX_STOCK_EN_VISTA && !stockAbierto) {
      if (sinCatalogo) return toast(porque);
      if (guardandoStock) return;
      return navegar(`/catalogo/${producto.id}/editar?abrir=stock`);
    }
    setStockAbierto((a) => !a);
  };
  const guardarStock = () => {
    if (variantes.pendiente) {
      if (variantes.bajan > 0) return setMotivoVariantes(true);
      void variantes.guardar("reposicion", null).then((bien) => bien && toast("Ajuste guardado. No cuenta como venta."));
      return;
    }
    inventario.pedirGuardar(async (motivo, nota) => { const bien = await inventario.guardar({}, false, motivo, nota); if (bien) toast("Ajuste guardado. No cuenta como venta."); return bien; });
  };
  const totalStock = conPresentaciones ? activas.reduce((t, v) => t + variantes.valor(v), 0) : (inventario.propuesta ?? 0);
  const detalleStock = conPresentaciones ? `${activas.length === 1 ? "1 presentación" : `${activas.length} presentaciones`} · ${totalStock} en total` : `${totalStock} en total`;

  return (
    <div className="flex flex-col gap-3 text-texto" data-vista-producto="">
      {ranuraEditar && !internaAbierta && createPortal(
        <button
          type="button" onClick={editar} aria-disabled={sinCatalogo || guardandoStock}
          className={clases("tocable inline-flex h-11 shrink-0 items-center rounded-full bg-superficie-hundida px-4 text-cuerpo font-extrabold text-texto", FOCO, (sinCatalogo || guardandoStock) && "opacity-40")}
          data-boton-editar=""
        >
          Editar
        </button>,
        ranuraEditar,
      )}

      <VistaPrevia producto={producto} precio={precio} alCompartir={tienda ? () => (producto.fotos[0] ? setEnHistoria(true) : toast("Ponle una foto primero.")) : undefined} />

      {personas > 0 && (
        <button type="button" onClick={(e) => alVerEspera(e.currentTarget)} className={clases("tocable flex min-h-14 w-full items-center gap-3 rounded-radio-l bg-atencion-suave px-4 text-left text-atencion-texto", FOCO)} data-franja-espera="">
          <IconoReloj tamano={22} className="shrink-0" />
          <span className="min-w-0 flex-1 text-destacado font-extrabold">{textoPersonasLoEsperan(personas)}</span>
          <IconoChevronDerecha tamano={20} strokeWidth={2.2} className="shrink-0" />
        </button>
      )}
      {espera.error ? <ListaAgrupada><FilaLista titulo="No pudimos leer la lista de espera" onClick={() => espera.reintentar()} fin={<span>Reintentar</span>} /></ListaAgrupada> : espera.cargando && <p role="status" className="text-secundario text-texto-secundario">Actualizando personas en espera…</p>}

      <ListaAgrupada>
        <FilaLista
          titulo="Visible en el catálogo" detalle={visible ? (producto.stock === 0 ? "Se ve como «Agotado»" : "Visible") : "Oculto del catálogo"}
          accion={<Interruptor encendido={visible} etiqueta="Visible en el catálogo" alCambiar={(v) => void cambiarVisible(v)} deshabilitado={sinCatalogo || guardandoVisible || guardandoStock || cargandoProductos || !tienda || bloqueaVisible} alTocarBloqueado={sinCatalogo ? () => toast(porque) : bloqueaVisible && !guardandoVisible ? avisarLleno : undefined} />}
        />
      </ListaAgrupada>

      <section aria-label="Stock" className="overflow-hidden rounded-radio-l border border-linea bg-superficie" data-stock-plegable="" data-abierto={stockAbierto ? "" : undefined}>
        <button type="button" aria-expanded={stockAbierto} onClick={abrirStock} className={clases("tocable flex min-h-15 w-full items-center gap-3 px-4 text-left", FOCO)}>
          <span className="flex min-w-0 flex-1 flex-col py-2">
            <span className="text-destacado text-texto">Stock</span>
            <span className="truncate text-secundario text-texto-secundario" data-detalle-stock="">{detalleStock}</span>
          </span>
          {conPresentaciones && activas.length > MAX_STOCK_EN_VISTA ? <IconoChevronDerecha tamano={20} strokeWidth={2.2} className="shrink-0 text-texto-secundario" /> : stockAbierto ? <IconoChevronArriba tamano={20} strokeWidth={2.2} className="shrink-0 text-texto-secundario" /> : <IconoChevronAbajo tamano={20} strokeWidth={2.2} className="shrink-0 text-texto-secundario" />}
        </button>
        {stockAbierto && (
          <ul className="border-t border-linea" data-filas-stock="">
            {conPresentaciones ? (
              activas.map((v) => {
                const nombre = textoCombinacion(producto.opciones, v.valores);
                const eje = producto.opciones.find((o) => esEjeColor(o.nombre));
                const c = eje ? colorPorNombre(v.valores[eje.nombre] ?? "") : null;
                return (
                  <li key={v.id} className="flex min-h-13 items-center gap-2.5 border-t border-linea pr-3 pl-4 first:border-t-0" data-fila-stock={nombre}>
                    {c && <span aria-hidden="true" className="size-3 shrink-0 rounded-full border border-borde-pastilla" style={{ background: c }} />}
                    <span className="min-w-0 flex-1 truncate text-cuerpo font-extrabold">{nombre}</span>
                    <Cantidad redonda valor={variantes.valor(v)} max={2147483647} deshabilitado={sinCatalogo || variantes.guardando || v.stock === null} alCambiar={(n) => variantes.poner(v.id, n)} etiquetaQuitar={`Disminuir stock de ${nombre}`} etiquetaAgregar={`Aumentar stock de ${nombre}`} />
                  </li>
                );
              })
            ) : inventario.base === null || inventario.propuesta === null ? (
              <li className="px-4 py-3 text-secundario text-texto-secundario" data-sin-cantidad="">Sin cantidad guardada: se ve como 0</li>
            ) : (
              <li className="flex min-h-13 items-center gap-2.5 pr-3 pl-4">
                <span className="min-w-0 flex-1 text-cuerpo font-extrabold">En stock</span>
                <Cantidad
                  redonda valor={inventario.propuesta} max={2147483647} deshabilitado={sinCatalogo || inventario.guardando || inventario.incierto}
                  alCambiar={(n) => inventario.cambiar(n - (inventario.propuesta ?? 0))} etiquetaQuitar={`Disminuir stock de ${producto.nombre}`} etiquetaAgregar={`Aumentar stock de ${producto.nombre}`}
                />
              </li>
            )}
          </ul>
        )}
      </section>

      <ListaAgrupada>
        <FilaLista titulo="Historial de ajustes" onClick={(e) => alVerHistorial(e.currentTarget)} />
      </ListaAgrupada>

      {(inventario.error || variantes.error) && <p role="alert" className="rounded-radio-m bg-atencion-suave p-4 text-secundario text-texto">{inventario.error ?? variantes.error}</p>}
      {inventario.incierto && <button type="button" disabled={inventario.guardando} onClick={() => void inventario.revisar()} className="tocable min-h-11 text-secundario font-extrabold text-accion underline">Revisar producto e historial</button>}
      {sinCatalogo && <p className="text-center text-secundario text-texto-secundario" data-sin-permiso="">{porque}</p>}

      {/* En el historial o la lista de espera el pie no se ve, pero sigue ocupando su lugar (el desplazamiento al volver es el mismo). */}
      {(
        <HojaFijoAbajo>
          <div className={internaAbierta ? "invisible" : undefined}>
          <PieFlotante className="pt-2.5" data-pie-vista="">
            {/* Con cambios de stock sin guardar, «Guardar cambios» es el único botón principal a la vista. */}
            {pendiente ? (
              <div className="flex flex-col gap-2">
                <p role="status" className="text-center text-secundario text-texto-secundario">{textoAjuste(conPresentaciones ? null : (inventario.propuesta ?? 0) - (inventario.base ?? 0))}</p>
                <div className="grid grid-cols-2 gap-3">
                  <Boton jerarquia="secundario" tamano="grande" deshabilitado={guardandoStock || inventario.incierto} onClick={() => { inventario.recuperar(); variantes.descartar(); }}>Descartar</Boton>
                  <Boton tamano="grande" cargando={guardandoStock} deshabilitado={inventario.incierto} onClick={guardarStock}>Guardar cambios</Boton>
                </div>
              </div>
            ) : (
              <Boton tamano="grande" anchoCompleto deshabilitado={guardandoStock} onClick={() => navegar(`/pedidos/nuevo?producto=${encodeURIComponent(producto.id)}`)}>Crear pedido</Boton>
            )}
          </PieFlotante>
          </div>
        </HojaFijoAbajo>
      )}
      <ConfirmacionInventario inventario={inventario} />
      <HojaMotivoVariantes
        abierta={motivoVariantes} unidades={variantes.bajan} guardando={variantes.guardando} error={variantes.error} alCerrar={() => setMotivoVariantes(false)}
        alConfirmar={async (motivo, nota) => {
          const bien = await variantes.guardar(motivo, nota);
          if (bien) { setMotivoVariantes(false); toast("Ajuste guardado. No cuenta como venta."); }
        }}
      />
      {enHistoria && tienda && <HojaHistoria producto={producto} promos={promos} tienda={tienda} alCerrar={() => setEnHistoria(false)} />}
    </div>
  );
}

const textoAjuste = (delta: number | null) =>
  delta === null ? "Cambiaste el stock. Guárdalo para que cuente." : `${delta > 0 ? "Añadirás" : "Retirarás"} ${Math.abs(delta)} ${Math.abs(delta) === 1 ? "unidad" : "unidades"}`;

/**
 * La vista previa grande de «Ver producto»: «Compartir» arriba a la derecha (abre «Súbelo a tu estado»), todas las fotos en un carrusel que se desliza, con las barras tipo historia del catálogo
 * arriba (la de la foto que se ve, llena) y, sobre un degradado, el precio (con la promo tachada), «Agotado» y las presentaciones
 * (los colores como puntos, las tallas como pastillas). Sin foto, la inicial como siempre.
 */
function VistaPrevia({ producto, precio, alCompartir }: { producto: Producto; precio: PrecioConPromo; alCompartir?: () => void }) {
  const fotos = producto.medios.length > 0 ? producto.medios.flatMap((m) => (m.tipo === "foto" ? [m.url] : m.portada ? [m.portada] : [])) : producto.fotos;
  const [indice, setIndice] = useState(0);
  const color = producto.opciones.find((o) => esEjeColor(o.nombre));
  const otras = producto.opciones.filter((o) => !esEjeColor(o.nombre));
  const conFoto = fotos.length > 0;
  return (
    <div className="relative h-[300px] w-full shrink-0 overflow-hidden rounded-radio-l bg-superficie-hundida" data-vista-previa-producto="">
      {conFoto ? (
        <div
          className="flex size-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="group" aria-roledescription="carrusel" aria-label={`Fotos de ${producto.nombre}`} data-carrusel-vista=""
          onScroll={(e) => setIndice(Math.round(e.currentTarget.scrollLeft / Math.max(1, e.currentTarget.clientWidth)))}
        >
          {fotos.map((u, i) => (
            <div key={`${u}-${i}`} className="relative size-full shrink-0 snap-center">
              <Foto src={u} alt={`Foto ${i + 1} de ${producto.nombre}`} className="absolute inset-0" sizes="(max-width: 480px) 100vw, 440px" prioridad={i === 0} />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid size-full place-items-center font-display text-titulo-pantalla text-texto-secundario">{producto.nombre[0]}</div>
      )}
      {fotos.length > 1 && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-3 top-2.5 flex gap-1" data-barras-vista="">
          {fotos.map((u, i) => <span key={`${u}-${i}`} className={clases("h-[3px] flex-1 rounded-full", i <= indice ? "bg-papel" : "bg-papel/40")} />)}
        </div>
      )}
      {alCompartir && (
        // «Compartir» (Lewis, 13 oct): la misma píldora de vidrio de la tarjeta del Catálogo, arriba a la derecha bajo las barras.
        <button
          type="button" onClick={alCompartir} aria-label={`Compartir ${producto.nombre} en tu estado`} data-compartir-vista=""
          className={clases("tocable absolute top-4 right-2 z-10 flex min-h-11 items-center text-white", FOCO)}
        >
          <span aria-hidden="true" className="flex h-8 items-center gap-1.5 rounded-full bg-black/45 pr-3 pl-2.5 text-[12px] leading-none font-bold backdrop-blur-sm">
            <IconoHistoria tamano={16} className="shrink-0" />
            Compartir
          </span>
        </button>
      )}
      {conFoto && <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-[45%] bottom-0 bg-linear-to-t from-velo to-transparent" />}
      <div className={clases("pointer-events-none absolute inset-x-4 bottom-3.5 flex flex-col gap-1.5", conFoto ? "text-papel" : "text-texto")}>
        <div className="flex items-end justify-between gap-3">
          <p className="flex flex-wrap items-baseline gap-x-2 font-display text-titulo-hoja tabular-nums" data-precio-vista="">
            <span>{formatearPesos(precio.precio)}</span>
            {precio.precioAntes && <span className="text-secundario font-normal line-through opacity-80">{formatearPesos(precio.precioAntes)}</span>}
          </p>
          {producto.stock === 0 && <Etiqueta tono="fuerte">Agotado</Etiqueta>}
        </div>
        {(color || otras.length > 0) && (
          <div className="flex flex-wrap items-center gap-2" data-presentaciones-vista="">
            {color && (
              <span className="inline-flex items-center gap-1.5">
                {color.valores.slice(0, 6).map((v) => <span key={v} aria-hidden="true" className="size-[18px] rounded-full border-[1.5px] border-white/70" style={{ background: colorPorNombre(v) ?? undefined }} />)}
                <span className="text-secundario font-extrabold">{color.valores.length === 1 ? `1 ${color.nombre.toLocaleLowerCase("es")}` : `${color.valores.length} colores`}</span>
              </span>
            )}
            {otras.flatMap((o) => o.valores.slice(0, 5).map((v) => (
              <span key={`${o.nombre}-${v}`} className={clases("inline-flex h-[22px] items-center rounded-full px-2 text-etiqueta", conFoto ? "bg-white/20" : "bg-superficie")}>{v}</span>
            )))}
          </div>
        )}
      </div>
    </div>
  );
}

const SIN_COLECCION = "\u0000sin-coleccion";

/** Selector de colección: las colecciones como Opción, "Sin colección" y "Agregar colección" (pide el nombre). */
export function HojaColeccion({
  abierta,
  alCerrar,
  colecciones,
  elegida,
  alElegir,
}: {
  abierta: boolean;
  alCerrar: () => void;
  colecciones: string[];
  elegida: string | null;
  /** `esNueva`: el nombre no existía todavía (se crea al guardar el producto). */
  alElegir: (nombre: string | null, esNueva: boolean) => void;
}) {
  const [agregando, setAgregando] = useState(false);
  const [nombre, setNombre] = useState("");
  // La colección nueva que aún no existe en la tienda sigue apareciendo como opción mientras no se guarde.
  const todas = elegida && !colecciones.includes(elegida) ? [...colecciones, elegida] : colecciones;
  const limpio = nombre.trim();
  const agregar = () => {
    if (!limpio) return;
    const existente = colecciones.find((c) => c.localeCompare(limpio, "es", { sensitivity: "accent" }) === 0);
    setAgregando(false);
    setNombre("");
    alElegir(existente ?? limpio, existente === undefined);
  };
  return (
    <Hoja abierta={abierta} alCerrar={alCerrar} titulo="Colección">
      <div className="flex flex-col gap-4">
        <GrupoOpciones
          etiqueta="Colección del producto"
          valor={elegida ?? SIN_COLECCION}
          alCambiar={(id) => alElegir(id === SIN_COLECCION ? null : id, id !== SIN_COLECCION && !colecciones.includes(id))}
          opciones={[{ id: SIN_COLECCION, texto: "Sin colección" }, ...todas.map((c) => ({ id: c, texto: c }))]}
        />
        {agregando ? (
          <div className="flex flex-col gap-3">
            <Campo etiqueta="Nombre de la colección" icono={IconoEtiqueta} autoFocus value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Para él" maxLength={60} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); agregar(); } }} />
            <Boton anchoCompleto deshabilitado={!limpio} onClick={agregar}>Agregar colección</Boton>
          </div>
        ) : (
          <ListaAgrupada>
            <li className="px-4">
              <FilaAgregar texto="Agregar colección" alTocar={() => setAgregando(true)} />
            </li>
          </ListaAgrupada>
        )}
      </div>
    </Hoja>
  );
}

/** Misma Hoja apilada y botones de peligro del panel; el borrador permanece montado. */
export function ConfirmacionEliminarProducto({ producto, abierta, pendiente, alCerrar, alEliminar, alIniciar, alOcultar }: { producto: Producto; abierta: boolean; pendiente: boolean; alCerrar: () => void; alEliminar: () => void; alIniciar: () => void; alOcultar: () => void }) {
  const { tiendaId } = useTiendaActiva();
  const { revisarEliminacionProducto, eliminarProducto, actualizarProducto, refrescar } = useData();
  const revision = useConsulta(`eliminar-producto:${tiendaId}:${producto.id}:${abierta}`, () => abierta ? revisarEliminacionProducto(tiendaId, producto.id) : Promise.resolve(null), true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [incierto, setIncierto] = useState(false);
  const enviando = useRef(false);
  const toast = useToast();
  const completado = useRef(false);
  const vigente = useRef(true);
  useEffect(() => { vigente.current = true; return () => { vigente.current = false; }; }, []);
  const r = revision.data;
  const bloqueado = Boolean(r && (r.pedidosPendientes || r.solicitudesPendientes || r.avisosPendientes));
  const cerrar = () => { if (!enviando.current) alCerrar(); };
  const guardar = async (ocultar: boolean) => {
    if (enviando.current || producto.tiendaId !== tiendaId || (!ocultar && (!r || revision.cargando || revision.error || bloqueado || incierto))) return;
    enviando.current = true; setGuardando(true); setError(null);
    try {
      if (ocultar) {
        await actualizarProducto(tiendaId, producto.id, { activo: false });
        if (!vigente.current) return;
        toast("Oculto del catálogo. Su historial y pendientes se conservan."); alOcultar();
      } else {
        alIniciar();
        await eliminarProducto(tiendaId, producto.id);
        if (!vigente.current) return;
        completado.current = true;
        toast("Producto eliminado. Su historial se conserva."); alCerrar();
      }
    } catch {
      if (!vigente.current) return;
      setError("No confirmamos el cambio. Revisa el estado y los pendientes antes de repetirlo.");
      setIncierto(true);
    } finally { enviando.current = false; if (vigente.current) setGuardando(false); }
  };
  return <Hoja abierta={abierta} alCerrar={cerrar} alSalir={() => { if (completado.current) alEliminar(); }} titulo="¿Eliminar producto?" altura="auto">
    <div className="flex flex-col gap-4">
      <p className="text-destacado break-words">{producto.nombre}</p>
      <p className="text-cuerpo text-texto-secundario">Saldrá del catálogo y de los selectores de nuevos pedidos. Conservamos pedidos, ventas, pagos, comprobantes, ajustes y sus fotos y videos para el historial.</p>
      {pendiente && <p className="text-secundario text-texto-secundario">Si lo eliminas, los cambios de esta ficha sin guardar se descartarán.</p>}
      {revision.error ? <><p role="alert" className="text-cuerpo text-texto-secundario">No pudimos comprobar si se puede eliminar. Esta tienda necesita tener habilitada la eliminación; mientras tanto puedes ocultarlo.</p><Boton jerarquia="secundario" onClick={revision.reintentar}>Reintentar</Boton></> : revision.cargando || !r ? <p role="status">Revisando pendientes…</p> : bloqueado ? <div role="status" className="text-cuerpo text-texto-secundario"><p>Antes de eliminar, resuelve estos pendientes. Puedes ocultarlo y seguir administrándolo.</p><ul className="mt-2 list-disc pl-5">{r.pedidosPendientes > 0 && <li>{r.pedidosPendientes} {r.pedidosPendientes === 1 ? "pedido en curso" : "pedidos en curso"}.</li>}{r.solicitudesPendientes > 0 && <li>{r.solicitudesPendientes} solicitudes por registrar.</li>}{r.avisosPendientes > 0 && <li>{r.avisosPendientes} solicitudes de reposición sin avisar.</li>}</ul></div> : r.conHistorial && <p className="text-secundario text-texto-secundario">Este producto tiene historial. Se conserva completo; no se borra para siempre.</p>}
      {error && <p role="alert" className="text-peligro text-secundario">{error}</p>}
      {incierto && <Boton jerarquia="secundario" deshabilitado={guardando} onClick={() => { refrescar(); revision.reintentar(); setIncierto(false); setError(null); }}>Revisar estado y pendientes</Boton>}
      {bloqueado || revision.error ? <Boton jerarquia="secundario" cargando={guardando} deshabilitado={incierto} onClick={() => void guardar(true)}>Ocultar producto</Boton> : <Boton jerarquia="peligro" cargando={guardando} deshabilitado={!r || revision.cargando || incierto} onClick={() => void guardar(false)}>{r?.conHistorial ? "Eliminar y conservar historial" : "Sí, eliminar producto"}</Boton>}
      <Boton jerarquia="secundario" deshabilitado={guardando} onClick={cerrar}>Cancelar</Boton>
    </div>
  </Hoja>;
}
