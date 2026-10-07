"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Boton, CampoMultilinea, Etiqueta, Tarjeta } from "@/components/ui";
import { Hoja } from "@/components/hoja";
import { IconoDescargar, IconoFlechaArriba } from "@/components/iconos";
import { useAdmin } from "@/lib/data/admin/provider";
import { bajarFoto } from "@/lib/admin/descargas";
import { codigoError, errorConocido, textoErrorAdmin } from "@/lib/admin/errores";
import { reducirFoto } from "@/lib/imagen";
import type { TiendaAdmin, TrabajoRetoque } from "@/lib/admin/tipos";
import { haceDias } from "@/lib/admin/tiempo";
import { instruccionesDeRetoque, marcaLista, type MarcaRetoque } from "@/lib/marca-retoque";
import { copiarTexto } from "@/lib/portapapeles";

const MAX_MOTIVO = 200;
const MOTIVOS_RAPIDOS = ["Está borrosa: mándala más nítida.", "No se ve bien el producto.", "Tiene muy poca luz."];

type Grupo = { tiendaId: string; nombre: string; creditos: number | null; trabajos: TrabajoRetoque[] };

function agrupar(trabajos: TrabajoRetoque[], tiendas: TiendaAdmin[]): Grupo[] {
  const grupos = new Map<string, Grupo>();
  for (const t of [...trabajos].sort((a, b) => Date.parse(a.creadoEn) - Date.parse(b.creadoEn) || a.id.localeCompare(b.id))) {
    const g = grupos.get(t.tiendaId) ?? {
      tiendaId: t.tiendaId,
      nombre: t.tiendaNombre ?? tiendas.find((x) => x.id === t.tiendaId)?.nombre ?? "Tienda",
      creditos: tiendas.find((x) => x.id === t.tiendaId)?.creditos ?? null,
      trabajos: [],
    };
    g.trabajos.push(t);
    grupos.set(t.tiendaId, g);
  }
  // La tienda con la foto más vieja va primero (el Map conserva ese orden).
  return [...grupos.values()];
}

/**
 * «Su marca» (tablero AdminFoto): las referencias (tocar abre grande), las 3 palabras, lo que no quiere, el Instagram y «Copiar
 * instrucciones» para pegar en la IA. Solo lee. Sin marca lista dice que la tienda todavía no la completó y deja trabajar igual.
 */
