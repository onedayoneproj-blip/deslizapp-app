"use client";

import { useEffect, useState, type ReactNode } from "react";
import { enlaceCatalogo } from "@/lib/enlace-catalogo";
import { textoFaltan } from "@/lib/publicar-catalogo";
import { ETIQUETAS_PASOS, NOMBRES_PASOS, PROGRESO_PASOS, pasoActual, type VistaCatalogo } from "@/lib/catalogo-estado";
import { menosMovimiento } from "@/lib/movimiento";
import type { Tienda } from "@/lib/types";
import { IconoCompartir, IconoCopiar } from "../iconos";
import { Boton as BotonUI, Tarjeta } from "../ui";

// La tarjeta del catálogo en línea (pestaña Catálogo): 8 estados dinámicos, del diseño aprobado en
// referencias/catalogo-estados/estados.dc.html. Colores y medidas de esa referencia con los tokens de la app; los keyframes están
// en app/globals.css (`cat-anim-*`, solo transform / opacity).

export type AccionesTarjeta = {
  /** «Publicar mi catálogo» (abre la hoja de confirmación). */
  alPublicar: () => void;
  /** Llevar a crear un producto (cuando faltan productos con foto para publicar). */
  alCrearProducto: () => void;
  /** Copia el enlace del catálogo. */
  alCopiar: () => void;
  /** «Dejar de mostrarlo» (abre la confirmación). */
  alDejarDeMostrar: () => void;
  /** Publicar y dejar de mostrar son solo de la dueña: sin ser ella, el botón se ve apagado y, al tocarlo, llama esto (explica por qué). */
  soloDuena?: () => void;
  alPedir: () => void;
  alRevisar: () => void;
  /** Comparte el enlace del catálogo (hoja nativa de compartir o, si no hay, lo copia). */
  alCompartir: () => void;
  /** Compartir desde la celebración: abre la hoja y da por vista la celebración. */
  alCompartirReciente: () => void;
  alConectar: () => void;
  alVerPlan: () => void;
  /** Esta cuenta no tiene el grupo catálogo: «Pedirlo» y «Revisar» se ven apagados y, al tocarlos, llaman esto (explica por qué). */
  sinPermiso?: () => void;
};

/**
 * Dibuja la tarjeta de la `vista` dada. Cuando la vista cambia con la pantalla abierta, la tarjeta anterior sale con un fundido y
 * la nueva entra con la animación "entrar"; con "reducir movimiento" el cambio es instantáneo.
 */
