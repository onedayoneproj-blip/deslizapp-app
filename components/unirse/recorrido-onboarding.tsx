"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ComponentType, type CSSProperties, type FormEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { flushSync } from "react-dom";
import {
  alternarRubro,
  borradorNuevo,
  capituloListo,
  datosParaCrear,
  DURACION_HISTORIA_MS,
  errorArchivoLogo,
  errorNombreTienda,
  prepararLogo,
  errorVendedora,
  inicialesTienda,
  leerBorrador,
  NOMBRE_RUBRO_ONBOARDING,
  NOMBRE_TIENDA_MAX,
  NOMBRE_VENDEDORA_MAX,
  primerNombre,
  rubrosEnTexto,
  saludoOnboarding,
  TOTAL_CAPITULOS,
  TOTAL_HISTORIAS,
  vendedoraDe,
  whatsappEscrito,
  whatsappParaGuardar,
  whatsappVisible,
  type Borrador,
  type Capitulo,
} from "@/lib/onboarding";
import { RUBROS, type Rubro } from "@/lib/rubros";
import {
  IconoAnillo,
  IconoBolsa,
  IconoCamisa,
  IconoCamara,
  IconoCasa,
  IconoEditar,
  IconoMas,
  IconoCheck,
  IconoCerrar,
  IconoCorazon,
  IconoEnlace,
  IconoLabial,
  IconoPerfume,
  IconoPersona,
  IconoTazon,
  IconoWhatsApp,
} from "../iconos";
import { Isotipo, Logotipo } from "../marca";
import { Boton, Campo, FondoPatron } from "../ui";
import { clases } from "../ui/comunes";

/** Lo que el recorrido necesita de afuera: en el modo real, Supabase; en la demo, nada real. */
export type FuenteOnboarding = {
  /** Clave del borrador en este navegador (la demo usa otra para no mezclarse). */
  claveBorrador: string;
  enlaceId: string;
  /** Nombre completo de la cuenta de Google (null si no hay). */
  nombreCuenta: string | null;
  /** El slug que pondría la base hoy (vista_slug). */
  vistaSlug: (nombre: string) => Promise<string | null>;
  /** Crea la tienda con todo junto. Lanza un Error con el mensaje para la persona. */
  crear: (datos: { nombre: string; rubros: Rubro[]; whatsapp: string; vendedora: string }) => Promise<void>;
  /**
   * «Pon tu logo» en «ya existe» (opcional): sube el logo ya reducido (data URL) a la tienda recién creada y devuelve la dirección
   * que se muestra. Lanza un Error con el mensaje para la persona.
   */
  ponerLogo: (logo: string) => Promise<string>;
  /** «Ver mi tienda». */
  alTerminar: () => void;
};

type Etapa = "historias" | "capitulos" | "existe";

const ICONO_RUBRO: Record<Rubro, ComponentType<{ tamano?: number }>> = {
  perfumes: IconoPerfume,
  ropa: IconoCamisa,
  accesorios: IconoAnillo,
  belleza: IconoLabial,
  comida: IconoTazon,
  hogar: IconoCasa,
  general: IconoBolsa,
};

/** Productos de ejemplo: los de la demo (Esencias Michel), nunca fotos nuevas de terceros. */
const EJEMPLO = {
  kiara: { nombre: "Kiara Pink", precio: "RD$1,100", foto: "/tienda/michel-kiara.jpg" },
  parade: { nombre: "Parade", precio: "RD$1,800", foto: "/tienda/michel-parade.jpg" },
  agotado: { foto: "/tienda/michel-oxana.jpg" },
  total: "RD$2,900",
};

function guardarBorrador(clave: string, b: Borrador) {
  try {
    localStorage.setItem(clave, JSON.stringify(b));
  } catch {
    // Sin almacenamiento: el recorrido sigue, solo no se recupera si cierra.
  }
}
function leerGuardado(clave: string, enlaceId: string): Borrador | null {
  try {
    return leerBorrador(localStorage.getItem(clave), enlaceId);
  } catch {
    return null;
  }
}
function borrarBorrador(clave: string) {
  try {
    localStorage.removeItem(clave);
  } catch {
    // Nada que borrar.
  }
}

/**
 * Onboarding de una tienda nueva (docs/17 §1-5): historias de bienvenida → la historia de tu tienda en 4 capítulos → «ya existe».
 * Si cierra a mitad, el borrador de este teléfono la devuelve al capítulo donde iba. La tienda se crea al cerrar el capítulo 4.
 */
export function RecorridoOnboarding({ fuente }: { fuente: FuenteOnboarding }) {
  const deGoogle = primerNombre(fuente.nombreCuenta);
  const [borrador, setBorrador] = useState<Borrador>(() => borradorNuevo(fuente.enlaceId));
  const [etapa, setEtapa] = useState<Etapa>("historias");
  const [listo, setListo] = useState(false);

  // El borrador se lee después de montar (localStorage no existe en el servidor).
  useEffect(() => {
    const t = window.setTimeout(() => {
      const guardado = leerGuardado(fuente.claveBorrador, fuente.enlaceId);
      if (guardado) {
        setBorrador(guardado);
        // Ya había empezado su historia: vuelve al capítulo donde iba, sin repetir la bienvenida.
        if (guardado.capitulo > 1 || guardado.nombre.trim()) setEtapa("capitulos");
      }
      setListo(true);
    }, 0);
    return () => window.clearTimeout(t);
  }, [fuente.claveBorrador, fuente.enlaceId]);

  const cambiar = (parcial: Partial<Borrador>) =>
    setBorrador((b) => {
      const nuevo = { ...b, ...parcial };
      guardarBorrador(fuente.claveBorrador, nuevo);
      return nuevo;
    });

  if (!listo) return <div className="fixed inset-0 bg-marca-rosa-fija" data-onboarding="cargando" />;

  if (etapa === "historias")
    return (
      <Historias
        nombre={deGoogle}
        alTerminar={() => {
          flushSync(() => setEtapa("capitulos"));
          // Dentro del mismo toque: el teclado se abre en el nombre de la tienda.
          document.querySelector<HTMLInputElement>("[data-campo-capitulo]")?.focus();
        }}
      />
    );

  if (etapa === "existe")
    return <YaExiste nombre={borrador.nombre.trim()} logoLocal={borrador.logo} alSeguir={fuente.alTerminar} ponerLogo={fuente.ponerLogo} />;

  return (
    <Capitulos
      borrador={borrador}
      deGoogle={deGoogle}
      fuente={fuente}
      cambiar={cambiar}
      volverAHistorias={() => setEtapa("historias")}
      alCrear={() => {
        borrarBorrador(fuente.claveBorrador);
        setEtapa("existe");
      }}
    />
  );
}

