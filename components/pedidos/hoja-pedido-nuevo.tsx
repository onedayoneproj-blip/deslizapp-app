"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { useCallback, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useConsulta, useTiendaActiva } from "@/lib/data/consulta";
import { buscarCodigoPromo, descuentoDeCodigo } from "@/lib/data/pedidos";
import { mensajeDeError } from "@/lib/data/errores";
import { useData } from "@/lib/data/provider";
import { formatearPesos } from "@/lib/formato";
import { diaEnPalabras, diaLocal, fechaDeVenta } from "@/lib/venta-pasada";
import { cantidadMaxima, unidadesVendidas } from "@/lib/buscar-productos";
import { formatearTelefono } from "@/lib/telefono";
import { precioConPromo } from "@/lib/promos";
import type { ClienteConResumen, PedidoConItems, Producto, Promo } from "@/lib/types";
import { Avatar } from "../clientes/comunes";
import { Foto } from "../foto";
import { Hoja } from "../hoja";
import { Interruptor } from "../controles";
import { IconoMas, IconoMenos } from "../iconos";
import { useToast } from "../toast";
import { CampoCodigo, CLASE_CAMPO } from "./campo-codigo";
import { SelectorCliente, type ClienteElegido } from "./selector-cliente";
import { SelectorProducto } from "./selector-producto";
import { useElegirPestanaPedidos } from "./vista-pedidos";

const campo = CLASE_CAMPO;

/**
 * Pedido manual ("+ Pedido"): una venta que no llegó por el catálogo. Entra directo en Por despachar.
 * Con `pedidoId` es el MISMO formulario en modo edición ("Editar pedido #N"): ya lleno y guarda sobre el mismo pedido.
 */
export function HojaPedidoNuevo({ pedidoId }: { pedidoId?: string }) {
  const router = useRouter();
  const { getProductos, getClientes, getPromos, getPedidos } = useData();
  const { tiendaId } = useTiendaActiva();
  // Al cerrar una edición se vuelve al detalle de ese pedido.
  const cerrar = useCallback(() => router.push(pedidoId ? `/pedidos/${pedidoId}` : "/pedidos", { scroll: false }), [router, pedidoId]);

  const { data: productos } = useConsulta(`productos:${tiendaId}`, () => getProductos(tiendaId));
  const { data: clientes } = useConsulta(`clientes:${tiendaId}`, () => getClientes(tiendaId));
  const { data: promos } = useConsulta(`promos:${tiendaId}`, () => getPromos(tiendaId));
  const { data: pedidos } = useConsulta(`pedidos:${tiendaId}`, () => getPedidos(tiendaId));
  if (!productos || !clientes || !promos || !pedidos) return null;

  const pedido = pedidoId ? pedidos.find((p) => p.id === pedidoId) : undefined;
  if (pedidoId && (!pedido || pedido.estado === "cancelado")) {
    return (
      <Hoja abierta alCerrar={cerrar} titulo="Editar pedido">
        <div className="py-6 text-center">
          <p className="font-display text-xl">{pedido ? "Este pedido está cancelado." : "Este pedido no vive aquí."}</p>
          <p className="mt-1 text-suave">
            {pedido ? "Reábrelo primero para poder editarlo." : "Quizá es de otra tienda. Los pedidos no se mezclan."}
          </p>
          <button
            type="button"
            onClick={() => router.push("/pedidos", { scroll: false })}
            className="mt-5 h-12 w-full rounded-full bg-bosque font-extrabold text-papel"
          >
            Volver a pedidos
          </button>
        </div>
      </Hoja>
    );
  }

  return (
    <Hoja abierta alCerrar={cerrar} titulo={pedido ? `Editar pedido #${pedido.numero}` : "Nuevo pedido"} altura="grande">
      <Formulario
        key={pedido?.id ?? "nuevo"}
        productos={productos}
        clientes={clientes}
        promos={promos}
        pedidos={pedidos}
        pedido={pedido}
        alTerminar={cerrar}
      />
    </Hoja>
  );
}

