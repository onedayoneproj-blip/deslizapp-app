"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type PointerEvent as EventoPuntero } from "react";
import { Boton, BotonIcono, Campo, CampoMultilinea, ControlSegmentado, Etiqueta, FilaLista, Interruptor, ListaAgrupada } from "@/components/ui";
import { Hoja } from "@/components/hoja";
import { IconoChevronAbajo, IconoChevronDerecha, IconoMas } from "@/components/iconos";
import { useAdmin, useAdminDemo } from "@/lib/data/admin/provider";
import { errorConocido, textoErrorAdmin } from "@/lib/admin/errores";
import {
  avisoContraste,
  BORRADOR_VACIO,
  cambiar,
  cambiosParaGuardar,
  COLORES,
  FRASES,
  hayCambios,
  LETRAS,
  modoOpiniones,
  problemas,
  SECCIONES,
  seccionesOpiniones,
  vistaPrevia,
  yaAplicado,
  type Borrador,
  type ClaveColor,
  type ModoOpiniones,
} from "@/lib/admin/personalizar";
import { opinionesValidas } from "@/lib/admin/personalizacion";
import { temaDeTienda } from "@/lib/tienda/tema";
import { validarSvgCabecera } from "@/lib/tienda/svg-cabecera";
import type { Objeto, PersonalizacionTiendaAdmin, ProductoAdmin } from "@/lib/admin/tipos";
import type { CatalogoPublico, OpinionProducto } from "@/lib/types";
import { EstadoAdmin } from "./estado";
import "@/app/tienda/fuentes.css";

type Hojas = "colores" | "letra" | "cabecera" | "opiniones-modo" | "orden" | "opiniones" | `frase:${string}` | null;
const ESTADOS: Record<string, string> = { sin: "sin catálogo", solicitado: "lo pidió", generando: "armándose", revisar: "esperando su sí", cambios: "pidió cambios", publicado: "publicado" };

function svgParaImg(svg: string, color: string) {
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg.replace(/var\(--logo1\)/g, color).replace(/var\(--logo2\)/g, color).replace(/var\(--logod\)/g, "#E8C98F"));
}
const familia = (f: string) => `"${f === "Figtree" ? "DZ Figtree" : f === "Fredoka" ? "DZ Fredoka" : f}", Georgia, serif`;

function leerGuardado(clave: string): Borrador | null {
  try {
    const v = JSON.parse(localStorage.getItem(clave) ?? "null") as Borrador | null;
    return v && typeof v === "object" && "cambios" in v ? v : null;
  } catch {
    return null;
  }
}
function guardarLocal(clave: string, b: Borrador | null) {
  try {
    if (b && hayCambios(b)) localStorage.setItem(clave, JSON.stringify(b));
    else localStorage.removeItem(clave);
  } catch {
    // Sin almacenamiento: el borrador vive solo mientras la pantalla esté abierta.
  }
}

