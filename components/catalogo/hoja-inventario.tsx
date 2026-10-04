"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { NOMBRE_PLAN, STOCK_BAJO } from "@/lib/config";
import { BotonVerMas, useVerMas } from "../ver-mas";
import { useConsulta, useTiendaActiva } from "@/lib/data/consulta";
import { mensajeDeError } from "@/lib/data/errores";
import { useData } from "@/lib/data/provider";
import { DIAS_SIN_MOVIMIENTO, etiquetaSalud, lecturaInventario, porcentajeDe, porReponer, saludDelInventario, seleccionInicial, sinMovimiento, stockParaSalud, ventasPorProducto } from "@/lib/inventario-catalogo";
import { resumenDelPlan, textosDelPlan } from "@/lib/plan-catalogo";
import type { Producto } from "@/lib/types";
import { Hoja } from "../hoja";
import { IconoChevronDerecha, IconoPedidos, IconoReloj } from "../iconos";
import { BotonVolver } from "../selector-busqueda";
import { usePanelUI } from "../panel/ui";
import { Boton, FilaLista, ListaAgrupada, ResumenDona, Tarjeta, useToastUI } from "../ui";
import { DetalleStock, Esperan } from "./stock-producto";
import { COLOR_STOCK, DonaInventario } from "./dona-inventario";
import { MiniaturaProducto } from "./miniatura-producto";
import { VistaHacerEspacio } from "./vista-hacer-espacio";
import { VistaPorReponer } from "./vista-por-reponer";

export type VistaInventario = "resumen" | "porReponer" | "sinMovimiento" | "espacio" | "grupo";
type GrupoInventario = "conStock" | "quedan" | "agotados";
const NOMBRE_GRUPO: Record<GrupoInventario, string> = { conStock: "Con stock", quedan: "Queda 1 o 2", agotados: "Agotados" };