// ─── Historias de bienvenida ──────────────────────────────────────────────────────────────────────────────────────────────

/** Movimiento reducido: sin avance solo ni barras que se llenan; se pasa con toques. Se lee una vez (no por eventos). */
function useMovimientoReducido() {
  const [reducido] = useState(() => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true);
  return reducido;
}

const FONDO_HISTORIA = ["bg-marca-rosa-fija", "bg-marca-bosque", "bg-marca-papel", "bg-marca-mandarina"] as const;
/** El patrón de iconos regados de cada historia (docs/10): un tono apenas distinto de su fondo. */
const PATRON_HISTORIA = ["#eeb0c5", "#2b6550", "#efe4cf", "#f4733d"] as const;
/** Texto y barras sobre cada fondo: claro sobre el verde, verde sobre los demás. */
const OSCURA = [false, true, false, false] as const;

function Historias({ nombre, alTerminar }: { nombre: string | null; alTerminar: () => void }) {
  const reducido = useMovimientoReducido();
  const [i, setI] = useState(0);
  const [pausa, setPausa] = useState(false);
  const presion = useRef<{ t: number; lado: "izq" | "der" } | null>(null);
  const ultima = i === TOTAL_HISTORIAS - 1;
  const oscura = OSCURA[i]!;

  const ir = (n: number) => setI(Math.max(0, Math.min(TOTAL_HISTORIAS - 1, n)));
  const siguiente = () => (ultima ? undefined : ir(i + 1));

  // Teclado físico: flechas para pasar.
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setI((x) => Math.min(TOTAL_HISTORIAS - 1, x + 1));
      if (e.key === "ArrowLeft") setI((x) => Math.max(0, x - 1));
    };
    document.addEventListener("keydown", tecla);
    return () => document.removeEventListener("keydown", tecla);
  }, []);

  // Tocar la izquierda vuelve, la derecha avanza; mantener pausa (al soltar sigue, sin pasar).
  const bajar = (lado: "izq" | "der") => {
    presion.current = { t: Date.now(), lado };
    setPausa(true);
  };
  const subir = () => {
    const p = presion.current;
    presion.current = null;
    setPausa(false);
    if (!p || Date.now() - p.t > 250) return;
    if (p.lado === "izq") ir(i - 1);
    else siguiente();
  };

  return (
    <div
      className={clases("fixed inset-0 overflow-hidden select-none", FONDO_HISTORIA[i], oscura ? "text-marca-papel" : "text-marca-bosque")}
      data-onboarding="historias"
      data-historia={i + 1}
    >
      <FondoPatron color={PATRON_HISTORIA[i]!} />
      <div className="relative mx-auto flex h-full max-w-[480px] flex-col">
        {/* Zonas de toque (debajo del contenido, que no recibe toques salvo sus botones) */}
        <button
          type="button"
          aria-label="Historia anterior"
          className="absolute inset-y-0 left-0 z-0 w-[32%] outline-none"
          onPointerDown={() => bajar("izq")}
          onPointerUp={subir}
          onPointerCancel={subir}
          onPointerLeave={() => { if (presion.current) subir(); }}
          onContextMenu={(e) => e.preventDefault()}
          onClick={(e) => e.detail === 0 && ir(i - 1)}
        />
        <button
          type="button"
          aria-label={ultima ? "Última historia" : "Siguiente historia"}
          className="absolute inset-y-0 right-0 z-0 w-[68%] outline-none"
          onPointerDown={() => bajar("der")}
          onPointerUp={subir}
          onPointerCancel={subir}
          onPointerLeave={() => { if (presion.current) subir(); }}
          onContextMenu={(e) => e.preventDefault()}
          onClick={(e) => e.detail === 0 && siguiente()}
        />

        <header className="pointer-events-none relative z-10 px-4 pt-[calc(10px+env(safe-area-inset-top))]">
          <Barras total={TOTAL_HISTORIAS} actual={i} oscura={oscura} pausa={pausa} reducido={reducido} alLlenarse={siguiente} />
          <div className="mt-3 flex items-start justify-between">
            <MarcaHistoria oscura={oscura} />
            {!ultima && (
              <button
                type="button"
                className="tocable pointer-events-auto -mr-2 -mt-1 rounded-full px-3 py-2 text-secundario font-extrabold"
                onClick={alTerminar}
                data-saltar
              >
                Saltar
              </button>
            )}
          </div>
        </header>

        <div className="pointer-events-none relative z-10 flex flex-1 flex-col justify-center px-6 pb-[calc(24px+env(safe-area-inset-bottom))]" aria-live="polite">
          {i === 0 && <Historia1 nombre={nombre} />}
          {i === 1 && <Historia2 />}
          {i === 2 && <Historia3 nombre={nombre} />}
          {i === 3 && <Historia4 />}
          {ultima && (
            <div className="pointer-events-auto mt-6 flex flex-col items-center gap-2">
              <p className="font-mano text-[1.625rem] leading-[1.9rem] text-marca-papel">ahora, la historia de tu tienda</p>
              <Boton tamano="grande" anchoCompleto onClick={alTerminar} className="!border-marca-bosque !bg-marca-bosque !text-marca-papel" data-contar-historia>
                Contar mi historia
              </Boton>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Barras de progreso: las vistas llenas, la actual se llena con el tiempo (con movimiento reducido, llena y sin avance solo). */
function Barras({
  total,
  actual,
  oscura,
  pausa = false,
  reducido = true,
  alLlenarse,
}: {
  total: number;
  actual: number;
  oscura: boolean;
  pausa?: boolean;
  reducido?: boolean;
  alLlenarse?: () => void;
}) {
  return (
    <div className="flex gap-1" aria-hidden="true">
      {Array.from({ length: total }, (_, n) => (
        <span key={n} className={clases("h-[3px] flex-1 overflow-hidden rounded-full", oscura ? "bg-marca-papel/30" : "bg-marca-bosque/20")}>
          {(n < actual || (n === actual && (reducido || !alLlenarse))) && <span className={clases("block h-full w-full", oscura ? "bg-marca-papel" : "bg-marca-bosque")} />}
          {n === actual && !reducido && alLlenarse && (
            <span
              key={actual}
              className={clases("onb-barra block h-full w-full origin-left", oscura ? "bg-marca-papel" : "bg-marca-bosque")}
              style={{ animationDuration: `${DURACION_HISTORIA_MS}ms`, animationPlayState: pausa ? "paused" : "running" }}
              onAnimationEnd={alLlenarse}
            />
          )}
        </span>
      ))}
    </div>
  );
}

function MarcaHistoria({ oscura }: { oscura: boolean }) {
  return (
    <div className="leading-none">
      <Logotipo className="text-[26px]" />
      <p className="mt-0.5 font-display text-[13px]">
        Desliz<span className={oscura ? "text-marca-mandarina" : "text-mandarina-texto"}>aaah…</span>
      </p>
    </div>
  );
}

function Destello({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={clases("absolute", className)} fill="currentColor">
      <path d="M12 2c.6 4.8 2.2 7.4 10 10-7.8 2.6-9.4 5.2-10 10-.6-4.8-2.2-7.4-10-10 7.8-2.6 9.4-5.2 10-10z" />
    </svg>
  );
}

/** Entrada escalonada de cada historia (docs/08, excepción «Historias del onboarding»): el ejemplo, luego el titular, luego el texto. */
const entra = (orden: number) => ({ style: { "--d": orden } as CSSProperties });

function Titulo({ children }: { children: ReactNode }) {
  return (
    <h1 {...entra(1)} className="onb-entra text-center font-display text-titulo-pantalla">
      {children}
    </h1>
  );
}
function Bajada({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p {...entra(2)} className={clases("onb-entra mx-auto mt-3 max-w-[330px] text-center text-cuerpo", className)}>
      {children}
    </p>
  );
}

/**
 * Un sticker de Deslizapp (public/stickers/marca, WebP con alfa): girado un poco, flota apenas y SE PUEDE ARRASTRAR con el dedo a
 * cualquier lugar de la pantalla (sin salirse); tocarlo hace un rebotito. Toma sus propios toques: no pasa ni vuelve la historia ni
 * la pausa. Donde lo deja se queda mientras esté en esa pantalla.
 */
function Sticker({ nombre, ancho, alto, className, giro = 0 }: { nombre: string; ancho: number; alto: number; className?: string; giro?: number }) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [toques, setToques] = useState(0);
  const arrastre = useRef<{ id: number; x0: number; y0: number; px: number; py: number; caja: DOMRect; movio: boolean } | null>(null);

  const bajar = (e: ReactPointerEvent<HTMLSpanElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    arrastre.current = { id: e.pointerId, x0: e.clientX, y0: e.clientY, px: pos.x, py: pos.y, caja: e.currentTarget.getBoundingClientRect(), movio: false };
  };
  const mover = (e: ReactPointerEvent<HTMLSpanElement>) => {
    const a = arrastre.current;
    if (!a || a.id !== e.pointerId) return;
    e.stopPropagation();
    let dx = e.clientX - a.x0;
    let dy = e.clientY - a.y0;
    if (!a.movio && Math.hypot(dx, dy) < 5) return;
    a.movio = true;
    // Nunca fuera de la pantalla.
    dx = Math.min(Math.max(dx, -a.caja.left), window.innerWidth - a.caja.right);
    dy = Math.min(Math.max(dy, -a.caja.top), window.innerHeight - a.caja.bottom);
    setPos({ x: a.px + dx, y: a.py + dy });
  };
  const soltar = (e: ReactPointerEvent<HTMLSpanElement>) => {
    const a = arrastre.current;
    if (!a || a.id !== e.pointerId) return;
    e.stopPropagation();
    arrastre.current = null;
    if (!a.movio) setToques((t) => t + 1);
  };

  return (
    <span
      className={clases("onb-rebote pointer-events-auto absolute z-20 cursor-grab touch-none active:cursor-grabbing", className)}
      style={{ "--giro": `${giro}deg`, translate: `${pos.x}px ${pos.y}px` } as CSSProperties}
      onPointerDown={bajar}
      onPointerMove={mover}
      onPointerUp={soltar}
      onPointerCancel={soltar}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
      data-sticker={nombre}
    >
      <span key={toques} className={clases("block", toques > 0 && "onb-toque")}>
        <Image src={`/stickers/marca/${nombre}.webp`} alt="" width={ancho} height={alto} loading="lazy" unoptimized draggable={false} className="onb-flota block select-none" style={{ width: ancho, height: "auto" }} />
      </span>
    </span>
  );
}

/**
 * Lo que imita la app (tarjetas, burbujas, el pedido): entra con un rebote y después «levita», con un balanceo lento y una sacudida
 * corta cada pocos segundos (docs/08, excepción «Historias del onboarding»). En los capítulos se queda quieto mientras se escribe.
 */
function Vivo({ children, className, entrada = false, orden = 0 }: { children: ReactNode; className?: string; entrada?: boolean; orden?: number }) {
  return (
    <div {...entra(orden)} className={clases(entrada && "onb-llega", className)}>
      <div className="onb-balancea">
        <div className="onb-sacude">{children}</div>
      </div>
    </div>
  );
}

function Historia1({ nombre }: { nombre: string | null }) {
  return (
    <>
      <div {...entra(0)} className="onb-llega relative mx-auto mb-10 size-[210px]">
        <Destello className="-left-8 top-24 size-5 text-marca-mandarina" />
        <IconoCorazon tamano={28} className="onb-flota absolute -bottom-2 -left-4 fill-marca-mandarina text-marca-mandarina" />
        <Vivo className="size-full">
          <div className="flex size-[210px] items-center justify-center rounded-full bg-marca-bosque text-marca-papel shadow-[0_24px_48px_-16px_rgb(16_54_42/0.45)]">
            <Isotipo tamano={124} />
          </div>
        </Vivo>
        <Sticker nombre="aaah" ancho={132} alto={100} giro={8} className="-right-14 -top-8" />
      </div>
      <Titulo>
        {saludoOnboarding(nombre)}
        <span className="block text-mandarina-texto">Esto se va a poner bueno.</span>
      </Titulo>
      <Bajada>Cuatro historias. Después contamos la tuya. Nada de manuales.</Bajada>
    </>
  );
}

function Historia2() {
  return (
    <>
      <div {...entra(0)} className="onb-llega relative mx-auto mb-10 w-[170px]">
        <Destello className="-left-14 top-4 size-5 text-marca-mandarina" />
        <Vivo>
        <div className="relative overflow-hidden rounded-[26px] border-4 border-marca-papel shadow-[0_24px_48px_-16px_rgb(0_0_0/0.45)]">
          <Image src={EJEMPLO.kiara.foto} alt="" width={162} height={300} className="h-[300px] w-full object-cover" priority draggable={false} />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent px-3 pb-3 pt-8 text-marca-papel">
            <p className="font-extrabold leading-tight">{EJEMPLO.kiara.nombre}</p>
            <p className="text-secundario font-bold">{EJEMPLO.kiara.precio}</p>
          </div>
        </div>
        </Vivo>
        <Sticker nombre="desliza-y-pide" ancho={92} alto={123} giro={10} className="-right-20 top-36" />
      </div>
      <Titulo>
        Deslizan.
        <span className="mt-1 block">
          <span className="rounded-[12px] bg-marca-rosa-fija px-2.5 text-marca-bosque">Tú vendes.</span>
        </span>
      </Titulo>
      <Bajada>Tu catálogo se mueve como sus reels. Cada aaah te cuenta qué les gustó.</Bajada>
    </>
  );
}

function Historia3({ nombre }: { nombre: string | null }) {
  return (
    <>
      <div {...entra(0)} className="onb-llega relative mx-auto mb-8 w-full max-w-[300px]">
        <Vivo>
        <div className="mx-auto mb-[-18px] flex size-[72px] items-center justify-center rounded-full bg-[#25d366] text-white shadow-[0_12px_28px_-8px_rgb(37_211_102/0.6)]">
          <IconoWhatsApp tamano={38} />
        </div>
        <div className="rounded-[20px] bg-menta px-4 pb-2 pt-5 text-marca-bosque shadow-[0_20px_40px_-18px_rgb(16_54_42/0.45)]">
          <p className="text-etiqueta tracking-wide">NUEVO PEDIDO</p>
          <p className="mt-1 text-secundario">{nombre ? `¡Hola ${nombre}! Vi tu catálogo y quiero:` : "¡Hola! Vi tu catálogo y quiero:"}</p>
          {[EJEMPLO.kiara, EJEMPLO.parade].map((p) => (
            <div key={p.nombre} className="mt-2 flex items-center gap-3">
              <Image src={p.foto} alt="" width={36} height={36} className="size-9 rounded-[8px] object-cover" draggable={false} />
              <span className="flex-1 text-secundario">{p.nombre}</span>
              <span className="text-secundario font-extrabold">{p.precio}</span>
            </div>
          ))}
          <div className="mt-2 flex justify-between border-t border-marca-bosque/15 pt-2 text-secundario">
            <span>Total</span>
            <span className="font-extrabold">{EJEMPLO.total}</span>
          </div>
          <p className="mt-1 text-right text-contador font-normal text-marca-bosque/60">9:41 ✓✓</p>
        </div>
        </Vivo>
        <p className="mt-3 -rotate-3 text-center font-mano text-[1.625rem] leading-[1.9rem] text-mandarina-texto">con recibo y todo</p>
      </div>
      <Titulo>
        El pedido te llega
        <span className="block text-mandarina-texto">solito.</span>
      </Titulo>
      <Bajada>Por WhatsApp, con fotos y total. Se acabó el «¿cuál era?».</Bajada>
    </>
  );
}

function Historia4() {
  return (
    <>
      <div {...entra(0)} className="onb-llega relative mx-auto mb-8 w-full max-w-[290px]">
        <Destello className="-right-2 -top-4 size-6 text-marca-bosque" />
        <Vivo>
        <div className="relative mx-auto h-[190px] w-[230px] -rotate-3 overflow-hidden rounded-[22px] shadow-[0_20px_40px_-18px_rgb(16_54_42/0.5)]">
          <Image src={EJEMPLO.agotado.foto} alt="" width={230} height={190} className="size-full object-cover" draggable={false} />
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12 rounded-full border-[3px] border-marca-mandarina bg-marca-papel/85 px-4 py-1 font-display text-titulo-hoja text-marca-mandarina">
            AGOTADO
          </span>
        </div>
        <div className="relative -mt-5 rounded-[20px] bg-marca-papel p-4 text-marca-bosque shadow-[0_20px_40px_-18px_rgb(16_54_42/0.5)]">
          <div className="flex items-center justify-between">
            <p className="text-secundario font-extrabold">Pedido #1043 · Carolina</p>
            <span className="rounded-full bg-menta px-2 py-0.5 text-etiqueta">Listo</span>
          </div>
          <p className="mt-3 flex h-11 items-center justify-center gap-2 rounded-full bg-marca-bosque text-secundario font-extrabold text-marca-papel">
            <IconoCheck tamano={16} /> Despachado
          </p>
        </div>
        </Vivo>
      </div>
      <Titulo>
        Despachas aquí.
        <span className="block text-marca-papel">El catálogo se entera.</span>
      </Titulo>
      <Bajada>Se fue el último y tus clientes ya lo saben. Sin que tú escribas nada.</Bajada>
    </>
  );
}

// ─── La historia de tu tienda: 4 capítulos ────────────────────────────────────────────────────────────────────────────────

/** El patrón de iconos regados de cada capítulo (docs/10, excepción del onboarding): muy suave, limpio en el título y el campo. */
const PATRON_CAPITULO: Record<Capitulo, string> = { 1: "#efbdcf", 2: "#f3eadb", 3: "#235a47", 4: "#f77a46" };

const FONDO_CAPITULO: Record<Capitulo, string> = {
  1: "bg-marca-rosa-fija text-marca-bosque",
  2: "bg-marca-papel text-marca-bosque",
  3: "bg-marca-bosque text-marca-papel",
  4: "bg-marca-mandarina text-marca-bosque",
};

function Capitulos({
  borrador: b,
  deGoogle,
  fuente,
  cambiar,
  volverAHistorias,
  alCrear,
}: {
  borrador: Borrador;
  deGoogle: string | null;
  fuente: FuenteOnboarding;
  cambiar: (p: Partial<Borrador>) => void;
  volverAHistorias: () => void;
  alCrear: () => void;
}) {
  const raiz = useRef<HTMLDivElement>(null);
  const [tocado, setTocado] = useState(false);
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cap = b.capitulo;
  const oscura = cap === 3;
  const listo = capituloListo(b, deGoogle);

  // Teclado (HANDOFF: regla del teclado): solo se escribe `--teclado` en el DOM para que «Seguir» quede encima. Sin estado de React.
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    let raf = 0;
    const acomodar = () => {
      raf = 0;
      const tapado = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
      raiz.current?.style.setProperty("--teclado", `${tapado}px`);
    };
    const pedir = () => {
      if (!raf) raf = requestAnimationFrame(acomodar);
    };
    vv.addEventListener("resize", pedir);
    vv.addEventListener("scroll", pedir);
    return () => {
      vv.removeEventListener("resize", pedir);
      vv.removeEventListener("scroll", pedir);
      cancelAnimationFrame(raf);
    };
  }, []);

  const irA = (c: Capitulo) => {
    flushSync(() => {
      setTocado(false);
      setError(null);
      cambiar({ capitulo: c });
    });
    // En el mismo toque: el teclado sigue abierto en el campo del capítulo nuevo (si tiene).
    raiz.current?.querySelector<HTMLInputElement>("[data-campo-capitulo]")?.focus();
  };

  const seguir = async (e?: FormEvent) => {
    e?.preventDefault();
    setTocado(true);
    if (!listo || creando) return;
    if (cap < TOTAL_CAPITULOS) {
      irA((cap + 1) as Capitulo);
      return;
    }
    const datos = datosParaCrear(b, deGoogle);
    if (!datos) return;
    setCreando(true);
    setError(null);
    try {
      await fuente.crear(datos);
      alCrear();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear tu tienda. Inténtalo otra vez.");
      setCreando(false);
    }
  };

  const nombre = b.nombre.trim();
  const subtitulo = cap === 3 && b.rubros.length ? rubrosEnTexto(b.rubros) : cap === 4 && whatsappParaGuardar(b.whatsapp) ? whatsappVisible(whatsappParaGuardar(b.whatsapp)!) : "la historia de";

  return (
    <div ref={raiz} className={clases("fixed inset-0 flex flex-col overflow-hidden", FONDO_CAPITULO[cap])} data-onboarding="capitulos" data-capitulo={cap}>
      <FondoPatron color={PATRON_CAPITULO[cap]} mascara="capitulo" />
      <form noValidate onSubmit={(e) => void seguir(e)} className="relative mx-auto flex h-full w-full max-w-[480px] flex-col">
        <header className="shrink-0 px-4 pt-[calc(10px+env(safe-area-inset-top))]">
          <Barras total={TOTAL_CAPITULOS} actual={cap - 1} oscura={oscura} />
          <div className="mt-3 flex items-center gap-3">
            <AvatarTienda nombre={nombre} cap={cap} logo={b.logo} />
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate font-extrabold">{nombre || "tu tienda"}</p>
              <p className={clases("truncate text-secundario", oscura ? "text-marca-papel/75" : "text-marca-bosque/70")}>{subtitulo}</p>
            </div>
            <button
              type="button"
              className="tocable -mr-1 flex size-11 items-center justify-center rounded-full"
              aria-label={cap === 1 ? "Volver a las historias" : "Volver al paso anterior"}
              onClick={() => (cap === 1 ? volverAHistorias() : irA((cap - 1) as Capitulo))}
            >
              <IconoCerrar tamano={22} />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-8 pb-[calc(120px+var(--teclado,0px))]">
          {cap === 1 && <Capitulo1 b={b} fuente={fuente} cambiar={cambiar} tocado={tocado} />}
          {cap === 2 && <Capitulo2 b={b} cambiar={cambiar} tocado={tocado} />}
          {cap === 3 && <Capitulo3 b={b} cambiar={cambiar} tocado={tocado} />}
          {cap === 4 && <Capitulo4 b={b} deGoogle={deGoogle} cambiar={cambiar} tocado={tocado} />}
          {error && (
            <p role="alert" className="mt-5 rounded-[18px] bg-marca-papel px-4 py-3 text-secundario font-bold text-marca-bosque">
              {error}
            </p>
          )}
        </div>

        {/* «Seguir» siempre a la vista: con el teclado abierto se sienta encima de él. */}
        <div className="fixed inset-x-0 bottom-[var(--teclado,0px)] z-20 mx-auto w-full max-w-[480px] px-5 pt-3 pb-[calc(16px+env(safe-area-inset-bottom))]" data-seguir>
          <Boton
            type="submit"
            tamano="grande"
            // El toque no le quita el foco al campo: el teclado sigue abierto y pasa al campo del capítulo siguiente.
            onMouseDown={(e) => e.preventDefault()}
            anchoCompleto
            cargando={creando}
            deshabilitado={!listo && tocado}
            className={oscura ? "!border-marca-papel !bg-marca-papel !text-marca-bosque" : "!border-marca-bosque !bg-marca-bosque !text-marca-papel"}
          >
            {cap === TOTAL_CAPITULOS ? "Cerrar el capítulo" : "Seguir"}
          </Boton>
        </div>
      </form>
    </div>
  );
}