export function PantallaPersonalizar({ tiendaId }: { tiendaId: string }) {
  const fuente = useAdmin();
  const demo = useAdminDemo();
  const raiz = demo ? "/admin-demo" : "/admin";
  const clave = `deslizapp-admin-personalizar-v1:${demo ? "demo" : "real"}:${tiendaId}`;
  const [datos, setDatos] = useState<PersonalizacionTiendaAdmin | null>(null);
  const [productos, setProductos] = useState<ProductoAdmin[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [borrador, setBorradorEstado] = useState<Borrador>(BORRADOR_VACIO);
  const [recuperado, setRecuperado] = useState(false);
  const [hoja, setHoja] = useState<Hojas>(null);
  const [guardando, setGuardando] = useState(false);
  const enCurso = useRef(false);
  const [aviso, setAviso] = useState<{ texto: string; error: boolean } | null>(null);

  const leer = useCallback(async () => {
    setError(null);
    try {
      const [d, p] = await Promise.all([fuente.personalizacionTienda(tiendaId), fuente.productosTienda(tiendaId)]);
      setDatos(d);
      setProductos(p);
      return { d, p };
    } catch {
      setError("No pudimos abrir el catálogo de esta tienda.");
      return null;
    }
  }, [fuente, tiendaId]);
  useEffect(() => {
    const id = window.setTimeout(() => {
      void leer();
      const previo = leerGuardado(clave);
      if (previo && hayCambios(previo)) {
        setBorradorEstado(previo);
        setRecuperado(true);
      }
    }, 0);
    return () => window.clearTimeout(id);
  }, [leer, clave]);

  const setBorrador = (b: Borrador) => {
    setBorradorEstado(b);
    guardarLocal(clave, b);
    setAviso(null);
  };
  const descartar = () => {
    setBorrador(BORRADOR_VACIO);
    setRecuperado(false);
  };

  if (!datos) return <EstadoAdmin cargando={!error} error={error} reintentar={() => void leer()} />;

  const vista = vistaPrevia(datos.personalizacion, borrador);
  const tema = temaDeTienda({ ...datos, personalizacion: vista } as unknown as CatalogoPublico["tienda"]);
  const temaPropio = (vista.tema ?? {}) as Objeto;
  const mensajes = (vista.mensajes ?? {}) as Objeto;
  const secciones = (vista.secciones ?? {}) as Objeto;
  const sinMarca = temaDeTienda({ ...datos, personalizacion: {} } as unknown as CatalogoPublico["tienda"]).colores;
  const ordenados = borrador.orden ? borrador.orden.map((id) => productos.find((p) => p.id === id)).filter((p): p is ProductoAdmin => !!p) : productos;
  const opinionesDe = (p: ProductoAdmin) => borrador.opiniones[p.id] ?? p.opiniones;
  const totalOpiniones = productos.reduce((n, p) => n + opinionesDe(p).length, 0);
  const conOpiniones = productos.filter((p) => opinionesDe(p).length > 0).length;
  const modo = modoOpiniones(secciones);
  const letra = LETRAS.find((l) => l.display === tema.fuentes.display);
  const sucio = hayCambios(borrador);
  const errores = sucio ? problemas(datos.personalizacion, borrador) : [];
  const enlaceCatalogo = `/tienda/${datos.slug}${demo ? "?demo" : ""}`;

  const guardar = async () => {
    if (enCurso.current || !sucio || errores.length) return;
    enCurso.current = true;
    setGuardando(true);
    setAviso(null);
    try {
      await fuente.guardarPersonalizacion(tiendaId, cambiosParaGuardar(borrador, productos));
      await leer();
      setBorrador(BORRADOR_VACIO);
      setRecuperado(false);
      setAviso({ texto: "Guardado. Su catálogo ya lo muestra.", error: false });
    } catch (e) {
      // Si la respuesta se perdió, se vuelve a leer: solo se dice «guardado» si de verdad quedó.
      const ahora = !errorConocido(e) ? await leer() : null;
      if (ahora && yaAplicado(ahora.d.personalizacion, borrador, ahora.p)) {
        setBorrador(BORRADOR_VACIO);
        setRecuperado(false);
        setAviso({ texto: "Guardado. Su catálogo ya lo muestra.", error: false });
      } else {
        setAviso({ texto: errorConocido(e) ? textoErrorAdmin(e) : "No se pudo guardar. Tu borrador sigue aquí: revisa la conexión e inténtalo otra vez.", error: true });
      }
    } finally {
      enCurso.current = false;
      setGuardando(false);
    }
  };

  const fraseTexto = (k: string, porDefecto: string) => {
    const v = mensajes[k];
    return Array.isArray(v) ? `${v.length} ${v.length === 1 ? "frase" : "frases"}` : typeof v === "string" ? v : porDefecto;
  };

  return (
    <div className="pb-24">
      <div className="flex items-center gap-3">
        <Link href={`${raiz}/tiendas/${tiendaId}`} aria-label="Volver a la tienda" className="grid size-11 shrink-0 place-items-center rounded-full bg-superficie-hundida text-bosque focus-visible:outline-3 focus-visible:outline-foco">
          <IconoChevronDerecha tamano={20} className="rotate-180" />
        </Link>
        <div className="min-w-0">
          <h1 className="font-display text-titulo-hoja font-bold text-bosque">Su catálogo</h1>
          <p className="truncate text-secundario text-texto-secundario">{datos.nombre} · {ESTADOS[datos.catalogoEstado] ?? datos.catalogoEstado}</p>
        </div>
      </div>

      <div
        className="relative mt-4 overflow-hidden rounded-radio-l px-4 pt-6 pb-4 text-center text-white"
        style={{ background: `linear-gradient(170deg, ${tema.colores.accent}, ${tema.colores.heart})` }}
        aria-label="Vista previa de la cabecera"
        role="img"
      >
        {typeof temaPropio.cabecera === "string" && validarSvgCabecera(temaPropio.cabecera).ok ? (
          // eslint-disable-next-line @next/next/no-img-element -- SVG validado, en data URL como en el catálogo
          <img src={svgParaImg(temaPropio.cabecera, "#fff")} alt="" className="mx-auto h-10 max-w-full" />
        ) : (
          <p className="truncate text-[30px] leading-tight" style={{ fontFamily: familia(tema.fuentes.display) }}>{datos.nombre}</p>
        )}
        <p className="mt-3 flex justify-center gap-5 text-secundario font-bold" style={{ fontFamily: familia(tema.fuentes.body) }}>
          <span>Novedades</span>
          {secciones.colecciones !== false && <span className="opacity-60">Colecciones</span>}
        </p>
      </div>
      <div className="mt-2 flex justify-end">
        <Boton jerarquia="secundario" tamano="compacto" href={enlaceCatalogo} target="_blank" rel="noreferrer">Ver como lo verá un cliente</Boton>
      </div>

      {recuperado && sucio && (
        <p role="status" className="mt-3 flex items-center justify-between gap-2 rounded-radio-m bg-atencion-suave p-3 text-secundario text-atencion-texto">
          Recuperamos tu borrador sin guardar.
          <button type="button" onClick={descartar} className="tocable min-h-11 shrink-0 font-extrabold underline">Descartar</button>
        </p>
      )}

      <h2 className="mt-5 mb-2 px-1 text-etiqueta tracking-wider text-texto-secundario uppercase">Marca</h2>
      <ListaAgrupada etiqueta="Marca">
        <FilaLista
          titulo="Colores"
          onClick={() => setHoja("colores")}
          fin={<span className="flex gap-1">{COLORES.map((c) => <span key={c.clave} className="size-6 rounded-full border border-linea" style={{ background: tema.colores[c.clave] }} />)}</span>}
        />
        <FilaLista titulo="Letra de títulos" onClick={() => setHoja("letra")} fin={<span style={{ fontFamily: familia(tema.fuentes.display) }}>{letra?.nombre ?? tema.fuentes.display}</span>} />
        <FilaLista titulo="Cabecera" onClick={() => setHoja("cabecera")} fin={<span className="text-secundario">{typeof temaPropio.cabecera === "string" ? "SVG" : "Su nombre"}</span>} />
      </ListaAgrupada>

      <h2 className="mt-5 mb-2 px-1 text-etiqueta tracking-wider text-texto-secundario uppercase">Frases</h2>
      <ListaAgrupada etiqueta="Frases">
        {FRASES.map((f) => (
          <FilaLista
            key={f.clave}
            titulo={f.nombre}
            onClick={() => setHoja(`frase:${f.clave}`)}
            fin={<span className="block max-w-[46vw] truncate text-secundario font-normal text-texto-secundario">{fraseTexto(f.clave, "La de siempre")}</span>}
          />
        ))}
      </ListaAgrupada>

      <h2 className="mt-5 mb-2 px-1 text-etiqueta tracking-wider text-texto-secundario uppercase">Secciones</h2>
      <ListaAgrupada etiqueta="Secciones">
        {SECCIONES.map((s) => (
          <FilaLista
            key={s.clave}
            titulo={s.nombre}
            accion={<Interruptor encendido={secciones[s.clave] !== false} etiqueta={s.nombre} alCambiar={(v) => setBorrador(cambiar(borrador, "secciones", { [s.clave]: v }))} />}
          />
        ))}
        <FilaLista
          titulo="Opiniones"
          onClick={() => setHoja("opiniones-modo")}
          fin={<Etiqueta tono={modo === "si" ? "exito" : "neutro"}>{modo === "si" ? "Encendidas" : modo === "pronto" ? "Pronto" : "Apagadas"}</Etiqueta>}
        />
      </ListaAgrupada>

      <h2 className="mt-5 mb-2 px-1 text-etiqueta tracking-wider text-texto-secundario uppercase">Productos</h2>
      <ListaAgrupada etiqueta="Productos">
        <FilaLista titulo="Orden en el catálogo" onClick={() => setHoja("orden")} fin={<span className="text-secundario font-normal text-texto-secundario">{productos.length} productos</span>} />
        <FilaLista titulo="Opiniones de internet" onClick={() => setHoja("opiniones")} fin={<span className="text-secundario font-normal text-texto-secundario">{totalOpiniones} en {conOpiniones} {conOpiniones === 1 ? "producto" : "productos"}</span>} />
      </ListaAgrupada>

      <p aria-live="polite" role={aviso?.error ? "alert" : "status"} className={aviso ? `mt-4 rounded-radio-m p-3 text-secundario ${aviso.error ? "bg-atencion-suave text-atencion-texto" : "bg-accion-suave text-exito-texto"}` : "sr-only"}>
        {aviso?.texto}
      </p>

      {sucio && (
        <div className="fixed inset-x-3 bottom-[calc(max(12px,env(safe-area-inset-bottom))+84px)] z-30 mx-auto max-w-[456px] rounded-radio-l border border-linea bg-superficie p-3 shadow-hoja">
          {errores.length > 0 && <p role="alert" className="mb-2 text-secundario text-peligro">{errores[0]}</p>}
          <div className="flex gap-2">
            <Boton jerarquia="secundario" onClick={descartar} deshabilitado={guardando}>Descartar</Boton>
            <Boton anchoCompleto cargando={guardando} deshabilitado={errores.length > 0} onClick={() => void guardar()}>Guardar cambios</Boton>
          </div>
        </div>
      )}

      <HojaColores abierta={hoja === "colores"} alCerrar={() => setHoja(null)} colores={tema.colores} deMarca={sinMarca} propios={(temaPropio.colores ?? {}) as Record<string, string>} alCambiar={(c) => setBorrador(cambiar(borrador, "tema", { colores: c }))} />
      <Hoja protegerAtras abierta={hoja === "letra"} alCerrar={() => setHoja(null)} titulo="Letra de títulos">
        <div className="px-5 pb-6">
          <ListaAgrupada etiqueta="Letras">
            {LETRAS.map((l) => (
              <FilaLista
                key={l.display}
                radio
                marcada={tema.fuentes.display === l.display}
                titulo={<span style={{ fontFamily: familia(l.display) }}>{l.nombre}</span>}
                detalle={l.estilo}
                onClick={() => setBorrador(cambiar(borrador, "tema", { fuentes: { display: l.display, body: l.body } }))}
              />
            ))}
          </ListaAgrupada>
          <p className="mt-3 text-secundario text-texto-secundario">Son las letras que el catálogo ya carga. «Como su marca» vuelve a la de su estilo.</p>
          <div className="mt-3"><Boton jerarquia="terciario" onClick={() => setBorrador(cambiar(borrador, "tema", { fuentes: null }))}>Como su marca</Boton></div>
        </div>
      </Hoja>
      <HojaCabecera abierta={hoja === "cabecera"} alCerrar={() => setHoja(null)} actual={typeof temaPropio.cabecera === "string" ? temaPropio.cabecera : null} nombre={datos.nombre} alGuardar={(svg) => { setBorrador(cambiar(borrador, "tema", { cabecera: svg })); setHoja(null); }} />
      {FRASES.map((f) => (
        <HojaFrase key={f.clave} abierta={hoja === `frase:${f.clave}`} alCerrar={() => setHoja(null)} frase={f} valor={mensajes[f.clave] as string | string[] | undefined} alGuardar={(v) => { setBorrador(cambiar(borrador, "mensajes", { [f.clave]: v })); setHoja(null); }} />
      ))}
      <Hoja protegerAtras abierta={hoja === "opiniones-modo"} alCerrar={() => setHoja(null)} titulo="Opiniones">
        <div className="space-y-3 px-5 pb-6">
          <ControlSegmentado<ModoOpiniones>
            etiqueta="Opiniones en el catálogo"
            valor={modo}
            alCambiar={(m) => setBorrador(cambiar(borrador, "secciones", seccionesOpiniones(m)))}
            opciones={[{ id: "si", texto: "Encendidas" }, { id: "pronto", texto: "Pronto" }, { id: "no", texto: "Apagadas" }]}
          />
          <p className="text-secundario text-texto-secundario">
            {modo === "si" ? "Se ven las opiniones de cada producto." : modo === "pronto" ? "El botón invita a preguntarle por WhatsApp; todavía no muestra opiniones." : "El botón de opiniones no aparece."}
          </p>
        </div>
      </Hoja>
      <HojaOrden abierta={hoja === "orden"} alCerrar={() => setHoja(null)} productos={ordenados} alCambiar={(ids) => setBorrador({ ...borrador, orden: ids })} />
      <HojaOpiniones abierta={hoja === "opiniones"} alCerrar={() => setHoja(null)} productos={ordenados} opinionesDe={opinionesDe} alCambiar={(id, ops) => setBorrador({ ...borrador, opiniones: { ...borrador.opiniones, [id]: ops } })} />
    </div>
  );
}

function HojaColores({ abierta, alCerrar, colores, deMarca, propios, alCambiar }: { abierta: boolean; alCerrar: () => void; colores: Record<string, string>; deMarca: Record<string, string>; propios: Record<string, string>; alCambiar: (c: Objeto) => void }) {
  return (
    <Hoja protegerAtras abierta={abierta} alCerrar={alCerrar} titulo="Colores">
      <div className="space-y-4 px-5 pb-6">
        {COLORES.map((c) => {
          const valor = colores[c.clave] ?? "#000000";
          const aviso = avisoContraste(c.clave as ClaveColor, colores);
          return (
            <div key={c.clave}>
              <div className="flex items-center gap-3">
                <label className="relative size-11 shrink-0 overflow-hidden rounded-full border border-linea focus-within:outline-3 focus-within:outline-foco" style={{ background: valor }}>
                  <span className="sr-only">Elegir color: {c.nombre}</span>
                  <input type="color" value={valor} onChange={(e) => alCambiar({ [c.clave]: e.target.value.toUpperCase() })} className="absolute inset-0 size-full cursor-pointer opacity-0" />
                </label>
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{c.nombre}</p>
                  <p className="text-secundario text-texto-secundario">{valor.toUpperCase()}{propios[c.clave] ? "" : " · de su marca"}</p>
                </div>
                {propios[c.clave] && <Boton jerarquia="terciario" tamano="compacto" aria-label={`${c.nombre}: como su marca`} onClick={() => alCambiar({ [c.clave]: null })}>Como su marca</Boton>}
              </div>
              {aviso && <p role="alert" className="mt-1 rounded-radio-m bg-atencion-suave px-3 py-2 text-secundario text-atencion-texto">{aviso}</p>}
            </div>
          );
        })}
        <p className="text-secundario text-texto-secundario">De su marca: fondo {deMarca.bg}, texto {deMarca.ink}, botones {deMarca.accent}.</p>
      </div>
    </Hoja>
  );
}

function HojaCabecera({ abierta, alCerrar, actual, nombre, alGuardar }: { abierta: boolean; alCerrar: () => void; actual: string | null; nombre: string; alGuardar: (svg: string | null) => void }) {
  const [tipo, setTipo] = useState<"texto" | "svg">(actual ? "svg" : "texto");
  const [svg, setSvg] = useState(actual ?? "");
  const [abiertaAntes, setAbiertaAntes] = useState(abierta);
  if (abierta !== abiertaAntes) {
    setAbiertaAntes(abierta);
    if (abierta) {
      setTipo(actual ? "svg" : "texto");
      setSvg(actual ?? "");
    }
  }
  const resultado = tipo === "svg" && svg.trim() ? validarSvgCabecera(svg) : null;
  return (
    <Hoja protegerAtras abierta={abierta} alCerrar={alCerrar} titulo="Cabecera" altura="grande" avisarAlSalir={tipo === "svg" && svg !== (actual ?? "")}>
      <div className="space-y-4 px-5 pb-6">
        <ControlSegmentado<"texto" | "svg"> etiqueta="Tipo de cabecera" valor={tipo} alCambiar={setTipo} opciones={[{ id: "texto", texto: "Su nombre" }, { id: "svg", texto: "SVG" }]} />
        {tipo === "texto" ? (
          <p className="text-texto-secundario">El catálogo muestra «{nombre}» con la letra de títulos.</p>
        ) : (
          <>
            <CampoMultilinea etiqueta="Código SVG" value={svg} onChange={(e) => setSvg(e.target.value)} filas={8} spellCheck={false} autoCapitalize="off" autoCorrect="off" ayuda="Solo dibujo: sin scripts, enlaces, estilos ni imágenes de afuera. Usa fill:var(--logo1) y var(--logo2) para los colores." />
            {resultado && !resultado.ok && <p role="alert" className="rounded-radio-m bg-atencion-suave px-3 py-2 text-secundario text-atencion-texto">{resultado.motivo}</p>}
            {resultado?.ok && (
              <div className="rounded-radio-m bg-accion p-4">
                {/* eslint-disable-next-line @next/next/no-img-element -- SVG validado, en data URL como en el catálogo */}
                <img src={svgParaImg(svg, "#fff")} alt="Vista previa de la cabecera" className="mx-auto h-10 max-w-full" />
              </div>
            )}
          </>
        )}
        <Boton anchoCompleto deshabilitado={tipo === "svg" && !resultado?.ok} onClick={() => alGuardar(tipo === "svg" ? svg.trim() : null)}>Usar esta cabecera</Boton>
      </div>
    </Hoja>
  );
}

function HojaFrase({ abierta, alCerrar, frase, valor, alGuardar }: { abierta: boolean; alCerrar: () => void; frase: (typeof FRASES)[number]; valor: string | string[] | undefined; alGuardar: (v: string | string[] | null) => void }) {
  const inicial = () => (frase.lista ? (Array.isArray(valor) ? valor : [""]) : [typeof valor === "string" ? valor : ""]);
  const [lineas, setLineas] = useState<string[]>(inicial);
  const [abiertaAntes, setAbiertaAntes] = useState(abierta);
  if (abierta !== abiertaAntes) {
    setAbiertaAntes(abierta);
    if (abierta) setLineas(inicial());
  }
  const limpias = lineas.map((l) => l.trim()).filter(Boolean);
  const largo = (s: string) => [...s].length;
  const malas = lineas.some((l) => largo(l.trim()) > frase.max);
  const cambio = JSON.stringify(frase.lista ? limpias : limpias[0] ?? "") !== JSON.stringify(frase.lista ? (Array.isArray(valor) ? valor : []) : typeof valor === "string" ? valor : "");
  const maxLineas = "maxLineas" in frase ? frase.maxLineas : 1;
  return (
    <Hoja protegerAtras abierta={abierta} alCerrar={alCerrar} titulo={frase.nombre} altura="grande" avisarAlSalir={cambio}>
      <div className="space-y-3 px-5 pb-6">
        {frase.clave === "al_agregar" && <p className="text-secundario text-texto-secundario">La primera sale con el primer producto, la segunda con el segundo… la última se repite.</p>}
        {frase.clave === "agotado_foto" && <p className="text-secundario text-texto-secundario">Cada línea va en su renglón sobre la foto agotada.</p>}
        {lineas.map((l, i) => (
          <div key={i} className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              {frase.max > 60 ? (
                <CampoMultilinea etiqueta={frase.lista ? `Frase ${i + 1}` : "Texto"} value={l} onChange={(e) => setLineas(lineas.map((x, j) => (j === i ? e.target.value : x)))} filas={3} ayuda={`${largo(l.trim())}/${frase.max}`} error={largo(l.trim()) > frase.max ? "Muy larga." : undefined} />
              ) : (
                <Campo etiqueta={frase.lista ? `Línea ${i + 1}` : "Texto"} value={l} onChange={(e) => setLineas(lineas.map((x, j) => (j === i ? e.target.value : x)))} ayuda={`${largo(l.trim())}/${frase.max}`} error={largo(l.trim()) > frase.max ? "Muy larga." : undefined} />
              )}
            </div>
            {frase.lista && lineas.length > 1 && <BotonIcono etiqueta={`Quitar ${frase.lista ? "frase" : "línea"} ${i + 1}`} className="mt-7" onClick={() => setLineas(lineas.filter((_, j) => j !== i))}>×</BotonIcono>}
          </div>
        ))}
        {frase.lista && lineas.length < maxLineas && (
          <Boton jerarquia="terciario" icono={<IconoMas tamano={18} />} onClick={() => setLineas([...lineas, ""])}>Agregar otra</Boton>
        )}
        <Boton anchoCompleto deshabilitado={malas} onClick={() => alGuardar(limpias.length ? (frase.lista ? limpias.slice(0, maxLineas) : limpias[0]!) : null)}>Listo</Boton>
        <Boton jerarquia="terciario" anchoCompleto onClick={() => alGuardar(null)}>Volver a la de siempre</Boton>
      </div>
    </Hoja>
  );
}

function HojaOrden({ abierta, alCerrar, productos, alCambiar }: { abierta: boolean; alCerrar: () => void; productos: ProductoAdmin[]; alCambiar: (ids: string[]) => void }) {
  const [arrastre, setArrastre] = useState<{ id: string; desde: number; y0: number; dy: number; alto: number } | null>(null);
  const [anuncio, setAnuncio] = useState("");
  const ids = productos.map((p) => p.id);
  const mover = (desde: number, hasta: number) => {
    if (hasta < 0 || hasta >= ids.length || desde === hasta) return;
    const nuevo = [...ids];
    const [x] = nuevo.splice(desde, 1);
    nuevo.splice(hasta, 0, x!);
    alCambiar(nuevo);
    setAnuncio(`${productos[desde]!.nombre}: puesto ${hasta + 1} de ${ids.length}.`);
  };
  const destino = arrastre ? Math.max(0, Math.min(ids.length - 1, arrastre.desde + Math.round(arrastre.dy / arrastre.alto))) : -1;
  const soltar = () => {
    if (arrastre && destino !== arrastre.desde) mover(arrastre.desde, destino);
    setArrastre(null);
  };
  return (
    <Hoja protegerAtras abierta={abierta} alCerrar={alCerrar} titulo="Orden en el catálogo" altura="grande">
      <div className="px-5 pb-6">
        <p className="mb-3 text-secundario text-texto-secundario">Arrastra desde ⠿ o usa las flechas. El primero es el que se ve primero.</p>
        <p className="sr-only" aria-live="polite">{anuncio}</p>
        <ol className="overflow-hidden rounded-radio-l border border-linea bg-superficie">
          {productos.map((p, i) => {
            const foto = p.medios.find((m) => m.tipo === "foto")?.url;
            const arrastrado = arrastre?.id === p.id;
            return (
              <li
                key={p.id}
                className={`flex min-h-16 items-center gap-2 border-t border-linea px-2 first:border-t-0 ${arrastrado ? "relative z-10 bg-superficie shadow-flotante" : ""} ${arrastre && !arrastrado && i === destino ? "bg-accion-suave" : ""}`}
                style={arrastrado ? { transform: `translateY(${arrastre.dy}px)` } : undefined}
              >
                <span
                  aria-hidden="true"
                  className="grid h-12 w-8 shrink-0 cursor-grab touch-none place-items-center text-texto-secundario select-none"
                  onPointerDown={(e: EventoPuntero<HTMLSpanElement>) => {
                    e.currentTarget.setPointerCapture(e.pointerId);
                    // El alto de una fila se mide al empezar (no durante el render).
                    setArrastre({ id: p.id, desde: i, y0: e.clientY, dy: 0, alto: (e.currentTarget.parentElement as HTMLElement).offsetHeight || 64 });
                  }}
                  onPointerMove={(e) => arrastre?.id === p.id && setArrastre({ ...arrastre, dy: e.clientY - arrastre.y0 })}
                  onPointerUp={soltar}
                  onPointerCancel={() => setArrastre(null)}
                >
                  ⠿
                </span>
                {/* eslint-disable-next-line @next/next/no-img-element -- miniatura de Storage o de la demo */}
                {foto ? <img src={foto} alt="" className="size-10 shrink-0 rounded-radio-s object-cover" /> : <span className="size-10 shrink-0 rounded-radio-s bg-superficie-hundida" />}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">{i + 1}. {p.nombre}</span>
                  {!p.activo && <span className="text-secundario text-texto-secundario">Oculto</span>}
                </span>
                <BotonIcono etiqueta={`Mover arriba: ${p.nombre}`} disabled={i === 0} onClick={() => mover(i, i - 1)}><IconoChevronAbajo tamano={18} className="rotate-180" /></BotonIcono>
                <BotonIcono etiqueta={`Mover abajo: ${p.nombre}`} disabled={i === productos.length - 1} onClick={() => mover(i, i + 1)}><IconoChevronAbajo tamano={18} /></BotonIcono>
              </li>
            );
          })}
        </ol>
      </div>
    </Hoja>
  );
}

const OPINION_VACIA: OpinionProducto = { usuario: "", fuente: "", url: "https://", texto: "", estrellas: 5, traducida: false };

function HojaOpiniones({ abierta, alCerrar, productos, opinionesDe, alCambiar }: { abierta: boolean; alCerrar: () => void; productos: ProductoAdmin[]; opinionesDe: (p: ProductoAdmin) => OpinionProducto[]; alCambiar: (id: string, ops: OpinionProducto[]) => void }) {
  const [productoId, setProductoId] = useState<string | null>(null);
  const [editando, setEditando] = useState<{ indice: number | null; opinion: OpinionProducto } | null>(null);
  const producto = productos.find((p) => p.id === productoId) ?? null;
  const ops = producto ? opinionesDe(producto) : [];
  const valida = editando ? opinionesValidas([editando.opinion]) : false;
  const cambiarCampo = <K extends keyof OpinionProducto>(k: K, v: OpinionProducto[K]) => editando && setEditando({ ...editando, opinion: { ...editando.opinion, [k]: v } });
  const volver = () => {
    if (editando) setEditando(null);
    else if (productoId) setProductoId(null);
    else return false;
    return true;
  };
  return (
    <Hoja protegerAtras abierta={abierta} alCerrar={() => { setProductoId(null); setEditando(null); alCerrar(); }} titulo={editando ? (editando.indice === null ? "Nueva opinión" : "Editar opinión") : producto ? producto.nombre : "Opiniones de internet"} altura="grande" alVolverInterno={volver}>
      <div className="space-y-3 px-5 pb-6">
        {!producto && (
          <ListaAgrupada etiqueta="Productos">
            {productos.map((p) => (
              <FilaLista key={p.id} titulo={p.nombre} onClick={() => setProductoId(p.id)} fin={<span className="text-secundario font-normal text-texto-secundario">{opinionesDe(p).length}</span>} />
            ))}
          </ListaAgrupada>
        )}
        {producto && !editando && (
          <>
            <Boton jerarquia="terciario" onClick={() => setProductoId(null)}>‹ Todos los productos</Boton>
            {ops.length === 0 && <p className="text-texto-secundario">Sin opiniones todavía.</p>}
            <ul className="space-y-2">
              {ops.map((o, i) => (
                <li key={i} className="rounded-radio-m border border-linea bg-superficie p-3">
                  <p className="font-bold">{o.usuario} · {o.fuente}{o.estrellas ? ` · ${"★".repeat(o.estrellas)}` : ""}</p>
                  <p className="mt-1 line-clamp-3 text-secundario">{o.texto}</p>
                  <div className="mt-2 flex gap-2">
                    <Boton tamano="compacto" jerarquia="secundario" onClick={() => setEditando({ indice: i, opinion: o })}>Editar</Boton>
                    <Boton tamano="compacto" jerarquia="terciario" tono="peligro" onClick={() => alCambiar(producto.id, ops.filter((_, j) => j !== i))}>Quitar</Boton>
                  </div>
                </li>
              ))}
            </ul>
            {ops.length < 20 && <Boton anchoCompleto icono={<IconoMas tamano={18} />} onClick={() => setEditando({ indice: null, opinion: OPINION_VACIA })}>Agregar opinión</Boton>}
          </>
        )}
        {producto && editando && (
          <>
            <Campo etiqueta="Usuario" value={editando.opinion.usuario} maxLength={80} onChange={(e) => cambiarCampo("usuario", e.target.value)} />
            <Campo etiqueta="Fuente" placeholder="Ej.: Fragrantica" value={editando.opinion.fuente} maxLength={80} onChange={(e) => cambiarCampo("fuente", e.target.value)} />
            <Campo etiqueta="Enlace" type="url" inputMode="url" value={editando.opinion.url} maxLength={2048} onChange={(e) => cambiarCampo("url", e.target.value.trim())} error={editando.opinion.url && !/^https:\/\/[^\s/]+(\/\S*)?$/.test(editando.opinion.url) ? "Tiene que empezar con https://." : undefined} />
            <CampoMultilinea etiqueta="Texto" value={editando.opinion.texto} maxLength={600} filas={4} onChange={(e) => cambiarCampo("texto", e.target.value)} ayuda={`${[...editando.opinion.texto].length}/600`} />
            <ControlSegmentado<string>
              etiqueta="Estrellas"
              valor={String(editando.opinion.estrellas ?? 0)}
              alCambiar={(v) => cambiarCampo("estrellas", v === "0" ? null : Number(v))}
              opciones={[{ id: "0", texto: "—" }, ...[1, 2, 3, 4, 5].map((n) => ({ id: String(n), texto: `${n}★` }))]}
            />
            <ListaAgrupada>
              <FilaLista titulo="Traducida" detalle="La original estaba en otro idioma." accion={<Interruptor encendido={editando.opinion.traducida} etiqueta="Traducida" alCambiar={(v) => cambiarCampo("traducida", v)} />} />
            </ListaAgrupada>
            <Boton
              anchoCompleto
              deshabilitado={!valida}
              onClick={() => {
                const o = { ...editando.opinion, usuario: editando.opinion.usuario.trim(), fuente: editando.opinion.fuente.trim(), texto: editando.opinion.texto.trim() };
                alCambiar(producto.id, editando.indice === null ? [...ops, o] : ops.map((x, j) => (j === editando.indice ? o : x)));
                setEditando(null);
              }}
            >
              Listo
            </Boton>
          </>
        )}
      </div>
    </Hoja>
  );
}
