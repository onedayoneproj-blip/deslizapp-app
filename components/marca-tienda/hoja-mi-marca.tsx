"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useConsulta, useTiendaActiva } from "@/lib/data/consulta";
import { mensajeDeError } from "@/lib/data/errores";
import { useData } from "@/lib/data/provider";
import { cargarFuentesMarca, familiaTexto, familiaTitulo } from "@/lib/fuentes-marca";
import { iniciales } from "@/lib/formato";
import { pixelesDeImagen, reducirLogo } from "@/lib/imagen";
import {
  coloresCupon,
  coloresDominantes,
  esHex,
  ESTILOS,
  marcaLegible,
  normalizarUrl,
  proponerCombinaciones,
  type EstiloMarca,
  type Marca,
} from "@/lib/marca";
import { estadoPromo } from "@/lib/promos";
import type { Promo, Tienda } from "@/lib/types";
import { Hoja } from "../hoja";
import { IconoCamara } from "../iconos";
import { useToast } from "../toast";
import { CuponTienda, marcaDeTienda } from "./cupon-tienda";

const ORDEN_ESTILOS: EstiloMarca[] = ["elegante", "moderna", "divertida", "clasica"];

/** "Mi marca": logo, colores, estilo tipográfico y enlace del catálogo de la tienda activa. */
export function HojaMiMarca({ abierta, alCerrar }: { abierta: boolean; alCerrar: () => void }) {
  const { tienda } = useTiendaActiva();
  // "grande": tiene campos (enlace, colores) y la hoja no cambia de tamaño con el teclado (HANDOFF.md)
  return (
    <Hoja abierta={abierta} alCerrar={alCerrar} titulo="Mi marca" altura="grande">
      {tienda && <Formulario key={tienda.id} tienda={tienda} alTerminar={alCerrar} />}
    </Hoja>
  );
}

/** Promo de ejemplo para la vista previa (la primera activa de la tienda, o una inventada). */
function promoDeEjemplo(tienda: Tienda, promos: Promo[] | undefined): Promo {
  const activa = promos?.find((p) => !p.pausada && estadoPromo(p) === "activa");
  if (activa) return activa;
  const hoy = new Date();
  return {
    id: "ejemplo",
    tiendaId: tienda.id,
    tipo: "coleccion",
    nombre: "Semana del aaah",
    valorPorcentaje: 15,
    codigo: null,
    coleccion: "Favoritos",
    productoId: null,
    fechaInicio: hoy.toISOString(),
    fechaFin: new Date(hoy.getTime() + 7 * 86400000).toISOString(),
    estado: "activa",
    limiteUsos: null,
    pausada: false,
  };
}

