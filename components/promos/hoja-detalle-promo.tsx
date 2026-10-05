"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { useConsulta, useTiendaActiva } from "@/lib/data/consulta";
import { useData } from "@/lib/data/provider";
import { diaMesCorto } from "@/lib/formato";
import { estadoVisible, pedidosConCodigo } from "@/lib/promos";
import type { Producto, Promo } from "@/lib/types";
import { Foto } from "../foto";
import { Hoja } from "../hoja";
import { CuerpoCargando, CuerpoConError } from "../hoja-estado";
import { TarjetaPromo } from "./tarjeta-promo";

const etiquetas = { activa: "Activa", programada: "Programada", terminada: "Terminada", pausada: "Pausada", agotada: "Agotada" } as const;
const boton = "tocable flex h-12 items-center justify-center rounded-full text-[15px] font-extrabold";

/** Detalle consultable por URL; la lista de Promos permanece montada debajo. */
export function HojaDetallePromo({ promoId, desdeLista = false }: { promoId: string; desdeLista?: boolean }) {
  const router = useRouter();
  const { getPromos, getProductos, getPedidos, getClientes } = useData();
  const { tiendaId } = useTiendaActiva();
  const cerrar = useCallback(() => {
    if (desdeLista) router.back();
    else router.replace("/promos", { scroll: false });
  }, [router, desdeLista]);
  const consultaPromos = useConsulta(`promos:${tiendaId}`, () => getPromos(tiendaId));
  const consultaProductos = useConsulta(`productos-historial:${tiendaId}`, () => getProductos(tiendaId, true));
  const consultaPedidos = useConsulta(`pedidos:${tiendaId}`, () => getPedidos(tiendaId));
  const { data: promos } = consultaPromos;
  const { data: productos } = consultaProductos;
  const { data: pedidos } = consultaPedidos;
  const error = consultaPromos.error || consultaProductos.error || consultaPedidos.error;
  const cargando = !promos || !productos || !pedidos;
  const promo = promos?.find((p) => p.id === promoId && p.tiendaId === tiendaId);
  const { data: clientes } = useConsulta(`clientes:${tiendaId}`, () => getClientes(tiendaId));
  const paraCliente = promo?.clienteId ? (clientes?.find((c) => c.id === promo.clienteId)?.nombre ?? "un cliente") : null;

  return <Hoja abierta alCerrar={cerrar} titulo="Detalle de promo" altura="grande">
    {cargando ? error
      ? <CuerpoConError alCerrar={cerrar} alReintentar={() => { consultaPromos.reintentar(); consultaProductos.reintentar(); consultaPedidos.reintentar(); }} textoVolver="Volver a promos" />
      : <CuerpoCargando titulo="promo" />
      : !promo
        ? <div className="py-6 text-center">
          <p className="font-display text-xl">Esta promo no vive aquí.</p>
          <p className="mt-1 text-suave">Quizá es de otra tienda. Las promos no se mezclan.</p>
          <button type="button" onClick={cerrar} className={`${boton} mt-5 w-full bg-bosque text-papel`}>Volver a promos</button>
        </div>
        : <Detalle promo={promo} paraCliente={paraCliente} productos={productos} pedidos={pedidos} alEditar={() => router.push(`/promos/${promo.id}/editar?desde=detalle`, { scroll: false })} alCompartir={() => router.push(`/promos/${promo.id}/compartir?desde=detalle`, { scroll: false })} alDuplicar={() => router.push(`/promos/nueva?copiar=${promo.id}`, { scroll: false })} />}
  </Hoja>;
}

function Detalle({ promo, paraCliente, productos, pedidos, alEditar, alCompartir, alDuplicar }: {
  promo: Promo;
  /** Código personal: a quién es (no se puede cambiar). */
  paraCliente: string | null;
  productos: Producto[];
  pedidos: Parameters<typeof pedidosConCodigo>[0];
  alEditar: () => void;
  alCompartir: () => void;
  alDuplicar: () => void;
}) {
  const usos = promo.tipo === "codigo" ? pedidosConCodigo(pedidos, promo) : null;
  const estado = estadoVisible(promo, usos);
  const producto = promo.productoId ? productos.find((p) => p.id === promo.productoId) : undefined;
  const deColeccion = promo.coleccion ? productos.filter((p) => p.categoria === promo.coleccion).length : 0;
  const fin = promo.fechaFin ? diaMesCorto(promo.fechaFin) : "Sin fecha de fin";

  return <div className="flex flex-col gap-4">
    <TarjetaPromo promo={promo} estado={estado} producto={producto} productosDeColeccion={deColeccion} usos={usos} />
    <div className="rounded-[20px] border border-linea bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-[22px] leading-tight text-bosque">{promo.nombre}</p>
          <p className="mt-1 text-sm font-bold text-suave">{promo.valorPorcentaje}% de descuento</p>
        </div>
        <span className="shrink-0 rounded-full bg-menta px-2.5 py-1 text-[12px] font-extrabold text-bosque">{etiquetas[estado]}</span>
      </div>
      <dl className="mt-4 flex flex-col gap-3 border-t border-linea pt-4 text-sm">
        <Dato titulo="Tipo" valor={promo.tipo === "codigo" ? "Código" : promo.tipo === "producto" ? "Por producto" : "Por colección"} />
        {promo.tipo === "codigo" && <><Dato titulo="Destino" valor="Todo el pedido" /><Dato titulo="Código" valor={promo.codigo ?? "—"} />{paraCliente && <Dato titulo="Para" valor={`Solo para ${paraCliente}`} />}</>}
        {promo.tipo === "producto" && <div className="flex items-center justify-between gap-3">
          <dt className="font-semibold text-suave">Producto</dt>
          <dd className="flex min-w-0 items-center gap-2 text-right font-bold">
            {producto?.fotos[0] && <span className="h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-arena"><Foto src={producto.fotos[0]} alt="" className="h-full w-full" sizes="40px" /></span>}
            <span>{producto?.nombre ?? "Producto no disponible"}</span>
          </dd>
        </div>}
        {promo.tipo === "coleccion" && <Dato titulo="Colección" valor={promo.coleccion ?? "—"} />}
        <Dato titulo="Inicio" valor={diaMesCorto(promo.fechaInicio)} />
        <Dato titulo="Vencimiento" valor={fin} />
        {promo.tipo === "codigo" && <>
          <Dato titulo="Veces usado" valor={String(usos ?? 0)} />
          <Dato titulo="Límite" valor={promo.limiteUsos === null ? "Sin límite" : String(promo.limiteUsos)} />
          <Dato titulo="Usos restantes" valor={promo.limiteUsos === null ? "Sin límite" : String(Math.max(0, promo.limiteUsos - (usos ?? 0)))} />
        </>}
      </dl>
      {promo.tipo === "codigo" && <p className="mt-3 text-[12.5px] font-semibold text-suave">Cuenta los pedidos no cancelados.</p>}
    </div>
    {estado === "terminada"
      ? <button type="button" onClick={alDuplicar} className={`${boton} bg-bosque text-papel`}>Duplicar promo</button>
      : <>
        <button type="button" onClick={alEditar} className={`${boton} bg-bosque text-papel`}>Editar promo</button>
        <button type="button" onClick={alCompartir} className={`${boton} border-[1.5px] border-bosque text-bosque`}>Compartir promo</button>
      </>}
  </div>;
}

function Dato({ titulo, valor }: { titulo: string; valor: string }) {
  return <div className="flex justify-between gap-3"><dt className="font-semibold text-suave">{titulo}</dt><dd className="text-right font-bold">{valor}</dd></div>;
}