const TITULO: Record<VistaInventario, string> = {
  resumen: "Tu inventario",
  porReponer: "Por reponer",
  sinMovimiento: "Sin movimiento",
  espacio: "Hacer espacio",
  grupo: "Tu inventario",
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
  const [grupo, setGrupo] = useState<GrupoInventario>("conStock");
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
      titulo={vista === "grupo" ? `${NOMBRE_GRUPO[grupo]}\u00a0·\u00a0${saludDelInventario(productos ?? [])[grupo]}` : TITULO[vista]}
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
          alAbrirGrupo={(g) => {
            setGrupo(g);
            setVista("grupo");
          }}
        />
      ) : vista === "grupo" ? (
        <VistaGrupoInventario productos={productos} grupo={grupo} alCerrarHoja={alCerrar} />
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

function Resumen({ productos, ventas, ahora, alAbrir, alAbrirGrupo }: { productos: Producto[]; ventas: VentasMapa; ahora: number; alAbrir: (v: VistaInventario) => void; alAbrirGrupo: (g: GrupoInventario) => void }) {
  const { tienda } = useTiendaActiva();
  const { mostrarToast } = useToastUI();
  const { cambiarVisibilidad } = useData();
  const { abrirPlan } = usePanelUI();
  const [ocultando, setOcultando] = useState(false);

  const limite = tienda?.limiteProductos ?? 0;
  const plan = resumenDelPlan(productos, limite);
  const salud = saludDelInventario(productos);
  const lectura = lecturaInventario(salud);
  const textos = textosDelPlan(plan);
  const reponer = porReponer(productos, ventas);
  const agotadosAVista = productos.filter((p) => p.activo && p.stock === 0);
  const quietos = sinMovimiento(productos, ventas, ahora);
  const vendidosAgotados = reponer.vendidos.length;
  // También cuentan los productos con alguna opción agotada aunque queden de otras (se reponen por variante).
  const conOpcionAgotada = reponer.seAcaban.filter((l) => (l.producto.variantes ?? []).some((v) => v.activa && v.stock === 0));
  const paraReponer = [...reponer.vendidos, ...reponer.sinVentas, ...conOpcionAgotada];

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
  const etiquetaBarra = `Plan de ${plan.limite} productos: ${salud.disponibles} disponibles, ${salud.agotados} agotados y ${libre} libres`;

  return (
    <ResumenDona
      dona={<DonaInventario salud={salud} tamano={112} grosor={12} cifra="text-cifra" />}
      etiquetaDona={etiquetaSalud(salud)}
      titulo={lectura.titulo}
      linea={lectura.linea}
      leyenda={(
        [
          { id: "conStock", nombre: "Con stock", color: COLOR_STOCK.conStock, valor: salud.conStock },
          { id: "quedan", nombre: "Queda 1 o 2", color: COLOR_STOCK.quedan, valor: salud.quedan },
          { id: "agotados", nombre: "Agotados", color: COLOR_STOCK.agotados, valor: salud.agotados },
        ] as const
      ).map((f) => ({ ...f, subtitulo: `${porcentajeDe(f.valor, salud.total)} %`, alTocar: () => alAbrirGrupo(f.id) }))}
      etiquetaLeyenda="Salud del inventario"
    >
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
                  <p className="text-secundario text-texto-secundario">{vendidosAgotados > 0
                      ? vendidosAgotados === 1
                        ? "1 se fue volando"
                        : `${vendidosAgotados} se fueron volando`
                      : paraReponer.length === 1
                        ? "1 agotado"
                        : `${paraReponer.length} agotados`}</p>
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
          <div role="img" aria-label={etiquetaBarra} className="mt-3 flex h-3 gap-[3px]">
            {[
              { valor: salud.disponibles, color: COLOR_STOCK.conStock },
              { valor: salud.agotados, color: COLOR_STOCK.agotados },
              { valor: libre, color: "var(--superficie-hundida)" },
            ]
              .filter((t) => t.valor > 0)
              .map((t) => (
                <span key={t.color} className="block min-w-3 rounded-full transition-[flex-grow] duration-(--mov-normal) ease-(--curva-salida)" style={{ flexGrow: t.valor / base, flexBasis: 0, backgroundColor: t.color }} />
              ))}
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
            {[
              { nombre: "Disponibles", valor: salud.disponibles, color: COLOR_STOCK.conStock },
              { nombre: "Agotados", valor: salud.agotados, color: COLOR_STOCK.agotados },
              { nombre: "Libres", valor: libre, color: "var(--superficie-hundida)" },
            ].map((l) => (
              <div key={l.nombre} className="flex items-center gap-2 text-secundario">
                <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: l.color }} />
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
    </ResumenDona>
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
          <FilaLista key={p.id} inicio={<MiniaturaProducto producto={p} />} titulo={p.nombre} detalle={<DetalleStock producto={p} />} />
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

/** Vista interna de un grupo de la leyenda: sus productos visibles; tocar uno abre su hoja. */
function VistaGrupoInventario({ productos, grupo, alCerrarHoja }: { productos: Producto[]; grupo: GrupoInventario; alCerrarHoja: () => void }) {
  const router = useRouter();
  const { avisosPendientes } = useData();
  const { tiendaId } = useTiendaActiva();
  const { data: avisos } = useConsulta(`avisos:${tiendaId}`, () => avisosPendientes(tiendaId));
  const cumple = (p: Producto) => {
    const stock = stockParaSalud(p);
    return p.activo && (grupo === "agotados" ? stock === 0 : grupo === "quedan" ? stock !== null && stock > 0 && stock <= STOCK_BAJO : stock === null || stock > STOCK_BAJO);
  };
  const lista = productos.filter(cumple).sort((a, b) => (stockParaSalud(a) ?? Infinity) - (stockParaSalud(b) ?? Infinity) || a.nombre.localeCompare(b.nombre, "es"));
  const paginada = useVerMas(lista, `grupo:${grupo}`);
  return (
    <div className="pb-6">
      <ListaAgrupada etiqueta={NOMBRE_GRUPO[grupo]}>
        {paginada.visibles.map((p) => (
          <FilaLista
            key={p.id}
            inicio={<MiniaturaProducto producto={p} atenuada={p.stock === 0} />}
            titulo={p.nombre}
            detalle={<DetalleStock producto={p} />}
            accion={(avisos ?? []).some((a) => a.productoId === p.id) ? <Esperan producto={p} avisos={(avisos ?? []).filter((a) => a.productoId === p.id)} /> : undefined}
            onClick={() => {
              alCerrarHoja();
              router.push(`/catalogo/${p.id}`, { scroll: false });
            }}
          />
        ))}
        <BotonVerMas forma="fila" quedan={paginada.quedan} mostrados={paginada.mostrados} total={lista.length} alTocar={paginada.verMas} />
      </ListaAgrupada>
    </div>
  );
}
