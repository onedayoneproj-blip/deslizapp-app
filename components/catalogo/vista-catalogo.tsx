"use client";

import { usePermisos } from "@/lib/data/permisos";
import { useToast } from "../toast";
import Link from "next/link";
import { startTransition, useMemo, useState } from "react";
import { DonaInventario } from "./dona-inventario";
import { useConsulta, useTiendaActiva } from "@/lib/data/consulta";
import { useData } from "@/lib/data/provider";
import { formatearPesos } from "@/lib/formato";
import { resumenDeProducto, textoPresentaciones } from "@/lib/presentaciones";
import { etiquetaSalud, saludDelInventario, stockParaSalud, etiquetaStock } from "@/lib/inventario-catalogo";
import { Esperan } from "./stock-producto";
import { Aviso } from "../ui";
import type { AvisoLlegada } from "@/lib/types";
import { STOCK_BAJO } from "@/lib/config";
import { resumenDelPlan } from "@/lib/plan-catalogo";
import { precioConPromo } from "@/lib/promos";
import type { Producto, Promo } from "@/lib/types";
import { Segmentos } from "../controles";
import { EstadoVacio } from "../estado-vacio";
import { Esqueleto } from "../esqueleto";
import { Foto } from "../foto";
import { Etiqueta } from "../ui";
import { IconoBuscar, IconoCorazon } from "../iconos";
import { SeccionCatalogo } from "./seccion-catalogo";
import { BotonFlotante } from "../panel/boton-flotante";
import { TituloPantalla } from "../panel/titulo-pantalla";
import { usePanelUI } from "../panel/ui";
import { NOMBRE_TIPO, rubrosDeTienda, type Rubro } from "@/lib/rubros";
import { catalogoInicial, contarPorCatalogo, guardarCatalogoActivo, leerCatalogoActivo, productosDeCatalogo } from "@/lib/catalogo-activo";
import { SelectorCatalogo } from "./selector-catalogo";
import { HojaLoQueVendes } from "./hoja-lo-que-vendes";

const SUBTITULO_VARIOS = "Tus catálogos viven aquí. Toca el nombre y cambia.";
const SUBTITULO_UNO = "Lo que tus clientes deslizan. Tú solo lo mantienes bonito.";

type Filtro = "todos" | "visibles" | "por_agotarse" | "agotados" | "ocultos" | "en_espera";

/** Filtros cuyo contador va en Mandarina (piden acción del dueño). Fácil de cambiar aquí. */
const PIDEN_ATENCION: Filtro[] = ["agotados"];

const FILTROS: { id: Filtro; nombre: string; cumple: (p: Producto) => boolean }[] = [
  { id: "todos", nombre: "Todos", cumple: () => true },
  { id: "visibles", nombre: "Visibles", cumple: (p) => p.activo && p.stock !== 0 },
  // Con variantes: se está agotando si a alguna le queda 1 o 2 (docs/12 §2).
  { id: "por_agotarse", nombre: "Por agotarse", cumple: (p) => { const s = stockParaSalud(p); return p.activo && s !== null && s > 0 && s <= STOCK_BAJO; } },
  { id: "agotados", nombre: "Agotados", cumple: (p) => p.stock === 0 },
  { id: "ocultos", nombre: "Ocultos", cumple: (p) => !p.activo },
];

/** "Shé" → "she": para buscar sin que importen tildes ni mayúsculas. */
const normalizar = (texto: string) =>
  texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

