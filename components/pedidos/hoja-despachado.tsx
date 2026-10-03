"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { STOCK_BAJO } from "@/lib/config";
import { enlaceWhatsApp, formatearPesos } from "@/lib/formato";
import type { Cliente, PedidoConItems, Producto } from "@/lib/types";
import { Foto } from "../foto";
import { Hoja } from "../hoja";
import { IconoCamion, IconoChat, IconoCheck, IconoCorazon, IconoFlechaArriba, IconoWhatsApp } from "../iconos";
import { Boton, Etiqueta, FilaLista, ListaAgrupada } from "../ui";
import { menosMovimiento } from "@/lib/movimiento";

const ESPERA_MONTO_MS = 1950;
const DURACION_MONTO_MS = 800;
const PASOS = ["Recibido", "Confirmado", "Despachado"];

/** Cuenta de 0 al total en 800 ms (ease-out cúbico) después de la espera; con movimiento reducido muestra el total de una vez. */
function useMontoQueCuenta(total: number, activo: boolean) {
  const [valor, setValor] = useState(() => (menosMovimiento() ? total : 0));
  useEffect(() => {
    if (!activo || menosMovimiento()) return;
    let raf = 0;
    const t0 = performance.now();
    const paso = (t: number) => {
      const p = Math.min(Math.max((t - t0 - ESPERA_MONTO_MS) / DURACION_MONTO_MS, 0), 1);
      setValor(Math.round(total * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(paso);
    };
    raf = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(raf);
  }, [total, activo]);
  return menosMovimiento() ? total : valor;
}

/**
 * Celebración de "Pedido despachado" (referencias/animacion-despacho/pedido-despachado.html), encima del detalle del pedido y solo
 * DESPUÉS de que el servidor confirmó el despacho. Todo el movimiento es CSS (transform y opacity; `desp-*` en app/globals.css)
 * salvo el conteo del monto. Con prefers-reduced-motion se ve directo el estado final. Los botones y la X funcionan desde el inicio.
 * El stock de cada producto es el que ya trae el servidor (`productos` se relee al despachar), no se calcula aquí.
 */
export function HojaDespachado({
  abierta,
  alCerrar,
  pedido,
  cliente,
  productos,
}: {
  abierta: boolean;
  alCerrar: () => void;
  pedido: PedidoConItems;
  cliente: Cliente | null;
  productos: Producto[];
}) {
  const router = useRouter();
  const porId = useMemo(() => new Map(productos.map((p) => [p.id, p])), [productos]);
  const monto = useMontoQueCuenta(pedido.total, abierta);
  const primerNombre = cliente?.nombre.split(" ")[0] ?? "";
  const nombre = cliente?.nombre ?? "Cliente sin nombre";
  const visibles = pedido.items.length > 4 ? pedido.items.slice(0, 3) : pedido.items;
  const restantes = pedido.items.length - visibles.length;

  return (
    <Hoja
      abierta={abierta}
      alCerrar={alCerrar}
      titulo="Pedido despachado"
      tituloOculto
      altura="auto"
      decoracionAbajo={
        <div className="desp-mascara relative h-75 w-full">
          <IconoFlechaArriba className="desp-icono desp-p1 text-patron" strokeWidth={3} />
          <IconoCorazon className="desp-icono desp-icono-2 desp-p2 fill-patron text-patron" strokeWidth={0} />
          <IconoChat className="desp-icono desp-icono-3 desp-p3 text-patron" strokeWidth={2.4} />
          <IconoCorazon className="desp-icono desp-icono-3 desp-p4 fill-patron text-patron" strokeWidth={0} />
          <IconoChat className="desp-icono desp-p5 text-patron" strokeWidth={2.4} />
          <IconoFlechaArriba className="desp-icono desp-icono-2 desp-p6 text-patron" strokeWidth={3} />
          <IconoCorazon className="desp-icono desp-p7 fill-patron text-patron" strokeWidth={0} />
        </div>
      }
    >
      <p role="status" className="sr-only">
        Pedido #{pedido.numero} despachado
      </p>
      <div className="flex flex-col items-center gap-5.5">
        {/* Barra de 3 pasos, camión y sello */}
        <div className="desp-escena relative h-37.5 w-full">
          <div className="desp-camion absolute top-7 -left-15 flex items-center gap-1" aria-hidden="true">
            <svg className="desp-lineas h-10 w-8.5 text-resalte" viewBox="0 0 34 40" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round">
              <path d="M4 10h22M10 20h22M4 30h22" />
            </svg>
            <IconoCamion tamano={64} strokeWidth={1.8} className="text-accion" />
          </div>
          <div className="absolute top-25.5 right-12.5 left-0 grid grid-cols-3 gap-2" aria-hidden="true">
            <div className="h-2 rounded-full bg-accion" />
            <div className="h-2 rounded-full bg-accion" />
            <div className="relative h-2 overflow-hidden rounded-full bg-linea">
              <div className="desp-llena absolute inset-0 rounded-full bg-resalte" />
              <div className="desp-llena-fin absolute inset-0 rounded-full bg-accion" />
            </div>
          </div>
          <div className="desp-sello absolute top-22 right-0 grid size-9 place-items-center rounded-full bg-accion text-sobre-accion" aria-hidden="true">
            <IconoCheck tamano={20} strokeWidth={3} />
          </div>
          <div className="absolute top-31 right-12.5 left-0 grid grid-cols-3 gap-2 text-etiqueta text-texto-secundario" aria-hidden="true">
            {PASOS.map((p, i) =>
              i < 2 ? (
                <span key={p}>{p}</span>
              ) : (
                <span key={p} className="relative">
                  {p}
                  <span className="desp-rotulo absolute inset-0 text-texto">{p}</span>
                </span>
              ),
            )}
          </div>
        </div>

        <div className="desp-sube-1 flex flex-col items-center gap-1.5 text-center">
          <p aria-hidden="true" className="font-display text-titulo-pantalla text-texto">
            Pedido despachado
          </p>
          <p className="text-cuerpo text-texto-secundario">
            #{pedido.numero} · {nombre}
          </p>
        </div>

        <p className="desp-sube-2 font-display text-cifra text-texto tabular-nums">{formatearPesos(monto)}</p>

        <ListaAgrupada etiqueta="Productos despachados" className="desp-sube-3 w-full">
          {visibles.map((i) => {
            const producto = porId.get(i.productoId);
            const stock = producto?.stock;
            const foto = producto?.fotos[0];
            return (
              <FilaLista
                key={i.id}
                inicio={<span className="block size-11 overflow-hidden rounded-radio-s bg-superficie-hundida">{foto ? <Foto src={foto} alt="" className="h-full w-full" sizes="44px" /> : null}</span>}
                titulo={i.nombreProducto}
                detalle={`${i.cantidad} × ${formatearPesos(i.precioUnitario)}`}
                fin={
                  stock === 0 ? (
                    <Etiqueta tono="fuerte">Agotado</Etiqueta>
                  ) : stock != null && stock <= STOCK_BAJO ? (
                    <Etiqueta tono="atencion">{stock === 1 ? "Queda 1" : `Quedan ${stock}`}</Etiqueta>
                  ) : undefined
                }
              />
            );
          })}
          {restantes > 0 && <FilaLista titulo={<span className="text-texto-secundario">+{restantes} {restantes === 1 ? "producto más" : "productos más"}</span>} />}
        </ListaAgrupada>
        <p className="desp-sube-3 -mt-2 text-secundario text-texto-secundario">El stock ya se actualizó.</p>
      </div>

      <div className="desp-sube-4 relative mt-7 flex flex-col gap-3">
        {cliente?.telefono && (
          <Boton
            tamano="grande"
            anchoCompleto
            icono={<IconoWhatsApp tamano={20} />}
            href={enlaceWhatsApp(cliente.telefono, `¡Hola ${primerNombre}! Tu pedido #${pedido.numero} ya va en camino 🚚`)}
            target="_blank"
            rel="noreferrer"
          >
            Avisarle a {primerNombre}
          </Boton>
        )}
        <Boton
          jerarquia="secundario"
          tamano="grande"
          anchoCompleto
          onClick={() => {
            alCerrar();
            router.push("/pedidos", { scroll: false });
          }}
        >
          Volver a pedidos
        </Boton>
      </div>
    </Hoja>
  );
}
