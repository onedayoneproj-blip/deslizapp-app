"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { NOMBRE_PLAN } from "@/lib/config";
import { useConsulta, useTiendaActiva } from "@/lib/data/consulta";
import { mensajeDeError } from "@/lib/data/errores";
import { useData } from "@/lib/data/provider";
import { DIAS_SIN_MOVIMIENTO, porReponer, saludDelInventario, seleccionInicial, sinMovimiento, ventasPorProducto } from "@/lib/inventario-catalogo";
import { resumenDelPlan, textosDelPlan } from "@/lib/plan-catalogo";
import type { Producto } from "@/lib/types";
import { Hoja } from "../hoja";
import { IconoChevronDerecha, IconoPedidos, IconoReloj } from "../iconos";
import { BotonVolver } from "../selector-busqueda";
import { usePanelUI, type FiltroCatalogo } from "../panel/ui";
import { Boton, FilaLista, ListaAgrupada, Tarjeta, useToastUI } from "../ui";
import { COLOR_STOCK, DonaInventario } from "./dona-inventario";
import { MiniaturaProducto } from "./miniatura-producto";
import { VistaHacerEspacio } from "./vista-hacer-espacio";
import { VistaPorReponer } from "./vista-por-reponer";

export type VistaInventario = "resumen" | "porReponer" | "sinMovimiento" | "espacio";

const TITULO: Record<VistaInventario, string> = {
  resumen: "Tu inventario",
  porReponer: "Por reponer",
  sinMovimiento: "Sin movimiento",
  espacio: "Hacer espacio",
};

