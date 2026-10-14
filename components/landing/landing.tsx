import Link from "next/link";
import type { CSSProperties } from "react";
import { Isotipo, Logotipo } from "../marca";
import { ESCENAS, en, fotoDe, ventana, type Escena } from "@/lib/landing/escenas";
import { ENLACE_CATALOGO_EJEMPLO, ENLACE_QUIERO_VENDER, RUTA_ENTRAR } from "@/lib/landing/enlaces";
import { KEY_MODO } from "@/lib/data/modo";
import { DemoScroll } from "./controlador";
import { PANTALLAS_DE, TodasLasPantallas } from "./pantallas";
import { pista } from "./pista";
import { Telefono } from "./telefono";
import "./landing.css";

// Antes de pintar: con JavaScript se usa el escenario animado (si no, la versión en pasos), y quien ya eligió «Ver demo» no
// ve la landing mientras su panel de prueba abre (lib/data/sesion.ts lo decide en el navegador).
const ANTES_DE_PINTAR = `(function(){var r=document.documentElement;r.setAttribute("data-landing-js","");try{if(localStorage.getItem(${JSON.stringify(KEY_MODO)})==="demo")r.setAttribute("data-dz-demo","")}catch(e){}})();`;

/** La landing de deslizapp.com para quien no tiene sesión (docs/prompts/landing-demo-scroll.md). */
export function Landing() {
  return (
    <div className="landing" id="arriba">
      <script dangerouslySetInnerHTML={{ __html: ANTES_DE_PINTAR }} />
      <header className="landing-cabecera flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-1.5 text-texto" aria-label="deslizapp, inicio">
          <Isotipo tamano={28} />
          <Logotipo className="text-[22px] min-[390px]:text-[24px]" />
        </Link>
        <nav aria-label="Principal" className="flex items-center gap-1">
          <a href="#cierre" className="tocable flex h-11 items-center rounded-full px-2 text-[14px] font-bold whitespace-nowrap text-texto-secundario underline-offset-4 hover:underline min-[390px]:px-3">
            Saltar demo
          </a>
          <Link href={RUTA_ENTRAR} className="tocable flex h-11 items-center rounded-full bg-accion px-4 text-[15px] min-[390px]:px-5 font-extrabold text-sobre-accion">
            Entrar
          </Link>
        </nav>
      </header>

      <main>
        <DemoScroll>
          <div className="lt-fondo-tienda pista" style={pista({ entra: ventana("cambio", 0.2, 0.6), sale: ventana("cierre", 0, 0.3) })} />
          <div className="lt-progreso" aria-hidden="true">
            <i />
          </div>
          <div className="lt-leyendas" aria-hidden="true">
            {ESCENAS.map((e, i) => (
              <div
                key={e.id}
                className="lt-leyenda pista"
                data-leyenda={e.id}
                style={pista({
                  entra: i > 0 ? [en(e.id, 0), en(e.id, 0) + 0.15] : undefined,
                  sale: i < ESCENAS.length - 1 ? [en(e.id, 1) - 0.15, en(e.id, 1)] : undefined,
                  y0: "10px",
                  y1: "-10px",
                })}
              >
                <Leyenda escena={e} />
              </div>
            ))}
          </div>
          <div className="lt-zona">
            <Telefono>
              <TodasLasPantallas />
            </Telefono>
          </div>
        </DemoScroll>

        {/* Sin JavaScript o con movimiento reducido: la misma historia en pasos. Con animación queda para lectores de pantalla. */}
        <section className="landing-pasos mx-auto max-w-[560px] px-4 py-8" aria-labelledby="pasos-titulo">
          <h2 id="pasos-titulo" className="font-display text-titulo-pantalla">
            Un pedido, de principio a fin
          </h2>
          <ol className="mt-6 flex flex-col gap-12">
            {ESCENAS.map((e) => (
              <li key={e.id} className="flex flex-col gap-4" data-paso={e.id}>
                <div>
                  <Leyenda escena={e} nivel="h3" />
                </div>
                <Telefono style={{ "--p": fotoDe(e) } as CSSProperties}>
                  {PANTALLAS_DE[e.id].map((Pantalla, j) => (
                    <Pantalla key={j} />
                  ))}
                </Telefono>
              </li>
            ))}
          </ol>
        </section>

        <section id="cierre" className="mx-auto flex max-w-[560px] flex-col items-center px-4 pt-16 pb-14 text-center" aria-labelledby="cierre-titulo">
          <h2 id="cierre-titulo" className="font-display text-[34px] leading-[1.1] min-[900px]:text-[44px]">
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
          <a href="#arriba" className="tocable mt-6 flex h-11 items-center text-[14px] font-bold text-texto-secundario underline underline-offset-4">
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

function Leyenda({ escena: e, nivel = "p" }: { escena: Escena; nivel?: "p" | "h3" }) {
  const Titulo = nivel;
  return (
    <>
      {e.lado && (
        <span className="lt-lado" data-lado={e.lado}>
          {e.lado === "compras" ? "Compras" : "Vendes"}
        </span>
      )}
      <Titulo className="lt-titular">
        {e.titulo}
        {e.remate && (
          <>
            {" "}
            <span className="lt-remate">{e.remate}</span>
          </>
        )}
      </Titulo>
      <p className="lt-apoyo">{e.apoyo}</p>
    </>
  );
}
