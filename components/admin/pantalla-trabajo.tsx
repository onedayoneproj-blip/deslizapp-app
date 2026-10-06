"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Avatar, Boton, Campo, ControlSegmentado, Contador, Etiqueta, Tarjeta } from "@/components/ui";
import { Hoja } from "@/components/hoja";
import { useAdmin, useAdminDemo } from "@/lib/data/admin/provider";
import { ETIQUETAS_PASOS, NOMBRES_PASOS, pasoActual } from "@/lib/catalogo-estado";
import { enlaceWhatsAppAdmin, mensajeRevisarCatalogo } from "@/lib/admin/mensajes";
import { errorConocido, textoErrorAdmin } from "@/lib/admin/errores";
import type { TiendaAdmin, TrabajoRetoque } from "@/lib/admin/tipos";
import { haceDias } from "@/lib/admin/tiempo";
import { EstadoAdmin } from "./estado";
import { HojaFotosTienda } from "./hoja-fotos-tienda";
import { FotosTrabajo } from "./trabajo-fotos";

type Vista = "catalogos" | "fotos";
type Grupo = { estado: TiendaAdmin["catalogoEstado"]; titulo: string };
const GRUPOS: Grupo[] = [
  { estado: "solicitado", titulo: "Por empezar" },
  { estado: "generando", titulo: "Armando" },
  { estado: "cambios", titulo: "Pidió cambios" },
  { estado: "revisar", titulo: "Esperando su sí" },
];
const EN_TRABAJO = new Set(GRUPOS.map((g) => g.estado));

const mayuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** El enlace propuesto para «Mandar a revisar»: el que ya tiene, o su catálogo en Deslizapp (siempre https). */
function enlacePropuesto(t: TiendaAdmin) {
  if (t.urlCatalogo) return t.urlCatalogo;
  if (typeof window === "undefined") return "";
  return `https://${window.location.host}/tienda/${t.slug}`;
}