function SuMarca({ tiendaId, tiendaNombre }: { tiendaId: string; tiendaNombre: string }) {
  const fuente = useAdmin();
  const [marca, setMarca] = useState<MarcaRetoque | null | "error">(null);
  const [grande, setGrande] = useState<string | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);
  useEffect(() => {
    let vigente = true;
    fuente.marcaTienda(tiendaId).then(
      (m) => vigente && setMarca(m),
      () => vigente && setMarca("error"),
    );
    return () => {
      vigente = false;
    };
  }, [fuente, tiendaId]);

  if (marca === null) return <p className="mt-3 text-secundario opacity-80">Leyendo su marca…</p>;
  if (marca === "error") return <p className="mt-3 text-secundario opacity-80">No pudimos leer su marca. Puedes trabajar igual.</p>;
  const lista = marcaLista(marca);
  const copiar = () => {
    // Dentro del toque, sin await antes (en iPhone el navegador lo rechaza si no).
    void copiarTexto(instruccionesDeRetoque(tiendaNombre, marca)).then((ok) => setCopiado(ok ? "Instrucciones copiadas." : "No se pudo copiar. Prueba otra vez."));
  };
  return (
    <section aria-label={`Su marca: ${tiendaNombre}`} className="mt-3 border-t border-linea pt-3" data-su-marca={lista ? "lista" : "falta"}>
      <h4 className="mb-2 text-etiqueta tracking-wider uppercase opacity-80">Su marca</h4>
      {!lista && <p className="mb-2 rounded-radio-m bg-atencion-suave p-2.5 text-secundario font-bold text-atencion-texto">Esta tienda todavía no completó su marca.</p>}
      {marca.referencias.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Fotos de referencia">
          {marca.referencias.map((r, i) => (
            <li key={r.id}>
              <button type="button" onClick={() => setGrande(r.url)} aria-label={`Ver referencia ${i + 1} grande`} className="tocable block size-[68px] overflow-hidden rounded-radio-m bg-superficie-hundida focus-visible:outline-3 focus-visible:outline-foco">
                {/* eslint-disable-next-line @next/next/no-img-element -- URL firmada o data URL */}
                <img src={r.url} alt="" className="size-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {marca.palabras.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-2" aria-label="Su marca en 3 palabras">
          {marca.palabras.map((p) => (
            <li key={p}>
              <Etiqueta tono="exito">{p}</Etiqueta>
            </li>
          ))}
        </ul>
      )}
      {marca.evita && <p className="mt-2 rounded-radio-m bg-atencion-suave p-2.5 text-secundario font-bold text-atencion-texto">No quiere: {marca.evita}</p>}
      {marca.instagram && (
        <p className="mt-2 text-secundario">
          Instagram <b>@{marca.instagram}</b>
        </p>
      )}
      <div className="mt-3">
        <Boton jerarquia="secundario" anchoCompleto onClick={copiar}>
          Copiar instrucciones
        </Boton>
        <p role="status" className={copiado ? "mt-2 text-secundario font-bold" : "sr-only"}>
          {copiado}
        </p>
      </div>
      <Hoja abierta={grande !== null} alCerrar={() => setGrande(null)} titulo="Referencia">
        {grande && (
          // eslint-disable-next-line @next/next/no-img-element -- URL firmada o data URL
          <img src={grande} alt="Foto de referencia, grande" className="mx-auto max-h-[70dvh] w-full rounded-radio-m object-contain" />
        )}
      </Hoja>
    </section>
  );
}

/** La foto que se está retocando: antes y después, Bajar original, Subir la retocada, Entregar y Devolver. */
function Mesa({
  trabajo: t,
  posicion,
  total,
  alTerminar,
}: {
  trabajo: TrabajoRetoque;
  posicion: number;
  total: number;
  alTerminar: (texto: string, error?: boolean) => Promise<void>;
}) {
  const fuente = useAdmin();
  const idArchivo = useId();
  const archivo = useRef<HTMLInputElement>(null);
  const [despues, setDespues] = useState<string | null>(null);
  const [fase, setFase] = useState<"listo" | "preparando" | "subiendo" | "entregando" | "devolviendo">("listo");
  const [aviso, setAviso] = useState<string | null>(null);
  const [devolver, setDevolver] = useState(false);
  const [motivo, setMotivo] = useState("");
  const enCurso = useRef(false);
  // La foto ya subida para este trabajo: un reintento la reutiliza en vez de subir otra.
  const subida = useRef<{ dataUrl: string; url: string } | null>(null);

  const elegir = async (f: File | undefined) => {
    if (!f) return;
    setAviso(null);
    setFase("preparando");
    try {
      setDespues(await reducirFoto(f));
      subida.current = null;
    } catch {
      setAviso("No pudimos leer esa foto. Prueba con un JPG o PNG.");
    } finally {
      setFase("listo");
      if (archivo.current) archivo.current.value = "";
    }
  };

  /** ¿El trabajo quedó entregado con nuestra foto? (para una respuesta que se perdió en la red o un doble toque). */
  const quedoEntregado = async (url: string | null) => {
    try {
      const entregados = await fuente.trabajosRetoque("entregado");
      return entregados.some((x) => x.id === t.id && (!url || x.medioUrlRetocado === url));
    } catch {
      return false;
    }
  };

  const entregar = async () => {
    if (!despues || enCurso.current) return;
    enCurso.current = true;
    setAviso(null);
    let url: string | null = subida.current?.dataUrl === despues ? subida.current.url : null;
    try {
      if (!url) {
        setFase("subiendo");
        url = await fuente.subirRetocada(t, despues);
        subida.current = { dataUrl: despues, url };
      }
      setFase("entregando");
      await fuente.entregarRetoque(t.id, url);
      await alTerminar(`Entregada: ${t.productoNombre ?? "la foto"} ya tiene su foto nueva. Se cobraron ${t.creditos} créditos.`);
    } catch (e) {
      const codigo = codigoError(e);
      if (url && (!errorConocido(e) || codigo === "trabajo_no_pendiente") && (await quedoEntregado(url))) {
        await alTerminar(`Entregada: ${t.productoNombre ?? "la foto"} ya tiene su foto nueva. Se cobraron ${t.creditos} créditos.`);
        return;
      }
      if (codigo === "trabajo_no_pendiente") {
        await alTerminar(textoErrorAdmin(e), true);
        return;
      }
      setAviso(
        errorConocido(e)
          ? textoErrorAdmin(e)
          : url
            ? "No se pudo entregar (la foto ya está subida). Revisa la conexión e inténtalo otra vez."
            : "No se pudo subir la foto. Revisa la conexión e inténtalo otra vez.",
      );
      if (codigo === "foto_no_encontrada" || codigo === "producto_no_encontrado") setMotivo(codigo === "foto_no_encontrada" ? "Cambiaste esta foto mientras esperaba. Mándala otra vez si quieres retocarla." : "Retiraste este producto.");
    } finally {
      enCurso.current = false;
      setFase("listo");
    }
  };

  const confirmarDevolver = async () => {
    const m = motivo.trim();
    if (!m || [...m].length > MAX_MOTIVO || enCurso.current) return;
    enCurso.current = true;
    setFase("devolviendo");
    try {
      await fuente.devolverRetoque(t.id, m);
      setDevolver(false);
      await alTerminar(`Devuelta. ${t.tiendaNombre ?? "La tienda"} verá el motivo y no se le cobra.`);
    } catch (e) {
      if (!errorConocido(e) || codigoError(e) === "trabajo_no_pendiente") {
        try {
          const devueltos = await fuente.trabajosRetoque("devuelto");
          if (devueltos.some((x) => x.id === t.id)) {
            setDevolver(false);
            await alTerminar(`Devuelta. ${t.tiendaNombre ?? "La tienda"} verá el motivo y no se le cobra.`);
            return;
          }
        } catch {
          /* se avisa abajo */
        }
      }
      setAviso(errorConocido(e) ? textoErrorAdmin(e) : "No se pudo devolver. Revisa la conexión e inténtalo otra vez.");
      setDevolver(false);
    } finally {
      enCurso.current = false;
      setFase("listo");
    }
  };

  const ocupado = fase !== "listo";
  const largoMotivo = [...motivo].length;
  return (
    <Tarjeta tono="destacada" className="p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="truncate font-bold">{t.productoNombre ?? "Foto"}</h3>
        <span className="shrink-0 text-secundario opacity-80">{posicion} de {total}</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <figure>
          <figcaption className="mb-1 text-etiqueta tracking-wider uppercase opacity-80">Antes</figcaption>
          {/* eslint-disable-next-line @next/next/no-img-element -- foto de Storage o de la demo (data URL) */}
          <img src={t.medioUrlOriginal} alt={`Original de ${t.productoNombre ?? "la foto"}`} className="aspect-[4/5] w-full rounded-radio-m bg-superficie-hundida object-cover" />
        </figure>
        <figure>
          <figcaption className="mb-1 text-etiqueta tracking-wider uppercase opacity-80">Después</figcaption>
          <input ref={archivo} id={idArchivo} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => void elegir(e.target.files?.[0])} disabled={ocupado} />
          <label
            htmlFor={idArchivo}
            className="relative grid aspect-[4/5] w-full cursor-pointer place-items-center overflow-hidden rounded-radio-m border-2 border-dashed border-current/60 text-center focus-within:outline-3 focus-within:outline-foco"
          >
            {despues ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element -- vista previa local, todavía no entregada */}
                <img src={despues} alt="La retocada, sin entregar" className="absolute inset-0 size-full object-cover" />
                <span className="absolute right-1.5 bottom-1.5 rounded-full bg-superficie px-2.5 py-1 text-[12px] font-bold text-texto">Cambiar</span>
              </>
            ) : (
              <span className="flex flex-col items-center gap-2 px-2 text-secundario font-bold">
                <IconoFlechaArriba tamano={22} />
                {fase === "preparando" ? "Preparando…" : "Subir la retocada"}
              </span>
            )}
          </label>
        </figure>
      </div>
      <SuMarca tiendaId={t.tiendaId} tiendaNombre={t.tiendaNombre ?? "la tienda"} />
      <div className="mt-3 flex flex-wrap gap-2">
        <Boton jerarquia="secundario" icono={<IconoDescargar tamano={20} />} onClick={() => void bajarFoto(t.medioUrlOriginal, `${t.productoNombre ?? "foto"} original`)}>Bajar original</Boton>
        <Boton jerarquia="resalte" deshabilitado={!despues || (ocupado && fase !== "subiendo" && fase !== "entregando")} cargando={fase === "subiendo" || fase === "entregando"} onClick={() => void entregar()}>
          {fase === "subiendo" ? "Subiendo…" : fase === "entregando" ? "Entregando…" : "Entregar"}
        </Boton>
        <button type="button" disabled={ocupado} onClick={() => setDevolver(true)} className="tocable min-h-11 rounded-full px-3 font-extrabold underline underline-offset-4 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco disabled:opacity-50">Devolver</button>
      </div>
      {aviso && <p role="alert" className="mt-3 rounded-radio-m bg-superficie p-3 text-secundario text-peligro">{aviso}</p>}
      <p className="mt-3 text-secundario opacity-85">Al entregar, la foto cambia en su producto y se le cobran {t.creditos} créditos. Si no se puede, «Devolver» le explica por qué y no cobra.</p>
      <Hoja protegerAtras abierta={devolver} alCerrar={() => !ocupado && setDevolver(false)} titulo="Devolver la foto" avisarAlSalir={motivo.trim().length > 0 && fase === "listo"}>
        <div className="space-y-3 px-5 pb-6">
          <p className="text-texto-secundario">Ella lo verá en la foto, con «Subir otra». No se le cobra.</p>
          <div className="flex flex-wrap gap-2">
            {MOTIVOS_RAPIDOS.map((m) => (
              <button key={m} type="button" onClick={() => setMotivo(m)} className="tocable min-h-11 rounded-full border border-linea bg-superficie px-3 text-secundario font-bold focus-visible:outline-3 focus-visible:outline-foco">{m}</button>
            ))}
          </div>
          <CampoMultilinea etiqueta="Por qué la devuelves" value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={MAX_MOTIVO} filas={3} ayuda={`${largoMotivo}/${MAX_MOTIVO}`} />
          <Boton anchoCompleto deshabilitado={!motivo.trim() || largoMotivo > MAX_MOTIVO} cargando={fase === "devolviendo"} onClick={() => void confirmarDevolver()}>Devolver</Boton>
        </div>
      </Hoja>
    </Tarjeta>
  );
}

