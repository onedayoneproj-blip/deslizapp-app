/* eslint-disable @next/next/no-img-element -- Capturas estáticas de la versión sin JavaScript: tamaño fijo, sin optimizador. */
import Link from "next/link";
import { Fragment, type CSSProperties, type ReactNode } from "react";
import { Isotipo, Logotipo } from "../marca";
import { MOCKUPS, altoPagina } from "./mockups";
import { PieContacto } from "../inicio-publico/pie-contacto";
import { CAPITULOS_NOMBRES, PASOS, burbujaLarga, horaDeBurbuja, primerPasoDe, type IconoBurbuja, type Paso } from "@/lib/landing/pasos";
import { ENLACE_CATALOGO_EJEMPLO, ENLACE_QUIERO_VENDER, RUTA_ENTRAR, RUTA_PLANES } from "@/lib/landing/enlaces";
import { Icono } from "../tienda/iconos";
import { IconoBolsa, IconoCamion, IconoCatalogo, IconoClientes, IconoCorazon, IconoEnlace, IconoEtiqueta, IconoInstagram, IconoMoneda, IconoPedidos, IconoWhatsApp } from "../iconos";
import { BurbujaChat } from "../chat/burbuja-chat";
import { DemoPasos } from "./controlador";
import { CambioLado, GiroTelefono } from "./cambio-lado";
import { SeparadorQuieto, Separadores } from "./separadores";
import { EscenaQuieta, Escenas } from "./escenas";
import { PerfilACatalogo } from "./perfil-a-catalogo";
import { TelefonoMockup } from "./telefono-mockup";
import "./landing.css";

// Antes de pintar: con JavaScript se usa la demo por pasos (si no, la versión en pasos estáticos). La landing vive en /conoce y
// se ve siempre, con sesión, sin ella o en la demo.
const ANTES_DE_PINTAR = `document.documentElement.setAttribute("data-landing-js","");`;

