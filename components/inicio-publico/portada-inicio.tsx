import { KEY_MODO } from "@/lib/data/modo";
import type { FotoInicio } from "@/lib/inicio/fotos";
import { ENLACE_QUIERO_VENDER, RUTA_CONOCE, RUTA_PLANES } from "@/lib/landing/enlaces";
import { IconoInstagram, IconoReels } from "../iconos";
import { BotonGoogle, EnlaceDemo } from "./boton-google";
import { MedirPortada, EnlaceMedido } from "./medicion";
import { FeedFondo } from "./feed-fondo";
import { Vivo } from "./vivo";
import "./pagina-principal.css";

// Quien ya eligió «Ver demo» no ve esta página mientras su panel de prueba abre (lib/data/sesion.ts lo decide en el navegador).
const ANTES_DE_PINTAR = `(function(){try{if(localStorage.getItem(${JSON.stringify(KEY_MODO)})==="demo")document.documentElement.setAttribute("data-dz-demo","")}catch(e){}})();`;

/**
 * Todo lo que se ve de la página principal de deslizapp.com sin sesión (docs/prompts/pagina-principal-y-conoce.md,
 * referencias/inicio/inicio.dc.html): de fondo, el feed de fotos en tres columnas (seis en escritorio) que suben sin parar; un
 * corazón «aaah» y burbujas de pedido que aparecen en bucle (./vivo.tsx); abajo, el lema, «Iniciar sesión» con Google (en el reel del catálogo, «Ver planes»),
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
  // Dentro del catálogo ya hay un <main> y un <h1> (el nombre de la tienda): aquí van un <div> y un <h2>.
  const Texto = reel ? "div" : "main";
  const Lema = reel ? "h2" : "h1";
  return (
    <div className={"ini" + (reel ? " ini-reel" : "")} data-ini data-activo={activo ? "si" : "no"}>
      {!reel && <script dangerouslySetInnerHTML={{ __html: ANTES_DE_PINTAR }} />}
      <FeedFondo fotos={fotos} reel={reel} />

      <header className={"ini-arriba" + (reel ? "" : " ini-arriba-planes")}>
        {/* El icono y la palabra van juntos en un solo elemento: así, con «Planes» como tercer hijo, el logo no se separa. */}
        <span className="ini-logo">
          {/* eslint-disable-next-line @next/next/no-img-element -- icono pequeño de la app, sin optimizador */}
          <img src="/icons/apple-touch-icon.png" alt="" width={36} height={36} />
          <span>deslizapp</span>
        </span>
        {!reel && (
          <EnlaceMedido evento="cta_planes" href={RUTA_PLANES} className="ini-planes tocable">
            Planes
          </EnlaceMedido>
        )}
      </header>

      <Texto className="ini-texto">
        <div className="ini-burbuja-sitio" data-burbuja-sitio aria-hidden="true" />
        <Lema className="ini-lema">
          Comprar sin
          <br />
          tanta <span className="ini-lema-vuelta">vuelta.</span>
          <br />
          <span className="ini-lema-orden">
            Vender con
            <br />
            más orden.
          </span>
        </Lema>
        <p className="ini-descripcion">Tu catálogo para vender por WhatsApp, y una app para todo lo que pasa después.</p>
        {/* Quien llega desde el catálogo de una tienda es una posible vendedora, no alguien con cuenta: en el reel, «Ver planes»
            (con el mismo botón principal) en lugar de «Iniciar sesión». La página principal sigue con «Iniciar sesión». */}
        {reel ? (
          <EnlaceMedido evento="catalogo_cta_planes" href={RUTA_PLANES} className="ini-google tocable" data-cta="ver-planes">
            Ver planes
          </EnlaceMedido>
        ) : (
          <BotonGoogle evento="cta_iniciar_sesion" />
        )}
        <div className="ini-botones">
          <EnlaceMedido evento={reel ? "catalogo_cta_como_funciona" : "cta_como_funciona"} href={RUTA_CONOCE} className="ini-como tocable" data-cta="como-funciona">
            <IconoReels tamano={20} strokeWidth={2.2} />
            Cómo funciona
          </EnlaceMedido>
          <EnlaceMedido
            evento={reel ? "catalogo_cta_quiero_vender" : "cta_quiero_vender"}
            href={ENLACE_QUIERO_VENDER}
            target="_blank"
            rel="noopener noreferrer"
            className="ini-vender tocable"
            data-cta="vender"
          >
            <IconoInstagram tamano={18} strokeWidth={2.2} />
            Quiero vender
          </EnlaceMedido>
        </div>
        {/* Desde un catálogo no hay panel debajo que se abra solo: tras elegir la demo se va a `/`. */}
        <EnlaceDemo evento={reel ? "catalogo_cta_demo" : "cta_demo"} alTerminar={reel ? () => window.location.assign("/") : undefined} />
      </Texto>

      <MedirPortada modo={modo} activo={activo} />
      <Vivo productos={[...new Set(fotos.map((f) => f.nombre))]} activo={activo} enPagina={!reel} />
    </div>
  );
}