function Formulario({ tienda, alTerminar }: { tienda: Tienda; alTerminar: () => void }) {
  const { actualizarMarca, getPromos, getProductos } = useData();
  const { tiendaId } = useTiendaActiva();
  const toast = useToast();
  const { data: promos } = useConsulta(`promos:${tiendaId}`, () => getPromos(tiendaId));
  const { data: productos } = useConsulta(`productos:${tiendaId}`, () => getProductos(tiendaId));

  const [logo, setLogo] = useState<string | null>(tienda.logoUrl);
  const [marca, setMarca] = useState<Marca>(() => marcaDeTienda(tienda));
  const [combos, setCombos] = useState<Marca[]>([]);
  const [url, setUrl] = useState(tienda.urlCatalogo ?? "");
  const [urlTocada, setUrlTocada] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const entradaLogo = useRef<HTMLInputElement>(null);

  // En esta hoja se ven los 4 estilos ("Aa"): se cargan sus fuentes solo mientras está abierta
  useEffect(() => {
    for (const e of ORDEN_ESTILOS) void cargarFuentesMarca(e);
  }, []);

  // Combinaciones a partir del logo actual (sin logo: la paleta neutra)
  useEffect(() => {
    let vigente = true;
    const calcular = async () => {
      const px = logo ? await pixelesDeImagen(logo) : null;
      if (vigente) setCombos(proponerCombinaciones(px ? coloresDominantes(px) : [], marca.estilo));
    };
    void calcular();
    return () => {
      vigente = false;
    };
    // Solo cuando cambia el logo (el estilo no cambia los colores)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logo]);

  const subirLogo = async (archivo: File | undefined) => {
    if (!archivo) return;
    setProcesando(true);
    try {
      const nuevo = await reducirLogo(archivo);
      const px = await pixelesDeImagen(nuevo);
      const propuestas = proponerCombinaciones(px ? coloresDominantes(px) : [], marca.estilo);
      setLogo(nuevo);
      setCombos(propuestas);
      // Se aplica la primera combinación por defecto
      if (propuestas[0]) setMarca((m) => ({ ...m, principal: propuestas[0]!.principal, acento: propuestas[0]!.acento }));
    } catch {
      toast("No pudimos leer ese logo. Prueba con otra imagen.");
    } finally {
      setProcesando(false);
    }
  };

  const legible = marcaLegible(marca);
  const ajustada = legible.principal !== marca.principal.toUpperCase() || legible.acento !== marca.acento.toUpperCase();
  const urlNormal = normalizarUrl(url);
  const urlMala = url.trim() !== "" && urlNormal === null;
  const ejemplo = useMemo(() => promoDeEjemplo(tienda, promos), [tienda, promos]);
  const producto = ejemplo.productoId ? productos?.find((p) => p.id === ejemplo.productoId) : undefined;
  const deColeccion = ejemplo.coleccion ? (productos?.filter((p) => p.categoria === ejemplo.coleccion).length ?? 0) : 0;

  const guardar = async () => {
    setUrlTocada(true);
    if (urlMala || guardando) return;
    setGuardando(true);
    try {
      await actualizarMarca(tiendaId, { logoUrl: logo, principal: legible.principal, acento: legible.acento, estilo: marca.estilo, urlCatalogo: urlNormal });
      toast("¡Tu marca quedó lista!");
      alTerminar();
    } catch (e) {
      toast(mensajeDeError(e, "No se pudo guardar. Inténtalo otra vez."));
      setGuardando(false);
    }
  };

  const titulo = (t: string) => <p className="mb-2 text-[13.5px] font-bold">{t}</p>;

  return (
    <div className="flex flex-col gap-5">
      <p className="-mb-2 text-[14px] text-suave">Así ven tus clientes tus cupones, imágenes y catálogo. El panel no cambia.</p>

      {/* Vista previa en vivo */}
      <div className="rounded-[22px] bg-[#FFF9EE] p-4 shadow-[inset_0_0_0_1px_var(--color-linea)]" data-vista-previa="">
        <CuponTienda promo={ejemplo} marca={legible} tienda={{ nombre: tienda.nombre, logoUrl: logo }} producto={producto} productosDeColeccion={deColeccion} />
      </div>

      {/* Logo */}
      <div>
        {titulo("Logo")}
        <div className="flex items-center gap-3">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element -- data URL del logo, sin optimizar
            <img src={logo} alt="Tu logo" className="h-16 w-16 rounded-[18px] border border-linea bg-white object-contain" />
          ) : (
            <span className="grid h-16 w-16 place-items-center rounded-[18px] text-xl font-bold" style={{ background: coloresCupon(legible).fondo, color: coloresCupon(legible).acento }}>
              {iniciales(tienda.nombre)}
            </span>
          )}
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => entradaLogo.current?.click()}
              disabled={procesando}
              className="tocable flex h-11 items-center gap-2 rounded-full border-[1.5px] border-bosque bg-white px-4 text-[14.5px] font-extrabold disabled:opacity-60"
            >
              <IconoCamara tamano={18} />
              {procesando ? "Leyendo colores…" : logo ? "Cambiar logo" : "Subir logo"}
            </button>
            {logo && (
              <button type="button" onClick={() => setLogo(null)} className="tocable flex min-h-11 items-center self-start px-1 text-[13px] font-bold text-suave">
                Quitar logo (usar iniciales)
              </button>
            )}
          </div>
          <input ref={entradaLogo} type="file" accept="image/*" hidden aria-label="Subir logo" onChange={(e) => void subirLogo(e.target.files?.[0])} />
        </div>
      </div>

      {/* Colores */}
      <div>
        {titulo("Colores")}
        <div role="group" aria-label="Combinaciones propuestas" className="grid grid-cols-3 gap-2">
          {combos.map((m, i) => {
            const elegida = m.principal === legible.principal && m.acento === legible.acento;
            const c = coloresCupon(m);
            return (
              <button
                key={`${m.principal}${m.acento}`}
                type="button"
                aria-pressed={elegida}
                aria-label={`Combinación ${i + 1}`}
                onClick={() => setMarca((x) => ({ ...x, principal: m.principal, acento: m.acento }))}
                className={`tocable flex h-[72px] flex-col items-center justify-center rounded-[16px] border-[3px] ${elegida ? "border-bosque" : "border-transparent"}`}
                style={{ background: c.fondo }}
                data-combinacion={`${m.principal}|${m.acento}`}
              >
                <span className="text-[24px] leading-none font-bold" style={{ color: c.acento, fontFamily: familiaTitulo(marca.estilo) }}>
                  15%
                </span>
                <span className="mt-1 text-[10px] font-bold tracking-wider" style={{ color: c.texto }}>
                  DESCUENTO
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <SelectorColor etiqueta="Principal" valor={marca.principal} alCambiar={(v) => setMarca((m) => ({ ...m, principal: v }))} />
          <SelectorColor etiqueta="Acento" valor={marca.acento} alCambiar={(v) => setMarca((m) => ({ ...m, acento: v }))} />
        </div>
        {ajustada && <p className="mt-2 text-[12.5px] font-semibold text-suave">Lo ajustamos un poquito para que se lea bien.</p>}
      </div>

      {/* Estilo */}
      <div>
        {titulo("Estilo de letra")}
        <div role="group" aria-label="Estilo de letra" className="grid grid-cols-2 gap-2">
          {ORDEN_ESTILOS.map((e) => {
            const elegido = marca.estilo === e;
            return (
              <button
                key={e}
                type="button"
                aria-pressed={elegido}
                onClick={() => setMarca((m) => ({ ...m, estilo: e }))}
                className={`tocable flex flex-col items-start rounded-[18px] border-[1.5px] bg-white px-4 py-3 text-left ${elegido ? "border-bosque shadow-[inset_0_0_0_1.5px_var(--color-bosque)]" : "border-borde"}`}
              >
                <span className="text-[32px] leading-tight" style={{ fontFamily: familiaTitulo(e), fontWeight: 700 }}>
                  Aa
                </span>
                <span className="text-[14px] font-bold" style={{ fontFamily: familiaTexto(e) }}>
                  {ESTILOS[e].nombre}
                </span>
                <span className="text-[11.5px] text-suave">
                  {ESTILOS[e].titulo} + {ESTILOS[e].texto}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Enlace */}
      <label className="flex flex-col gap-1.5 text-[13.5px] font-bold">
        <span>
          Enlace de tu catálogo <span className="font-semibold text-suave">(opcional)</span>
        </span>
        <input
          type="url"
          inputMode="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onBlur={() => setUrlTocada(true)}
          placeholder="Ej: instagram.com/tutienda"
          autoCapitalize="none"
          autoComplete="off"
          aria-invalid={(urlTocada && urlMala) || undefined}
          className={`h-[50px] w-full min-w-0 rounded-2xl border-[1.5px] bg-white px-3.5 text-base font-normal text-bosque outline-none focus:border-bosque ${urlTocada && urlMala ? "border-[#b4432a]" : "border-borde"}`}
        />
        {urlTocada && urlMala && <span className="text-[12.5px] font-semibold text-[#b4432a]">Ese enlace no se ve bien. Ej: tutienda.com o instagram.com/tutienda</span>}
      </label>

      <button type="button" onClick={guardar} disabled={guardando} className="tocable h-14 rounded-full bg-bosque text-[16.5px] font-extrabold text-papel disabled:opacity-60">
        Guardar mi marca
      </button>
      {!tienda.logoUrl && !logo && <p className="-mt-3 text-center text-[12.5px] text-suave">Sin logo usamos tus iniciales y una paleta neutra.</p>}
    </div>
  );
}

function SelectorColor({ etiqueta, valor, alCambiar }: { etiqueta: string; valor: string; alCambiar: (v: string) => void }) {
  const [texto, setTexto] = useState(valor.toUpperCase());
  const [previo, setPrevio] = useState(valor);
  // Si cambia desde afuera (combinación elegida), se refleja en el campo
  if (previo !== valor) {
    setPrevio(valor);
    setTexto(valor.toUpperCase());
  }
  return (
    <label className="flex items-center gap-2 rounded-2xl border-[1.5px] border-borde bg-white py-1.5 pr-2 pl-1.5 text-[13px] font-bold">
      <input
        type="color"
        value={esHex(valor) ? valor : "#000000"}
        onChange={(e) => alCambiar(e.target.value.toUpperCase())}
        aria-label={`Color ${etiqueta.toLowerCase()}`}
        className="h-11 w-11 shrink-0 cursor-pointer rounded-xl border-0 bg-transparent p-0"
      />
      <span className="flex min-w-0 flex-col">
        {etiqueta}
        <input
          type="text"
          value={texto}
          onChange={(e) => {
            const v = e.target.value.toUpperCase().slice(0, 7);
            setTexto(v);
            if (esHex(v)) alCambiar(v);
          }}
          aria-label={`Código del color ${etiqueta.toLowerCase()}`}
          autoCapitalize="characters"
          autoComplete="off"
          className="w-full min-w-0 bg-transparent font-mono text-[13px] font-normal text-suave outline-none"
        />
      </span>
    </label>
  );
}
