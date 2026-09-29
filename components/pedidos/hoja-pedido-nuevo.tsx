"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { useConsulta, useTiendaActiva } from "@/lib/data/consulta";
import { buscarCodigoPromo, descuentoDeCodigo } from "@/lib/data/pedidos";
import { useData } from "@/lib/data/provider";
import { formatearPesos } from "@/lib/formato";
import { normalizarTelefonoDO } from "@/lib/telefono";
import { precioConPromo } from "@/lib/promos";
import type { ClienteConResumen, Producto, Promo } from "@/lib/types";
import { Segmentos } from "../controles";
import { Foto } from "../foto";
import { Hoja } from "../hoja";
import { IconoMas, IconoMenos } from "../iconos";
import { useToast } from "../toast";
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

  const [modo, setModo] = useState<"existente" | "nuevo">(clientes.length > 0 ? "existente" : "nuevo");
  const [clienteId, setClienteId] = useState("");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
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

  const telefonoMalo = modo === "nuevo" && telefono.trim() !== "" && normalizarTelefonoDO(telefono) === null;
  const clienteListo = modo === "existente" ? clienteId !== "" : nombre.trim() !== "" && !telefonoMalo;
  const puedeGuardar = clienteListo && lineas.length > 0 && !codigoMalo && !guardando;

  const cambiar = (id: string, delta: number) =>
    setCantidades((c) => ({ ...c, [id]: Math.min(99, Math.max(0, (c[id] ?? 0) + delta)) }));

  const guardar = async () => {
    if (!puedeGuardar) return;
    setGuardando(true);
    try {
      const { pedido } = await crearPedidoManual(tiendaId, {
        ...(modo === "existente" ? { clienteId } : { clienteNuevo: { nombre, telefono } }),
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

  return (
    <div className="flex flex-col gap-3.5">
      <p className="text-[13.5px] font-bold">Cliente</p>
      {clientes.length > 0 && (
        <Segmentos
          etiqueta="Tipo de cliente"
          valor={modo}
          alCambiar={setModo}
          opciones={[
            { id: "existente", texto: "Ya es cliente" },
            { id: "nuevo", texto: "Cliente nuevo" },
          ]}
        />
      )}
      {modo === "existente" ? (
        <select
          value={clienteId}
          onChange={(e) => setClienteId(e.target.value)}
          aria-label="Cliente"
          className={`${campo} ${clienteId ? "" : "text-suave"}`}
        >
          <option value="">Elige un cliente</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
      ) : (
        <>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre del cliente"
            aria-label="Nombre del cliente"
            autoComplete="off"
            className={campo}
          />
          <input
            type="tel"
            inputMode="tel"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value.replace(/[^\d+\-() ]/g, "").slice(0, 18))}
            placeholder="WhatsApp: 809-000-0000"
            aria-label="WhatsApp del cliente"
            className={campo}
          />
          {telefonoMalo && <span className="-mt-2 text-[12.5px] font-semibold text-[#b4432a]">Escríbelo con 809, 829 o 849 y 7 dígitos más.</span>}
        </>
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
