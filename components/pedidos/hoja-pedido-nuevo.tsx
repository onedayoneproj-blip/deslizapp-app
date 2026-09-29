"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useConsulta, useTiendaActiva } from "@/lib/data/consulta";
import { buscarCodigoPromo, descuentoDeCodigo } from "@/lib/data/pedidos";
import { useData } from "@/lib/data/provider";
import { formatearPesos } from "@/lib/formato";
import { formatearTelefono } from "@/lib/telefono";
import { precioConPromo } from "@/lib/promos";
import type { ClienteConResumen, Producto, Promo } from "@/lib/types";
import { Avatar } from "../clientes/comunes";
import { Foto } from "../foto";
import { Hoja } from "../hoja";
import { IconoMas, IconoMenos } from "../iconos";
import { useToast } from "../toast";
import { SelectorCliente, type ClienteElegido } from "./selector-cliente";
import { useElegirPestanaPedidos } from "./vista-pedidos";

const campo =
  "h-[50px] w-full min-w-0 rounded-2xl border-[1.5px] border-borde bg-white px-3.5 text-base text-bosque outline-none focus:border-bosque";

/** Pedido manual ("+ Pedido"): una venta que no llegó por el catálogo. Entra directo en Por despachar. */
export function HojaPedidoNuevo() {
  const router = useRouter();
  const { getProductos, getClientes, getPromos } = useData();
  const { tiendaId } = useTiendaActiva();
  const cerrar = useCallback(() => router.push("/pedidos", { scroll: false }), [router]);

  const { data: productos } = useConsulta(`productos:${tiendaId}`, () => getProductos(tiendaId));
  const { data: clientes } = useConsulta(`clientes:${tiendaId}`, () => getClientes(tiendaId));
  const { data: promos } = useConsulta(`promos:${tiendaId}`, () => getPromos(tiendaId));
  if (!productos || !clientes || !promos) return null;

  return (
    <Hoja abierta alCerrar={cerrar} titulo="Nuevo pedido" altura="grande">
      <Formulario productos={productos} clientes={clientes} promos={promos} alTerminar={cerrar} />
    </Hoja>
  );
}

function Formulario({
  productos,
  clientes,
  promos,
  alTerminar,
}: {
  productos: Producto[];
  clientes: ClienteConResumen[];
  promos: Promo[];
  alTerminar: () => void;
}) {
  const { crearPedidoManual } = useData();
  const { tiendaId } = useTiendaActiva();
  const elegirPestana = useElegirPestanaPedidos();
  const toast = useToast();

  // El selector de cliente es otra vista DENTRO de esta misma hoja (no una segunda hoja).
  const [vista, setVista] = useState<"pedido" | "cliente">("pedido");
  const [cliente, setCliente] = useState<ClienteElegido | null>(null);
  const buscador = useRef<HTMLInputElement>(null);
  const [cantidades, setCantidades] = useState<Record<string, number>>({});
  const [codigo, setCodigo] = useState("");
  const [guardando, setGuardando] = useState(false);

  // Solo productos que el cliente puede pedir hoy (los ocultos no se venden).
  const ofrecidos = useMemo(() => productos.filter((p) => p.activo), [productos]);
  const lineas = ofrecidos
    .map((p) => ({ producto: p, cantidad: cantidades[p.id] ?? 0, precio: precioConPromo(p, promos).precio }))
    .filter((l) => l.cantidad > 0);
  const subtotal = lineas.reduce((suma, l) => suma + l.precio * l.cantidad, 0);
  const promo = buscarCodigoPromo(promos, tiendaId, codigo);
  const descuento = descuentoDeCodigo(promo, subtotal);
  const codigoMalo = codigo.trim() !== "" && !promo;

  const puedeGuardar = cliente !== null && lineas.length > 0 && !codigoMalo && !guardando;

  // El foco va al buscador en el MISMO toque que abre el selector (flushSync pinta la vista ya):
  // así el teclado del iPhone abre bien. Regla del teclado en HANDOFF.md.
  const abrirSelector = () => {
    flushSync(() => setVista("cliente"));
    buscador.current?.focus({ preventScroll: true });
  };
  const elegir = (c: ClienteElegido) => {
    setCliente(c);
    setVista("pedido");
  };

  const cambiar = (id: string, delta: number) =>
    setCantidades((c) => ({ ...c, [id]: Math.min(99, Math.max(0, (c[id] ?? 0) + delta)) }));

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
      {ofrecidos.length === 0 ? (
        <p className="rounded-[18px] bg-arena p-4 text-center text-suave">Aún no tienes productos visibles. Publica uno en el Catálogo.</p>
      ) : (
        <ul className="rounded-[20px] border border-linea bg-white px-3.5">
          {ofrecidos.map((p) => {
            const n = cantidades[p.id] ?? 0;
            const precio = precioConPromo(p, promos);
            return (
              <li key={p.id} className="flex items-center gap-3 border-b border-arena py-2.5 last:border-b-0">
                <span className="h-[46px] w-[46px] shrink-0 overflow-hidden rounded-xl bg-arena">
                  {p.fotos[0] ? <Foto src={p.fotos[0]} alt="" className="h-full w-full" sizes="46px" /> : null}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14.5px] font-extrabold">{p.nombre}</p>
                  <p className="text-[12.5px] text-suave">
                    {formatearPesos(precio.precio)}
                    {p.stock === 0 ? " · Agotado" : p.stock === null ? "" : ` · ${p.stock} en stock`}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {n > 0 && (
                    <>
                      <button type="button" onClick={() => cambiar(p.id, -1)} aria-label={`Quitar uno de ${p.nombre}`} className="tocable grid h-10 w-10 place-items-center rounded-[13px] bg-arena">
                        <IconoMenos tamano={18} />
                      </button>
                      <span className="min-w-[26px] text-center font-display text-xl tabular-nums" aria-live="polite">
                        {n}
                      </span>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => cambiar(p.id, 1)}
                    aria-label={`Agregar ${p.nombre}`}
                    className="tocable grid h-10 w-10 place-items-center rounded-[13px] bg-bosque text-papel"
                  >
                    <IconoMas tamano={18} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

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
