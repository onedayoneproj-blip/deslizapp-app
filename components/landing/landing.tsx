import Link from "next/link";
import type { CSSProperties } from "react";
import { Isotipo, Logotipo } from "../marca";
import { CAPITULOS, CRUCE, ESCENAS, anclaEn, en, fotoDe, HILO_APARECE, type Escena } from "@/lib/landing/escenas";
import { ENLACE_CATALOGO_EJEMPLO, ENLACE_QUIERO_VENDER, RUTA_ENTRAR } from "@/lib/landing/enlaces";
import { KEY_MODO } from "@/lib/data/modo";
import { DemoScroll } from "./controlador";
import { Hilo } from "./hilo";
import { PANTALLAS_DE, PantallasCompradora, PantallasTienda } from "./pantallas";
import { entre, pista } from "./pista";
import { Telefono } from "./telefono";
import "./landing.css";

// Antes de pintar: con JavaScript se usa el escenario animado (si no, la versión en pasos), y quien ya eligió «Ver demo» no
// ve la landing mientras su panel de prueba abre (lib/data/sesion.ts lo decide en el navegador).
const ANTES_DE_PINTAR = `(function(){var r=document.documentElement;r.setAttribute("data-landing-js","");try{if(localStorage.getItem(${JSON.stringify(KEY_MODO)})==="demo")r.setAttribute("data-dz-demo","")}catch(e){}})();`;

const dos = (n: number) => String(n).padStart(2, "0");

/** La landing de deslizapp.com para quien no tiene sesión (docs/prompts/landing-demo-scroll.md, referencias/landing/ajustes-lewis-1.md). */
export function Landing() {
  const capitulos = Array.from({ length: CAPITULOS }, (_, i) => {
    const escenas = ESCENAS.filter((e) => e.capitulo === i + 1);
    return { n: i + 1, desde: en(escenas[0]!.id, 0), hasta: en(escenas[escenas.length - 1]!.id, 1) };
  });
  return (
    <div className="landing" id="arriba">
      <script dangerouslySetInnerHTML={{ __html: ANTES_DE_PINTAR }} />
      <main>
        <DemoScroll>
          {/* Fondo a pantalla completa: rosa de la compradora, verde de la tienda, y formas que asoman abajo */}
          <div className="lt-fondo" aria-hidden="true">
            <div className="lt-fondo-tienda pista" style={pista({ entra: CRUCE.fondo })} />
            <span className="lt-forma lt-forma-a" />
            <span className="lt-forma lt-forma-b" />
          </div>

          <div className="lt-zona">
            <Telefono className="lt-tel-compradora pista desenfoca" style={pista({ sale: CRUCE.sale, x1: "-75%", s1: -0.18 })}>
              <PantallasCompradora />
            </Telefono>
            <Telefono className="lt-tel-tienda pista" style={pista({ entra: CRUCE.entra, x0: "75%", s0: -0.18 })}>
              <PantallasTienda />
            </Telefono>
          </div>
          <Hilo />

          {/* Desenfoque progresivo arriba y abajo (el patrón de components/hoja.tsx) */}
          <div className="lt-borde lt-borde-arriba hoja-borde" aria-hidden="true">
            <i className="hoja-borde-desenfoque" />
            <i className="hoja-borde-desenfoque" />
            <i className="hoja-borde-desenfoque" />
            <i className="hoja-borde-desenfoque" />
          </div>
          <div className="lt-borde lt-borde-abajo hoja-borde-abajo" aria-hidden="true">
            <i className="hoja-borde-desenfoque" />
            <i className="hoja-borde-desenfoque" />
            <i className="hoja-borde-desenfoque" />
            <i className="hoja-borde-desenfoque" />
          </div>

          <div className="lt-arriba">
            <span className="lt-capitulo" aria-hidden="true">
              {capitulos.map((c, i) => (
                <span key={c.n} className="pista" style={i === 0 ? pista({ sale: [c.hasta, c.hasta + 0.04] }) : entre(c.desde, i < capitulos.length - 1 ? c.hasta : 1e4)}>
                  {dos(c.n)} / {dos(CAPITULOS)}
                </span>
              ))}
            </span>
            <a href="#cierre" className="lt-saltar tocable" data-saltar>
              Saltar
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 6l7 6-7 6M13 6l7 6-7 6" />
              </svg>
            </a>
          </div>

          <div className="lt-tarjeta" aria-hidden="true">
            {ESCENAS.map((e, i) => (
              <div key={e.id} className="lt-leyenda" data-leyenda={e.id}>
                <LeyendaAnimada escena={e} primera={i === 0} ultima={i === ESCENAS.length - 1} />
              </div>
            ))}
          </div>
        </DemoScroll>

        {/* Sin JavaScript o con movimiento reducido: la misma historia en pasos. Con animación queda para lectores de pantalla. */}
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
            <ol className="mt-6 flex flex-col gap-12">
              {ESCENAS.map((e) => {
                const p = fotoDe(e);
                const { telefono, pantallas } = PANTALLAS_DE[e.id];
                const ancla = p >= HILO_APARECE[1] ? anclaEn(p) : null;
                return (
                  <li key={e.id} className="flex flex-col gap-4" data-paso={e.id} data-lado={e.lado}>
                    <Leyenda escena={e} />
                    <Telefono className={`lt-tel-${telefono}`} style={{ "--p": p, ...(ancla ? { [`--ancla-${ancla}`]: 1 } : {}) } as CSSProperties}>
                      {pantallas.map((Pantalla, j) => (
                        <Pantalla key={j} />
                      ))}
                    </Telefono>
                  </li>
                );
              })}
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
        </section>
      </main>

      <footer className="flex justify-center gap-5 px-4 pb-[calc(24px+env(safe-area-inset-bottom))] text-[13px] text-texto-secundario">
        <Link href="/privacidad" className="tocable flex items-center underline">
          Privacidad
        </Link>
        <Link href="/terminos" className="tocable flex items-center underline">
          Términos
        </Link>
      </footer>
    </div>
  );
}