/** Catálogo (pantalla 1): medidor del plan, buscador, filtros y grilla. */
export function VistaCatalogo() {
  const { getProductos, getPromos } = useData();
  const { puede, porque } = usePermisos();
  const sinCatalogo = !puede("catalogo");
  const toast = useToast();
  const { tiendaId, tienda } = useTiendaActiva();
  const { abrirInventario, espera } = usePanelUI();
  const { data: productos } = useConsulta(`productos:${tiendaId}`, () => getProductos(tiendaId));
  const { data: promos } = useConsulta(`promos:${tiendaId}`, () => getPromos(tiendaId));
  // El texto del buscador responde al instante; la grilla se actualiza dentro de una transición
  // para que los productos entren, salgan y se reacomoden con suavidad.
  const [busqueda, setBusqueda] = useState("");
  const [busquedaAplicada, setBusquedaAplicada] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  // Un catálogo a la vez (sin «Todo»): solo con más de un rubro. Abre el último que miró esta persona, o el principal.
  const [catalogoElegido, setCatalogoElegido] = useState<Rubro | null>(null);
  const [vendiendoOtra, setVendiendoOtra] = useState(false);
  const tipos = tienda ? rubrosDeTienda(tienda) : [];
  const variosTipos = tipos.length > 1;
  const catalogo: Rubro | null = tienda && variosTipos ? (catalogoElegido && tipos.includes(catalogoElegido) ? catalogoElegido : catalogoInicial(tienda, leerCatalogoActivo(tienda.id))) : null;
  const delCatalogo = useMemo(() => (productos && tienda && catalogo ? productosDeCatalogo(productos, tienda, catalogo) : productos), [productos, tienda, catalogo]);
  const conteo = useMemo(() => (productos && tienda && variosTipos ? contarPorCatalogo(productos, tienda) : undefined), [productos, tienda, variosTipos]);
  // true si el último cambio de la lista se hizo con el teclado abierto: ahí NO hay transición de
  // vista (le quitaría el foco al campo) y los productos que entran lo hacen con un fundido CSS.

  const visibles = useMemo(() => {
    const cumple = filtro === "en_espera" ? (p: Producto) => Boolean(espera.resumen?.porProducto.has(p.id)) : FILTROS.find((f) => f.id === filtro)!.cumple;
    const q = normalizar(busquedaAplicada);
    return (delCatalogo ?? []).filter((p) => cumple(p) && (!q || normalizar(p.nombre).includes(q)));
  }, [delCatalogo, filtro, busquedaAplicada, espera.resumen]);

  // Salud del inventario (solo visibles) y estado del plan (los ocultos no ocupan lugar).
  const salud = saludDelInventario(productos ?? []);
  const lleno = resumenDelPlan(productos ?? [], tienda?.limiteProductos ?? 0).estado === "lleno";

  return (
    <>
      <TituloPantalla
        titulo={tienda && catalogo ? (
          <SelectorCatalogo
            tipos={tipos} valor={catalogo} conteo={conteo} tamano="pantalla" textoOtra="Lo que vendes…"
            alCambiar={(r) => { guardarCatalogoActivo(tienda.id, r); startTransition(() => setCatalogoElegido(r)); }}
            alVenderOtra={() => setVendiendoOtra(true)}
          />
        ) : "Tu catálogo"}
        subtitulo={variosTipos ? SUBTITULO_VARIOS : SUBTITULO_UNO}
        derecha={
        tienda && productos ? <button type="button" onClick={() => abrirInventario()} aria-label={etiquetaSalud(salud)}
          className="tocable flex w-20 shrink-0 flex-col items-center gap-1 rounded-radio-m">
          <DonaInventario className="dona-cabecera" salud={salud} cifra={String(salud.disponibles).length > 3 ? "dona-cifra-larga text-secundario" : "text-titulo-seccion"} />
          <span className="text-center text-etiqueta whitespace-nowrap text-texto-secundario">
            {salud.disponibles} {salud.disponibles === 1 ? "disponible" : "disponibles"}
            {salud.agotados > 0 && (
              <>
                <br />
                {salud.agotados} {salud.agotados === 1 ? "agotado" : "agotados"}
              </>
            )}
          </span>
        </button> : <Esqueleto className="h-[96px] w-[76px] shrink-0 rounded-full" />
      } />

      <div className="flex flex-col gap-3.5 px-5 pt-1">
        {tienda ? <SeccionCatalogo tienda={tienda} /> : <Esqueleto className="h-[76px] rounded-[22px]" />}
        <label className="flex h-12 items-center gap-2.5 rounded-full border-[1.5px] border-borde bg-white px-4">
          <IconoBuscar tamano={20} className="shrink-0 text-suave" />
          <span className="sr-only">Buscar producto</span>
          <input
            type="search"
            value={busqueda}
            onChange={(e) => {
              const valor = e.target.value;
              setBusqueda(valor);
              startTransition(() => setBusquedaAplicada(valor));
            }}
            placeholder={catalogo ? `Busca en ${NOMBRE_TIPO[catalogo]}` : "Busca un producto"}
            className="min-w-0 flex-1 bg-transparent text-base text-bosque outline-none placeholder:text-suave/80"
          />
        </label>

        <Segmentos
            etiqueta="Filtrar productos"
            valor={filtro}
            alCambiar={(id) =>
              startTransition(() => setFiltro(id))
            }
            opciones={[...FILTROS.map((f) => ({
              id: f.id,
              texto: f.nombre,
              cantidad: delCatalogo ? delCatalogo.filter(f.cumple).length : undefined,
              atencion: PIDEN_ATENCION.includes(f.id),
            })), ...((espera.resumen?.productos || filtro === "en_espera" || espera.error || !espera.resumen) ? [{ id: "en_espera" as const, texto: "En espera", cantidad: espera.error || espera.cargando ? undefined : espera.resumen?.productos, atencion: true }] : [])]}
          />

        {espera.error ? <Aviso tono="peligro" accion={{ texto: "Reintentar", alTocar: espera.reintentar }}>No pudimos leer las personas en espera.</Aviso> : espera.cargando && <p role="status" className="text-secundario text-texto-secundario">Actualizando personas en espera…</p>}
        {productos && visibles.length === 0 && !(filtro === "en_espera" && (espera.error || espera.cargando)) && (
          productos.length === 0 ? (
            <EstadoVacio
              ilustracion="catalogo"
              titulo="Tu vitrina está vacía."
              remate="Sube tu primera pieza y deja que tu gente diga aaah."
              accion={{ texto: "Publicar mi primer producto", href: "/catalogo/nuevo", bloqueado: sinCatalogo ? { motivo: porque, alTocar: () => toast(porque) } : undefined }}
            />
          ) : catalogo && delCatalogo?.length === 0 ? (
            <EstadoVacio
              pequeno
              ilustracion="catalogo"
              titulo={`Todavía no hay nada en ${NOMBRE_TIPO[catalogo]}.`}
              remate="Sube tu primera pieza y deja que tu gente diga aaah."
              accion={{ texto: "Agregar producto", href: "/catalogo/nuevo", bloqueado: sinCatalogo ? { motivo: porque, alTocar: () => toast(porque) } : undefined }}
            />
          ) : (
            <EstadoVacio pequeno ilustracion="catalogo" titulo={filtro === "en_espera" && espera.resumen?.productos === 0 ? "Nadie esperando por ahora." : "No encontramos nada con eso."} remate={filtro === "en_espera" && espera.resumen?.productos === 0 ? undefined : "Ni un suspiro. Prueba con otra palabra u otro filtro."} />
          )
        )}

        <ul className="grid grid-cols-2 gap-x-3 gap-y-4">
          {!productos &&
            Array.from({ length: 4 }, (_, i) => (
              <li key={i}>
                <Esqueleto className="aspect-[4/5] rounded-[20px]" />
                <Esqueleto className="mt-2 h-3.5 w-3/4 rounded-full" />
                <Esqueleto className="mt-1.5 h-3.5 w-1/2 rounded-full" />
              </li>
            ))}
          {visibles.map((p, i) => (
            <li key={p.id}>
              <TarjetaProducto producto={p} promos={promos ?? []} prioridad={i < 4} avisos={espera.error || espera.cargando ? [] : espera.resumen?.porProducto.get(p.id) ?? []}/>
            </li>
          ))}
        </ul>
      </div>

      {/* Sin productos, el botón del estado vacío ya invita a publicar: no se duplica */}
      {!(productos && productos.length === 0) && !(catalogo && delCatalogo?.length === 0) && <BotonFlotante href="/catalogo/nuevo" texto="Producto" detalle={lleno ? "plan lleno" : undefined} bloqueado={sinCatalogo ? () => toast(porque) : undefined} />}
      {vendiendoOtra && tienda && <HojaLoQueVendes tienda={tienda} alCerrar={() => setVendiendoOtra(false)} />}
    </>
  );
}

