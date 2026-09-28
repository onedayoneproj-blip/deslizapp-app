"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { NOMBRE_PLAN } from "@/lib/config";
import { useConsulta, useTiendaActiva } from "@/lib/data/consulta";
import { useData } from "@/lib/data/provider";
import { formatearPesos } from "@/lib/formato";
import { precioConPromo } from "@/lib/promos";
import type { Producto, Promo } from "@/lib/types";
import { Chip } from "../controles";
import { Foto } from "../foto";
import { IconoBuscar } from "../iconos";
import { BotonFlotante } from "../panel/boton-flotante";
import { TituloPantalla } from "../panel/titulo-pantalla";
import { usePanelUI } from "../panel/ui";

type Filtro = "todos" | "visibles" | "agotados" | "ocultos";

const FILTROS: { id: Filtro; nombre: string; cumple: (p: Producto) => boolean }[] = [
  { id: "todos", nombre: "Todos", cumple: () => true },
  { id: "visibles", nombre: "Visibles", cumple: (p) => p.activo && p.stock !== 0 },
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
  const { tiendaId, tienda } = useTiendaActiva();
  const { abrirPlan } = usePanelUI();
  const { data: productos } = useConsulta(`productos:${tiendaId}`, () => getProductos(tiendaId));
  const { data: promos } = useConsulta(`promos:${tiendaId}`, () => getPromos(tiendaId));
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");

  const visibles = useMemo(() => {
    const cumple = FILTROS.find((f) => f.id === filtro)!.cumple;
    const q = normalizar(busqueda);
    return (productos ?? []).filter((p) => cumple(p) && (!q || normalizar(p.nombre).includes(q)));
  }, [productos, filtro, busqueda]);

  const usados = productos?.length ?? 0;
  const limite = tienda?.limiteProductos ?? 0;
  const lleno = limite > 0 && usados >= limite;
  const porcentaje = limite ? Math.min(100, Math.round((usados / limite) * 100)) : 0;

  return (
    <>
      <TituloPantalla titulo="Tu catálogo" subtitulo="Lo que tus clientes deslizan. Tú solo lo mantienes bonito." />

      <div className="flex flex-col gap-3.5 px-5 pt-3.5">
        {tienda && productos && (
          <button
            type="button"
            onClick={abrirPlan}
            className={`block w-full rounded-[22px] px-4 py-3.5 text-left text-bosque ${lleno ? "bg-mandarina" : "bg-rosa"}`}
          >
            <span className="flex items-baseline justify-between gap-2.5">
              <span className="text-[15px] font-extrabold">
                {lleno ? `Catálogo lleno: ${usados} de ${limite}` : `${usados} de ${limite} productos`}
              </span>
              <span className="text-[13px] font-bold underline">{lleno ? "Subir de plan" : "Ver plan"}</span>
            </span>
            <span className="mt-2.5 block h-2.5 overflow-hidden rounded-full bg-papel">
              <span className="block h-2.5 rounded-full bg-bosque" style={{ width: `${porcentaje}%` }} />
            </span>
            <span className="mt-[7px] block text-[13px] font-semibold">
              {lleno
                ? "Lleno… de éxito. Para agregar más, sube de plan."
                : `${NOMBRE_PLAN[tienda.plan]} · te quedan ${limite - usados} ${limite - usados === 1 ? "espacio" : "espacios"}`}
            </span>
          </button>
        )}

        <label className="flex h-12 items-center gap-2.5 rounded-full border-[1.5px] border-borde bg-white px-4">
          <IconoBuscar tamano={20} className="shrink-0 text-suave" />
          <span className="sr-only">Buscar producto</span>
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Busca un producto"
            className="min-w-0 flex-1 bg-transparent text-base text-bosque outline-none placeholder:text-suave/80"
          />
        </label>

        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-0.5 [scrollbar-width:none]">
          {FILTROS.map((f) => (
            <Chip key={f.id} elegido={filtro === f.id} onClick={() => setFiltro(f.id)}>
              {f.nombre} {productos?.filter(f.cumple).length ?? ""}
            </Chip>
          ))}
        </div>

        {productos && visibles.length === 0 && (
          <div className="px-2.5 py-8 text-center text-suave">
            <p className="font-display text-xl text-bosque">Nada por aquí.</p>
            <p>{productos.length === 0 ? "Tu vitrina está esperando su primera estrella." : "Ni un suspiro. Prueba con otro filtro."}</p>
          </div>
        )}

        <ul className="grid grid-cols-2 gap-x-3 gap-y-4">
          {visibles.map((p) => (
            <li key={p.id}>
              <TarjetaProducto producto={p} promos={promos ?? []} />
            </li>
          ))}
        </ul>
      </div>

      <BotonFlotante href="/catalogo/nuevo" texto="Producto" detalle={lleno ? "plan lleno" : undefined} />
    </>
  );
}

function TarjetaProducto({ producto: p, promos }: { producto: Producto; promos: Promo[] }) {
  const precio = precioConPromo(p, promos);
  const agotado = p.stock === 0;
  const etiqueta = agotado
    ? { texto: "Agotado", clase: "bg-bosque text-papel" }
    : !p.activo
      ? { texto: "Oculto", clase: "bg-papel text-bosque" }
      : precio.porcentaje
        ? { texto: `−${precio.porcentaje}%`, clase: "bg-mandarina text-bosque-oscuro" }
        : null;
  const stock = p.stock === null ? "Sin control de stock" : agotado ? "Sin stock" : `${p.stock} en stock`;

  return (
    <Link
      href={`/catalogo/${p.id}`}
      scroll={false}
      aria-label={`Editar ${p.nombre}`}
      className={`block text-bosque ${p.activo ? "" : "opacity-60"}`}
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-[20px] bg-arena">
        {p.fotos[0] ? (
          <Foto src={p.fotos[0]} alt="" className={`h-full w-full ${agotado ? "grayscale" : ""}`} sizes="(max-width: 480px) 50vw, 220px" />
        ) : (
          <span className="grid h-full place-items-center font-display text-4xl text-bosque/30">{p.nombre[0]}</span>
        )}
        {etiqueta && (
          <span className={`absolute top-2.5 left-2.5 rounded-full px-2.5 py-1 text-xs font-extrabold ${etiqueta.clase}`}>
            {etiqueta.texto}
          </span>
        )}
        {p.fotoRetocada && (
          <span className="absolute bottom-2.5 left-2.5 rounded-full bg-bosque px-2 py-[3px] text-[11px] font-extrabold text-papel">
            Retocada ✦
          </span>
        )}
        <span className="absolute right-2.5 bottom-2.5 rounded-full bg-white px-[9px] py-[3px] text-xs font-extrabold">♥ {p.likes}</span>
      </div>
      <p className="mt-2 text-[14.5px] leading-tight font-extrabold">{p.nombre}</p>
      <p className="mt-0.5 flex items-baseline gap-1.5">
        <span className="text-[14.5px] font-extrabold">{formatearPesos(precio.precio)}</span>
        {precio.precioAntes && <span className="text-[12.5px] text-suave line-through">{formatearPesos(precio.precioAntes)}</span>}
      </p>
      <p className="text-[12.5px] font-semibold text-suave">{stock}</p>
    </Link>
  );
}
