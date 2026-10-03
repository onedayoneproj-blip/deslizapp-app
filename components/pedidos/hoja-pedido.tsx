"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useConsulta, useTiendaActiva } from "@/lib/data/consulta";
import { consumirDestelloDePasos } from "@/lib/destello";
import { CURVA, menosMovimiento } from "@/lib/movimiento";
import { mensajeDeError } from "@/lib/data/errores";
import { puedeEditarCodigo } from "@/lib/data/pedidos";
import { buscarCodigoPromo } from "@/lib/promos";
import { useData } from "@/lib/data/provider";
import { enlaceWhatsApp, fechaCorta, formatearPesos } from "@/lib/formato";
import { formatearTelefono } from "@/lib/telefono";
import type { Cliente, PedidoConItems, Producto, Promo } from "@/lib/types";
import { Foto } from "../foto";
import { Hoja } from "../hoja";
import { Alerta, Aviso, Avatar, Boton, Etiqueta, FilaLista, ListaAgrupada, type TonoEtiqueta } from "../ui";
import { CuerpoCargando, CuerpoConError } from "../hoja-estado";
import { IconoCamion, IconoCheck } from "../iconos";
import { AccionesFactura } from "./acciones-factura";
import { useToast } from "../toast";
import { PagoDelPedido } from "../credito/pago-del-pedido";
import { FilaDescuento, SelectorDescuento } from "./selector-descuento";
import { ChipEstado } from "./comunes";

const PASOS = ["Recibido", "Confirmado", "Despachado"];
const PASO_DE = { nuevo: 0, por_despachar: 1, despachado: 2, cancelado: -1 } as const;

/** Detalle de pedido sobre Pedidos. Al cerrar vuelve a /pedidos sin perder la pestaña (la guarda el layout). */
export function HojaPedido({ pedidoId }: { pedidoId: string }) {
  const router = useRouter();
  const { getPedido, getPedidos, getProductos, getClientes, getPromos } = useData();
  const { tiendaId } = useTiendaActiva();
  const cerrar = useCallback(() => router.push("/pedidos", { scroll: false }), [router]);
  // Al eliminar el pedido, la hoja se retira ya (si no, un instante mostraría "Este pedido no vive aquí").
  const [saliendo, setSaliendo] = useState(false);

  const q1 = useConsulta(`pedido:${tiendaId}:${pedidoId}`, () => getPedido(tiendaId, pedidoId));
  const q2 = useConsulta(`productos:${tiendaId}`, () => getProductos(tiendaId));
  const q3 = useConsulta(`clientes:${tiendaId}`, () => getClientes(tiendaId));
  const q4 = useConsulta(`promos:${tiendaId}`, () => getPromos(tiendaId));
  const q5 = useConsulta(`pedidos:${tiendaId}`, () => getPedidos(tiendaId));
  const { data: pedido } = q1;
  const { data: productos } = q2;
  const { data: clientes } = q3;
  const { data: promos } = q4;
  const { data: pedidos } = q5;

  if (saliendo) return null;
  // Nunca en blanco: siempre la misma hoja con su contenido: el esqueleto mientras carga, "Reintentar" si una lectura falla,
  // "no vive aquí" o el detalle (una sola hoja: entra una vez, sin parpadeo)
  let cuerpo: ReactNode;
  if (q1.error || q2.error || q3.error || q4.error || q5.error) {
    cuerpo = (
      <CuerpoConError alCerrar={cerrar} alReintentar={() => [q1, q2, q3, q4, q5].forEach((q) => q.reintentar())} textoVolver="Volver a pedidos" />
    );
  } else if (pedido === undefined || (pedido && (!productos || !clientes || !promos || !pedidos))) {
    cuerpo = <CuerpoCargando titulo="Pedido" />;
  } else if (!pedido) {
    cuerpo = (
      <div className="py-6 text-center">
        <p className="font-display text-titulo-seccion">Este pedido no vive aquí.</p>
        <p className="mt-1 text-texto-secundario">Quizá es de otra tienda. Los pedidos no se mezclan.</p>
        <Boton anchoCompleto className="mt-5" onClick={cerrar}>
          Volver a pedidos
        </Boton>
      </div>
    );
  } else if (productos && clientes && promos && pedidos) {
    cuerpo = (
      <Detalle pedido={pedido} productos={productos} promos={promos} pedidos={pedidos} alSalir={setSaliendo} alEliminado={cerrar} cliente={clientes.find((c) => c.id === pedido.clienteId) ?? null} />
    );
  }

  return (
    <Hoja abierta alCerrar={cerrar} titulo={pedido ? `Pedido #${pedido.numero}` : "Pedido"}>
      {cuerpo}
    </Hoja>
  );
}

