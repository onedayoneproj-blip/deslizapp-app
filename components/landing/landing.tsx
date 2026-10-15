/* eslint-disable @next/next/no-img-element -- Capturas estáticas de la versión sin JavaScript: tamaño fijo, sin optimizador. */
import Link from "next/link";
import { Fragment, type CSSProperties, type ReactNode } from "react";
import { Isotipo, Logotipo } from "../marca";
import { PASOS, type Paso } from "@/lib/landing/pasos";
import { HORA_DEMO } from "@/lib/landing/pedido-demo";
import { ENLACE_CATALOGO_EJEMPLO, ENLACE_QUIERO_VENDER, RUTA_ENTRAR } from "@/lib/landing/enlaces";
import { KEY_MODO } from "@/lib/data/modo";
import { Icono } from "../tienda/iconos";
import { DemoPasos } from "./controlador";
import "./landing.css";

// Antes de pintar: con JavaScript se usa la demo por pasos (si no, la versión en pasos estáticos), y quien ya eligió «Ver demo»
// no ve la landing mientras su panel de prueba abre (lib/data/sesion.ts lo decide en el navegador).
const ANTES_DE_PINTAR = `(function(){var r=document.documentElement;r.setAttribute("data-landing-js","");try{if(localStorage.getItem(${JSON.stringify(KEY_MODO)})==="demo")r.setAttribute("data-dz-demo","")}catch(e){}})();`;

// El video de la portada con sus atributos literales en el HTML del servidor: React no escribe `muted`, y sin él Safari en iOS no
// lo reproduce solo (ajustes-lewis-7.md §2).
const VIDEO_PORTADA = `<video class="lt-portada-video" data-portada muted playsinline webkit-playsinline loop preload="metadata" poster="/landing/portada.webp" tabindex="-1" disablepictureinpicture><source src="/landing/portada.webm" type='video/webm; codecs="av01.0.05M.08"'><source src="/landing/portada.mp4" type="video/mp4"></video>`;

