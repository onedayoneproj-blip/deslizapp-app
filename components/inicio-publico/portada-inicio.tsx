import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { KEY_MODO } from "@/lib/data/modo";
import type { FotoInicio } from "@/lib/inicio/fotos";
import { ENLACE_QUIERO_VENDER, RUTA_CONOCE } from "@/lib/landing/enlaces";
import { IconoInstagram, IconoReels } from "../iconos";
import { BotonGoogle, EnlaceDemo } from "./boton-google";
import { Vivo } from "./vivo";
import "./pagina-principal.css";

// Quien ya eligió «Ver demo» no ve esta página mientras su panel de prueba abre (lib/data/sesion.ts lo decide en el navegador).
const ANTES_DE_PINTAR = `(function(){try{if(localStorage.getItem(${JSON.stringify(KEY_MODO)})==="demo")document.documentElement.setAttribute("data-dz-demo","")}catch(e){}})();`;

/** Segundos por vuelta de cada columna del feed (cada una a su velocidad) y dónde empieza cada una. */
const COLUMNAS = [
  { vuelta: 60, desfase: -40 },
  { vuelta: 45, desfase: 70 },
  { vuelta: 75, desfase: -10 },
  { vuelta: 52, desfase: 40 },
  { vuelta: 68, desfase: -60 },
  { vuelta: 48, desfase: 20 },
];
/** Fotos por columna (antes de duplicarla para el bucle): de sobra para llenar el alto, también en escritorio. */
const FOTOS_POR_COLUMNA = 9;

/** Cada columna empieza en otra foto, para que no se vean en fila. */
function columna(fotos: FotoInicio[], k: number): FotoInicio[] {
  return Array.from({ length: FOTOS_POR_COLUMNA }, (_, i) => fotos[(i + k * 2) % fotos.length]!);
}

/**
 * Todo lo que se ve de la página principal de deslizapp.com sin sesión (docs/prompts/pagina-principal-y-conoce.md,
 * referencias/inicio/inicio.dc.html): de fondo, el feed de fotos en tres columnas (seis en escritorio) que suben sin parar; un
 * corazón «aaah» y burbujas de pedido que aparecen en bucle (./vivo.tsx); abajo, el lema, «Iniciar sesión» con Google,
 * «Cómo funciona» (la landing, en /conoce), «Quiero vender» (el Instagram) y el enlace a la demo. Con movimiento reducido, todo quieto.
 *
 * Lo usan `/` (`modo="pagina"`, con las fotos de la tienda Deslizapp) y el último reel de cada catálogo (`modo="reel"`, con las fotos
 * y los nombres de los productos de ese catálogo; las columnas y lo vivo solo se mueven con el reel `activo`).
 */
export function PortadaInicio({
  fotos,
  modo = "pagina",
  activo = true,
}: {
  fotos: FotoInicio[];
  modo?: "pagina" | "reel";
  activo?: boolean;
}) {
  const reel = modo === "reel";
  return (
    <div className={"ini" + (reel ? " ini-reel" : "")} data-ini data-activo={activo ? "si" : "no"}>
      {!reel && <script dangerouslySetInnerHTML={{ __html: ANTES_DE_PINTAR }} />}
      <div className="ini-feed" aria-hidden="true">
        {fotos.length > 0 && (
          <div className="ini-columnas">
            {COLUMNAS.map((c, k) => (
              <div key={k} className="ini-columna" style={{ "--vuelta": `${c.vuelta}s`, "--desfase": `${c.desfase}px` } as CSSProperties}>
                {/* La lista dos veces: al subir media tira, vuelve al principio sin que se note. */}
                <div className="ini-tira">
                  {[...columna(fotos, k), ...columna(fotos, k)].map((f, i) => (
                    <div key={i} className="ini-foto" data-foto-inicio={f.src}>
                      {/* En el catálogo las fotos ya vienen de su dueño (cualquier origen): sin optimizador. */}
                      <Image
                        src={f.src}
                        alt=""
                        fill
                        sizes="(min-width: 900px) 260px, 230px"
                        quality={70}
                        loading={!reel && i < 3 ? "eager" : "lazy"}
                        unoptimized={reel}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="ini-velo" aria-hidden="true" />

      <header className="ini-arriba">
        {/* eslint-disable-next-line @next/next/no-img-element -- icono pequeño de la app, sin optimizador */}
        <img src="/icons/apple-touch-icon.png" alt="" width={36} height={36} />
        <span>deslizapp</span>
      </header>

      <main className="ini-texto">
        <div className="ini-burbuja-sitio" data-burbuja-sitio aria-hidden="true" />
        <h1 className="ini-lema">
          Comprar sin
          <br />
          tanta <span className="ini-lema-vuelta">vuelta.</span>
          <br />
          <span className="ini-lema-orden">
            Vender con
            <br />
            más orden.
          </span>
        </h1>
        <p className="ini-descripcion">Tu catálogo para vender por WhatsApp, y una app para todo lo que pasa después.</p>
        <BotonGoogle />
        <div className="ini-botones">
          <Link href={RUTA_CONOCE} className="ini-como tocable" data-cta="como-funciona">
            <IconoReels tamano={20} strokeWidth={2.2} />
            Cómo funciona
          </Link>
          <a href={ENLACE_QUIERO_VENDER} target="_blank" rel="noopener noreferrer" className="ini-vender tocable" data-cta="vender">
            <IconoInstagram tamano={18} strokeWidth={2.2} />
            Quiero vender
          </a>
        </div>
        {/* Desde un catálogo no hay panel debajo que se abra solo: tras elegir la demo se va a `/`. */}
        <EnlaceDemo alTerminar={reel ? () => window.location.assign("/") : undefined} />
      </main>

      <Vivo productos={[...new Set(fotos.map((f) => f.nombre))]} activo={activo} enPagina={!reel} />
    </div>
  );
}