function Formulario({
  productos,
  clientes,
  promos,
  pedidos,
  pedido,
  alTerminar,
}: {
  productos: Producto[];
  clientes: ClienteConResumen[];
  promos: Promo[];
  pedidos: PedidoConItems[];
  /** Si viene, es una edición de ese pedido (nunca cancelado). */
  pedido?: PedidoConItems;
  alTerminar: () => void;
}) {
  const { crearPedidoManual, editarPedido } = useData();
  const { tiendaId } = useTiendaActiva();
  const elegirPestana = useElegirPestanaPedidos();
  const toast = useToast();

  // Los selectores (cliente, productos) son otra vista DENTRO de esta misma hoja (no una segunda hoja).
  const [vista, setVista] = useState<"pedido" | "cliente" | "productos">("pedido");
  const [cliente, setCliente] = useState<ClienteElegido | null>(() => {
    const c = pedido?.clienteId ? clientes.find((x) => x.id === pedido.clienteId) : undefined;
    return c ? { id: c.id, nombre: c.nombre, telefono: c.telefono } : null;
  });
  // Despachado: solo cliente y fecha. Los productos y el código se ven atenuados y no se tocan.
  const bloqueado = pedido?.estado === "despachado";
  const buscador = useRef<HTMLInputElement>(null);
  const [cantidades, setCantidades] = useState<Record<string, number>>(() => {
    const c: Record<string, number> = {};
    for (const i of pedido?.items ?? []) c[i.productoId] = (c[i.productoId] ?? 0) + i.cantidad;
    return c;
  });
  const [codigo, setCodigo] = useState(pedido?.codigoPromo ?? "");
  const [guardando, setGuardando] = useState(false);
  // "Es una venta que ya hice": entra despachada con la fecha elegida.
  const [ventaPasada, setVentaPasada] = useState(false);
  const diaOriginal = pedido ? diaLocal(new Date(pedido.creadoEn)) : null;
  const [dia, setDia] = useState(() => diaOriginal ?? diaLocal());
  const [descontarStock, setDescontarStock] = useState(false);

  const vendidas = useMemo(() => unidadesVendidas(pedidos), [pedidos]);
  // Despachado: se muestra lo que se vendió (precios de ese momento). Si no, la cuenta de hoy, igual que al crear.
  const lineas = bloqueado
    ? (pedido?.items ?? []).flatMap((i) => {
        const p = productos.find((x) => x.id === i.productoId);
        return p ? [{ producto: p, cantidad: i.cantidad, precio: i.precioUnitario }] : [];
      })
    : productos
        .map((p) => ({ producto: p, cantidad: cantidades[p.id] ?? 0, precio: precioConPromo(p, promos).precio }))
        .filter((l) => l.cantidad > 0);
  const subtotal = lineas.reduce((suma, l) => suma + l.precio * l.cantidad, 0);
  const promo = buscarCodigoPromo(promos, tiendaId, codigo);
  const descuento = bloqueado ? Math.max(0, subtotal - (pedido?.total ?? 0)) : descuentoDeCodigo(promo, subtotal);
  const totalFinal = bloqueado ? (pedido?.total ?? 0) : subtotal - descuento;
  const codigoMalo = !bloqueado && codigo.trim() !== "" && !promo;

  const pideFecha = bloqueado || ventaPasada;
  const fechaVenta = pideFecha ? fechaDeVenta(dia) : null;
  const puedeGuardar = cliente !== null && lineas.length > 0 && !codigoMalo && !guardando && (!pideFecha || fechaVenta !== null);

  // El foco va al buscador en el MISMO toque que abre el selector (flushSync pinta la vista ya):
  // así el teclado del iPhone abre bien. Regla del teclado en HANDOFF.md.
  const abrir = (destino: "cliente" | "productos") => {
    flushSync(() => setVista(destino));
    buscador.current?.focus({ preventScroll: true });
  };
  const abrirSelector = () => abrir("cliente");
  const elegir = (c: ClienteElegido) => {
    setCliente(c);
    setVista("pedido");
  };

  // La cantidad nunca supera el stock (99 si no se lleva la cuenta).
  const cambiar = (p: Producto, delta: number) =>
    setCantidades((c) => ({ ...c, [p.id]: Math.min(cantidadMaxima(p), Math.max(0, (c[p.id] ?? 0) + delta)) }));

  const guardar = async () => {
    if (!puedeGuardar || !cliente) return;
    setGuardando(true);
    try {
      const conVenta = ventaPasada && fechaVenta ? { fecha: fechaVenta, descontarStock } : undefined;
      if (pedido) {
        // Despachado: solo se manda la fecha si el día cambió (así no se pierde la hora original).
        const r = await editarPedido(
          tiendaId,
          pedido.id,
          bloqueado
            ? { clienteId: cliente.id, fecha: dia !== diaOriginal && fechaVenta ? fechaVenta : undefined }
            : {
                clienteId: cliente.id,
                items: lineas.map((l) => ({ productoId: l.producto.id, cantidad: l.cantidad })),
                codigo: promo ? codigo : undefined,
                ventaPasada: conVenta,
              },
        );
        elegirPestana(r.pedido.estado);
        toast(conVenta ? `Venta #${r.pedido.numero} guardada con fecha ${diaEnPalabras(dia)}.` : `Pedido #${r.pedido.numero} actualizado.`);
        alTerminar();
        return;
      }
      const { pedido: creado } = await crearPedidoManual(tiendaId, {
        clienteId: cliente.id,
        items: lineas.map((l) => ({ productoId: l.producto.id, cantidad: l.cantidad })),
        codigo: promo ? codigo : undefined,
        ventaPasada: conVenta,
      });
      if (conVenta) {
        elegirPestana("despachado");
        toast(`Venta #${creado.numero} guardada con fecha ${diaEnPalabras(dia)}.`);
      } else {
        elegirPestana("por_despachar");
        toast(`Pedido #${creado.numero} guardado. Está en Por despachar.`);
      }
      alTerminar();
    } catch (e) {
      toast(mensajeDeError(e, "No se pudo guardar. Inténtalo otra vez."));
      setGuardando(false);
    }
  };

  if (vista === "productos") {
    return (
      <SelectorProducto
        productos={productos}
        promos={promos}
        vendidas={vendidas}
        cantidades={cantidades}
        alCambiar={cambiar}
        entrada={buscador}
        alTerminar={() => setVista("pedido")}
      />
    );
  }

  if (vista === "cliente") {
    return <SelectorCliente clientes={clientes} entrada={buscador} alElegir={elegir} alVolver={() => setVista("pedido")} />;
  }

  return (
    <div className="flex flex-col gap-3.5">
      <p className="text-[13.5px] font-bold">Cliente</p>
      {cliente ? (
        <div className="flex items-center gap-3 rounded-[20px] border border-linea bg-white p-3">
          <Avatar nombre={cliente.nombre} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-extrabold">{cliente.nombre}</p>
            {cliente.telefono && <p className="truncate text-[13px] text-suave">{formatearTelefono(cliente.telefono)}</p>}
          </div>
          <button
            type="button"
            onClick={abrirSelector}
            className="tocable h-11 shrink-0 rounded-full border-[1.5px] border-bosque px-4 text-sm font-extrabold"
          >
            Cambiar
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={abrirSelector}
          aria-label="Elegir cliente"
          className={`${campo} tocable flex items-center justify-between text-left text-suave`}
        >
          Busca o crea un cliente
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      )}

      <p className="mt-1 text-[13.5px] font-bold">Productos</p>
      {bloqueado && (
        <p className="rounded-[18px] bg-arena px-4 py-3 text-[14px] leading-snug font-semibold">
          Este pedido ya se despachó, así que los productos no se pueden cambiar aquí. Para cambiarlos: toca «Por despachar» en la barra de pasos (el
          stock se devuelve), edita el pedido y vuelve a despacharlo.
        </p>
      )}
      {lineas.length === 0 ? (
        // Sin productos: toda el área invita a agregar (un solo botón, para que sea tocable completa)
        <button
          type="button"
          onClick={() => abrir("productos")}
          className="tocable flex flex-col items-center rounded-[22px] border border-linea bg-white px-5 pt-4 pb-5 text-center text-bosque"
        >
          <Image src="/ilustraciones/pedidos.webp" alt="" width={110} height={97} unoptimized draggable={false} className="select-none" />
          <span className="mt-2 block font-display text-xl leading-tight">Tu pedido está vacío</span>
          <span className="mt-1 block max-w-[240px] text-[14px] leading-snug text-suave">Agrega los productos que va a llevar tu cliente.</span>
          <span className="mt-3.5 flex h-[46px] items-center gap-1.5 rounded-full bg-mandarina pr-5 pl-4 text-[15px] font-extrabold text-bosque-oscuro">
            <IconoMas tamano={20} />
            Agregar productos
          </span>
        </button>
      ) : (
        <>
          <ul inert={bloqueado} className={`rounded-[20px] border border-linea bg-white px-3.5 ${bloqueado ? "opacity-55" : ""}`}>
            {lineas.map(({ producto: p, cantidad, precio }) => (
              <li key={p.id} className="flex items-center gap-3 border-b border-arena py-2.5 last:border-b-0">
                <span className="h-[46px] w-[46px] shrink-0 overflow-hidden rounded-xl bg-arena">
                  {p.fotos[0] ? <Foto src={p.fotos[0]} alt="" className="h-full w-full" sizes="46px" /> : null}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14.5px] font-extrabold">{p.nombre}</p>
                  <p className="text-[12.5px] text-suave">
                    {cantidad} × {formatearPesos(precio)}
                  </p>
                </div>
                {bloqueado ? (
                  <span className="shrink-0 font-display text-xl tabular-nums">{cantidad}</span>
                ) : (
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => cambiar(p, -1)}
                      aria-label={`Quitar uno de ${p.nombre}`}
                      className="tocable grid h-11 w-11 place-items-center rounded-[13px] bg-arena"
                    >
                      <IconoMenos tamano={18} />
                    </button>
                    <span className="min-w-[26px] text-center font-display text-xl tabular-nums" aria-live="polite">
                      {cantidad}
                    </span>
                    <button
                      type="button"
                      onClick={() => cambiar(p, 1)}
                      disabled={cantidad >= cantidadMaxima(p)}
                      aria-label={`Agregar otro ${p.nombre}`}
                      className="tocable grid h-11 w-11 place-items-center rounded-[13px] bg-bosque text-papel disabled:opacity-35"
                    >
                      <IconoMas tamano={18} />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
          {!bloqueado && (
            <button
              type="button"
              onClick={() => abrir("productos")}
              className="tocable flex h-[52px] items-center justify-center gap-2 rounded-full border-[1.5px] border-bosque bg-white text-[15px] font-extrabold text-bosque"
            >
              <IconoMas tamano={20} />
              Agregar más productos
            </button>
          )}
        </>
      )}

      <div inert={bloqueado} className={bloqueado ? "opacity-55" : ""}>
        <CampoCodigo valor={codigo} alCambiar={setCodigo} promo={promo} />
      </div>

      <div className="rounded-[20px] border border-linea bg-white px-3.5 py-2.5">
        <div className="flex justify-between py-0.5 text-sm font-semibold text-suave">
          <span>Subtotal</span>
          <span>{formatearPesos(subtotal)}</span>
        </div>
        {descuento > 0 && (
          <div className="flex justify-between py-0.5 text-sm font-bold">
            <span>Descuento{(bloqueado ? pedido?.codigoPromo : promo?.codigo) ? ` · ${bloqueado ? pedido?.codigoPromo : promo?.codigo}` : ""}</span>
            <span>−{formatearPesos(descuento)}</span>
          </div>
        )}
        <div className="flex justify-between pt-1 font-display text-[22px]">
          <span>Total</span>
          <span>{formatearPesos(totalFinal)}</span>
        </div>
      </div>

      {bloqueado ? (
        <div className="rounded-[20px] border border-linea bg-white px-3.5 py-3">
          <label className="flex min-w-0 flex-col gap-1.5 text-[13.5px] font-bold">
            Fecha de la venta
            <input
              type="date"
              value={dia}
              max={diaLocal()}
              onChange={(e) => setDia(e.target.value)}
              className={`${campo} max-w-full appearance-none`}
            />
            {fechaVenta === null && <span className="text-[12.5px] font-semibold text-[#b4432a]">Elige un día que ya pasó (hoy también vale).</span>}
          </label>
        </div>
      ) : (
        <div className="rounded-[20px] border border-linea bg-white px-3.5 py-2.5">
          <div className="flex min-h-11 items-center justify-between gap-3">
            <span className="text-[15px] font-extrabold">Es una venta que ya hice</span>
            <Interruptor encendido={ventaPasada} alCambiar={setVentaPasada} etiqueta="Es una venta que ya hice" />
          </div>
          {ventaPasada && (
            <div className="mt-2 flex flex-col gap-3 border-t border-arena pt-3 pb-1">
              <label className="flex min-w-0 flex-col gap-1.5 text-[13.5px] font-bold">
                Fecha de la venta
                <input
                  type="date"
                  value={dia}
                  max={diaLocal()}
                  onChange={(e) => setDia(e.target.value)}
                  className={`${campo} max-w-full appearance-none`}
                />
                {fechaVenta === null && (
                  <span className="text-[12.5px] font-semibold text-[#b4432a]">Elige un día que ya pasó (hoy también vale).</span>
                )}
              </label>
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={descontarStock}
                  onChange={(e) => setDescontarStock(e.target.checked)}
                  className="mt-0.5 h-6 w-6 shrink-0 accent-[var(--color-bosque)]"
                />
                <span className="min-w-0 text-[14.5px]">
                  <span className="block font-extrabold">Descontar del stock</span>
                  <span className="block text-[12.5px] font-semibold text-suave">Déjala apagada si vendiste esto antes de cargar tu inventario.</span>
                </span>
              </label>
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={guardar}
        disabled={!puedeGuardar}
        className="tocable h-14 rounded-full bg-bosque text-[16.5px] font-extrabold text-papel disabled:opacity-50"
      >
        {ventaPasada ? "Guardar venta" : pedido ? "Guardar cambios" : "Guardar pedido"}
      </button>
      {!puedeGuardar && !guardando && !codigoMalo && (
        <p className="-mt-1.5 text-center text-[13px] font-semibold text-suave">
          {lineas.length === 0 ? "Agrega al menos un producto" : "Elige un cliente"}
        </p>
      )}
    </div>
  );
}
