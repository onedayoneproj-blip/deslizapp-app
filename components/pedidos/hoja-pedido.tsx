"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useConsulta, useTiendaActiva } from "@/lib/data/consulta";
import { mensajeDeError } from "@/lib/data/errores";
import { buscarCodigoPromo } from "@/lib/data/pedidos";
import { puedeEditarCodigo } from "@/lib/data/pedidos";
import { useData } from "@/lib/data/provider";
import { enlaceWhatsApp, fechaCorta, formatearPesos, iniciales } from "@/lib/formato";
import { formatearTelefono } from "@/lib/telefono";
import type { Cliente, PedidoConItems, Producto, Promo } from "@/lib/types";
import { Foto } from "../foto";
import { Hoja } from "../hoja";
import { IconoCamion, IconoCheck, IconoMas, IconoWhatsApp } from "../iconos";
import { useToast } from "../toast";
import { CampoCodigo } from "./campo-codigo";
import { ChipEstado } from "./comunes";

const PASOS = ["Recibido", "Confirmado", "Despachado"];
/** "Editar pedido": botón secundario de contorno (píldora, borde fino, sin relleno), de la altura táctil de la app. */
const ACCION_EDITAR = "tocable flex h-11 items-center justify-center rounded-full border-[1.5px] border-borde text-[14.5px] font-semibold text-bosque disabled:opacity-60";
const PASO_DE = { nuevo: 0, por_despachar: 1, despachado: 2, cancelado: -1 } as const;

/** Detalle de pedido sobre Pedidos. Al cerrar vuelve a /pedidos sin perder la pestaña (la guarda el layout). */
export function HojaPedido({ pedidoId }: { pedidoId: string }) {
  const router = useRouter();
  const { getPedido, getProductos, getClientes, getPromos } = useData();
  const { tiendaId } = useTiendaActiva();
  const cerrar = useCallback(() => router.push("/pedidos", { scroll: false }), [router]);
  // Al eliminar el pedido, la hoja se retira ya (si no, un instante mostraría "Este pedido no vive aquí").
  const [saliendo, setSaliendo] = useState(false);

  const { data: pedido, cargando } = useConsulta(`pedido:${tiendaId}:${pedidoId}`, () => getPedido(tiendaId, pedidoId));
  const { data: productos } = useConsulta(`productos:${tiendaId}`, () => getProductos(tiendaId));
  const { data: clientes } = useConsulta(`clientes:${tiendaId}`, () => getClientes(tiendaId));
  const { data: promos } = useConsulta(`promos:${tiendaId}`, () => getPromos(tiendaId));

  if (saliendo || (pedido === undefined && cargando)) return null;
  if (!pedido) {
    return (
      <Hoja abierta alCerrar={cerrar} titulo="Pedido">
        <div className="py-6 text-center">
          <p className="font-display text-xl">Este pedido no vive aquí.</p>
          <p className="mt-1 text-suave">Quizá es de otra tienda. Los pedidos no se mezclan.</p>
          <button type="button" onClick={cerrar} className="mt-5 h-12 w-full rounded-full bg-bosque font-extrabold text-papel">
            Volver a pedidos
          </button>
        </div>
      </Hoja>
    );
  }
  if (!productos || !clientes || !promos) return null;

  return (
    <Hoja abierta alCerrar={cerrar} titulo={`Pedido #${pedido.numero}`}>
      <Detalle pedido={pedido} productos={productos} promos={promos} alSalir={setSaliendo} alEliminado={cerrar} cliente={clientes.find((c) => c.id === pedido.clienteId) ?? null} />
    </Hoja>
  );
}