/** La landing de deslizapp.com para quien no tiene sesión (docs/prompts/landing-demo-scroll.md, referencias/landing/ajustes-lewis-2.md). */
export function Landing() {
  return (
    <div className="landing" id="arriba">
      <script dangerouslySetInnerHTML={{ __html: ANTES_DE_PINTAR }} />
      <main>
        <DemoPasos pasos={<Secciones />}>
          {/* Fondo a pantalla completa: rosa de la compradora, verde de la tienda, y formas que asoman abajo */}
          <div className="lt-fondo" aria-hidden="true">
            <div className="lt-fondo-tienda" />
            <span className="lt-forma lt-forma-a" />
            <span className="lt-forma lt-forma-b" />
          </div>

          {/* La portada (ajustes-lewis-6.md y -7.md): el video de Lewis de fondo, luego sube el icono de la app y asoma el teléfono
              bloqueado. El controlador reproduce el video, salvo con movimiento reducido o ahorro de datos: entonces, el póster. */}
          <div className="lt-intro" aria-hidden="true">
            <div className="lt-portada-caja" dangerouslySetInnerHTML={{ __html: VIDEO_PORTADA }} />
            {/* El lema de la campaña, bajo el icono (ajustes-lewis-8.md §4) */}
            <p className="lt-lema">
              Comprar sin tanta <b className="lt-lema-vuelta">vuelta.</b>
              <br />
              Vender con <b className="lt-lema-orden">más orden.</b>
            </p>
          </div>

          {/* El icono de la app: sube en la portada y, al desbloquear, viaja a la esquina de arriba a la izquierda; desde ahí lleva
              de vuelta a la portada (ajustes-lewis-8.md §7). */}
          <a href="#paso-intro" className="lt-icono" aria-label="Volver al principio" data-icono>
            <img src="/icons/apple-touch-icon.png" alt="" width={180} height={180} />
          </a>

          <div className="lt-zona">
            <Telefono id="compradora" src="/demo-landing/compradora" />
            <Telefono id="tienda" src="/demo-landing/tienda" diferido />
          </div>
          <Hilo />

          {/* Desenfoque progresivo arriba (el patrón de components/hoja.tsx) */}
          <div className="lt-borde lt-borde-arriba hoja-borde" aria-hidden="true">
            <i className="hoja-borde-desenfoque" />
            <i className="hoja-borde-desenfoque" />
            <i className="hoja-borde-desenfoque" />
            <i className="hoja-borde-desenfoque" />
          </div>

          <div className="lt-arriba">
            <a href="#cierre" className="lt-saltar tocable" data-saltar>
              Saltar
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 6l7 6-7 6M13 6l7 6-7 6" />
              </svg>
            </a>
          </div>

          <Indice />

          {/* Las burbujas: Deslizapp le cuenta la demo a quien la ve, como en un chat */}
          <div className="lt-burbujas" aria-live="polite">
            {PASOS.map((p, i) => p.burbuja && (
              <Burbuja key={p.id} burbuja={p.burbuja} lado={p.lado} indice={i} />
            ))}
          </div>
        </DemoPasos>

        {/* Sin JavaScript: la misma historia en pasos, con una captura de cada uno. */}
        <section className="landing-pasos" aria-labelledby="pasos-titulo">
          <div className="mx-auto flex max-w-[560px] items-center justify-between px-4 pt-[calc(16px+env(safe-area-inset-top))]">
            <span className="flex items-center gap-1.5 text-texto">
              <Isotipo tamano={26} />
              <Logotipo className="text-[22px]" />
            </span>
            <a href="#cierre" className="lt-saltar tocable">
              Saltar
            </a>
          </div>
          <div className="mx-auto max-w-[560px] px-4 py-8">
            <h2 id="pasos-titulo" className="font-display text-titulo-pantalla">
              Un pedido, de principio a fin
            </h2>
            <ol className="mt-6 flex flex-col gap-10">
              {PASOS.map((p) => (
                <li key={p.id} className="flex flex-col gap-4" data-paso={p.id}>
                  {p.burbuja && (
                    <p className="lt-burbuja-quieta">
                      {p.burbuja.texto}
                      {p.burbuja.remate && ` ${p.burbuja.remate}`}
                    </p>
                  )}
                  {p.id !== "intro" && <img src={`/landing/pasos/${p.id}.webp`} alt="" width={393} height={852} loading="lazy" decoding="async" className="lt-captura" />}
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="cierre" className="lt-cierre" aria-labelledby="cierre-titulo">
          <span className="flex items-center gap-1.5 text-texto">
            <Isotipo tamano={30} />
            <Logotipo className="text-[26px]" />
          </span>
          <h2 id="cierre-titulo" className="mt-8 font-display text-[34px] leading-[1.1] min-[900px]:text-[46px]">
            Comprar sin tanta vuelta.
            <br />
            <span className="text-atencion-texto">Vender con más orden.</span>
          </h2>
          <p className="mt-3 text-[16px] text-texto-secundario">Un catálogo para comprar. Una app para lo que pasa después.</p>
          <div className="mt-8 flex w-full flex-col gap-3 min-[600px]:max-w-[420px]">
            <a
              href={ENLACE_QUIERO_VENDER}
              target="_blank"
              rel="noopener noreferrer"
              data-cta="vender"
              className="tocable flex h-[54px] items-center justify-center rounded-full bg-accion px-6 text-[16px] font-extrabold text-sobre-accion"
            >
              Quiero vender
            </a>
            <a
              href={ENLACE_CATALOGO_EJEMPLO}
              data-cta="catalogo"
              className="tocable flex h-[54px] items-center justify-center rounded-full border-[1.5px] border-accion px-6 text-[16px] font-extrabold text-texto"
            >
              Ver un catálogo de ejemplo
            </a>
          </div>
          <p className="mt-4 text-[14px] text-texto-secundario">Las tiendas entran por invitación. Escríbenos y te contamos.</p>
          <p className="mt-6 text-[15px] text-texto-secundario">
            ¿Ya tienes tienda?{" "}
            <Link href={RUTA_ENTRAR} data-cta="entrar" className="tocable inline-flex h-11 items-center font-extrabold text-texto underline underline-offset-4">
              Entrar
            </Link>
          </p>
          <a href="#arriba" className="tocable mt-2 flex h-11 items-center text-[14px] font-bold text-texto-secundario underline underline-offset-4">
            Ver la demo otra vez
          </a>
          <footer className="mt-10 flex justify-center gap-5 pb-[env(safe-area-inset-bottom)] text-[13px] text-texto-secundario">
            <Link href="/privacidad" className="tocable flex items-center underline">
              Privacidad
            </Link>
            <Link href="/terminos" className="tocable flex items-center underline">
              Términos
            </Link>
          </footer>
        </section>
      </main>
    </div>
  );
}

/** Las secciones vacías que dan los pasos al scroll (una pantalla cada una, con snap). */
function Secciones() {
  return (
    <div className="lt-pasos" aria-hidden="true">
      {PASOS.map((p, i) => (
        <div key={p.id} id={`paso-${p.id}`} className="lt-paso" data-paso-seccion={i} />
      ))}
    </div>
  );
}

/** Los mockups (public/landing/mockup-*.webp): tamaño de la imagen y dónde está la pantalla (en %, unos px más grande: el marco la tapa). */
const MOCKUPS = {
  compradora: { src: "/landing/mockup-titanio.webp", ancho: 640, alto: 1325, x: 6.094, y: 2.113, w: 87.969, h: 95.774 },
  tienda: { src: "/landing/mockup-negro.webp", ancho: 640, alto: 1350, x: 5.313, y: 1.926, w: 89.688, h: 96.148 },
} as const;

/**
 * Un teléfono de la demo: la página real (app/demo-landing) en un iframe de 393 px de ancho y el alto del hueco del mockup, escalada
 * a ese hueco.
 * No es tocable: el gesto es de la página.
 */
function Telefono({ id, src, diferido = false }: { id: "compradora" | "tienda"; src: string; diferido?: boolean }) {
  const m = MOCKUPS[id];
  const alto = Math.round((393 * m.h * m.alto) / (m.w * m.ancho));
  const estilo = { "--m-ratio": m.ancho / m.alto, "--m-x": `${m.x}%`, "--m-y": `${m.y}%`, "--m-w": `${m.w}%`, "--m-h": `${m.h}%`, "--m-alto": `${alto}px` } as CSSProperties;
  return (
    <div className={`lt-telefono lt-tel-${id}`} style={estilo} aria-hidden="true">
      <div className="lt-hueco">
        <div className="lt-pantalla">
          <iframe data-telefono={id} {...(diferido ? { "data-src": src } : { src })} title="" tabIndex={-1} inert loading="eager" />
        </div>
        {id === "compradora" && <PantallaBloqueo />}
      </div>
      <img src={m.src} alt="" className="lt-mockup" width={m.ancho} height={m.alto} decoding="async" />
    </div>
  );
}

/**
 * El indicador, a la izquierda (ajustes-lewis-7.md §1): una raya gruesa por paso (cada vez que hay que deslizar) y, entre dos
 * gruesas, una fina por cada toque o fase del paso (`fases` en lib/landing/pasos.ts). Las finas se llenan mientras el paso avanza.
 * Solo las gruesas se tocan (llevan a su paso). No sale en la portada. El controlador marca el estado.
 */
function Indice() {
  return (
    <nav className="lt-indice" aria-label="Recorrido de la demo">
      <div className="lt-indice-rayas">
        {PASOS.map((p, i) => (
          <Fragment key={p.id}>
            <a href={`#paso-${p.id}`} className="lt-raya-gruesa" data-raya-paso={i} data-estado={i === 0 ? "actual" : "falta"} aria-current={i === 0 ? "step" : undefined} aria-label={p.burbuja ? [p.burbuja.texto, p.burbuja.remate].filter(Boolean).join(" ") : "Portada"} />
            {Array.from({ length: p.fases }, (_, k) => (
              <span key={k} className="lt-raya-fina" data-raya-fina={i} data-llena="no" aria-hidden="true" />
            ))}
          </Fragment>
        ))}
      </div>
    </nav>
  );
}

/**
 * La pantalla de bloqueo del teléfono de Ana en la portada (ajustes-lewis-7.md §3): la hora, la fecha y «Desliza y mira» sobre el
 * rosa de la marca, con la barrita de inicio. Al primer deslizamiento sube y se va, y el catálogo entra como una app que se abre.
 */
function PantallaBloqueo() {
  return (
    <div className="lt-bloqueo" data-bloqueo>
      <p className="lt-bloqueo-fecha">martes, 14 de octubre</p>
      <p className="lt-bloqueo-hora">3:41</p>
      <p className="lt-bloqueo-desliza">Desliza y mira</p>
      <span className="lt-bloqueo-barra" />
    </div>
  );
}

/**
 * El ♥, el dedo de la demo: aparece para cada toque y se va. Es el corazón del reel (Icono «heart» del catálogo), en mandarina
 * como el like de la app (ajustes-lewis-5.md); al despachar se vuelve un check.
 */
function Hilo() {
  return (
    <div className="lt-hilo" data-hilo data-visible="no" aria-hidden="true">
      <span className="lt-hilo-dentro">
        <span className="lt-hilo-corazon">
          <Icono nombre="heart" />
        </span>
        <svg viewBox="0 0 24 24" className="lt-hilo-check">
          <circle cx="12" cy="12" r="10.5" fill="var(--marca-bosque)" stroke="var(--marca-papel)" strokeWidth="1.4" />
          <path d="M7.4 12.3l3.1 3.1 6.1-6.6" fill="none" stroke="var(--marca-papel)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="lt-hilo-pulso" data-hilo-pulso />
    </div>
  );
}

/** El texto con sus palabras clave en color de marca (`resalta` en lib/landing/pasos.ts). */
function conResaltes(texto: string, claves: string[]): ReactNode[] {
  if (!claves.length) return [texto];
  const patron = new RegExp(`(${claves.map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`);
  return texto.split(patron).map((trozo, k) => (claves.includes(trozo) ? <b key={k} className="lt-resalte">{trozo}</b> : trozo));
}

/**
 * Una burbuja de la demo: un mensaje enviado de WhatsApp (ajustes-lewis-4.md y -8.md): verde claro, Fredoka, las palabras clave
 * en color de marca, la hora con el doble check dentro (el hueco reserva su sitio) y la cola de una pieza con la burbuja.
 */
function Burbuja({ burbuja, lado, indice }: { burbuja: NonNullable<Paso["burbuja"]>; lado: Paso["lado"]; indice: number }) {
  const texto = [burbuja.texto, burbuja.remate].filter(Boolean).join(" ");
  return (
    <div className="lt-burbuja" data-burbuja={indice} data-estado="futura" data-lado={lado}>
      <p className="lt-burbuja-texto">
        {conResaltes(texto, burbuja.resalta ?? [])}
        <span className="lt-burbuja-hueco" aria-hidden="true" />
      </p>
      <span className="lt-burbuja-hora" aria-hidden="true">
        {HORA_DEMO} <span className="lt-burbuja-checks">✓✓</span>
      </span>
      {/* La cola: sale de la esquina de abajo con una curva continua y se afina hacia fuera (r8-cola-burbuja-referencia.webp) */}
      <svg className="lt-burbuja-cola" viewBox="0 0 34 22" aria-hidden="true">
        <path d="M18 0V9C18 15 20.8 19.6 30 22C22 22.8 16.6 21.6 13.2 19.4C9.4 21.2 4.6 22 0 22V0Z" />
      </svg>
    </div>
  );
}