export function FotosTrabajo({
  trabajos,
  tiendas,
  resaltar,
  refrescar,
}: {
  trabajos: TrabajoRetoque[];
  tiendas: TiendaAdmin[];
  resaltar: string | null;
  refrescar: () => Promise<unknown>;
}) {
  const grupos = agrupar(trabajos, tiendas);
  const [abierta, setAbierta] = useState<string | null>(() => (grupos.find((g) => g.tiendaId === resaltar) ?? grupos[0])?.trabajos[0]?.id ?? null);
  const [aviso, setAviso] = useState<{ texto: string; error: boolean } | null>(null);
  const actual = trabajos.find((t) => t.id === abierta) ?? null;

  useEffect(() => {
    if (!resaltar) return;
    const reducir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById(`fotos-${resaltar}`)?.scrollIntoView({ block: "start", behavior: reducir ? "auto" : "smooth" });
  }, [resaltar]);

  /** Después de entregar o devolver: vuelve a leer y abre la siguiente foto de la misma tienda (o la de la siguiente). */
  const terminar = (t: TrabajoRetoque) => async (texto: string, error = false) => {
    setAviso({ texto, error });
    const g = grupos.find((x) => x.tiendaId === t.tiendaId);
    const resto = [...(g?.trabajos ?? []), ...grupos.filter((x) => x.tiendaId !== t.tiendaId).flatMap((x) => x.trabajos)].filter((x) => x.id !== t.id);
    setAbierta(resto[0]?.id ?? null);
    await refrescar();
  };

  if (!grupos.length)
    return (
      <>
        {aviso && <p role="status" className="mb-3 rounded-radio-m bg-accion-suave p-3 text-secundario text-exito-texto">{aviso.texto}</p>}
        <Tarjeta className="p-5">
          <p className="font-display text-destacado font-bold text-bosque">El taller está vacío.</p>
          <p className="mt-1 text-secundario text-texto-secundario">Cuando una tienda mande una foto a retocar, llega aquí.</p>
        </Tarjeta>
      </>
    );

  return (
    <>
      <p aria-live="polite" role={aviso?.error ? "alert" : "status"} className={aviso ? `mb-3 rounded-radio-m p-3 text-secundario ${aviso.error ? "bg-atencion-suave text-atencion-texto" : "bg-accion-suave text-exito-texto"}` : "sr-only"}>
        {aviso?.texto}
      </p>
      <div className="space-y-3">
        {grupos.map((g, i) => {
          const reservado = g.trabajos.reduce((n, t) => n + t.creditos, 0);
          const sinSaldo = g.creditos !== null && g.creditos < reservado;
          const visibles = g.trabajos.slice(0, 4);
          const abiertaAqui = g.trabajos.find((t) => t.id === actual?.id);
          return (
            <section key={g.tiendaId} id={`fotos-${g.tiendaId}`} aria-label={`Fotos de ${g.nombre}`} className="space-y-3">
              <Tarjeta className={`p-4 ${resaltar === g.tiendaId ? "ring-3 ring-resalte ring-offset-2 ring-offset-fondo" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="truncate font-bold">{g.nombre}</h2>
                    <p className="text-secundario text-texto-secundario">
                      {g.trabajos.length} {g.trabajos.length === 1 ? "foto" : "fotos"} · llegaron {haceDias(g.trabajos[0]!.creadoEn)}
                      {g.creditos !== null && ` · ${g.creditos} créditos`}
                    </p>
                  </div>
                  {i === 0 && grupos.length > 1 && <Etiqueta tono="atencion">La más vieja</Etiqueta>}
                </div>
                {sinSaldo && <p role="alert" className="mt-2 rounded-radio-m bg-atencion-suave p-2 text-secundario text-atencion-texto">Ojo: su saldo ({g.creditos}) ya no cubre las {g.trabajos.length} fotos ({reservado} créditos). No debería pasar: revisa sus créditos antes de entregar.</p>}
                <ul className="mt-3 grid grid-cols-4 gap-2">
                  {visibles.map((t, j) => {
                    const elegida = t.id === actual?.id;
                    const resto = g.trabajos.length - 4;
                    return (
                      <li key={t.id}>
                        <button
                          type="button"
                          aria-pressed={elegida}
                          aria-label={j === 3 && resto > 0 ? `${t.productoNombre ?? "Foto"} y ${resto} más` : `Abrir ${t.productoNombre ?? "foto"}`}
                          onClick={() => setAbierta(t.id)}
                          className={`tocable relative block aspect-square w-full overflow-hidden rounded-radio-m focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco ${elegida ? "ring-3 ring-resalte" : ""}`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element -- foto de Storage o de la demo */}
                          <img src={t.medioUrlOriginal} alt="" className="size-full bg-superficie-hundida object-cover" />
                          {j === 3 && resto > 0 && <span className="absolute inset-0 grid place-items-center bg-superficie-hundida/90 font-display text-destacado font-bold">+{resto}</span>}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </Tarjeta>
              {abiertaAqui && <Mesa key={abiertaAqui.id} trabajo={abiertaAqui} posicion={g.trabajos.indexOf(abiertaAqui) + 1} total={g.trabajos.length} alTerminar={terminar(abiertaAqui)} />}
            </section>
          );
        })}
      </div>
    </>
  );
}
