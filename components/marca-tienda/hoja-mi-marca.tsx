"use client";

import { usePermisos } from "@/lib/data/permisos";
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
import { Hoja, useAvisarAlSalir } from "../hoja";
import { IconoCamara } from "../iconos";
import { useToast } from "../toast";
import { instagramLimpio, marcaLista, MARCA_VACIA, type MarcaRetoque } from "@/lib/marca-retoque";
import { borradorCambio, borradorDeMarca, SeccionRetoque, type BorradorRetoque } from "./seccion-retoque";
import { CuponTienda, marcaDeTienda } from "./cupon-tienda";
import { HojaLoQueVendes } from "../catalogo/hoja-lo-que-vendes";
import { FilaLista, ListaAgrupada } from "../ui";
import { NOMBRE_TIPO, rubrosDeTienda } from "@/lib/rubros";

const ORDEN_ESTILOS: EstiloMarca[] = ["elegante", "moderna", "divertida", "clasica"];

/** "Mi marca": logo, colores, estilo tipográfico y enlace del catálogo de la tienda activa. */
export function HojaMiMarca({ abierta, alCerrar, campo }: { abierta: boolean; alCerrar: () => void; campo?: "enlace" }) {
  const { tienda } = useTiendaActiva();
  // "grande": tiene campos (enlace, colores) y la hoja no cambia de tamaño con el teclado (HANDOFF.md)
  return (
    <Hoja abierta={abierta} alCerrar={alCerrar} titulo="Mi marca" altura="grande">
      {tienda && <Formulario key={`${tienda.id}:${campo ?? ""}`} tienda={tienda} alTerminar={alCerrar} mostrarEnlace={campo === "enlace"} />}
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
    clienteId: null,
  };
}