const TAMANO_AVATAR = { chico: "size-10 text-[15px]", medio: "size-16 text-[22px]", grande: "size-[150px] text-[56px]" } as const;

/** El círculo de la tienda: su logo si ya eligió uno; si no, las iniciales (o «?» punteado mientras no tiene nombre). */
function AvatarTienda({ nombre, cap, logo = null, tamano = "chico" }: { nombre: string; cap: Capitulo | "fin"; logo?: string | null; tamano?: keyof typeof TAMANO_AVATAR }) {
  if (logo)
    return (
      // eslint-disable-next-line @next/next/no-img-element -- data URL del borrador o el logo recién subido
      <img src={logo} alt="" aria-hidden="true" className={clases("shrink-0 rounded-full bg-white object-cover", TAMANO_AVATAR[tamano])} data-logo-tienda />
    );
  const vacio = !nombre;
  const color = cap === 3 || cap === "fin" ? "bg-marca-rosa-fija text-marca-bosque" : "bg-marca-bosque text-marca-papel";
  return (
    <span
      aria-hidden="true"
      className={clases(
        "flex shrink-0 items-center justify-center rounded-full font-display",
        TAMANO_AVATAR[tamano],
        vacio ? "border-2 border-dashed border-current bg-transparent" : color,
      )}
    >
      {vacio ? "?" : inicialesTienda(nombre)}
    </span>
  );
}

