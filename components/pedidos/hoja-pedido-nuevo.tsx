"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useConsulta, useTiendaActiva } from "@/lib/data/consulta";
import { buscarCodigoPromo, descuentoDeCodigo } from "@/lib/data/pedidos";
import { useData } from "@/lib/data/provider";
import { formatearPesos } from "@/lib/formato";
import { cantidadMaxima, unidadesVendidas } from "@/lib/buscar-productos";
import { formatearTelefono } from "@/lib/telefono";
import { precioConPromo } from "@/lib/promos";
import type { ClienteConResumen, PedidoConItems, Producto, Promo } from "@/lib/types";
import { Avatar } from "../clientes/comunes";
import { Foto } from "../foto";
import { Hoja } from "../hoja";
import { IconoMas, IconoMenos } from "../iconos";
import { useToast } from "../toast";
import { SelectorCliente, type ClienteElegido } from "./selector-cliente";
import { SelectorProducto } from "./selector-producto";
import { useElegirPestanaPedidos } from "./vista-pedidos";

const campo =
  "h-[50px] w-full min-w-0 rounded-2xl border-[1.5px] border-borde bg-white px-3.5 text-base text-bosque outline-none focus:border-bosque";

/** Pedido manual ("+ Pedido"): una venta que no llegó por el catálogo. Entra directo en Por despachar. */
export function HojaPedidoNuevo() {
  const router = useRouter();
  const { getProductos, getClientes, getPromos, getPedidos } = useData();
  const { tiendaId } = useTiendaActiva();
  const cerrar = useCallback(() => router.push("/pedidos", { scroll: false }), [router]);

  const { data: productos } = useConsulta(`productos:${tiendaId}`, () => getProductos(tiendaId));
  const { data: clientes } = useConsulta(`clientes:${tiendaId}`, () => getClientes(tiendaId));
  const { data: promos } = useConsulta(`promos:${tiendaId}`, () => getPromos(tiendaId));
  const { data: pedidos } = useConsulta(`pedidos:${tiendaId}`, () => getPedidos(tiendaId));
  if (!productos || !clientes || !promos || !pedidos) return null;

  return (
    <Hoja abierta alCerrar={cerrar} titulo="Nuevo pedido" altura="grande">
      <Formulario productos={productos} clientes={clientes} promos={promos} pedidos={pedidos} alTerminar={cerrar} />
    </Hoja>
  );
}

function Formulario({
  productos,
  clientes,
  promos,
  pedidos,
  alTerminar,
}: {
  productos: Producto[];
  clientes: ClienteConResumen[];
  promos: Promo[];
  pedidos: PedidoConItems[];
  alTerminar: () => void;
}) {
  const { crearPedidoManual } = useData();
  const { tiendaId } = useTiendaActiva();
  const elegirPestana = useElegirPestanaPedidos();
  const toast = useToast();

  // Los selectores (cliente, productos) son otra vista DENTRO de esta misma hoja (no una segunda hoja).
  const [vista, setVista] = useState<"pedido" | "cliente" | "productos">("pedido");
  const [cliente, setCliente] = useState<ClienteElegido | null>(null);
  const buscador = useRef<HTMLInputElement>(null);
  const [cantidades, setCantidades] = useState<Record<string, number>>({});
  const [codigo, setCodigo] = useState("");
  const [guardando, setGuardando] = useState(false);

  const vendidas = useMemo(() => unidadesVendidas(pedidos), [pedidos]);
  const lineas = productos
    .map((p) => ({ producto: p, cantidad: cantidades[p.id] ?? 0, precio: precioConPromo(p, promos).precio }))
    .filter((l) => l.cantidad > 0);
  const subtotal = lineas.reduce((suma, l) => suma + l.precio * l.cantidad, 0);
  const promo = buscarCodigoPromo(promos, tiendaId, codigo);
  const descuento = descuentoDeCodigo(promo, subtotal);
  const codigoMalo = codigo.trim() !== "" && !promo;

  const puedeGuardar = cliente !== null && lineas.length > 0 && !codigoMalo && !guardando;

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
      const { pedido } = await crearPedidoManual(tiendaId, {
        clienteId: cliente.id,
        items: lineas.map((l) => ({ productoId: l.producto.id, cantidad: l.cantidad })),
        codigo: promo ? codigo : undefined,
      });
      elegirPestana("por_despachar");
      toast(`Pedido #${pedido.numero} guardado. Está en Por despachar.`);
      alTerminar();
    } catch {
      toast("No se pudo guardar. Inténtalo otra vez.");
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
          <button type="button" onClick={abrirSelector} className="tocable h-11 shrink-0 rounded-full border-[1.5px] border-bosque px-4 text-sm font-extrabold">
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
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      )}

      <p className="mt-1 text-[13.5px] font-bold">Productos</p>
      {lineas.length > 0 && (
        <ul className="rounded-[20px] border border-linea bg-white px-3.5">
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
              <div className="flex shrink-0 items-center gap-1">
                <button type="button" onClick={() => cambiar(p, -1)} aria-label={`Quitar uno de ${p.nombre}`} className="tocable grid h-10 w-10 place-items-center rounded-[13px] bg-arena">
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
                  className="tocable grid h-10 w-10 place-items-center rounded-[13px] bg-bosque text-papel disabled:opacity-35"
                >
                  <IconoMas tamano={18} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={() => abrir("productos")}
        className="tocable flex h-[52px] items-center justify-center gap-2 rounded-full border-[1.5px] border-bosque bg-white text-[15px] font-extrabold text-bosque"
      >
        <IconoMas tamano={20} />
        {lineas.length > 0 ? "Agregar más productos" : "Agregar productos"}
      </button>

      <label className="mt-1 flex flex-col gap-1.5 text-[13.5px] font-bold">
        ¿Usó un código? <span className="-mt-1 text-[12.5px] font-semibold text-suave">(opcional)</span>
        <input
          type="text"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.toUpperCase().slice(0, 20))}
          placeholder="Ej: LUNA20"
          autoCapitalize="characters"
          autoComplete="off"
          className={campo}
        />
        {promo && <span className="text-[12.5px] font-semibold text-suave">Código {promo.codigo}: {promo.valorPorcentaje}% menos.</span>}
        {codigoMalo && <span className="text-[12.5px] font-semibold text-[#b4432a]">Ese código no existe o ya terminó.</span>}
      </label>

      <div className="rounded-[20px] border border-linea bg-white px-3.5 py-2.5">
        <div className="flex justify-between py-0.5 text-sm font-semibold text-suave">
          <span>Subtotal</span>
          <span>{formatearPesos(subtotal)}</span>
        </div>
        {descuento > 0 && (
          <div className="flex justify-between py-0.5 text-sm font-bold">
            <span>Código {promo?.codigo}</span>
            <span>−{formatearPesos(descuento)}</span>
          </div>
        )}
        <div className="flex justify-between pt-1 font-display text-[22px]">
          <span>Total</span>
          <span>{formatearPesos(subtotal - descuento)}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={guardar}
        disabled={!puedeGuardar}
        className="tocable h-14 rounded-full bg-bosque text-[16.5px] font-extrabold text-papel disabled:opacity-50"
      >
        Guardar pedido
      </button>
    </div>
  );
}