export function TarjetaCatalogo({ vista, tienda, acciones, faltan = 0 }: { vista: VistaCatalogo; tienda: Tienda; acciones: AccionesTarjeta; faltan?: number }) {
  const [mostrada, setMostrada] = useState(vista);
  const [saliendo, setSaliendo] = useState(false);
  useEffect(() => {
    if (vista === mostrada) return;
    if (menosMovimiento()) {
      const t = setTimeout(() => setMostrada(vista), 0);
      return () => clearTimeout(t);
    }
    const t1 = setTimeout(() => setSaliendo(true), 0);
    const t2 = setTimeout(() => {
      setMostrada(vista);
      setSaliendo(false);
    }, 160);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [vista, mostrada]);

  return (
    <section aria-label="Catálogo en línea" aria-live="polite" className="min-h-[76px]">
      <div key={mostrada} className={`cat-anim-entrar ${saliendo ? "cat-anim-salir" : ""}`}>
        <Estado vista={mostrada} tienda={tienda} acciones={acciones} faltan={faltan} />
      </div>
    </section>
  );
}

function Estado({ vista, tienda, acciones, faltan }: { vista: VistaCatalogo; tienda: Tienda; acciones: AccionesTarjeta; faltan: number }) {
  switch (vista) {
    case "sin":
      // La tienda publica sola: sin lo mínimo, dice qué falta; con lo mínimo, «Publicar mi catálogo» (solo la dueña).
      return faltan > 0 ? (
        <Sin subtitulo={textoFaltan(faltan)} boton="Crear producto" alTocar={acciones.alCrearProducto} debajo />
      ) : (
        <Sin subtitulo="Ya tienes lo necesario. Tus clientes lo verán en un enlace tuyo." boton="Publicar mi catálogo" alTocar={acciones.soloDuena ?? acciones.alPublicar} apagado={!!acciones.soloDuena} debajo mas={false} />
      );
    case "conectar":
      return <Sin boton="Conectar mi catálogo" alTocar={acciones.alConectar} debajo />;
    case "solicitado":
      return <Solicitado />;
    case "generando":
      return <Generando paso={pasoActual(tienda.catalogoPaso)} />;
    case "revisar":
      return <Revisar alTocar={acciones.sinPermiso ?? acciones.alRevisar} apagado={!!acciones.sinPermiso} />;
    case "cambios":
      return <Cambios notas={tienda.catalogoNotasCambios} />;
    case "recien":
      return <Recien alTocar={acciones.alCompartirReciente} />;
    case "publicado":
      return <Publicado tienda={tienda} acciones={acciones} />;
    case "pausado":
      return <Pausado alTocar={acciones.alVerPlan} />;
  }
}

// ---------------------------------------------------------------------------
// Piezas compartidas
// ---------------------------------------------------------------------------

const CAJA = "relative box-border w-full overflow-hidden rounded-[22px] py-3.5 pr-3.5 pl-4";
const FILA = "flex items-center gap-3";

function Textos({ titulo, subtitulo, colorSub = "text-suave", colorTitulo = "text-bosque" }: { titulo: string; subtitulo?: string; colorSub?: string; colorTitulo?: string }) {
  return (
    <div className="min-w-0 grow">
      <p className={`text-[15px] leading-tight font-extrabold ${colorTitulo}`}>{titulo}</p>
      {subtitulo && <p className={`mt-[3px] text-[13px] leading-[1.35] ${colorSub}`}>{subtitulo}</p>}
    </div>
  );
}

function Insignia({ fondo, children, className = "" }: { fondo: string; children: ReactNode; className?: string }) {
  return <div className={`relative grid h-11 w-11 shrink-0 place-items-center rounded-full ${fondo} ${className}`}>{children}</div>;
}

/** Botón de la tarjeta: 36 px de alto con el área de toque de 44 px (pseudo-elemento invisible). */
function Boton({ children, alTocar, clase, latido = false, apagado = false }: { children: ReactNode; alTocar: () => void; clase: string; latido?: boolean; apagado?: boolean }) {
  return (
    <button
      type="button"
      onClick={alTocar}
      aria-disabled={apagado || undefined}
      data-sin-permiso={apagado || undefined}
      className={`${apagado ? "opacity-40 " : ""}tocable relative isolate flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13.5px] font-extrabold after:absolute after:inset-x-0 after:-inset-y-1 after:content-[''] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco ${clase} ${latido ? "cat-anim-onda-cta" : ""}`}
    >
      {children}
    </button>
  );
}

function Icono({ children, tamano = 22, trazo = "#174b3a", grosor = 2 }: { children: ReactNode; tamano?: number; trazo?: string; grosor?: number }) {
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none" stroke={trazo} strokeWidth={grosor} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Los estados
// ---------------------------------------------------------------------------

/** 1 · Sin catálogo (y "Conectar mi catálogo" cuando figura publicado pero no hay un enlace válido). */
function Sin({ boton, alTocar, subtitulo = "Lo armamos por ti con tus fotos. Tú solo lo compartes.", debajo = false, mas = true, apagado = false }: { boton: string; alTocar: () => void; subtitulo?: string; debajo?: boolean; mas?: boolean; apagado?: boolean }) {
  return (
    <div className={`${CAJA} border-[1.5px] border-dashed border-bosque/30 bg-papel`}>
      <span aria-hidden="true" className="cat-anim-nota absolute top-1 right-[18px] font-mano text-[17px] text-mandarina-texto" style={{ transform: "rotate(-4deg)" }}>
        ¡abierto 24/7!
      </span>
      <div className={`${FILA} pt-2`}>
        <Insignia fondo="bg-rosa">
          <span className="cat-anim-titilar flex">
            <Icono>
              <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6.3 6.3l2.2 2.2M15.5 15.5l2.2 2.2M6.3 17.7l2.2-2.2M15.5 8.5l2.2-2.2" />
            </Icono>
          </span>
          <span aria-hidden="true" className="cat-anim-titilar2 absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-mandarina" />
        </Insignia>
        <Textos titulo="Tu catálogo en línea" subtitulo={subtitulo} />
        {!debajo && (
          <Boton alTocar={alTocar} clase="bg-mandarina text-bosque-oscuro" latido={!apagado} apagado={apagado}>
            {boton}
          </Boton>
        )}
      </div>
      {debajo && (
        <div className="mt-3 flex">
          <Boton alTocar={alTocar} clase="bg-mandarina text-bosque-oscuro" latido={!apagado} apagado={apagado}>
            {mas && (
              <span className="grid h-4 w-4 place-items-center rounded-full bg-bosque text-papel">
                <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" aria-hidden="true">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </span>
            )}
            {boton}
          </Boton>
        </div>
      )}
    </div>
  );
}

/** 2 · Pedido recibido. */
function Solicitado() {
  return (
    <div className={`${CAJA} bg-menta`}>
      <div className={FILA}>
        <Insignia fondo="bg-white">
          <span className="cat-anim-rebote flex">
            <Icono>
              <path d="M4 13l2.2-6.2A1 1 0 0 1 7.1 6h9.8a1 1 0 0 1 .9.8L20 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
              <path d="M4 13h4.5l1.5 2.5h4l1.5-2.5H20" />
              <path d="M9.5 9l2 2 3.5-3.5" />
            </Icono>
          </span>
        </Insignia>
        <Textos titulo="¡Pedido recibido!" subtitulo="Te avisamos en cuanto empecemos a armarlo." />
        <span className="flex h-7 shrink-0 items-center gap-1 rounded-full border-[1.5px] border-bosque px-2.5 text-xs font-extrabold text-bosque">
          En cola
          <span aria-hidden="true" className="inline-flex gap-0.5">
            {[0, 0.2, 0.4].map((d) => (
              <i key={d} className="cat-anim-punto block h-[3px] w-[3px] rounded-full bg-bosque" style={{ animationDelay: `${d}s` }} />
            ))}
          </span>
        </span>
      </div>
    </div>
  );
}

/** El check de trazo curvo de un paso completado (el del diseño; no el carácter ✓). */
function PasoHecho() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
      <circle cx="12" cy="12" r="11" fill="#dcebe2" />
      <path d="M7.4 12.9c1.1.9 2 1.8 2.8 2.9 1.6-2.7 3.6-4.8 6.4-6.5" fill="none" stroke="#174b3a" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
/** El paso en curso: aro Mandarina con un punto que late. */
function PasoEnCurso() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
      <circle cx="12" cy="12" r="10" fill="none" stroke="#ff834f" strokeWidth="2.4" />
      <circle className="cat-anim-late" cx="12" cy="12" r="4.2" fill="#ff834f" />
    </svg>
  );
}
/** Un paso pendiente: aro tenue, sin relleno. */
function PasoPendiente() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
      <circle cx="12" cy="12" r="10" fill="none" stroke="#fff9ee" strokeOpacity="0.3" strokeWidth="2.2" />
    </svg>
  );
}