function Encabezado({ capitulo, children, acento }: { capitulo: string; children: ReactNode; acento: ReactNode }) {
  return (
    <>
      <p className="text-etiqueta tracking-[0.18em] uppercase opacity-90">{capitulo}</p>
      <h1 className="mt-2 font-display text-titulo-pantalla">
        {children}
        <span className="block">{acento}</span>
      </h1>
    </>
  );
}

/** Nota bajo un campo: ayuda o, si ya intentó seguir, el error. Con su propio color para cada fondo. */
function Nota({ id, error, children, oscura = false }: { id: string; error?: string | null; children?: ReactNode; oscura?: boolean }) {
  if (error)
    return (
      <p id={id} role="alert" className="mt-2 inline-block rounded-[12px] bg-marca-papel px-3 py-1.5 text-secundario font-bold text-marca-bosque">
        {error}
      </p>
    );
  if (!children) return null;
  return (
    <p id={id} className={clases("mt-2 text-secundario", oscura ? "text-marca-papel/80" : "text-marca-bosque/80")}>
      {children}
    </p>
  );
}

function Mano({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={clases("mt-8 -rotate-3 text-right font-mano text-[1.75rem] leading-[2rem]", className)}>{children}</p>;
}

/** Cap. 1 · El nombre: «Así nace tu enlace», con el slug que devuelve la base (espera corta mientras escribe). */
function Capitulo1({ b, fuente, cambiar, tocado }: { b: Borrador; fuente: FuenteOnboarding; cambiar: (p: Partial<Borrador>) => void; tocado: boolean }) {
  const nombre = b.nombre.trim();
  const [slug, setSlug] = useState<{ de: string; slug: string | null } | null>(null);
  const turno = useRef(0);
  const vista = fuente.vistaSlug;

  useEffect(() => {
    const n = ++turno.current;
    if (!nombre || nombre.length > NOMBRE_TIENDA_MAX) return;
    const t = window.setTimeout(() => {
      vista(nombre)
        .then((s) => n === turno.current && setSlug({ de: nombre, slug: s }))
        .catch(() => n === turno.current && setSlug({ de: nombre, slug: null }));
    }, 350);
    return () => window.clearTimeout(t);
  }, [nombre, vista]);

  const error = tocado ? errorNombreTienda(b.nombre) : null;
  const slugAlDia = slug && slug.de === nombre ? slug.slug : null;
  const entradaLogo = useRef<HTMLInputElement>(null);
  const [leyendo, setLeyendo] = useState(false);
  const [avisoLogo, setAvisoLogo] = useState<string | null>(null);

  // La foto se recorta y se reduce aquí mismo y queda en el borrador: la tienda todavía no existe para subirla.
  const elegirLogo = async (archivo: File | undefined) => {
    if (entradaLogo.current) entradaLogo.current.value = "";
    if (!archivo) return;
    const malo = errorArchivoLogo(archivo);
    if (malo) {
      setAvisoLogo(malo);
      return;
    }
    setAvisoLogo(null);
    setLeyendo(true);
    try {
      cambiar({ logo: await prepararLogo(archivo) });
    } catch {
      setAvisoLogo("No pudimos leer esa imagen. Prueba con otra.");
    } finally {
      setLeyendo(false);
    }
  };

  return (
    <>
      <Encabezado capitulo="Capítulo 1 · Paso 1 de 4 · El nombre" acento={<span className="text-mandarina-texto">con un nombre.</span>}>
        Toda historia empieza
      </Encabezado>
      {/* La tarjeta ES el campo: el nombre se escribe en su título y el círculo pone la foto (docs/17, capítulo 1). */}
      <div className="mt-6 rounded-[22px] bg-marca-papel p-4 text-marca-bosque shadow-[0_18px_36px_-20px_rgb(16_54_42/0.45)]" data-vista-enlace>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => entradaLogo.current?.click()}
            disabled={leyendo}
            aria-label={b.logo ? "Cambiar tu logo" : "Pon tu logo"}
            className="tocable relative shrink-0 rounded-full"
            data-poner-logo
          >
            <span key={b.logo ?? "sin-logo"} className={clases("block rounded-full", b.logo && "onb-pop")}>
              <AvatarTienda nombre={nombre} cap={1} logo={b.logo} tamano="medio" />
            </span>
            <span className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full bg-marca-mandarina text-marca-bosque ring-2 ring-marca-papel">
              {b.logo ? <IconoCamara tamano={13} /> : <IconoMas tamano={14} strokeWidth={3} />}
            </span>
          </button>
          <div className="min-w-0 flex-1">
            <label className="flex items-center gap-1.5 border-b-2 border-dashed border-marca-bosque/25 focus-within:border-marca-bosque">
              <input
                value={b.nombre}
                onChange={(e) => cambiar({ nombre: e.target.value })}
                maxLength={NOMBRE_TIENDA_MAX}
                autoComplete="organization"
                autoCapitalize="words"
                enterKeyHint="next"
                placeholder="Tu tienda"
                aria-label="Nombre de tu tienda"
                aria-invalid={error ? true : undefined}
                className="min-w-0 flex-1 bg-transparent py-0.5 font-display text-titulo-seccion text-marca-bosque caret-marca-mandarina outline-none placeholder:text-marca-bosque/40"
                data-campo-capitulo
              />
              <IconoEditar tamano={16} className="shrink-0 text-marca-bosque/50" />
            </label>
            <p className="mt-1 text-secundario text-marca-bosque/70">Así nace tu enlace</p>
          </div>
        </div>
        <p className="mt-3 flex items-center gap-2 overflow-hidden rounded-[12px] bg-marca-bosque/[0.07] px-3 py-2.5 text-secundario">
          <IconoEnlace tamano={16} className="shrink-0" />
          <span className="truncate">
            deslizapp…/tienda/<b className="font-extrabold" data-slug>{nombre ? (slugAlDia ?? "…") : "tu-tienda"}</b>
          </span>
        </p>
        <input ref={entradaLogo} type="file" accept="image/*" hidden aria-label="Pon tu logo" onChange={(e) => void elegirLogo(e.target.files?.[0])} />
      </div>
      <Nota id="nota-nombre" error={error ?? avisoLogo}>
        {b.logo ? null : "Toca el círculo para poner tu logo o una foto. Puedes hacerlo después."}
      </Nota>
      {nombre && <Mano className="text-mandarina-texto">ya suena a marca</Mano>}
    </>
  );
}