function Detalle({
  pedido,
  productos,
  promos,
  cliente,
  alSalir,
  alEliminado,
}: {
  pedido: PedidoConItems;
  productos: Producto[];
  promos: Promo[];
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
  const [editandoCodigo, setEditandoCodigo] = useState(false);
  const [codigo, setCodigo] = useState("");
  const campoCodigo = useRef<HTMLInputElement>(null);

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

  // Código de descuento (solo mientras el pedido no se despacha ni se cancela)
  const puedeCodigo = puedeEditarCodigo(pedido.estado);
  const promoEscrita = buscarCodigoPromo(promos, tiendaId, codigo);
  // El foco va al campo en el MISMO toque que lo abre (flushSync): así el teclado del iPhone abre bien (HANDOFF.md).
  const abrirCodigo = (inicial: string) => {
    setCodigo(inicial);
    flushSync(() => setEditandoCodigo(true));
    campoCodigo.current?.focus({ preventScroll: true });
  };
  const aplicarCodigo = () =>
    correr(async () => {
      if (!promoEscrita) return;
      await aplicarCodigoPedido(tiendaId, pedido.id, codigo);
      setEditandoCodigo(false);
      toast(`Código ${promoEscrita.codigo} aplicado. El total ya cambió.`);
    });
  const quitarCodigo = () =>
    correr(async () => {
      await aplicarCodigoPedido(tiendaId, pedido.id, null);
      toast("Código quitado. El total ya cambió.");
    });

  // "Editar pedido": el mismo formulario de "+ Pedido", ya lleno (no aplica a un cancelado: se reabre o se elimina).
  const botonEditar = (
    <Link href={`/pedidos/${pedido.id}/editar`} scroll={false} className={ACCION_EDITAR}>
      Editar pedido
    </Link>
  );

  const primerNombre = cliente?.nombre.split(" ")[0] ?? "";
  const mensaje = `Hola ${primerNombre}, te escribo de ${tienda?.nombre ?? "la tienda"} por tu pedido #${pedido.numero}.`;

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-bold text-suave">
          {fechaCorta(pedido.creadoEn)} · {pedido.origen === "catalogo" ? "desde el catálogo" : "manual"}
        </p>
        <ChipEstado estado={pedido.estado} />
      </div>

      {/* Línea de avance: los pasos ANTERIORES al actual se tocan para volver a ellos (área de 44 px, barra delgada). */}
      <div className="flex items-center gap-2.5" role="group" aria-label={paso >= 0 ? `Va en: ${PASOS[paso]}` : "Pedido cancelado"}>
        {PASOS.map((nombre, i) => {
          const barra = (
            <>
              <span className={`block h-1.5 rounded-[3px] ${i <= paso ? (i === 2 ? "bg-mandarina" : "bg-bosque") : "bg-borde"}`} />
              <span className={`mt-[5px] block text-xs font-extrabold ${i <= paso ? "text-bosque" : "text-tenue"} `}>
                {nombre}
              </span>
            </>
          );
          const caja = "flex min-h-11 min-w-0 flex-1 flex-col justify-center text-left";
          return i < paso ? (
            <button
              key={nombre}
              type="button"
              onClick={() => irAlPaso(i as 0 | 1)}
              disabled={ocupado}
              aria-label={`Volver a ${nombre}`}
              className={`tocable ${caja} disabled:opacity-60`}
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

      {/* Cliente */}
      <div className="flex items-center gap-3 rounded-[20px] border border-linea bg-white p-3">
        <span className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-full bg-rosa font-display text-[17px]">
          {cliente ? iniciales(cliente.nombre) : "?"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-extrabold">{cliente?.nombre ?? "Cliente sin nombre"}</p>
          <p className="truncate text-[13px] text-suave">{cliente?.telefono ? formatearTelefono(cliente.telefono) : "Sin teléfono"}</p>
        </div>
        {cliente?.telefono ? (
          <a
            href={enlaceWhatsApp(cliente.telefono, mensaje)}
            target="_blank"
            rel="noreferrer"
            aria-label={`Escribir a ${cliente.nombre} por WhatsApp`}
            className="tocable flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-bosque px-3.5 text-sm font-extrabold text-papel"
          >
            <IconoWhatsApp tamano={18} />
            Escribir
          </a>
        ) : null}
      </div>

      {/* Productos y totales */}
      <div className="rounded-[20px] border border-linea bg-white px-3.5 pt-1.5">
        {pedido.items.map((i) => {
          const producto = porId.get(i.productoId);
          const foto = producto?.fotos[0];
          return (
            <div key={i.id} className="flex items-center gap-3 border-b border-arena py-2.5">
              <span className="h-[52px] w-[52px] shrink-0 overflow-hidden rounded-[14px] bg-arena">
                {foto ? <Foto src={foto} alt="" className="h-full w-full" sizes="52px" /> : null}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-extrabold">{i.nombreProducto}</p>
                <p className="text-[13px] text-suave">
                  {i.cantidad} × {formatearPesos(i.precioUnitario)}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <EtiquetasStock estado={pedido.estado} producto={producto} cantidad={i.cantidad} />
              </div>
            </div>
          );
        })}
        {puedeCodigo && !editandoCodigo && !pedido.codigoPromo && (
          <button
            type="button"
            onClick={() => abrirCodigo("")}
            disabled={ocupado}
            className="tocable flex min-h-11 w-full items-center justify-between gap-3 border-b border-arena text-left text-[14.5px] font-extrabold"
          >
            Agregar código de descuento
            <IconoMas tamano={18} />
          </button>
        )}
        {puedeCodigo && !editandoCodigo && pedido.codigoPromo && (
          <div className="flex min-h-11 items-center justify-between gap-3 border-b border-arena">
            <span className="min-w-0 truncate rounded-full bg-rosa px-3 py-1 text-[13px] font-extrabold">Código {pedido.codigoPromo}</span>
            <span className="flex shrink-0 items-center">
              <button type="button" onClick={() => abrirCodigo(pedido.codigoPromo ?? "")} disabled={ocupado} className="tocable h-11 px-2.5 text-[14px] font-extrabold text-bosque">
                Cambiar
              </button>
              <button type="button" onClick={quitarCodigo} disabled={ocupado} className="tocable h-11 pl-2.5 text-[14px] font-extrabold text-[#b4432a]">
                Quitar
              </button>
            </span>
          </div>
        )}
        {puedeCodigo && editandoCodigo && (
          <div className="border-b border-arena pb-3">
            <CampoCodigo valor={codigo} alCambiar={setCodigo} promo={promoEscrita} opcional={false} entrada={campoCodigo} />
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={aplicarCodigo}
                disabled={ocupado || !promoEscrita}
                className="tocable h-11 flex-1 rounded-full bg-bosque text-sm font-extrabold text-papel disabled:opacity-50"
              >
                Aplicar código
              </button>
              <button
                type="button"
                onClick={() => setEditandoCodigo(false)}
                disabled={ocupado}
                className="tocable h-11 flex-1 rounded-full border-[1.5px] border-bosque text-sm font-extrabold text-bosque"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
        <div className="flex justify-between pt-2.5 pb-0.5 text-sm font-semibold text-suave">
          <span>Subtotal</span>
          <span>{formatearPesos(subtotal)}</span>
        </div>
        {descuento > 0 && (
          <div className="flex justify-between py-1 text-sm font-bold">
            <span>Descuento{pedido.codigoPromo ? ` · ${pedido.codigoPromo}` : ""}</span>
            <span>−{formatearPesos(descuento)}</span>
          </div>
        )}
        <div className="flex justify-between pt-1.5 pb-2.5 font-display text-[22px]">
          <span>Total</span>
          <span>{formatearPesos(pedido.total)}</span>
        </div>
      </div>

      {/* Acciones */}
      {pedido.estado === "nuevo" && (
        <div className="flex flex-col gap-2">
          <button type="button" onClick={confirmar} disabled={ocupado} className="tocable h-14 rounded-full bg-bosque text-[16.5px] font-extrabold text-papel disabled:opacity-60">
            Confirmar pedido
          </button>
          {botonEditar}
          <button type="button" onClick={cancelar} disabled={ocupado} className="h-11 text-[14.5px] font-extrabold text-[#b4432a]">
            Cancelar pedido
          </button>
        </div>
      )}
      {pedido.estado === "por_despachar" && (
        <div className="flex flex-col gap-2">
          {faltantes.length > 0 && (
            <div role="alert" className="rounded-[18px] bg-mandarina/20 px-4 py-3 text-sm">
              <b>No alcanza el stock de {faltantes.join(" ni de ")}.</b> Sube el stock desde el Catálogo o cancela el pedido: no
              dejamos el stock en negativo.
            </div>
          )}
          <button
            type="button"
            onClick={despachar}
            aria-disabled={faltantes.length > 0 || undefined}
            disabled={ocupado}
            className={`tocable flex h-[58px] items-center justify-center gap-2.5 rounded-full bg-mandarina text-[17px] font-extrabold text-bosque-oscuro disabled:opacity-60 ${faltantes.length > 0 ? "opacity-60" : ""}`}
          >
            <IconoCamion tamano={24} />
            Despachar pedido
          </button>
          <p className="text-center font-mano text-xl text-suave">al despachar, el stock se actualiza solito</p>
          {botonEditar}
          <button type="button" onClick={cancelar} disabled={ocupado} className="h-11 text-[14.5px] font-extrabold text-[#b4432a]">
            Cancelar pedido
          </button>
        </div>
      )}
      {pedido.estado === "despachado" && (
        <div className="flex flex-col gap-2">
          <div className="flex h-[54px] items-center justify-center gap-2 rounded-full bg-rosa font-extrabold">
            <IconoCheck tamano={20} strokeWidth={2.6} />
            Despachado. Final feliz.
          </div>
          {confirmando !== null ? (
            <div role="alertdialog" aria-label="Volver al paso anterior" className="rounded-[18px] bg-arena px-4 py-3">
              <p className="text-sm font-bold">Se devolverá el stock de los productos. ¿Volver a {PASOS[confirmando]}?</p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => retroceder(confirmando)}
                  disabled={ocupado}
                  className="tocable h-11 flex-1 rounded-full bg-bosque text-sm font-extrabold text-papel disabled:opacity-60"
                >
                  Sí, volver
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmando(null)}
                  disabled={ocupado}
                  className="tocable h-11 flex-1 rounded-full border-[1.5px] border-bosque text-sm font-extrabold text-bosque"
                >
                  Mejor no
                </button>
              </div>
            </div>
          ) : (
            botonEditar
          )}
        </div>
      )}
      {pedido.estado === "cancelado" && (
        <div className="flex flex-col gap-2">
          <p className="rounded-[18px] bg-arena p-3 text-center font-bold text-suave">Pedido cancelado. Pasa hasta en las mejores tiendas.</p>
          <button type="button" onClick={reabrir} disabled={ocupado} className="tocable h-14 rounded-full bg-bosque text-[16.5px] font-extrabold text-papel disabled:opacity-60">
            Reabrir pedido
          </button>
          {confirmandoEliminar ? (
            <div role="alertdialog" aria-label="Eliminar pedido" className="rounded-[18px] bg-arena px-4 py-3">
              <p className="text-sm font-bold">Se borrará para siempre y no se puede recuperar. ¿Eliminar el pedido #{pedido.numero}?</p>
              <div className="mt-2 flex gap-2">
                <button type="button" onClick={eliminar} disabled={ocupado} className="tocable h-11 flex-1 rounded-full bg-[#b4432a] text-sm font-extrabold text-white disabled:opacity-60">
                  Sí, eliminar
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmandoEliminar(false)}
                  disabled={ocupado}
                  className="tocable h-11 flex-1 rounded-full border-[1.5px] border-bosque text-sm font-extrabold text-bosque"
                >
                  Mejor no
                </button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmandoEliminar(true)} disabled={ocupado} className="h-11 text-[14.5px] font-extrabold text-[#b4432a]">
              Eliminar pedido
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Estado del stock de un producto del pedido. Ya despachado: "Entregado" y, si se acabó, "Agotado". */
function EtiquetasStock({ estado, producto, cantidad }: { estado: PedidoConItems["estado"]; producto: Producto | undefined; cantidad: number }) {
  const chip = "rounded-full px-[9px] py-[3px] text-xs font-extrabold whitespace-nowrap";
  if (estado === "cancelado") return null;
  const stock = producto?.stock;
  if (estado === "despachado") {
    return (
      <>
        <span className={`${chip} bg-arena text-bosque`}>Entregado</span>
        {stock === 0 && <span className={`${chip} bg-bosque text-papel`}>Agotado</span>}
      </>
    );
  }
  if (stock === undefined || stock === null) return <span className={`${chip} bg-arena text-suave`}>Sin control</span>;
  if (stock === 0) return <span className={`${chip} bg-bosque text-papel`}>Sin stock</span>;
  const texto = stock === 1 ? "Queda 1" : `Quedan ${stock}`;
  if (stock < cantidad) return <span className={`${chip} bg-bosque text-papel`}>{texto}</span>;
  return <span className={`${chip} ${stock - cantidad === 0 ? "bg-mandarina text-bosque-oscuro" : "bg-rosa text-bosque"}`}>{texto}</span>;
}