function Formulario({ tienda, alTerminar, mostrarEnlace }: { tienda: Tienda; alTerminar: () => void; mostrarEnlace: boolean }) {
  const { actualizarMarca, guardarMarcaRetoque, getMarcaRetoque, getPromos, getProductos, soloMirar: verComo } = useData();
  // Mi marca la edita la dueña o un Administrador (grupo «marca»). A los demás se les muestra sin editar, con el porqué.
  const { puede, porque } = usePermisos();
  const sinPermiso = !verComo && !puede("marca");
  const soloMirar = verComo || sinPermiso;
  const { tiendaId } = useTiendaActiva();
  const toast = useToast();
  const { data: promos } = useConsulta(`promos:${tiendaId}`, () => getPromos(tiendaId));
  const { data: productos } = useConsulta(`productos:${tiendaId}`, () => getProductos(tiendaId));

  const { data: marcaGuardada, error: errorMarca, reintentar: reintentarMarca } = useConsulta(`marca:${tiendaId}`, () => getMarcaRetoque(tiendaId));
  // El borrador de «Para el retoque» arranca cuando llega lo guardado (una sola vez por apertura de la hoja).
  const [retoque, setRetoque] = useState<BorradorRetoque | null>(null);
  if (marcaGuardada && !retoque) setRetoque(borradorDeMarca(marcaGuardada));
  const [igTocado, setIgTocado] = useState(false);
  const [logo, setLogo] = useState<string | null>(tienda.logoUrl);
  const [marca, setMarca] = useState<Marca>(() => marcaDeTienda(tienda));
  const [combos, setCombos] = useState<Marca[]>([]);
  const [url, setUrl] = useState(tienda.urlCatalogo ?? "");
  const [urlTocada, setUrlTocada] = useState(false);
  // Viniendo de "Conectar mi catálogo" / "Cambiar enlace": el campo se acerca a la vista y se resalta un momento. No se enfoca
  // (el teclado del iPhone solo abre bien si el foco sale de un toque; HANDOFF.md): la persona toca el campo y escribe.
  const campoEnlace = useRef<HTMLLabelElement>(null);
  const [resaltar, setResaltar] = useState(mostrarEnlace);
  useEffect(() => {
    if (!mostrarEnlace) return;
    campoEnlace.current?.scrollIntoView({ block: "center" });
    const t = setTimeout(() => setResaltar(false), 1600);
    return () => clearTimeout(t);
  }, [mostrarEnlace]);
  const [vendiendo, setVendiendo] = useState(false);
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

  const marcaPrevia: MarcaRetoque = marcaGuardada ?? MARCA_VACIA;
  const igMal = retoque ? !instagramLimpio(retoque.instagram).valido : false;
  const retoqueCambio = !!retoque && borradorCambio(retoque, marcaPrevia);
  const marcaCambio =
    logo !== tienda.logoUrl ||
    marca.principal.toUpperCase() !== tienda.marcaColorPrincipal.toUpperCase() ||
    marca.acento.toUpperCase() !== tienda.marcaColorAcento.toUpperCase() ||
    marca.estilo !== tienda.marcaEstilo ||
    urlNormal !== (tienda.urlCatalogo ?? null);
  // Con cambios sin guardar, cerrar pregunta «¿Salir sin guardar?» (la hoja lo hace con este aviso).
  useAvisarAlSalir(!soloMirar && !guardando && (retoqueCambio || marcaCambio || url.trim() !== (tienda.urlCatalogo ?? "")));

  const guardar = async () => {
    setUrlTocada(true);
    setIgTocado(true);
    if (urlMala || igMal || guardando || soloMirar) return;
    setGuardando(true);
    try {
      await actualizarMarca(tiendaId, { logoUrl: logo, principal: legible.principal, acento: legible.acento, estilo: marca.estilo, urlCatalogo: urlNormal });
      let lista = marcaLista(marcaGuardada);
      if (retoque && retoqueCambio) {
        const ig = instagramLimpio(retoque.instagram);
        const guardada = await guardarMarcaRetoque(tiendaId, {
          instagram: ig.valor,
          palabras: retoque.palabras,
          evita: retoque.evita.trim() || null,
          quitar: retoque.quitar,
          nuevas: retoque.nuevas.map((n) => n.url),
        });
        lista = marcaLista(guardada);
      }
      toast(lista ? "Tu marca está lista para el taller." : "Mi marca guardada.");
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
            <img src={logo} alt="Tu logo" className="h-16 w-16 rounded-full border border-linea bg-white object-contain" />
          ) : (
            <span className="grid h-16 w-16 place-items-center rounded-full text-xl font-bold" style={{ background: coloresCupon(legible).fondo, color: coloresCupon(legible).acento }}>
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
      <label ref={campoEnlace} className="flex flex-col gap-1.5 text-[13.5px] font-bold">
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
          className={`h-[50px] w-full min-w-0 rounded-2xl border-[1.5px] bg-white px-3.5 text-base font-normal text-bosque outline-none focus:border-bosque ${urlTocada && urlMala ? "border-[#b4432a]" : resaltar ? "border-mandarina" : "border-borde"}`}
        />
        {urlTocada && urlMala && <span className="text-[12.5px] font-semibold text-[#b4432a]">Ese enlace no se ve bien. Ej: tutienda.com o instagram.com/tutienda</span>}
      </label>

      <ListaAgrupada etiqueta="Lo que vendes">
        <FilaLista titulo="Lo que vendes" fin={<span className="text-secundario font-normal text-texto-secundario">{rubrosDeTienda(tienda).map((r) => NOMBRE_TIPO[r]).join(", ")}</span>} onClick={() => setVendiendo(true)} />
      </ListaAgrupada>
      {vendiendo && <HojaLoQueVendes tienda={tienda} alCerrar={() => setVendiendo(false)} />}

      {retoque && marcaGuardada ? (
        <SeccionRetoque
          marca={marcaGuardada}
          borrador={retoque}
          alCambiar={setRetoque}
          soloLectura={soloMirar}
          tieneLogo={!!logo}
          alAvisar={toast}
          errorInstagram={igTocado && igMal}
        />
      ) : (
        <section aria-label="Para el retoque" className="border-t border-linea pt-5">
          <h3 className="font-display text-titulo-seccion text-texto">Para el retoque</h3>
          {errorMarca ? (
            <p className="mt-1 text-secundario text-texto-secundario">
              No pudimos leer tu marca.{" "}
              <button type="button" onClick={reintentarMarca} className="tocable font-extrabold text-accion">
                Reintentar
              </button>
            </p>
          ) : (
            <p className="mt-1 text-secundario text-texto-secundario">Un momento…</p>
          )}
        </section>
      )}

      {soloMirar ? (
        <p className="text-center text-secundario text-texto-secundario" data-sin-permiso={sinPermiso || undefined}>{sinPermiso ? porque : "Solo mirar: aquí no se cambia nada."}</p>
      ) : (
        <button type="button" onClick={guardar} disabled={guardando} className="tocable h-14 rounded-full bg-bosque text-[16.5px] font-extrabold text-papel disabled:opacity-60">
          Guardar mi marca
        </button>
      )}
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