/** La tarjeta de una escena en la demo animada: el titular entra palabra por palabra, de borroso a nítido. */
function LeyendaAnimada({ escena: e, primera, ultima }: { escena: Escena; primera: boolean; ultima: boolean }) {
  const inicio = en(e.id, 0);
  const fin = en(e.id, 1);
  const sale: [number, number] | undefined = ultima ? undefined : [fin - 0.12, fin];
  let k = 0;
  // La primera escena ya está escrita al llegar; las demás escriben sus palabras al empezar.
  const palabra = (texto: string, clase = "") => {
    const a = primera ? -1 : inicio + 0.04 + k * 0.03;
    k++;
    return (
      <span key={`${texto}-${k}`}>
        <span className={`palabra ${clase}`} style={pista({ entra: [a, a + 0.12], sale })}>
          {texto}
        </span>{" "}
      </span>
    );
  };
  const titulo = e.titulo.split(" ").map((w) => palabra(w));
  const remate = e.remate.split(" ").map((w) => palabra(w, "lt-remate"));
  const apoyo = primera ? -1 : inicio + 0.08 + k * 0.03;
  return (
    <>
      <p className="lt-titular">
        {titulo}
        <br />
        {remate}
      </p>
      <p className="lt-apoyo palabra" style={pista({ entra: [apoyo, apoyo + 0.14], sale })}>
        {e.apoyo}
      </p>
    </>
  );
}

function Leyenda({ escena: e }: { escena: Escena }) {
  return (
    <div className="lt-tarjeta-quieta">
      <span className="lt-lado" data-lado={e.lado}>
        {e.lado === "compras" ? "Compras" : "Vendes"}
      </span>
      <h3 className="lt-titular">
        {e.titulo} <span className="lt-remate">{e.remate}</span>
      </h3>
      <p className="lt-apoyo">{e.apoyo}</p>
    </div>
  );
}