/** La landing de deslizapp.com/conoce (docs/prompts/landing-demo-scroll.md, referencias/landing/ajustes-lewis-2.md). */
export function Landing({ desde = null }: { /** «Desde RD$499/mes · 30 días gratis» (lib/planes/planes.ts `lineaDesde`); null si no hay planes. */ desde?: string | null }) {
  return (
    <div className="landing" id="arriba">
      <script dangerouslySetInnerHTML={{ __html: ANTES_DE_PINTAR }} />
      <main>
        <DemoPasos pasos={<Secciones />}>
          {/* Fondo a pantalla completa: arena en el dolor de antes, rosa de la compradora, verde de la tienda, y formas que asoman abajo */}
          <div className="lt-fondo" aria-hidden="true">
            <div className="lt-fondo-arena" />
            <div className="lt-fondo-tienda" />
            <span className="lt-forma lt-forma-a" />
            <span className="lt-forma lt-forma-b" />
          </div>

          {/* El icono de la app, arriba a la izquierda: lleva de vuelta al principio (ajustes-lewis-8.md §7). Sale cuando entra la marca
              (el post) y no en las dos pantallas de dolor, que son neutras. */}
          {/* Rosado con quien compra (la portada y compras) y verde con la tienda: se funden al cambiar de persona (ajustes-lewis-12.md §1). */}
          <a href={`#paso-${PASOS[0]!.id}`} className="lt-icono" aria-label="Volver al principio" data-icono>
            <img src="/landing/icono-rosa.webp" alt="" width={180} height={180} className="lt-icono-rosa" />
            <img src="/landing/icono-verde.webp" alt="" width={180} height={180} className="lt-icono-verde" />
          </a>

          <div className="lt-zona">
            <Telefono id="compradora" src="/demo-landing/compradora" />
            <Telefono id="tienda" src="/demo-landing/tienda" diferido />
            {/* El cambio de lado (paso `cambio-lado`): el teléfono que gira, con el tamaño y el sitio del de la tienda */}
            <GiroTelefono />
            {/* Del perfil al catálogo (paso `enlace`): su propio teléfono, que corre una sola vez al llegar al paso */}
            <div className="lt-enlace" aria-hidden="true">
              <PerfilACatalogo unaVez />
            </div>
          </div>
          <Hilo />
          <CambioLado />
          <Separadores />

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

          <Barra />
          <Desliza />

          {/* Las burbujas: Deslizapp le cuenta la demo a quien la ve, como en un chat */}
          <div className="lt-burbujas" aria-live="polite">
            {PASOS.map((p, i) => p.burbuja && (
              <Burbuja key={p.id} burbuja={p.burbuja} lado={p.lado} indice={i} hora={horaDeBurbuja(p.id)} larga={burbujaLarga(p)} />
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
                  {p.escena === "cambio-lado" ? (
                    <div className="lt-cambio-quieto">
                      <img src="/landing/icono-verde.webp" alt="" width={96} height={96} />
                      <b>Así lo ve Tu Tienda.</b>
                      <span>El pedido te llega completo: qué quiere, cuánto y a quién se lo mandas.</span>
                    </div>
                  ) : p.escena === "bienvenida" || p.escena === "antes" || p.escena === "solucion" ? (
                    <SeparadorQuieto id={p.escena} />
                  ) : p.escena ? (
                    <TelefonoMockup className="lt-captura-tm">
                      <EscenaQuieta id={p.escena} />
                    </TelefonoMockup>
                  ) : (
                    <img src={`/landing/pasos/${p.id}.webp`} alt="" width={393} height={852} loading="lazy" decoding="async" className="lt-captura" />
                  )}
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* El cierre (ajustes-lewis-10.md): fondo Bosque, las tres fotos en abanico con el ♥ y «Despachado», el lema y la hoja crema. */}
        <section id="cierre" className="lt-cierre" aria-labelledby="cierre-titulo">
          <div className="lt-cierre-arriba">
            <img src="/landing/icono-verde.webp" alt="Deslizapp" width={40} height={40} className="lt-cierre-icono" />
            <a href="#arriba" className="lt-cierre-otra tocable" data-cta="otra-vez">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5" />
              </svg>
              Ver la demo otra vez
            </a>
          </div>
          <div className="lt-abanico" aria-hidden="true">
            <img src="/landing/feed-gorra.webp" alt="" width={720} height={900} className="lt-abanico-foto lt-abanico-gorra" decoding="async" loading="lazy" />
            <img src="/landing/feed-tote.webp" alt="" width={720} height={900} className="lt-abanico-foto lt-abanico-tote" decoding="async" loading="lazy" />
            <img src="/landing/feed-termo.webp" alt="" width={720} height={900} className="lt-abanico-foto lt-abanico-termo" decoding="async" loading="lazy" />
            <span className="lt-abanico-corazon" data-corazon-cierre>
              <svg width="26" height="26" viewBox="0 0 24 24">
                <path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z" />
              </svg>
            </span>
            <span className="lt-abanico-etiqueta">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
              Despachado
            </span>
          </div>
          <h2 id="cierre-titulo" className="lt-cierre-lema">
            Comprar sin
            <br />
            tanta <span className="lt-lema-vuelta">vuelta</span>.
            <br />
            Vender con
            <br />
            <span className="lt-lema-orden">más orden</span>.
          </h2>
          <div className="lt-cierre-hoja">
            <a href={ENLACE_QUIERO_VENDER} target="_blank" rel="noopener noreferrer" data-cta="vender" className="lt-cierre-vender tocable">
              <IconoInstagram tamano={22} strokeWidth={2.2} />
              Escríbenos
            </a>
            <p className="lt-cierre-nota">Las tiendas entran por invitación.</p>
            <a href={ENLACE_CATALOGO_EJEMPLO} data-cta="catalogo" className="lt-cierre-catalogo tocable">
              Ver un catálogo de ejemplo
            </a>
            <Link href={RUTA_PLANES} data-cta="planes" className="lt-cierre-catalogo tocable">
              Ver los planes
            </Link>
            {desde && <p className="lt-cierre-desde">{desde}</p>}
            <p className="lt-cierre-entrar">
              ¿Ya tienes tienda?
              <Link href={RUTA_ENTRAR} data-cta="entrar" className="tocable">
                Entrar
              </Link>
            </p>
            <PieContacto className="lt-cierre-contacto" />
            <footer className="lt-cierre-pie">
              <Link href="/privacidad" className="tocable">
                Privacidad
              </Link>
              <Link href="/terminos" className="tocable">
                Términos
              </Link>
            </footer>
          </div>
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

/**
 * Un teléfono de la demo: la página real (app/demo-landing) en un iframe de 393 px de ancho y el alto del hueco del mockup, escalada
 * a ese hueco.
 * No es tocable: el gesto es de la página.
 */
function Telefono({ id, src, diferido = false }: { id: "compradora" | "tienda"; src: string; diferido?: boolean }) {
  const m = MOCKUPS[id];
  const alto = altoPagina(id);
  const estilo = { "--m-ratio": m.ancho / m.alto, "--m-x": `${m.x}%`, "--m-y": `${m.y}%`, "--m-w": `${m.w}%`, "--m-h": `${m.h}%`, "--m-alto": `${alto}px` } as CSSProperties;
  return (
    <div className={`lt-telefono lt-tel-${id}`} style={estilo} aria-hidden="true">
      <div className="lt-hueco">
        <div className="lt-pantalla">
          <iframe data-telefono={id} {...(diferido ? { "data-src": src } : { src })} title="" tabIndex={-1} inert loading="eager" />
        </div>
        {id === "compradora" && <Escenas />}
      </div>
      <img src={m.src} alt="" className="lt-mockup" width={m.ancho} height={m.alto} decoding="async" />
    </div>
  );
}

/**
 * El riel de avance (referencias/landing/conoce-narrativa/LEEME.md, «Cuándo deslizar»; lienzo de Design «17 oct · Ronda 2», IndRiel): un riel
 * vertical pegado al borde derecho, a media altura, con un segmento por capítulo (CAPITULOS_NOMBRES). El del capítulo actual es más alto y se llena
 * de arriba abajo a lo largo de sus pasos (data-estado: lleno, llenando, parcial o vacío; controlador.tsx). Los segmentos son enlaces (llevan al
 * primer paso de su capítulo) con un área de toque mayor que ellos. Al lado del icono de la app va el nombre del capítulo (.lt-capitulo).
 * Para cambiarlo por otro indicador: esta pieza y su bloque de landing.css («El riel de avance»); el controlador solo marca data-seg.
 */
function Barra() {
  return (
    <>
      <nav className="lt-riel" aria-label="Recorrido de la demo">
        {CAPITULOS_NOMBRES.map((nombre, c) => (
          <a key={nombre} href={`#paso-${PASOS[primerPasoDe(c + 1)]!.id}`} className="lt-seg" data-seg={c} data-estado={c === 0 ? "llenando" : "vacio"} aria-current={c === 0 ? "step" : undefined} aria-label={nombre}>
            <i />
          </a>
        ))}
      </nav>
      <p className="lt-capitulo" data-capitulo-nombre aria-hidden="true">
        {CAPITULOS_NOMBRES[PASOS[0]!.capitulo - 1]}
      </p>
    </>
  );
}

/**
 * «Desliza ↑»: una píldora a media altura de la burbuja, que aparece cuando termina el último paso del capítulo (o con un toque) y se va en cuanto
 * se desliza. En el último capítulo es «Ver planes ↑» (mandarina, late suave) y lleva al cierre, donde están los planes. Decoración (el cierre
 * también se alcanza con «Saltar»).
 */
function Desliza() {
  return (
    <a href="#cierre" className="lt-desliza" tabIndex={-1} aria-hidden="true">
      <span className="lt-desliza-desliza">Desliza</span>
      <span className="lt-desliza-planes">Ver planes</span>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 19V5M5.5 11.5L12 5l6.5 6.5" />
      </svg>
    </a>
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

const ICONOS_BURBUJA: Record<IconoBurbuja, (p: { tamano?: number; strokeWidth?: number }) => ReactNode> = {
  clientes: IconoClientes,
  bolsa: IconoBolsa,
  pedidos: IconoPedidos,
  catalogo: IconoCatalogo,
  whatsapp: IconoWhatsApp,
  corazon: IconoCorazon,
  enlace: IconoEnlace,
  camion: IconoCamion,
  moneda: IconoMoneda,
  etiqueta: IconoEtiqueta,
};

/**
 * El texto con sus palabras clave en color de marca (`resalta` en lib/landing/pasos.ts) y, delante de las que lo llevan, el icono
 * de la app que las nombra (`iconos`), en el color de los resaltes y pegado a la palabra. Los iconos son decoración (aria-hidden).
 */
function conResaltes(texto: string, claves: string[], iconos: Record<string, IconoBurbuja> = {}): ReactNode[] {
  const todas = [...new Set([...claves, ...Object.keys(iconos)])].sort((a, b) => b.length - a.length);
  if (!todas.length) return [texto];
  const patron = new RegExp(`(${todas.map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`);
  return texto.split(patron).map((trozo, k) => {
    if (!todas.includes(trozo)) return trozo;
    const palabra = claves.includes(trozo) ? <b className="lt-resalte">{trozo}</b> : trozo;
    const icono = iconos[trozo];
    if (!icono) return <Fragment key={k}>{palabra}</Fragment>;
    const Dibujo = ICONOS_BURBUJA[icono];
    return (
      <span key={k} className="lt-con-icono">
        <span className="lt-icono-burbuja" data-icono-burbuja={icono} aria-hidden="true">
          <Dibujo strokeWidth={2.2} />
        </span>
        {palabra}
      </span>
    );
  });
}

/**
 * Una burbuja de la demo: un mensaje enviado de WhatsApp (ajustes-lewis-4.md y -8.md) con las palabras clave en color de marca. La
 * forma (verde claro, Fredoka, hora con el doble check y cola) es la de components/chat/burbuja-chat.tsx; aquí solo se apila y se anima.
 */
function Burbuja({ burbuja, lado, indice, hora, larga }: { burbuja: NonNullable<Paso["burbuja"]>; lado: Paso["lado"]; indice: number; hora: string; larga: boolean }) {
  const texto = [burbuja.texto, burbuja.remate].filter(Boolean).join(" ");
  return (
    <BurbujaChat className="lt-burbuja" hora={hora} data-burbuja={indice} data-estado={indice === 0 ? "actual" : "futura"} data-lado={lado} data-larga={larga ? "" : undefined}>
      {conResaltes(texto, burbuja.resalta ?? [], burbuja.iconos)}
    </BurbujaChat>
  );
}