/** El Ojo (icono suelto de "agotados a la vista"): la app aún no tiene IconoOjo, se dibuja aquí con el mismo trazo. */
function IconoOjo({ tamano = 26 }: { tamano?: number }) {
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

/**
 * "Tu inventario": la salud del stock, lo que pide atención ("Por reponer", agotados a la vista, sin movimiento) y el plan.
 * "Por reponer", "Sin movimiento" y "Hacer espacio" son vistas internas de esta misma hoja (con su botón Volver).
 * Vive en el PanelUIProvider para abrirse desde la dona, el Toast de plan lleno o cualquier pantalla.
 */
export function HojaInventario({ abierta, alCerrar, vistaAlAbrir, ahora }: { abierta: boolean; alCerrar: () => void; vistaAlAbrir: VistaInventario; /** Cuándo se abrió (ms): las ventas de "30 días" se cuentan desde ahí. */ ahora: number }) {
  const { getProductos, getPedidos } = useData();
  const { tiendaId, tienda } = useTiendaActiva();
  const { data: productos } = useConsulta(`productos:${tiendaId}`, () => getProductos(tiendaId));
  const { data: pedidos } = useConsulta(`pedidos:${tiendaId}`, () => getPedidos(tiendaId));

  // Vista actual y lo marcado en "Por reponer" (cantidad por producto): duran lo que la hoja esté abierta. Se reinician al abrir.
  const [vista, setVista] = useState<VistaInventario>(vistaAlAbrir);
  const [marcados, setMarcados] = useState<Record<string, number> | null>(null);
  const [estabaAbierta, setEstabaAbierta] = useState(abierta);
  if (abierta !== estabaAbierta) {
    setEstabaAbierta(abierta);
    if (abierta) {
      setVista(vistaAlAbrir);
      setMarcados(null);
    }
  }

  const ventas = useMemo(() => ventasPorProducto(pedidos ?? [], ahora), [pedidos, ahora]);
  const alVolver = () => setVista("resumen");
  // Al entrar a "Por reponer" por primera vez, vienen marcados los vendidos y agotados (y "Hacer espacio" ya sabe cuáles).
  const abrirVista = (v: VistaInventario) => {
    if (v === "porReponer" && marcados === null && productos) setMarcados(seleccionInicial(porReponer(productos, ventas)));
    setVista(v);
  };

  if (!tienda) return null;

  return (
    <Hoja
      abierta={abierta}
      alCerrar={alCerrar}
      titulo={TITULO[vista]}
            alVolverInterno={() => {
        if (vista === "resumen") return false;
        setVista("resumen");
        return true;
      }}
      fijoArriba={
        vista === "resumen" ? undefined : (
          <div className="flex items-center gap-2 text-secundario font-extrabold text-texto">
            <BotonVolver onClick={alVolver} etiqueta="Volver a Tu inventario" />
            <span aria-hidden="true">Tu inventario</span>
          </div>
        )
      }
    >
      {!productos ? (
        <p role="status" className="py-8 text-center text-texto-secundario">
          Cargando tu inventario…
        </p>
      ) : vista === "resumen" ? (
        <Resumen
          productos={productos}
          ventas={ventas}
          ahora={ahora}
          alAbrir={abrirVista}
          alCerrarHoja={alCerrar}
        />
      ) : vista === "porReponer" ? (
        <VistaPorReponer productos={productos} ventas={ventas} marcados={marcados} alCambiarMarcados={setMarcados} alTerminar={alVolver} />
      ) : vista === "sinMovimiento" ? (
        <VistaSinMovimiento productos={productos} ventas={ventas} ahora={ahora} alCerrarHoja={alCerrar} />
      ) : (
        <VistaHacerEspacio productos={productos} ventas={ventas} enReposicion={marcados} alTerminar={alVolver} />
      )}
    </Hoja>
  );
}

type VentasMapa = ReturnType<typeof ventasPorProducto>;

function Resumen({ productos, ventas, ahora, alAbrir, alCerrarHoja }: { productos: Producto[]; ventas: VentasMapa; ahora: number; alAbrir: (v: VistaInventario) => void; alCerrarHoja: () => void }) {
  const { tienda } = useTiendaActiva();
  const { mostrarToast } = useToastUI();
  const { cambiarVisibilidad } = useData();
  const { abrirPlan, filtrarCatalogo } = usePanelUI();
  const [ocultando, setOcultando] = useState(false);

  const limite = tienda?.limiteProductos ?? 0;
  const plan = resumenDelPlan(productos, limite);
  const salud = saludDelInventario(productos);
  const textos = textosDelPlan(plan);
  const reponer = porReponer(productos, ventas);
  const agotadosAVista = productos.filter((p) => p.activo && p.stock === 0);
  const quietos = sinMovimiento(productos, ventas, ahora);
  const vendidosAgotados = reponer.vendidos.length;
  const paraReponer = [...reponer.vendidos, ...reponer.sinVentas];

  const filtrar = (f: FiltroCatalogo) => {
    alCerrarHoja();
    filtrarCatalogo(f);
  };

  const ocultarAgotados = async () => {
    if (ocultando) return;
    const ids = agotadosAVista.map((p) => p.id);
    setOcultando(true);
    try {
      await cambiarVisibilidad(tienda!.id, ids, false);
      mostrarToast(`Ocultaste ${ids.length}`, {
        accion: {
          texto: "Deshacer",
          alTocar: () => void cambiarVisibilidad(tienda!.id, ids, true).catch((e) => mostrarToast(mensajeDeError(e, "No se pudo deshacer."))),
        },
      });
    } catch (e) {
      mostrarToast(mensajeDeError(e, "No se pudo ocultar. Inténtalo otra vez."));
    } finally {
      setOcultando(false);
    }
  };

  const hayAtencion = paraReponer.length > 0 || agotadosAVista.length > 0 || quietos.length > 0;
  const libre = Math.max(0, plan.limite - plan.usados);
  const base = Math.max(plan.limite, plan.usados, 1);
  const conStock = salud.conStock + salud.quedan;
  const etiquetaBarra = `Plan de ${plan.limite} productos: ${conStock} visibles con stock, ${salud.agotados} agotados y ${libre} libres`;

  return (
    <div className="flex flex-col gap-6">
      {/* Resumen: dona y leyenda tocable */}
      <section aria-label="Salud del inventario" className="flex items-center gap-5">
        <DonaInventario salud={salud} tamano={112} grosor={12} cifra="text-cifra" />
        <ul className="min-w-0 flex-1">
          {(
            [
              { nombre: "Con stock", valor: salud.conStock, color: COLOR_STOCK.conStock, filtro: "visibles" },
              { nombre: "Queda 1 o 2", valor: salud.quedan, color: COLOR_STOCK.quedan, filtro: "por_agotarse" },
              { nombre: "Agotados", valor: salud.agotados, color: COLOR_STOCK.agotados, filtro: "agotados" },
            ] as const
          ).map((fila) => (
            <li key={fila.nombre}>
              <button
                type="button"
                onClick={() => filtrar(fila.filtro)}
                className="tocable flex h-(--alto-control) w-full items-center gap-2.5 rounded-radio-s text-left outline-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco"
              >
                <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: fila.color }} />
                <span className="min-w-0 flex-1 truncate text-cuerpo text-texto">{fila.nombre}</span>
                <span className="text-destacado text-texto tabular-nums">{fila.valor}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {hayAtencion && (
        <section aria-labelledby="atencion-inventario" className="flex flex-col gap-3">
          <h3 id="atencion-inventario" className="text-destacado text-texto">
            Necesita tu atención
          </h3>
          {paraReponer.length > 0 && (
            <Tarjeta onClick={() => alAbrir("porReponer")} etiqueta="Por reponer">
              <div className="flex items-center gap-3">
                <IconoPedidos tamano={26} className="shrink-0 text-texto" />
                <div className="min-w-0 flex-1">
                  <p className="text-destacado text-texto">Por reponer</p>
                  <p className="text-secundario text-texto-secundario">{vendidosAgotados > 0 ? `${vendidosAgotados} se fueron volando` : `${paraReponer.length} agotados`}</p>
                </div>
                <IconoChevronDerecha tamano={20} strokeWidth={2.2} className="shrink-0 text-texto-secundario" />
              </div>
              <div aria-hidden="true" className="mt-3 flex -space-x-2">
                {paraReponer.slice(0, 4).map((l) => (
                  <MiniaturaProducto key={l.producto.id} producto={l.producto} className="size-10 border-2 border-superficie" />
                ))}
              </div>
            </Tarjeta>
          )}
          {agotadosAVista.length > 0 && (
            <Tarjeta>
              <div className="flex items-center gap-3">
                <span className="shrink-0 text-texto">
                  <IconoOjo />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-destacado text-texto">
                    {agotadosAVista.length === 1 ? "1 agotado sigue a la vista" : `${agotadosAVista.length} agotados siguen a la vista`}
                  </p>
                  <p className="text-secundario text-texto-secundario">
                    {agotadosAVista.length === 1 ? "Ocupa 1 lugar de tu plan" : `Ocupan ${agotadosAVista.length} lugares de tu plan`}
                  </p>
                </div>
                <Boton jerarquia="secundario" tamano="compacto" cargando={ocultando} onClick={() => void ocultarAgotados()}>
                  Ocultarlos
                </Boton>
              </div>
            </Tarjeta>
          )}
          {quietos.length > 0 && (
            <Tarjeta onClick={() => alAbrir("sinMovimiento")} etiqueta="Sin movimiento">
              <div className="flex items-center gap-3">
                <IconoReloj tamano={26} className="shrink-0 text-texto" />
                <div className="min-w-0 flex-1">
                  <p className="text-destacado text-texto">Sin movimiento</p>
                  <p className="text-secundario text-texto-secundario">
                    {quietos.length} sin venderse en {DIAS_SIN_MOVIMIENTO} días · hazles una promo
                  </p>
                </div>
                <IconoChevronDerecha tamano={20} strokeWidth={2.2} className="shrink-0 text-texto-secundario" />
              </div>
            </Tarjeta>
          )}
        </section>
      )}

      {/* Plan: título que cambia según el espacio, fuera de la tarjeta */}
      <section aria-labelledby="titulo-plan-inventario" className="flex flex-col gap-3">
        <div>
          <h3 id="titulo-plan-inventario" className="font-display text-titulo-hoja text-texto">
            {textos.titulo}
          </h3>
          <p className="text-secundario text-texto-secundario">{textos.subtitulo}</p>
        </div>
        <Tarjeta>
          <p className="text-destacado text-texto">{tienda ? NOMBRE_PLAN[tienda.plan] : "Tu plan"}</p>
          <p className="text-secundario text-texto-secundario">
            {plan.usados} visibles de {plan.limite}
          </p>
          <div role="img" aria-label={etiquetaBarra} className="mt-3 flex h-3 gap-[3px] overflow-hidden rounded-full">
            {[
              { valor: conStock, clase: "bg-accion" },
              { valor: salud.agotados, clase: "bg-resalte" },
              { valor: libre, clase: "bg-superficie-hundida" },
            ]
              .filter((t) => t.valor > 0)
              .map((t) => (
                <span key={t.clase} className={`block min-w-1 rounded-full transition-[flex-grow] duration-(--mov-normal) ease-(--curva-salida) ${t.clase}`} style={{ flexGrow: t.valor / base, flexBasis: 0 }} />
              ))}
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
            {[
              { nombre: "Con stock", valor: conStock, clase: "bg-accion" },
              { nombre: "Agotados", valor: salud.agotados, clase: "bg-resalte" },
              { nombre: "Libres", valor: libre, clase: "bg-superficie-hundida" },
            ].map((l) => (
              <div key={l.nombre} className="flex items-center gap-2 text-secundario">
                <span aria-hidden="true" className={`size-2.5 shrink-0 rounded-full ${l.clase}`} />
                <dt className="min-w-0 flex-1 truncate text-texto-secundario">{l.nombre}</dt>
                <dd className="text-texto tabular-nums">{l.valor}</dd>
              </div>
            ))}
          </dl>
          <div className={`mt-4 ${plan.estado === "sobra" ? "flex" : "grid grid-cols-2 gap-3"}`}>
            <Boton jerarquia="secundario" tamano={plan.estado === "sobra" ? "compacto" : "normal"} anchoCompleto={plan.estado !== "sobra"} onClick={() => alAbrir("espacio")}>
              Hacer espacio
            </Boton>
            {plan.estado !== "sobra" && (
              <Boton onClick={abrirPlan} anchoCompleto>
                Subir de plan
              </Boton>
            )}
          </div>
        </Tarjeta>
      </section>
    </div>
  );
}

function VistaSinMovimiento({ productos, ventas, ahora, alCerrarHoja }: { productos: Producto[]; ventas: VentasMapa; ahora: number; alCerrarHoja: () => void }) {
  const router = useRouter();
  const quietos = sinMovimiento(productos, ventas, ahora);
  return (
    <div className="flex flex-col gap-4">
      <p className="text-secundario text-texto-secundario">
        {quietos.length} sin venderse en {DIAS_SIN_MOVIMIENTO} días. Una promo los puede mover.
      </p>
      <ListaAgrupada etiqueta="Productos sin movimiento">
        {quietos.map(({ producto: p }) => (
          <FilaLista key={p.id} inicio={<MiniaturaProducto producto={p} />} titulo={p.nombre} detalle={p.stock === 1 ? "Queda 1" : `${p.stock} en stock`} />
        ))}
      </ListaAgrupada>
      <Boton
        tamano="grande"
        anchoCompleto
        onClick={() => {
          alCerrarHoja();
          // Promos todavía no recibe productos preseleccionados: solo se navega.
          router.push("/promos/nueva", { scroll: false });
        }}
      >
        Crear promo
      </Boton>
    </div>
  );
}