function PasosCatalogo({ paso }: { paso: 1 | 2 | 3 }) {
  return (
    <div className="mt-3" aria-label={`Paso ${paso} de 3: ${ETIQUETAS_PASOS[paso - 1]}`} role="img">
      <div className="grid grid-cols-3 gap-1.5">
        {ETIQUETAS_PASOS.map((e, i) => (
          <div key={e}>
            <div className={`h-1.5 rounded-full ${i + 1 < paso ? "bg-accion" : i + 1 === paso ? "bg-resalte" : "bg-superficie-hundida"}`} />
            <p className={`mt-1 text-[12px] font-bold ${i + 1 <= paso ? "text-texto" : "text-texto-secundario"}`}>{e}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function TarjetaCatalogo({
  tienda: t,
  resaltada,
  ocupada,
  avanzar,
  mandarARevisar,
  verFotos,
}: {
  tienda: TiendaAdmin;
  resaltada: boolean;
  ocupada: boolean;
  avanzar: (t: TiendaAdmin, accion: "empezar" | "siguiente") => void;
  mandarARevisar: (t: TiendaAdmin) => void;
  verFotos: (t: TiendaAdmin) => void;
}) {
  const raiz = useAdminDemo() ? "/admin-demo" : "/admin";
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!resaltada) return;
    const reducir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    ref.current?.scrollIntoView({ block: "center", behavior: reducir ? "auto" : "smooth" });
  }, [resaltada]);
  const paso = pasoActual(t.catalogoPaso);
  const desde = haceDias(t.catalogoPasoEn);
  const whatsapp = enlaceWhatsAppAdmin(t.whatsapp, mensajeRevisarCatalogo(t.nombre, t.vendedora));
  return (
    <div ref={ref} id={`tienda-${t.id}`} className={`rounded-radio-l ${resaltada ? "ring-3 ring-resalte ring-offset-2 ring-offset-fondo" : ""}`}>
      <Tarjeta className="p-4">
        <div className="flex items-start gap-3">
          <Avatar nombre={t.nombre} tipo="tienda" foto={t.logoUrl ?? t.fotoPerfilUrl} />
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-bold">{t.nombre}</h3>
            <p className="text-secundario text-texto-secundario">
              {mayuscula(t.rubro)}
              {t.catalogoEstado === "revisar" ? ` · se lo mandaste ${desde}` : t.catalogoEstado === "solicitado" ? "" : ` · ${desde}`}
            </p>
          </div>
          {t.catalogoEstado === "solicitado" && <Etiqueta tono="atencion">{mayuscula(desde)}</Etiqueta>}
        </div>
        {t.catalogoEstado === "generando" && (
          <>
            <PasosCatalogo paso={paso} />
            <p className="mt-2 text-secundario text-texto-secundario">Ella ve «{NOMBRES_PASOS[paso - 1]}» en su app.</p>
          </>
        )}
        {t.catalogoEstado === "cambios" && (
          <blockquote className="mt-3 rounded-radio-m bg-fondo p-3">«{t.catalogoNotasCambios?.trim() || "Pidió cambios sin nota."}»</blockquote>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {t.catalogoEstado === "solicitado" && (
            <>
              <Boton cargando={ocupada} onClick={() => avanzar(t, "empezar")}>Empezar</Boton>
              <Boton jerarquia="secundario" onClick={() => verFotos(t)}>Ver sus fotos</Boton>
            </>
          )}
          {t.catalogoEstado === "generando" &&
            (paso < 3 ? (
              <Boton cargando={ocupada} onClick={() => avanzar(t, "siguiente")}>Pasar a {ETIQUETAS_PASOS[paso as 1 | 2]}</Boton>
            ) : (
              <Boton cargando={ocupada} onClick={() => mandarARevisar(t)}>Mandar a revisar</Boton>
            ))}
          {t.catalogoEstado === "generando" && <Boton jerarquia="secundario" onClick={() => verFotos(t)}>Ver sus fotos</Boton>}
          {t.catalogoEstado === "cambios" && (
            <>
              <Boton cargando={ocupada} onClick={() => mandarARevisar(t)}>Mandar a revisar</Boton>
              <Boton jerarquia="secundario" href={`${raiz}/tiendas/${t.id}/catalogo`}>Personalizar</Boton>
            </>
          )}
          {t.catalogoEstado === "revisar" &&
            (whatsapp ? (
              <Boton jerarquia="secundario" whatsapp href={whatsapp} target="_blank" rel="noreferrer">Recordarle</Boton>
            ) : (
              <p className="text-secundario text-texto-secundario">No tiene WhatsApp guardado para recordarle.</p>
            ))}
        </div>
      </Tarjeta>
    </div>
  );
}

function Catalogos({ tiendas, resaltar, refrescar }: { tiendas: TiendaAdmin[]; resaltar: string | null; refrescar: () => Promise<TiendaAdmin[] | null> }) {
  const fuente = useAdmin();
  const enCurso = useRef<string | null>(null);
  const [ocupada, setOcupada] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ texto: string; error: boolean } | null>(null);
  const [revisar, setRevisar] = useState<TiendaAdmin | null>(null);
  const [enlace, setEnlace] = useState("");
  const [errorEnlace, setErrorEnlace] = useState<string | null>(null);
  const [fotosDe, setFotosDe] = useState<TiendaAdmin | null>(null);

  /** Una acción a la vez por pantalla (doble toque o dos botones). Si la respuesta se pierde, se vuelve a leer antes de decir nada. */
  const correr = async (t: TiendaAdmin, hacer: () => Promise<unknown>, listo: string) => {
    if (enCurso.current) return false;
    enCurso.current = t.id;
    setOcupada(t.id);
    setAviso(null);
    try {
      await hacer();
      await refrescar();
      setAviso({ texto: listo, error: false });
      return true;
    } catch (e) {
      if (!errorConocido(e)) {
        const despues = (await refrescar())?.find((x) => x.id === t.id);
        if (despues && (despues.catalogoEstado !== t.catalogoEstado || despues.catalogoPaso !== t.catalogoPaso)) {
          setAviso({ texto: listo, error: false });
          return true;
        }
        setAviso({ texto: "No se pudo guardar. Revisa la conexión e inténtalo otra vez.", error: true });
      } else {
        await refrescar();
        setAviso({ texto: textoErrorAdmin(e), error: true });
      }
      return false;
    } finally {
      enCurso.current = null;
      setOcupada(null);
    }
  };

  const avanzar = (t: TiendaAdmin, accion: "empezar" | "siguiente") =>
    void correr(
      t,
      () => fuente.avanzarCatalogo(t.id, accion),
      accion === "empezar" ? `Empezaste el catálogo de ${t.nombre}. Ella ya ve «${NOMBRES_PASOS[0]}».` : `${t.nombre} ya ve «${NOMBRES_PASOS[Math.min(pasoActual(t.catalogoPaso), 2) as 1 | 2]}».`,
    );
  const abrirRevisar = (t: TiendaAdmin) => {
    setRevisar(t);
    setEnlace(enlacePropuesto(t));
    setErrorEnlace(null);
  };
  const confirmarRevisar = async () => {
    if (!revisar) return;
    const url = enlace.trim();
    if (!/^https:\/\/\S+$/.test(url) || url.length > 2048) {
      setErrorEnlace("Tiene que empezar con https://.");
      return;
    }
    const ok = await correr(revisar, () => fuente.avanzarCatalogo(revisar.id, "a_revisar", url), `Se lo mandaste a ${revisar.nombre}. Publicar lo toca ella.`);
    if (ok) setRevisar(null);
  };

  const enTrabajo = tiendas.filter((t) => EN_TRABAJO.has(t.catalogoEstado));
  return (
    <>
      <p aria-live="polite" role={aviso?.error ? "alert" : "status"} className={aviso ? `mb-3 rounded-radio-m p-3 text-secundario ${aviso.error ? "bg-atencion-suave text-atencion-texto" : "bg-accion-suave text-exito-texto"}` : "sr-only"}>
        {aviso?.texto}
      </p>
      {enTrabajo.length === 0 && (
        <Tarjeta className="p-5">
          <p className="font-display text-destacado font-bold text-bosque">Ningún catálogo por armar.</p>
          <p className="mt-1 text-secundario text-texto-secundario">Cuando una tienda pida el suyo, aparece aquí.</p>
        </Tarjeta>
      )}
      {GRUPOS.map((g) => {
        const lista = enTrabajo
          .filter((t) => t.catalogoEstado === g.estado)
          .sort((a, b) => Date.parse(a.catalogoPasoEn ?? "") - Date.parse(b.catalogoPasoEn ?? ""));
        if (!lista.length) return null;
        return (
          <section key={g.estado} aria-labelledby={`grupo-${g.estado}`} className="mb-5">
            <h2 id={`grupo-${g.estado}`} className="mb-2 px-1 text-etiqueta tracking-wider text-texto-secundario uppercase">{g.titulo}</h2>
            <div className="space-y-3">
              {lista.map((t) => (
                <TarjetaCatalogo key={t.id} tienda={t} resaltada={resaltar === t.id} ocupada={ocupada === t.id} avanzar={avanzar} mandarARevisar={abrirRevisar} verFotos={setFotosDe} />
              ))}
            </div>
          </section>
        );
      })}
      {enTrabajo.some((t) => t.catalogoEstado === "revisar") && <p className="mt-2 text-center font-mano text-mano text-resalte">publicar lo toca ella, no tú</p>}
      <Hoja abierta={!!revisar} alCerrar={() => setRevisar(null)} titulo="Mandar a revisar">
        <div className="space-y-4 px-5 pb-6">
          <p className="text-texto-secundario">{revisar?.nombre} lo verá en su pestaña Catálogo, con «Publicar» y «Pedir cambios».</p>
          <Campo etiqueta="Enlace de su catálogo" type="url" inputMode="url" autoComplete="off" value={enlace} onChange={(e) => { setEnlace(e.target.value); setErrorEnlace(null); }} error={errorEnlace ?? undefined} />
          <Boton anchoCompleto cargando={!!revisar && ocupada === revisar.id} onClick={() => void confirmarRevisar()}>Mandar a revisar</Boton>
        </div>
      </Hoja>
      <HojaFotosTienda tienda={fotosDe} alCerrar={() => setFotosDe(null)} />
    </>
  );
}

export function PantallaTrabajo() {
  const fuente = useAdmin();
  const params = useSearchParams();
  const router = useRouter();
  const ruta = usePathname();
  const vista: Vista = params.get("ver") === "fotos" ? "fotos" : "catalogos";
  const resaltar = params.get("tienda");
  const [tiendas, setTiendas] = useState<TiendaAdmin[] | null>(null);
  const [trabajos, setTrabajos] = useState<TrabajoRetoque[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const leer = useCallback(async () => {
    setError(null);
    try {
      const [t, r] = await Promise.all([fuente.tiendas("todas"), fuente.trabajosRetoque("pendiente")]);
      setTiendas(t.tiendas);
      setTrabajos(r);
      return t.tiendas;
    } catch {
      setError("No se pudo cargar Trabajo.");
      return null;
    }
  }, [fuente]);
  useEffect(() => {
    const id = window.setTimeout(() => void leer(), 0);
    const alVolver = () => document.visibilityState === "visible" && void leer();
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [leer]);

  const cambiarVista = (v: Vista) => router.replace(v === "fotos" ? `${ruta}?ver=fotos` : ruta, { scroll: false });
  const catalogos = tiendas?.filter((t) => EN_TRABAJO.has(t.catalogoEstado)).length ?? 0;
  return (
    <>
      <h1 className="font-display text-titulo-pantalla font-bold text-bosque">Trabajo</h1>
      <div className="mt-4 mb-5">
        <ControlSegmentado<Vista>
          etiqueta="Qué trabajo ver"
          valor={vista}
          alCambiar={cambiarVista}
          opciones={[
            { id: "catalogos", texto: <span className="inline-flex items-center gap-1.5">Catálogos <Contador valor={catalogos} atencion={catalogos > 0} /></span> },
            { id: "fotos", texto: <span className="inline-flex items-center gap-1.5">Fotos <Contador valor={trabajos?.length ?? 0} atencion={(trabajos?.length ?? 0) > 0} /></span> },
          ]}
        />
      </div>
      <EstadoAdmin cargando={!tiendas && !error} error={error} reintentar={() => void leer()} />
      {tiendas && trabajos && (vista === "catalogos" ? <Catalogos tiendas={tiendas} resaltar={resaltar} refrescar={leer} /> : <FotosTrabajo trabajos={trabajos} tiendas={tiendas} resaltar={resaltar} refrescar={leer} />)}
    </>
  );
}