/** Cap. 2 · Lo que vendes: varios; el primero que marca es el principal. */
function Capitulo2({ b, cambiar, tocado }: { b: Borrador; cambiar: (p: Partial<Borrador>) => void; tocado: boolean }) {
  const nombre = b.nombre.trim() || "Tu tienda";
  return (
    <>
      <Encabezado capitulo="Capítulo 1 · Paso 2 de 4 · Lo que vendes" acento={<span className="text-mandarina-texto">vende…</span>}>
        {nombre}
      </Encabezado>
      <p className="mt-2 text-secundario text-marca-bosque/80">Elige todo lo que vendas. El primero es el principal.</p>
      <div role="group" aria-label="Lo que vendes" className="mt-5 grid grid-cols-2 gap-3">
        {RUBROS.map((r) => {
          const marcado = b.rubros.includes(r);
          const principal = marcado && b.rubros[0] === r;
          const Icono = ICONO_RUBRO[r];
          return (
            <button
              key={r}
              type="button"
              aria-pressed={marcado}
              data-rubro={r}
              onClick={() => cambiar({ rubros: alternarRubro(b.rubros, r) })}
              className={clases(
                "tocable relative flex rounded-[20px] border-2 p-4 pr-11 text-left",
                r === "general" ? "col-span-2 items-center gap-3" : "min-h-[84px] flex-col items-start justify-between gap-2",
                marcado ? "border-marca-bosque bg-marca-bosque text-marca-papel" : "border-borde bg-white text-marca-bosque",
              )}
            >
              <Icono tamano={22} />
              <span className="flex flex-col items-start gap-1">
                <span className="font-extrabold">{NOMBRE_RUBRO_ONBOARDING[r]}</span>
                {principal && <span className="rounded-full bg-marca-rosa-fija px-2 py-0.5 text-contador tracking-wide text-marca-bosque">PRINCIPAL</span>}
              </span>
              {marcado && (
                <span className="absolute right-3 top-3 flex size-6 items-center justify-center rounded-full bg-marca-mandarina text-marca-bosque">
                  <IconoCheck tamano={14} strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}
      </div>
      <Nota id="nota-rubros" error={tocado && b.rubros.length === 0 ? "Elige al menos una cosa." : null} />
      {b.rubros.length > 1 && <Mano className="text-mandarina-texto">el combo completo</Mano>}
    </>
  );
}

/** Cap. 3 · El chat: el WhatsApp de la tienda (dominicano, igual que en Clientes). */
function Capitulo3({ b, cambiar, tocado }: { b: Borrador; cambiar: (p: Partial<Borrador>) => void; tocado: boolean }) {
  const valido = whatsappParaGuardar(b.whatsapp) !== null;
  const error = tocado && !valido ? "Revisa el número: 10 dígitos, empieza con 809, 829 u 849." : null;
  return (
    <>
      <Encabezado capitulo="Capítulo 1 · Paso 3 de 4 · El chat" acento={<span className="text-marca-mandarina">dice aaah…</span>}>
        Y cuando alguien
      </Encabezado>
      <div className="mt-6 [&_label]:text-marca-papel">
        <Campo
          etiqueta="¿A qué WhatsApp te escribe?"
          prefijo="+1"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          enterKeyHint="next"
          placeholder="809 555 0142"
          value={whatsappEscrito(b.whatsapp)}
          onChange={(e) => cambiar({ whatsapp: e.target.value })}
          data-campo-capitulo
        />
        <Nota id="nota-whatsapp" error={error} oscura>
          {valido ? (
            <span className="inline-flex items-center gap-1.5">
              <IconoCheck tamano={14} strokeWidth={3} /> Ahí te llegan los pedidos. Si tienes dos, el de la tienda.
            </span>
          ) : (
            "Ahí te llegan los pedidos. Si tienes dos, el de la tienda."
          )}
        </Nota>
      </div>
      <Burbuja className="mt-8">
        ¡Hola! Vi tu catálogo y quiero:
        <br />• {EJEMPLO.kiara.nombre} ({EJEMPLO.kiara.precio})
      </Burbuja>
      <Mano className="text-left text-marca-rosa-fija">ese número va a sonar</Mano>
    </>
  );
}

/** Cap. 4 · Tú: cómo te llaman tus clientes, con el nombre de Google de entrada. */
function Capitulo4({ b, deGoogle, cambiar, tocado }: { b: Borrador; deGoogle: string | null; cambiar: (p: Partial<Borrador>) => void; tocado: boolean }) {
  const vendedora = vendedoraDe(b, deGoogle);
  const error = tocado ? errorVendedora(vendedora) : null;
  return (
    <>
      <Encabezado capitulo="Capítulo 1 · Paso 4 de 4 · Tú" acento={<span className="text-marca-papel">por tu nombre.</span>}>
        …te saluda
      </Encabezado>
      <div className="mt-6">
        <Campo
          etiqueta="¿Cómo te llaman tus clientes?"
          icono={IconoPersona}
          value={vendedora}
          maxLength={NOMBRE_VENDEDORA_MAX}
          autoComplete="given-name"
          autoCapitalize="words"
          enterKeyHint="done"
          placeholder="Tu nombre"
          onChange={(e) => cambiar({ vendedora: e.target.value })}
          data-campo-capitulo
        />
        <Nota id="nota-vendedora" error={error}>
          {deGoogle ? "Lo tomamos de tu Google. Cámbialo si te dicen distinto." : "Así te saludan cuando te escriben."}
        </Nota>
      </div>
      <Burbuja className="mt-8">
        ¡Hola{vendedora.trim() ? " " : ""}
        {vendedora.trim() && <mark className="rounded-[6px] bg-marca-rosa-fija px-1 font-extrabold text-marca-bosque">{vendedora.trim()}</mark>}! Vi tu catálogo y quiero:
        <br />• {EJEMPLO.kiara.nombre} ({EJEMPLO.kiara.precio})
        <br />• {EJEMPLO.parade.nombre} ({EJEMPLO.parade.precio})
      </Burbuja>
      <Mano className="text-marca-papel">mejor que «estimada tienda»</Mano>
    </>
  );
}

function Burbuja({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Vivo className={className}>
    <div className={clases("ml-auto w-fit max-w-[280px] rounded-[18px] rounded-tr-[6px] bg-menta px-4 py-3 text-secundario text-marca-bosque shadow-[0_16px_32px_-16px_rgb(0_0_0/0.4)]")}>
      {children}
      <span className="mt-1 block text-right text-contador font-normal text-marca-bosque/60">9:41 ✓✓</span>
    </div>
    </Vivo>
  );
}

// ─── Fin del capítulo 1 ───────────────────────────────────────────────────────────────────────────────────────────────────

function YaExiste({
  nombre,
  logoLocal,
  alSeguir,
  ponerLogo,
}: {
  nombre: string;
  /** La foto que eligió en el capítulo 1 (del borrador): se sube aquí, la tienda ya existe. */
  logoLocal: string | null;
  alSeguir: () => void;
  ponerLogo: FuenteOnboarding["ponerLogo"];
}) {
  const entrada = useRef<HTMLInputElement>(null);
  // Se ve al momento (la foto local) mientras sube; si falla, vuelve a las iniciales.
  const [logo, setLogo] = useState<string | null>(logoLocal);
  const [subiendo, setSubiendo] = useState(!!logoLocal);
  const [aviso, setAviso] = useState<string | null>(null);
  const iniciado = useRef(false);

  const subir = async (local: string) => {
    setAviso(null);
    setSubiendo(true);
    setLogo(local);
    try {
      setLogo(await ponerLogo(local));
    } catch (e) {
      // La tienda ya existe: no se pierde nada. Se queda con las iniciales y puede reintentar (o ponerlo después en Mi marca).
      setLogo(null);
      setAviso(e instanceof Error && e.message ? e.message : "No se pudo subir tu logo. Inténtalo otra vez.");
    } finally {
      setSubiendo(false);
    }
  };

  // La foto del capítulo 1 se sube una sola vez al llegar (también con el doble montaje de desarrollo).
  useEffect(() => {
    if (!logoLocal) return;
    const t = window.setTimeout(() => {
      if (iniciado.current) return;
      iniciado.current = true;
      void subir(logoLocal);
    }, 0);
    return () => window.clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const elegir = async (archivo: File | undefined) => {
    if (entrada.current) entrada.current.value = "";
    if (!archivo || subiendo) return;
    const malo = errorArchivoLogo(archivo);
    if (malo) {
      setAviso(malo);
      return;
    }
    let local: string;
    try {
      local = await prepararLogo(archivo);
    } catch {
      setAviso("No pudimos leer esa imagen. Prueba con otra.");
      return;
    }
    await subir(local);
  };

  return (
    <div className="fixed inset-0 overflow-hidden bg-marca-bosque text-marca-papel" data-onboarding="existe">
      <FondoPatron color="#2b6550" />
      <div className="relative mx-auto flex h-full max-w-[480px] flex-col px-6 pt-[calc(56px+env(safe-area-inset-top))] pb-[calc(20px+env(safe-area-inset-bottom))]">
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="relative mb-12">
            <Destello className="-left-14 bottom-2 size-6 text-marca-mandarina" />
            <IconoCorazon tamano={22} className="onb-flota absolute -left-16 top-4 fill-marca-rosa-fija text-marca-rosa-fija" />
            {/* Las iniciales (o el logo) aparecen con un pop y su halo se abre detrás (docs/08, excepción «Historias del onboarding»). */}
            <span aria-hidden="true" className="onb-halo absolute inset-0 rounded-full bg-marca-papel/[0.06]" />
            <div key={logo ? `logo:${logo}` : "iniciales"} className="onb-pop relative rounded-full bg-marca-papel/10 p-6">
              <AvatarTienda nombre={nombre} cap="fin" logo={logo} tamano="grande" />
            </div>
            <Sticker key={logo ? `sticker:${logo}` : "sticker"} nombre="aaah-corazon" ancho={104} alto={90} giro={10} className="-right-16 -top-8" />
            {(!logo || subiendo) && (
              <button
                type="button"
                onClick={() => entrada.current?.click()}
                disabled={subiendo}
                className="tocable absolute -bottom-5 left-1/2 flex h-10 -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-marca-papel px-4 text-secundario font-extrabold text-marca-bosque shadow-[0_10px_24px_-10px_rgb(0_0_0/0.5)] disabled:opacity-70"
                data-poner-logo
              >
                {subiendo ? (
                  "Subiendo tu logo…"
                ) : (
                  <>
                    <IconoCamara tamano={16} /> Pon tu logo
                  </>
                )}
              </button>
            )}
            <input ref={entrada} type="file" accept="image/*" hidden aria-label="Pon tu logo" onChange={(e) => void elegir(e.target.files?.[0])} />
          </div>
          {aviso && (
            <p role="alert" className="mb-4 rounded-[14px] bg-marca-papel px-3 py-2 text-secundario font-bold text-marca-bosque" data-aviso-logo>
              {aviso}
            </p>
          )}
          <p className="text-etiqueta tracking-[0.18em]">FIN DEL CAPÍTULO 1</p>
          <h1 className="mt-3 font-display text-titulo-pantalla">
            {nombre}
            <span className="block text-marca-rosa-fija">ya existe.</span>
          </h1>
          <p className="mt-7 -rotate-2 font-mano text-[2.25rem] leading-[2.5rem] text-marca-mandarina" data-lo-que-sigue>
            lo que sigue lo escriben tus clientes
          </p>
        </div>
        <Boton tamano="grande" anchoCompleto onClick={alSeguir} deshabilitado={subiendo} className="!border-marca-mandarina !bg-marca-mandarina !text-marca-bosque" data-ver-mi-tienda>
          Ver mi tienda
        </Boton>
      </div>
    </div>
  );
}