function TarjetaProducto({ producto: p, promos, prioridad = false, avisos }: { producto: Producto; promos: Promo[]; prioridad?: boolean; avisos: AvisoLlegada[] }) {
  const precio = precioConPromo(p, promos);
  const agotado = p.stock === 0;
  const stock = etiquetaStock(p);
  // Con presentaciones: «Desde RD$ X · N presentaciones» y, en vez de «N en stock», «N agotadas» y «N en total».
  const pres = resumenDeProducto(p);
  const desde = pres?.desde != null ? precioConPromo({ ...p, precio: pres.desde }, promos).precio : null;
  const etiquetasPres: { texto: string; tono: "neutro" | "exito" | "atencion" | "fuerte" }[] = !pres
    ? []
    : pres.agotadas === pres.total
      ? [{ texto: "Agotado", tono: "fuerte" }]
      : pres.agotadas > 0
        ? [{ texto: `${pres.agotadas} ${pres.agotadas === 1 ? "agotada" : "agotadas"}`, tono: "atencion" }, { texto: `${pres.enTotal} en total`, tono: "neutro" }]
        : [{ texto: "Hay de todas", tono: "exito" }];
  const etiqueta = precio.porcentaje ? { texto: `−${precio.porcentaje}%`, clase: "bg-mandarina text-bosque-oscuro" } : null;
  // Nombre accesible = el texto visible de la tarjeta en el mismo orden (WCAG 2.5.3: nombre, precio, stock y después las
  // etiquetas de la foto), separado por comas para que se lea con pausas, y al final la acción.
  const nombreAccesible = [p.nombre, pres && desde != null ? `Desde ${formatearPesos(desde)}, ${textoPresentaciones(pres.total)}` : formatearPesos(precio.precio), precio.precioAntes ? formatearPesos(precio.precioAntes) : "", ...(pres ? etiquetasPres.map((e) => e.texto) : [stock.texto]), !p.activo ? "Oculto del catálogo" : "", etiqueta?.texto ?? "", p.fotoRetocada ? "Retocada ✦" : "", `${p.likes} ${p.likes === 1 ? "like" : "likes"}`]
    .filter(Boolean)
    .join(",") + ". Ver producto";

  return (
    <div className="min-w-0">
    <Link
      href={`/catalogo/${p.id}`}
      scroll={false}
      aria-label={nombreAccesible}
      className="tocable block min-w-0 text-texto"
    >
      <div className="flex flex-col">
        <div className="order-2">
      <div className="mt-2 flex items-start gap-2">
        <p className="min-w-0 flex-1 break-words text-secundario font-extrabold">{p.nombre}</p>

      </div>
      <p className="mt-0.5 flex items-baseline gap-1.5">
        {pres && desde != null ? (
          <span className="text-secundario font-extrabold">Desde {formatearPesos(desde)} · {textoPresentaciones(pres.total)}</span>
        ) : (
          <>
            <span className="text-[14.5px] font-extrabold">{formatearPesos(precio.precio)}</span>
            {precio.precioAntes && <span className="text-[12.5px] text-suave line-through">{formatearPesos(precio.precioAntes)}</span>}
          </>
        )}
      </p>
      <div className="mt-1 flex flex-col items-start gap-1">{(pres ? etiquetasPres : [stock]).map((e) => <Etiqueta key={e.texto} tono={e.tono} className="h-auto min-h-(--alto-etiqueta) max-w-full py-1 whitespace-normal">{e.texto}</Etiqueta>)}{!p.activo && <span className="text-etiqueta text-texto-secundario">Oculto del catálogo</span>}</div>
        </div>
        <div className="order-1 relative aspect-[4/5] overflow-hidden rounded-[20px] bg-arena">
        {p.fotos[0] ? (
          <Foto src={p.fotos[0]} alt="" prioridad={prioridad} className={`h-full w-full ${agotado ? "grayscale" : ""} ${p.activo ? "" : "opacity-50"}`} sizes="(max-width: 480px) 50vw, 220px" />
        ) : (
          <span className="grid h-full place-items-center font-display text-4xl text-bosque/30">{p.nombre[0]}</span>
        )}
        <span aria-hidden="true" data-likes-panel className="absolute right-2.5 bottom-2.5 inline-flex max-w-[calc(100%-1.25rem)] items-center justify-center gap-1.5 rounded-full border border-linea bg-marca-papel px-2 py-1 text-etiqueta font-extrabold tabular-nums text-texto">
          <IconoCorazon tamano={16} fill="currentColor" className="shrink-0 text-marca-mandarina" />
          <span className="min-w-0 break-all text-center">{p.likes}</span>
        </span>
        {etiqueta && (
          <span aria-hidden="true" className={`absolute top-2.5 left-2.5 rounded-full px-2.5 py-1 text-xs font-extrabold ${etiqueta.clase}`}>
            {etiqueta.texto}
          </span>
        )}
        {p.fotoRetocada && (
          <span aria-hidden="true" className="absolute bottom-2.5 left-2.5 max-w-1/2 rounded-full bg-bosque px-2 py-[3px] text-[11px] font-extrabold text-papel">
            Retocada ✦
          </span>
        )}
      </div>
      </div>
    </Link>
    {avisos.length > 0 && <Esperan producto={p} avisos={avisos} forma="fila"/>}
    </div>
  );
}