/** 3 · Armando tu catálogo (paso 1–3). */
function Generando({ paso }: { paso: 1 | 2 | 3 }) {
  return (
    <div className={`${CAJA} bg-bosque text-papel`}>
      <div className={FILA}>
        <Insignia fondo="bg-papel/12">
          <span className="cat-anim-destellos flex">
            <Icono tamano={24} trazo="#fff9ee">
              <path d="M10 4c.5 3.6 2.4 5.5 6 6-3.6.5-5.5 2.4-6 6-.5-3.6-2.4-5.5-6-6 3.6-.5 5.5-2.4 6-6z" />
              <path d="M18.5 15c.25 1.7 1.1 2.55 2.8 2.8-1.7.25-2.55 1.1-2.8 2.8-.25-1.7-1.1-2.55-2.8-2.8 1.7-.25 2.55-1.1 2.8-2.8z" />
            </Icono>
          </span>
        </Insignia>
        <Textos titulo="Armando tu catálogo…" subtitulo={`Paso ${paso} de 3 · ${NOMBRES_PASOS[paso - 1]}`} colorTitulo="text-papel" colorSub="text-menta" />
      </div>
      <div
        role="progressbar"
        aria-label="Progreso del catálogo"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={PROGRESO_PASOS[paso - 1]}
        className="mt-3 h-1.5 overflow-hidden rounded-[3px] bg-papel/16"
      >
        <div className="cat-anim-brillo h-1.5 rounded-[3px] bg-mandarina" style={{ width: `${PROGRESO_PASOS[paso - 1]}%` }} />
      </div>
      <ol className="mt-2.5 flex justify-between text-[12.5px] font-bold text-menta">
        {ETIQUETAS_PASOS.map((nombre, i) => {
          const n = i + 1;
          return (
            <li key={nombre} className={`flex items-center gap-1.5 ${n === paso ? "text-papel" : ""}`} aria-current={n === paso ? "step" : undefined}>
              {n < paso ? <PasoHecho /> : n === paso ? <PasoEnCurso /> : <PasoPendiente />}
              {nombre}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** 4 · Listo para revisar. */
function Revisar({ alTocar, apagado = false }: { alTocar: () => void; apagado?: boolean }) {
  return (
    <div className={`${CAJA} bg-rosa`}>
      <div className={FILA}>
        <Insignia fondo="bg-white">
          <span className="cat-anim-rebote flex">
            <Icono>
              <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
              <circle cx="12" cy="12" r="3" />
            </Icono>
          </span>
          <span aria-hidden="true" className="cat-anim-onda absolute top-0 right-0 isolate h-3 w-3 rounded-full border-2 border-rosa bg-mandarina" />
        </Insignia>
        <Textos titulo="¡Está listo! Échale un ojo" subtitulo="Revísalo y publícalo cuando te guste." colorSub="text-bosque" />
        <Boton alTocar={alTocar} clase="bg-bosque text-papel" apagado={apagado}>
          Revisar
        </Boton>
      </div>
    </div>
  );
}

/** 5 · Aplicando cambios (con las notas que envió el dueño). */
function Cambios({ notas }: { notas: string | null }) {
  return (
    <div className={`${CAJA} bg-arena`}>
      <div className={FILA}>
        <Insignia fondo="bg-white">
          <span className="cat-anim-destellos flex">
            <Icono>
              <path d="M4 18.5v-2.1c0-.4.2-.8.4-1L15 5a1.5 1.5 0 0 1 2.1 0L19 6.9a1.5 1.5 0 0 1 0 2.1L8.6 19.6c-.3.3-.6.4-1 .4H5.5A1.5 1.5 0 0 1 4 18.5z" />
              <path d="M13.5 6.5l4 4" />
            </Icono>
          </span>
        </Insignia>
        <Textos titulo="Aplicando tus cambios" subtitulo="Te lo devolvemos para revisar muy pronto." />
      </div>
      <div aria-hidden="true" className="relative mt-3 h-1 overflow-hidden rounded-sm bg-borde">
        <div className="cat-anim-va-y-viene absolute top-0 left-0 h-1 w-[35%] rounded-sm bg-bosque" />
      </div>
      {notas && <p className="mt-2.5 line-clamp-2 text-[12.5px] leading-snug break-words text-suave">Tus notas: {notas}</p>}
    </div>
  );
}

/** 6 · ¡Recién publicado! (celebración, solo la primera vez). */
function Recien({ alTocar }: { alTocar: () => void }) {
  const confeti = [
    ["8%", "bg-mandarina", "", 0],
    ["20%", "bg-rosa", "rounded-[4px]", 0.5],
    ["34%", "bg-papel", "", 1.1],
    ["48%", "bg-mandarina", "rounded-[4px]", 0.3],
    ["60%", "bg-rosa", "", 1.5],
    ["72%", "bg-papel", "rounded-[4px]", 0.8],
    ["84%", "bg-mandarina", "", 1.9],
    ["94%", "bg-rosa", "", 0.1],
  ] as const;
  return (
    <div className={`${CAJA} bg-bosque pt-3`}>
      {confeti.map(([izq, color, forma, retraso]) => (
        <span key={izq} aria-hidden="true" className={`cat-anim-confeti absolute -top-2.5 h-[7px] w-[7px] rounded-sm ${color} ${forma}`} style={{ left: izq, animationDelay: `${retraso}s` }} />
      ))}
      <div className={`${FILA} relative`}>
        <div className="min-w-0 grow">
          <p className="cat-anim-pop font-mano text-[28px] leading-none text-rosa">¡Ya estás en línea!</p>
          <p className="mt-1.5 text-[13px] leading-[1.35] text-papel">Compártelo y deja que lleguen los pedidos.</p>
        </div>
        <Boton alTocar={alTocar} clase="bg-mandarina text-bosque-oscuro">
          Compartir
        </Boton>
      </div>
    </div>
  );
}

/**
 * 7 · En línea: el estado del día a día. «Tu catálogo está en línea», el enlace, y debajo «Copiar enlace», «Compartir» y
 * «Dejar de mostrarlo» (solo la dueña). Tocar el título abre el catálogo.
 */
function Publicado({ tienda, acciones }: { tienda: Tienda; acciones: AccionesTarjeta }) {
  const enlace = enlaceCatalogo(tienda.urlCatalogo);
  const soloDuena = !!acciones.soloDuena;
  return (
    <Tarjeta className="relative">
      <div className={FILA}>
        <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full bg-en-linea" />
        <div className="min-w-0 grow">
          <p className="text-destacado text-texto">
            {enlace ? (
              <a
                href={enlace.href}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-radio-s after:absolute after:inset-0 after:rounded-radio-l after:content-[''] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco"
              >
                Tu catálogo está en línea
                <span className="sr-only"> · abrir el catálogo</span>
              </a>
            ) : (
              "Tu catálogo está en línea"
            )}
          </p>
          {enlace && (
            <p className="truncate text-secundario text-texto-secundario">
              {enlace.dominio}
              {enlace.resto}
            </p>
          )}
        </div>
      </div>
      <div className="relative z-10 mt-3 flex flex-wrap items-center gap-2">
        <BotonUI tamano="compacto" jerarquia="secundario" icono={<IconoCopiar tamano={18} />} onClick={acciones.alCopiar}>
          Copiar enlace
        </BotonUI>
        <BotonUI tamano="compacto" icono={<IconoCompartir tamano={18} />} onClick={acciones.alCompartir}>
          Compartir
        </BotonUI>
        <button
          type="button"
          onClick={soloDuena ? acciones.soloDuena : acciones.alDejarDeMostrar}
          aria-disabled={soloDuena || undefined}
          data-sin-permiso={soloDuena || undefined}
          className={`${soloDuena ? "opacity-40 " : ""}tocable ml-auto flex h-9 items-center rounded-full px-2 text-[13.5px] font-extrabold text-bosque focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco`}
        >
          Dejar de mostrarlo
        </button>
      </div>
    </Tarjeta>
  );
}

/** 8 · Catálogo pausado (tienda en prueba o plan vencido). */
function Pausado({ alTocar }: { alTocar: () => void }) {
  return (
    <div className={`${CAJA} border-[1.5px] border-dashed border-bosque/30 bg-white`}>
      <div className={FILA}>
        <Insignia fondo="bg-arena">
          <Icono tamano={20} trazo="#4f6a5e" grosor={2.2}>
            <path d="M9 6v12M15 6v12" />
          </Icono>
        </Insignia>
        <Textos titulo="Catálogo pausado" subtitulo="Tus clientes ven un aviso. Actívalo con tu plan." colorTitulo="text-suave" />
        <Boton alTocar={alTocar} clase="border-[1.5px] border-bosque bg-transparent text-bosque">
          Ver plan
        </Boton>
      </div>
    </div>
  );
}
