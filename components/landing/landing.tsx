/* eslint-disable @next/next/no-img-element -- Capturas estáticas de la versión sin JavaScript: tamaño fijo, sin optimizador. */
import Link from "next/link";
import type { CSSProperties } from "react";
import { Isotipo, Logotipo } from "../marca";
import { CAPITULOS, PASOS, type Paso } from "@/lib/landing/pasos";
import { HORA_DEMO } from "@/lib/landing/pedido-demo";
import { ENLACE_CATALOGO_EJEMPLO, ENLACE_QUIERO_VENDER, RUTA_ENTRAR } from "@/lib/landing/enlaces";
import { KEY_MODO } from "@/lib/data/modo";
import { DemoPasos } from "./controlador";
import "./landing.css";

// Antes de pintar: con JavaScript se usa la demo por pasos (si no, la versión en pasos estáticos), y quien ya eligió «Ver demo»
// no ve la landing mientras su panel de prueba abre (lib/data/sesion.ts lo decide en el navegador).
const ANTES_DE_PINTAR = `(function(){var r=document.documentElement;r.setAttribute("data-landing-js","");try{if(localStorage.getItem(${JSON.stringify(KEY_MODO)})==="demo")r.setAttribute("data-dz-demo","")}catch(e){}})();`;

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

          {/* Antes del teléfono: el logo y la bienvenida */}
          <div className="lt-intro" aria-hidden="true">
            <Isotipo tamano={96} />
            <Logotipo className="text-[54px] min-[900px]:text-[72px]" />
          </div>

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
            <span className="lt-capitulo" data-capitulo aria-hidden="true">
              01 / {String(CAPITULOS).padStart(2, "0")}
            </span>
            <a href="#cierre" className="lt-saltar tocable" data-saltar>
              Saltar
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 6l7 6-7 6M13 6l7 6-7 6" />
              </svg>
            </a>
          </div>

          {/* Las burbujas: Deslizapp le cuenta la demo a quien la ve, como en un chat */}
          <div className="lt-burbujas" aria-live="polite">
            {PASOS.map((p, i) => (
              <Burbuja key={p.id} paso={p} indice={i} />
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
                  <p className="lt-burbuja-quieta" data-de={p.burbuja.de}>
                    <b>{p.burbuja.texto}</b> {p.burbuja.remate && <span className="lt-remate">{p.burbuja.remate}</span>}
                  </p>
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
        <div key={p.id} className="lt-paso" data-paso-seccion={i} />
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
      </div>
      <img src={m.src} alt="" className="lt-mockup" width={m.ancho} height={m.alto} decoding="async" />
    </div>
  );
}

/** El ♥ que viaja por encima de los teléfonos: rosa con Ana, verde con la tienda y un check al despachar. */
function Hilo() {
  const trazo = "M12 20.3s-7.3-4.4-9.2-8.9C1.3 7.9 3.4 4.6 6.8 4.6c2.1 0 3.5 1.1 5.2 3 1.7-1.9 3.1-3 5.2-3 3.4 0 5.5 3.3 4 6.8-1.9 4.5-9.2 8.9-9.2 8.9z";
  return (
    <div className="lt-hilo" data-hilo data-visible="no" aria-hidden="true">
      <span className="lt-hilo-dentro">
        <svg viewBox="0 0 24 24" className="lt-hilo-rosa">
          <path d={trazo} fill="var(--marca-rosa-fija)" stroke="var(--marca-bosque)" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
        <svg viewBox="0 0 24 24" className="lt-hilo-verde">
          <path d={trazo} fill="var(--marca-bosque)" stroke="var(--marca-papel)" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
        <svg viewBox="0 0 24 24" className="lt-hilo-check">
          <circle cx="12" cy="12" r="10.5" fill="var(--marca-bosque)" stroke="var(--marca-papel)" strokeWidth="1.4" />
          <path d="M7.4 12.3l3.1 3.1 6.1-6.6" fill="none" stroke="var(--marca-papel)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="lt-hilo-suma">2</span>
      </span>
    </div>
  );
}

/** Una burbuja de chat de WhatsApp: sube desde abajo, como un mensaje nuevo. */
function Burbuja({ paso, indice }: { paso: Paso; indice: number }) {
  return (
    <div className="lt-burbuja" data-burbuja={indice} data-estado={indice === 0 ? "actual" : "futura"} data-de={paso.burbuja.de}>
      <p className="lt-burbuja-texto">
        {paso.burbuja.texto}
        {paso.burbuja.remate && (
          <>
            <br />
            <span className="lt-remate">{paso.burbuja.remate}</span>
          </>
        )}
      </p>
      <span className="lt-burbuja-hora" aria-hidden="true">
        {HORA_DEMO} <span className="lt-burbuja-checks">✓✓</span>
      </span>
    </div>
  );
}