function Detalle({
  pedido,
  productos,
  promos,
  pedidos,
  cliente,
  alSalir,
  alEliminado,
}: {
  pedido: PedidoConItems;
  productos: Producto[];
  promos: Promo[];
  pedidos: PedidoConItems[];
  cliente: Cliente | null;
  alSalir: (saliendo: boolean) => void;
  alEliminado: () => void;
}) {
  const { confirmarPedido, cancelarPedido, despacharPedido, volverPedidoARecibido, reabrirPedido, deshacerDespacho, aplicarCodigoPedido, eliminarPedido } = useData();
  const { tiendaId, tienda } = useTiendaActiva();
  const toast = useToast();
  const [ocupado, setOcupado] = useState(false);
  // Paso al que se quiere volver desde Despachado, esperando confirmación (0 = Recibido, 1 = Confirmado).
  const [confirmando, setConfirmando] = useState<0 | 1 | null>(null);
  const [confirmandoEliminar, setConfirmandoEliminar] = useState(false);
  // Viniendo de "Ir a los pasos del pedido" (Editar pedido de un despachado): un destello breve, una sola vez, en el paso
  // anterior de la barra (el que sirve para retroceder): resalte fijo de ~600 ms y, salvo movimiento reducido, un pulso de
  // opacidad. Se hace directo sobre el elemento (sin estado de React).
  const pasoAnterior = useRef<HTMLButtonElement | null>(null);
  const destellar = useRef<boolean | null>(null);
  useEffect(() => {
    destellar.current ??= consumirDestelloDePasos(pedido.id);
    const el = pasoAnterior.current;
    if (!destellar.current || !el) return;
    el.style.backgroundColor = "rgb(245 201 214 / 0.6)";
    if (!menosMovimiento()) el.animate?.([{ opacity: 1 }, { opacity: 0.3, offset: 0.35 }, { opacity: 1 }], { duration: 600, easing: CURVA.salida });
    const t = setTimeout(() => (el.style.backgroundColor = ""), 600);
    return () => {
      clearTimeout(t);
      el.style.backgroundColor = "";
    };
  }, [pedido.id]);
  // El selector de descuento es otra vista DENTRO de esta misma hoja (como los selectores de cliente y de producto).
  const [vista, setVista] = useState<"detalle" | "descuento">("detalle");
  const [cuponAlAbrir, setCuponAlAbrir] = useState<string | null>(null);

  const porId = useMemo(() => new Map(productos.map((p) => [p.id, p])), [productos]);
  const subtotal = pedido.items.reduce((suma, i) => suma + i.precioUnitario * i.cantidad, 0);
  const descuento = Math.max(0, subtotal - pedido.total);
  const paso = PASO_DE[pedido.estado];

  // Productos a los que no les alcanza el stock (solo importa mientras el pedido espera despacho).
  const faltantes = useMemo(() => {
    if (pedido.estado !== "por_despachar") return [];
    const necesarios = new Map<string, number>();
    for (const i of pedido.items) necesarios.set(i.productoId, (necesarios.get(i.productoId) ?? 0) + i.cantidad);
    return [...necesarios]
      .map(([id, n]) => ({ producto: porId.get(id), n }))
      .filter((f): f is { producto: Producto; n: number } => f.producto != null && f.producto.stock !== null && f.producto.stock < f.n)
      .map((f) => f.producto.nombre);
  }, [pedido, porId]);

  const correr = async (accion: () => Promise<void>) => {
    if (ocupado) return;
    setOcupado(true);
    try {
      await accion();
    } catch (error) {
      toast(mensajeDeError(error, "No se pudo. Inténtalo otra vez."));
    } finally {
      setOcupado(false);
    }
  };

  const confirmar = () =>
    correr(async () => {
      await confirmarPedido(tiendaId, pedido.id);
      toast("Confirmado. Pasa a Por despachar.");
    });
  const cancelar = () =>
    correr(async () => {
      await cancelarPedido(tiendaId, pedido.id);
      toast("Pedido cancelado.");
    });
  const despachar = () =>
    correr(async () => {
      const { agotados } = await despacharPedido(tiendaId, pedido.id);
      toast(
        agotados.length === 0
          ? "Despachado. El stock ya se enteró."
          : agotados.length === 1
            ? `Despachado. ${agotados[0]} se agotó y ya sale así en el catálogo.`
            : `Despachado. ${agotados.join(" y ")} se agotaron y ya salen así en el catálogo.`,
      );
    });

  const reabrir = () =>
    correr(async () => {
      await reabrirPedido(tiendaId, pedido.id);
      toast(`Pedido #${pedido.numero} reabierto.`);
    });

  const eliminar = async () => {
    if (ocupado) return;
    setOcupado(true);
    alSalir(true);
    try {
      await eliminarPedido(tiendaId, pedido.id);
      alEliminado();
      toast(`Pedido #${pedido.numero} eliminado.`);
    } catch (error) {
      alSalir(false);
      setOcupado(false);
      setConfirmandoEliminar(false);
      toast(mensajeDeError(error, "No se pudo eliminar. Inténtalo otra vez."));
    }
  };

  /** Vuelve a un paso anterior. Salir de Despachado devuelve el stock (deshacer_despacho); volver a Recibido cambia luego el estado a `nuevo`. */
  const retroceder = (destino: 0 | 1) =>
    correr(async () => {
      try {
        if (paso === 2) await deshacerDespacho(tiendaId, pedido.id);
        if (destino === 0) await volverPedidoARecibido(tiendaId, pedido.id);
        toast(`Pedido #${pedido.numero} volvió a ${PASOS[destino]}.`);
      } finally {
        setConfirmando(null);
      }
    });
  const irAlPaso = (destino: 0 | 1) => (paso === 2 ? setConfirmando(destino) : void retroceder(destino));

  // Descuento (solo mientras el pedido no se despacha ni se cancela). La regla de qué códigos se pueden usar vive en lib/promos.ts.
  const puedeCodigo = puedeEditarCodigo(pedido.estado);
  const contexto = useMemo(() => ({ pedidos, pedido }), [pedidos, pedido]);
  const promoAplicada = pedido.codigoPromo ? buscarCodigoPromo(promos, tiendaId, pedido.codigoPromo, contexto) : null;
  const elegirDescuento = (nuevo: string | null) =>
    correr(async () => {
      await aplicarCodigoPedido(tiendaId, pedido.id, nuevo);
      setVista("detalle");
      toast(nuevo ? `Descuento ${nuevo} aplicado. El total ya cambió.` : "Descuento quitado. El total ya cambió.");
    });

  // "Editar pedido": el mismo formulario de "+ Pedido", ya lleno (no aplica a un cancelado: se reabre o se elimina).
  const botonEditar = (
    <Boton jerarquia="secundario" anchoCompleto href={`/pedidos/${pedido.id}/editar`} scroll={false} deshabilitado={ocupado}>
      Editar pedido
    </Boton>
  );

  if (vista === "descuento") {
    return (
      <SelectorDescuento
        promos={promos}
        tiendaId={tiendaId}
        contexto={contexto}
        elegido={pedido.codigoPromo ?? ""}
        alElegir={(c) => void elegirDescuento(c)}
        alVolver={() => setVista("detalle")}
      />
    );
  }

  const primerNombre = cliente?.nombre.split(" ")[0] ?? "";
  const mensaje = `Hola ${primerNombre}, te escribo de ${tienda?.nombre ?? "la tienda"} por tu pedido #${pedido.numero}.`;

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-secundario font-bold text-texto-secundario">
          {fechaCorta(pedido.creadoEn)} · {pedido.origen === "catalogo" ? "desde el catálogo" : "manual"}
        </p>
        {pedido.estado !== "despachado" && <ChipEstado estado={pedido.estado} />}
      </div>

      {/* Línea de avance: los pasos ANTERIORES al actual se tocan para volver a ellos (área de 44 px, barra delgada). */}
      <div className="flex items-center gap-2.5" role="group" aria-label={paso >= 0 ? `Va en: ${PASOS[paso]}` : "Pedido cancelado"}>
        {PASOS.map((nombre, i) => {
          const barra = (
            <>
              <span className={`block h-1.5 rounded-full ${i <= paso ? "bg-accion" : "bg-borde-pastilla"}`} />
              <span className={`mt-[5px] block text-etiqueta ${i <= paso ? "text-texto" : "text-texto-secundario"} `}>
                {nombre}
              </span>
            </>
          );
          const caja = "flex min-h-11 min-w-0 flex-1 flex-col justify-center text-left";
          return i < paso ? (
            <button
              key={nombre}
              type="button"
              ref={i === paso - 1 ? pasoAnterior : undefined}
              onClick={() => irAlPaso(i as 0 | 1)}
              disabled={ocupado}
              aria-label={`Volver a ${nombre}`}
              className={`tocable ${caja} rounded-radio-s outline-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco disabled:opacity-40`}
            >
              {barra}
            </button>
          ) : (
            <div key={nombre} className={caja}>
              {barra}
            </div>
          );
        })}
      </div>

      {pedido.estado === "despachado" && (
        <>
          <p role="status" className="flex items-center gap-2 text-secundario font-bold text-texto">
            <IconoCheck tamano={18} strokeWidth={2.6} />
            Despachado. Final feliz.
          </p>
          {tienda && <AccionesFactura key={pedido.id} pedido={pedido} cliente={cliente} tienda={tienda} productos={productos} />}
        </>
      )}

      {/* Cliente */}
      <div className="flex items-center gap-3 rounded-radio-l border border-linea bg-superficie p-3">
        {cliente ? <Avatar nombre={cliente.nombre} /> : <span aria-hidden="true" className="grid size-(--alto-avatar) shrink-0 place-items-center rounded-full bg-marca-rosa font-display text-cuerpo text-texto">?</span>}
        <div className="min-w-0 flex-1">
          <p className="truncate text-destacado">{cliente?.nombre ?? "Cliente sin nombre"}</p>
          <p className="truncate text-secundario text-texto-secundario">{cliente?.telefono ? formatearTelefono(cliente.telefono) : "Sin teléfono"}</p>
        </div>
        {cliente?.telefono ? (
          <Boton
            whatsapp
            href={enlaceWhatsApp(cliente.telefono, mensaje)}
            target="_blank"
            rel="noreferrer"
            aria-label={`Escribir a ${cliente.nombre} por WhatsApp`}
          >
            Escribir
          </Boton>
        ) : null}
      </div>

      {/* Productos y totales: lista agrupada (filas sencillas del mismo tipo en una tarjeta) */}
      <ListaAgrupada etiqueta="Productos del pedido">
        {pedido.items.map((i) => {
          const producto = porId.get(i.productoId);
          const foto = producto?.fotos[0];
          return (
            <FilaLista
              key={i.id}
              inicio={<span className="block size-11 overflow-hidden rounded-radio-s bg-superficie-hundida">{foto ? <Foto src={foto} alt="" className="h-full w-full" sizes="44px" /> : null}</span>}
              titulo={i.nombreProducto}
              detalle={`${i.cantidad} × ${formatearPesos(i.precioUnitario)}`}
              fin={
                <span className="flex flex-col items-end gap-1">
                  <EtiquetasStock estado={pedido.estado} producto={producto} cantidad={i.cantidad} />
                </span>
              }
            />
          );
        })}
        {puedeCodigo && (
          <li className="border-t border-linea px-4">
            <FilaDescuento
              codigo={pedido.codigoPromo ?? ""}
              promo={promoAplicada}
              pedidos={pedidos}
              desde={cuponAlAbrir}
              alAbrir={() => {
                setCuponAlAbrir(pedido.codigoPromo ?? "");
                setVista("descuento");
              }}
              alQuitar={() => void elegirDescuento(null)}
              deshabilitado={ocupado}
            />
          </li>
        )}
        <li className="border-t border-linea px-4 pt-2.5 pb-3">
          <div className="flex justify-between text-secundario font-bold text-texto-secundario">
            <span>Subtotal</span>
            <span>{formatearPesos(subtotal)}</span>
          </div>
          {descuento > 0 && (
            <div className="flex justify-between py-1 text-secundario font-bold">
              <span>Descuento{pedido.codigoPromo ? ` · ${pedido.codigoPromo}` : ""}</span>
              <span>−{formatearPesos(descuento)}</span>
            </div>
          )}
          <div className="flex justify-between pt-1.5 font-display text-titulo-seccion">
            <span>Total</span>
            <span>{formatearPesos(pedido.total)}</span>
          </div>
        </li>
      </ListaAgrupada>

      {/* Pago: de contado ("Pagado") o a crédito (lo que debe, abonos y recordatorio) */}
      <PagoDelPedido pedido={pedido} cliente={cliente} />

      {/* Acciones: una sola principal por vista; lo irreversible pide confirmación con Alerta */}
      {pedido.estado === "nuevo" && (
        <div className="flex flex-col gap-2">
          <Boton tamano="grande" anchoCompleto onClick={confirmar} deshabilitado={ocupado}>
            Confirmar pedido
          </Boton>
          {botonEditar}
          <Boton jerarquia="terciario" tono="peligro" anchoCompleto onClick={cancelar} deshabilitado={ocupado}>
            Cancelar pedido
          </Boton>
        </div>
      )}
      {pedido.estado === "por_despachar" && (
        <div className="flex flex-col gap-2">
          {faltantes.length > 0 && (
            <div role="alert">
              <Aviso tono="atencion">
                <b>No alcanza el stock de {faltantes.join(" ni de ")}.</b> Sube el stock desde el Catálogo o cancela el pedido: no dejamos el stock en negativo.
              </Aviso>
            </div>
          )}
          <Boton jerarquia="resalte" tamano="grande" anchoCompleto icono={<IconoCamion tamano={24} />} onClick={despachar} deshabilitado={ocupado || faltantes.length > 0}>
            Despachar pedido
          </Boton>
          <p className="text-center font-mano text-mano text-atencion-texto">al despachar, el stock se actualiza solito</p>
          {botonEditar}
          <Boton jerarquia="terciario" tono="peligro" anchoCompleto onClick={cancelar} deshabilitado={ocupado}>
            Cancelar pedido
          </Boton>
        </div>
      )}
      {pedido.estado === "despachado" && <div className="flex flex-col gap-2">{botonEditar}</div>}
      {pedido.estado === "cancelado" && (
        <div className="flex flex-col gap-2">
          <Aviso tono="neutro" className="justify-center text-center font-bold text-texto-secundario">
            Pedido cancelado. Pasa hasta en las mejores tiendas.
          </Aviso>
          <Boton tamano="grande" anchoCompleto onClick={reabrir} deshabilitado={ocupado}>
            Reabrir pedido
          </Boton>
          <Boton jerarquia="terciario" tono="peligro" anchoCompleto onClick={() => setConfirmandoEliminar(true)} deshabilitado={ocupado}>
            Eliminar pedido
          </Boton>
        </div>
      )}

      <Alerta
        abierta={confirmando !== null}
        titulo={`¿Volver a ${confirmando !== null ? PASOS[confirmando] : ""}?`}
        descripcion="Se devolverá el stock de los productos."
        accion={{ texto: "Sí, volver", tono: "accion", alConfirmar: () => (confirmando !== null ? retroceder(confirmando) : undefined) }}
        alCancelar={() => setConfirmando(null)}
      />
      <Alerta
        abierta={confirmandoEliminar}
        titulo={`¿Eliminar el pedido #${pedido.numero}?`}
        descripcion="Se borrará para siempre y no se puede recuperar."
        accion={{ texto: "Sí, eliminar", tono: "peligro", alConfirmar: eliminar }}
        alCancelar={() => setConfirmandoEliminar(false)}
      />
    </div>
  );
}

/** Estado del stock de un producto del pedido. Ya despachado: "Entregado" y, si se acabó, "Agotado". */
function EtiquetasStock({ estado, producto, cantidad }: { estado: PedidoConItems["estado"]; producto: Producto | undefined; cantidad: number }) {
  if (estado === "cancelado") return null;
  const stock = producto?.stock;
  if (estado === "despachado") {
    return (
      <>
        <Etiqueta tono="exito">Entregado</Etiqueta>
        {stock === 0 && <Etiqueta tono="fuerte">Agotado</Etiqueta>}
      </>
    );
  }
  if (stock === undefined || stock === null) return <Etiqueta>Sin control</Etiqueta>;
  if (stock === 0) return <Etiqueta tono="fuerte">Sin stock</Etiqueta>;
  const texto = stock === 1 ? "Queda 1" : `Quedan ${stock}`;
  const tono: TonoEtiqueta = stock < cantidad ? "fuerte" : "atencion";
  return <Etiqueta tono={tono}>{texto}</Etiqueta>;
}
