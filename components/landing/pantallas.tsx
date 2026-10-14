/* eslint-disable @next/next/no-img-element -- Ilustración estática de la demo: imágenes locales con tamaño fijo, sin optimizador. */
// Las pantallas de los dos teléfonos de la demo, redibujadas a partir de las reales (no se incrusta la app):
// catálogo y «Tu pedido» (components/tienda/reel.tsx, catalogo.tsx, hojas-compra.tsx), el enlace del pedido
// (components/tienda/pedido-comprador.tsx), «¿Eres la tienda?» (components/pedido-catalogo/tienda-en-pedido.tsx), «Pedido del
// catálogo» (registrar-solicitud.tsx) y Pedidos (components/pedidos/vista-pedidos.tsx, hoja-pedido.tsx).
// Nada aquí tiene estado: cada elemento recibe su ventana de lib/landing/escenas.ts y el CSS la cruza con el scroll.
// Donde descansa el ♥ hay un <Ancla>: el ♥ (components/landing/hilo.tsx) la busca y se pone encima.

import type { CSSProperties, ReactNode } from "react";
import { Icono } from "../tienda/iconos";
import { IconoCatalogo, IconoChevronDerecha, IconoClientes, IconoInicio, IconoPedidos, IconoPromos } from "../iconos";
import { Contador, Etiqueta } from "../ui";
import { AGREGA_EN, TOCA_LIKE, agregadoEn, en, momentoProducto, ventana, type IdAncla, type IdEscena } from "@/lib/landing/escenas";
import {
  CODIGO_DEMO,
  COMPRADORA_DEMO,
  ENLACE_DEMO,
  ESTADO_ENVIADO,
  HORA_DEMO,
  MENSAJE_DEMO,
  NUMERO_PEDIDO_DEMO,
  PEDIDO_DEMO,
  PRODUCTOS_DEMO,
  TIENDA_DEMO,
  TOTAL_DEMO,
  UNIDADES_DEMO,
  VISTA_PREVIA_DEMO,
  pesos,
  totalHasta,
} from "@/lib/landing/pedido-demo";
import { CorazonHilo } from "./hilo";
import { pista, entre } from "./pista";
import { BarraEstado, Toque } from "./telefono";

const FIN = 1e4;

function Capa({ children, style, className = "" }: { children: ReactNode; style: CSSProperties; className?: string }) {
  return <div className={`lt-capa pista ${className}`} style={style}>{children}</div>;
}

function Velo({ entra, sale }: { entra: readonly [number, number]; sale?: readonly [number, number] }) {
  return <div className="lt-capa pista bg-[rgba(16,54,42,0.45)]" style={pista({ entra, sale })} />;
}

/**
 * Donde descansa el ♥. En la demo animada queda vacía (el ♥ de hilo.tsx se pone encima); en la versión en pasos, la página
 * enciende con `--ancla-<id>: 1` la que toca y aquí se dibuja el ♥ quieto.
 */
function Ancla({ id, tamano, className = "" }: { id: IdAncla; tamano: number; className?: string }) {
  return (
    <span data-ancla={id} className={`lt-ancla ${className}`} style={{ width: tamano, height: tamano }}>
      <span className="lt-ancla-quieto" style={{ opacity: `var(--ancla-${id}, 0)` }}>
        <CorazonHilo />
      </span>
    </span>
  );
}

function AvatarTienda({ tamano = 36 }: { tamano?: number }) {
  return (
    <span className="grid shrink-0 place-items-center rounded-full bg-resalte font-display text-sobre-resalte" style={{ width: tamano, height: tamano, fontSize: tamano * 0.5 }}>
      {TIENDA_DEMO.inicial}
    </span>
  );
}

function AvatarAna({ tamano = 40 }: { tamano?: number }) {
  return (
    <span className="grid shrink-0 place-items-center rounded-full bg-marca-rosa font-display text-texto" style={{ width: tamano, height: tamano, fontSize: tamano * 0.45 }}>
      {COMPRADORA_DEMO.inicial}
    </span>
  );
}

function Mini({ src, tamano, fondo, className = "" }: { src: string; tamano: number; fondo?: string; className?: string }) {
  return (
    <span className={`grid shrink-0 place-items-center overflow-hidden rounded-[12px] ${className}`} style={{ width: tamano, height: tamano, background: fondo ?? "var(--superficie-hundida)" }}>
      <img src={src} alt="" width={tamano} height={tamano} className="h-[88%] w-[88%] object-contain" loading="lazy" decoding="async" />
    </span>
  );
}

// =====================================================================================================================
// EL TELÉFONO DE ANA
// =====================================================================================================================

// ---- 1. Catálogo: el feed, «Lo quiero», la bolsa y «Tu pedido» ----

export function PantallaCatalogo() {
  const n = PRODUCTOS_DEMO.length;
  return (
    <Capa style={pista({ sale: ventana("revisar", 0.84, 1), x1: "-22%" })} className="bg-[#10362a]">
      {PRODUCTOS_DEMO.map((p, i) => (
        <article
          key={p.id}
          className="lt-capa mueve flex flex-col"
          style={pista({ entra: i > 0 ? momentoProducto(i, 0, 0.16) : undefined, y0: "100%", sale: i < n - 1 ? momentoProducto(i + 1, 0, 0.16) : undefined, y1: "-100%" }, { background: p.fondo })}
        >
          <img src={p.foto} alt="" width={720} height={720} className="lt-producto" loading={i === 0 ? "eager" : "lazy"} decoding="async" />
          <div className="absolute inset-x-0 top-0 h-[150px] bg-gradient-to-b from-[rgba(16,54,42,0.28)] to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-[46%] bg-gradient-to-t from-[rgba(16,54,42,0.72)] to-transparent" />
          <div className="absolute top-[62px] left-4 flex items-center gap-2.5 text-white">
            <AvatarTienda />
            <span className="text-[16px] font-extrabold drop-shadow">{TIENDA_DEMO.nombre}</span>
          </div>
          {p.enPedido && (
            <span className="pista absolute top-[66px] right-4 rounded-full bg-white px-3 py-1 text-[13px] font-extrabold text-texto" style={pista({ entra: momentoProducto(i, AGREGA_EN - 0.06, AGREGA_EN) })}>
              En tu pedido
            </span>
          )}
          <div className="lt-reel-cap text-white">
            <h3 className="font-display text-[26px] leading-[1.1]">{p.nombre}</h3>
            <p className="mt-1.5 text-[18px] font-extrabold">{pesos(p.precio)}</p>
            <p className="mt-1 text-[14px] opacity-85">Edición La Vuelta · Hecho para el día a día</p>
          </div>
          <div className="lt-reel-acts text-white">
            <span className="relative flex flex-col items-center gap-1">
              <span className="presiona lt-accion" style={p.enPedido ? pista({ entra: momentoProducto(i, TOCA_LIKE, TOCA_LIKE + 0.06), sale: momentoProducto(i, TOCA_LIKE + 0.07, TOCA_LIKE + 0.12) }) : undefined}>
                <span className="lt-icono">
                  <Icono nombre="heart" />
                </span>
                {p.enPedido && (
                  <span className="lt-icono lt-icono-lleno pista absolute" style={pista({ entra: momentoProducto(i, TOCA_LIKE + 0.06, TOCA_LIKE + 0.08), s0: -0.4 })}>
                    <Icono nombre="heart" />
                  </span>
                )}
              </span>
              <span className="text-[12.5px] font-bold">Lo quiero</span>
              {p.enPedido && <Toque style={pista({ entra: momentoProducto(i, TOCA_LIKE - 0.04, TOCA_LIKE + 0.02), sale: momentoProducto(i, TOCA_LIKE + 0.08, TOCA_LIKE + 0.14), s0: 0.6 }, { top: 2, left: "50%", marginLeft: -26 })} />}
            </span>
            <span className="flex flex-col items-center gap-1">
              <span className="lt-accion">
                <span className="lt-icono">
                  <Icono nombre="comment" />
                </span>
              </span>
              <span className="text-[12.5px] font-bold">Pregúntame</span>
            </span>
            <span className="flex flex-col items-center gap-1">
              <span className="lt-accion">
                <span className="lt-icono">
                  <Icono nombre="share" />
                </span>
              </span>
              <span className="text-[12.5px] font-bold">Compartir</span>
            </span>
          </div>
          {p.enPedido && (
            /* El «aaah» (reel.tsx .burst). El del termo es el ♥ del hilo (su ancla); el del tote cae a la bolsa y se suma. */
            <div className="lt-burst">
              {p.id === "termo" ? (
                <Ancla id="like-termo" tamano={130} />
              ) : (
                <span className="lt-burst-corazon pista" style={pista({ entra: momentoProducto(i, TOCA_LIKE + 0.06, TOCA_LIKE + 0.12), s0: -0.5, sale: momentoProducto(i, 0.5, AGREGA_EN), y1: "330px", x1: "-140px", s1: -0.75 })}>
                  <Icono nombre="heart" />
                </span>
              )}
              <span className="pista font-mano text-[44px] leading-none text-white drop-shadow" style={pista({ entra: momentoProducto(i, TOCA_LIKE + 0.06, TOCA_LIKE + 0.12), y0: "10px", sale: momentoProducto(i, 0.48, 0.58) })}>
                {p.id === "termo" ? "aaah" : "aaaah"}
              </span>
            </div>
          )}
        </article>
      ))}

      {/* Barra del pedido (catalogo.tsx .cartbar): la bolsa, con el ♥ */}
      <div className="lt-barra pista" style={pista({ entra: [agregadoEn(0) - 0.22, agregadoEn(0) - 0.12], y0: "160%" })}>
        <span className="grid size-[46px] shrink-0 place-items-center rounded-full bg-marca-rosa">
          <Ancla id="bolsa" tamano={30} />
        </span>
        <span className="relative min-w-0 flex-1">
          {PEDIDO_DEMO.map((_, k) => (
            <b key={k} className="pista absolute inset-x-0 top-0 truncate text-[15px] font-extrabold" style={k === 0 ? pista({ sale: [agregadoEn(1), agregadoEn(1) + 0.02] }) : entre(agregadoEn(k), FIN, 0.02)}>
              {k + 1} {k === 0 ? "producto" : "productos"} · {pesos(totalHasta(k + 1))}
            </b>
          ))}
          <small className="block truncate pt-[21px] text-[12.5px] text-texto-secundario">Ver o cambiar mi pedido</small>
          <Toque style={pista({ entra: ventana("revisar", 0.02, 0.07), sale: ventana("revisar", 0.1, 0.15), s0: 0.6 }, { top: -4, left: 30 })} />
        </span>
        <span className="flex h-[42px] shrink-0 items-center gap-1.5 rounded-full bg-accion px-3.5 text-[14.5px] font-extrabold text-sobre-accion">
          <span className="lt-icono size-[18px]">
            <Icono nombre="wa" />
          </span>
          Enviar
        </span>
      </div>

      {/* «Tu pedido» (hojas-compra.tsx HojaPedido): así le llegará el pedido a la tienda */}
      <Velo entra={ventana("revisar", 0.08, 0.24)} />
      <div className="lt-hoja pista" style={pista({ entra: ventana("revisar", 0.08, 0.26), y0: "100%" })}>
        <div className="flex items-center gap-3 border-b border-linea px-4 py-3">
          <AvatarTienda tamano={38} />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 text-[16px] font-extrabold">
              {TIENDA_DEMO.nombre}
              <Ancla id="tu-pedido" tamano={26} />
            </p>
            <p className="text-[12.5px] text-texto-secundario">Tu pedido</p>
          </div>
          <span className="grid size-9 place-items-center rounded-full bg-superficie-hundida text-[20px]">×</span>
        </div>
        <div className="flex flex-1 flex-col justify-center gap-2 overflow-hidden bg-chat-fondo px-3 py-3">
          <span className="self-center rounded-full bg-white/80 px-3 py-0.5 text-[12px] font-bold text-texto-secundario">Hoy</span>
          <span className="self-center text-[12.5px] text-texto-secundario">Así le llegará tu pedido a {TIENDA_DEMO.nombre}</span>
          <div className="ml-auto w-[88%] rounded-[16px] rounded-tr-[4px] bg-chat-burbuja p-3 text-[14.5px] leading-snug">
            <p>{MENSAJE_DEMO.split("\n")[0]}</p>
            <div className="mt-2 flex flex-col gap-2">
              {PEDIDO_DEMO.map((p) => (
                <div key={p.id} className="flex items-center gap-2.5">
                  <Mini src={p.mini} tamano={46} fondo="var(--marca-papel)" />
                  <div className="min-w-0 flex-1">
                    <b className="block truncate text-[14.5px]">{p.nombre}</b>
                    <small className="text-[13px] text-texto-secundario">{pesos(p.precio * p.cantidad)}</small>
                  </div>
                  <span className="lt-icono size-[18px] text-texto-secundario">
                    <Icono nombre="trash" />
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between border-t border-accion/15 pt-2 text-[15.5px]">
              <span>Total</span>
              <strong>{pesos(TOTAL_DEMO)}</strong>
            </div>
            <p className="mt-1">¿Los tienes disponibles?</p>
          </div>
        </div>
        <div className="relative flex flex-col items-center gap-2 px-4 pt-3 pb-8">
          <span className="presiona flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-accion text-[16px] font-extrabold text-sobre-accion" style={pista({ entra: ventana("revisar", 0.66, 0.72), sale: ventana("revisar", 0.74, 0.8) })}>
            <span className="lt-icono size-5">
              <Icono nombre="wa" />
            </span>
            Enviar por WhatsApp
          </span>
          <Toque style={pista({ entra: ventana("revisar", 0.62, 0.68), sale: ventana("revisar", 0.76, 0.82), s0: 0.6 }, { top: 12, left: "50%", marginLeft: -26 })} />
          <p className="text-[12.5px] text-texto-secundario">Se abre WhatsApp con este mensaje listo. Solo lo envías.</p>
        </div>
      </div>
      <BarraEstado claro />
    </Capa>
  );
}

// ---- 2. WhatsApp (dibujado; no es la app de WhatsApp): el mismo mensaje y la vista previa del enlace ----

/** La imagen de la vista previa: la misma composición que lib/tienda/render-imagen-pedido.tsx (dos productos lado a lado). */
function ImagenVistaPrevia({ ancla }: { ancla: IdAncla }) {
  return (
    <div className="relative flex aspect-[1200/630] items-center justify-center bg-[#fff9ee]">
      <div className="flex h-[95%] aspect-square flex-col">
        <div className="flex h-[78%] justify-center gap-[2%]">
          {PEDIDO_DEMO.map((p) => (
            <span key={p.id} className="grid h-full w-[49%] place-items-center overflow-hidden rounded-[6px] bg-accion-suave">
              <img src={p.mini} alt="" width={160} height={160} className="w-[92%] object-contain" loading="lazy" decoding="async" />
            </span>
          ))}
        </div>
        <span className="pt-[3%] text-[9px] leading-tight text-texto">{VISTA_PREVIA_DEMO.titulo}</span>
        <span className="text-[7.5px] leading-tight text-texto">{VISTA_PREVIA_DEMO.descripcion}</span>
      </div>
      <span className="absolute top-2 right-2">
        <Ancla id={ancla} tamano={34} />
      </span>
    </div>
  );
}

function GloboPedido({ lado, toque, ticks }: { lado: "sale" | "entra"; toque: CSSProperties; ticks?: number }) {
  const lineas = MENSAJE_DEMO.split("\n");
  return (
    <div className={`relative w-[88%] rounded-[14px] p-1 text-[14.5px] leading-[1.38] text-[#111b21] shadow-[0_1px_1px_rgba(0,0,0,0.12)] ${lado === "sale" ? "ml-auto rounded-tr-[4px] bg-[#d9fdd3]" : "rounded-tl-[4px] bg-white"}`}>
      <div className="relative overflow-hidden rounded-[10px] bg-black/5">
        <ImagenVistaPrevia ancla={lado === "sale" ? "chat-compradora" : "chat-tienda"} />
        <div className="px-2.5 py-2">
          <p className="text-[13.5px] font-bold">{VISTA_PREVIA_DEMO.titulo}</p>
          <p className="text-[12.5px] text-black/60">{VISTA_PREVIA_DEMO.descripcion}</p>
          <p className="text-[12px] text-black/45">{VISTA_PREVIA_DEMO.dominio}</p>
        </div>
        <Toque style={toque} className="top-[30%] left-[40%]" />
      </div>
      <p className="px-1.5 pt-1.5 whitespace-pre-line">
        {lineas.map((l, i) => (
          <span key={i}>
            {l === ENLACE_DEMO ? <span className="break-all text-[#027eb5] underline">{l}</span> : l}
            {i < lineas.length - 1 && "\n"}
          </span>
        ))}
      </p>
      <p className="flex items-center justify-end gap-1 px-1.5 pb-0.5 text-[11px] text-black/45">
        {HORA_DEMO}
        {lado === "sale" && ticks !== undefined && (
          <span className="relative inline-block w-[18px]">
            <span className="pista text-[#53bdeb]" style={pista({ entra: [ticks, ticks + 0.02] })}>
              ✓✓
            </span>
          </span>
        )}
      </p>
    </div>
  );
}

function CabeceraChat({ nombre, avatar }: { nombre: string; avatar: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 bg-[#f6f5f3] px-3 pt-[56px] pb-2.5">
      <span className="lt-icono size-6 text-[#027eb5]">
        <Icono nombre="back" />
      </span>
      {avatar}
      <div className="min-w-0 flex-1">
        <p className="text-[16px] font-bold text-[#111b21]">{nombre}</p>
        <p className="text-[12px] text-black/50">en línea</p>
      </div>
    </div>
  );
}

const FONDO_CHAT: CSSProperties = { backgroundColor: "#efe5d3", backgroundImage: "url(/chat/patron-whatsapp.svg)", backgroundSize: "180px" };

export function PantallaChatCompradora() {
  return (
    <Capa style={pista({ entra: ventana("whatsapp-comprador", 0, 0.14), x0: "100%", sale: ventana("seguimiento", 0, 0.14), x1: "-22%" })} className="flex flex-col bg-white">
      <CabeceraChat nombre={TIENDA_DEMO.nombre} avatar={<AvatarTienda />} />
      <div className="relative flex flex-1 flex-col justify-end gap-2 overflow-hidden px-3 py-3" style={FONDO_CHAT}>
        <div className="pista" style={pista({ entra: ventana("whatsapp-comprador", 0.3, 0.4), y0: "12%" })}>
          <GloboPedido
            lado="sale"
            ticks={en("whatsapp-comprador", 0.52)}
            toque={pista({ entra: ventana("whatsapp-comprador", 0.74, 0.8), sale: ventana("whatsapp-comprador", 0.86, 0.92), s0: 0.6 })}
          />
        </div>
      </div>
      {/* El mensaje llega escrito: solo falta enviarlo */}
      <div className="relative flex items-end gap-2 bg-[#f6f5f3] px-3 pt-2 pb-8">
        <div className="relative min-h-[40px] flex-1 overflow-hidden rounded-[20px] bg-white px-3.5 py-2 text-[14px] leading-snug">
          <p className="pista line-clamp-3" style={pista({ sale: ventana("whatsapp-comprador", 0.28, 0.31) })}>
            {MENSAJE_DEMO}
          </p>
          <p className="pista absolute inset-x-3.5 top-2 text-black/40" style={pista({ entra: ventana("whatsapp-comprador", 0.3, 0.32) })}>
            Mensaje
          </p>
        </div>
        <span className="presiona grid size-10 shrink-0 place-items-center rounded-full bg-[#1daa61] text-white" style={pista({ entra: ventana("whatsapp-comprador", 0.2, 0.25), sale: ventana("whatsapp-comprador", 0.27, 0.3) })}>
          <span className="lt-icono size-5">
            <Icono nombre="send" />
          </span>
        </span>
        <Toque style={pista({ entra: ventana("whatsapp-comprador", 0.17, 0.23), sale: ventana("whatsapp-comprador", 0.28, 0.33), s0: 0.6 }, { right: 6, top: 2 })} />
      </div>
      <BarraEstado />
    </Capa>
  );
}

// ---- 3. El enlace del pedido (/pedido/CODIGO) ----

type ModoPedido = { escena: IdEscena; tienda: boolean; entra: readonly [number, number]; sale?: readonly [number, number]; ancla?: IdAncla };

const PASOS = ["Enviado", "Confirmado", "Despachado"] as const;

function PaginaPedido({ escena, tienda, entra, sale, ancla }: ModoPedido) {
  const estado = ESTADO_ENVIADO;
  // Las fotos pasan solas en la app (5 s cada una); aquí pasan con el scroll, una por mitad de la escena.
  const tramo = (j: number) => ventana(escena, 0.12 + (j * 0.86) / PEDIDO_DEMO.length, 0.12 + ((j + 1) * 0.86) / PEDIDO_DEMO.length);
  return (
    <Capa style={pista({ entra, sale, y0: "5%" })} className="flex flex-col bg-[#10362a]">
      <div className="relative flex-1 overflow-hidden">
        {PEDIDO_DEMO.map((p, j) => (
          <div key={p.id} className="lt-capa pista" style={pista({ entra: j > 0 ? [tramo(j)[0] - 0.03, tramo(j)[0]] : undefined, sale: j < PEDIDO_DEMO.length - 1 ? [tramo(j)[1], tramo(j)[1] + 0.03] : undefined }, { background: p.fondo })}>
            <img src={p.foto} alt="" width={720} height={720} className="lt-producto lt-producto-pedido" loading="lazy" decoding="async" />
          </div>
        ))}
        <div className="absolute inset-x-0 top-0 h-[140px] bg-gradient-to-b from-[rgba(16,54,42,0.5)] to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-[rgba(16,54,42,0.85)] to-transparent" />
        <div className="absolute inset-x-3 top-[54px] flex gap-1">
          {PEDIDO_DEMO.map((p, j) => (
            <i key={p.id} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/35">
              <b className="llena block h-full bg-white" style={pista({ entra: tramo(j) })} />
            </i>
          ))}
        </div>
        <div className="absolute inset-x-3 top-[66px] flex items-center gap-2.5 text-white">
          <AvatarTienda tamano={34} />
          <div className="min-w-0 flex-1 leading-tight">
            <b className="block text-[15px]">{TIENDA_DEMO.nombre}</b>
            <small className="text-[12.5px] opacity-85">Tu pedido · #{CODIGO_DEMO}</small>
          </div>
          <span className="text-[26px] leading-none">×</span>
        </div>
        <div className="absolute inset-x-4 bottom-3 text-white">
          <span className="text-[13px] font-extrabold tracking-wide text-marca-rosa">¡Gracias por tu compra!</span>
          {PEDIDO_DEMO.map((p, j) => (
            <div key={p.id} className={`pista ${j ? "absolute inset-x-0 bottom-0" : ""}`} style={pista({ entra: j > 0 ? [tramo(j)[0] - 0.03, tramo(j)[0]] : undefined, sale: j < PEDIDO_DEMO.length - 1 ? [tramo(j)[1], tramo(j)[1] + 0.03] : undefined })}>
              <h3 className="font-display text-[24px] leading-tight">{p.nombre}</h3>
              <p className="text-[14px]">
                <b>{pesos(p.precio * p.cantidad)}</b> · {j + 1} de {PEDIDO_DEMO.length}
              </p>
            </div>
          ))}
        </div>
      </div>
      <section className="relative rounded-t-[22px] bg-fondo px-4 pt-4 pb-8 text-texto">
        <div className="flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 font-display text-[21px] leading-tight">
            {estado.titulo}
            {ancla && <Ancla id={ancla} tamano={26} />}
          </h3>
          <b className="font-display text-[19px]">{pesos(TOTAL_DEMO)}</b>
        </div>
        <p className="mt-0.5 text-[14px] text-texto-secundario">{estado.linea}</p>
        <ol className="mt-3 grid grid-cols-3 gap-1.5 text-center text-[12px] font-bold">
          {PASOS.map((paso, n) => (
            <li key={paso} className={`border-t-[4px] pt-1.5 ${n < estado.paso ? "border-accion text-texto" : "border-borde-pastilla text-texto-secundario"}`}>
              {paso}
            </li>
          ))}
        </ol>
        <div className="mt-3 grid grid-cols-[1fr_auto] gap-2 text-[14px] font-extrabold">
          <span className="rounded-full bg-accion-suave py-2.5 text-center">Recibo (imagen)</span>
          <span className="rounded-full bg-accion-suave px-5 py-2.5 text-center">PDF</span>
        </div>
        <span className="mt-2 block rounded-full bg-accion py-3 text-center text-[15px] font-extrabold text-sobre-accion">Seguir explorando {TIENDA_DEMO.nombre}</span>
        <p className="mt-2.5 text-center text-[13.5px] text-texto-secundario">
          ¿Eres la tienda?{" "}
          <span className={`relative font-extrabold text-texto underline ${tienda ? "lt-resalta" : ""}`}>
            Entra para registrarlo
            {tienda && <Toque style={pista({ entra: ventana("acceso", 0.18, 0.24), sale: ventana("acceso", 0.3, 0.35), s0: 0.6 })} className="top-[-14px] left-[30%]" />}
          </span>
        </p>
      </section>
      <BarraEstado claro />
    </Capa>
  );
}

export function PantallaPedidoCompradora() {
  return <PaginaPedido escena="seguimiento" tienda={false} entra={ventana("seguimiento", 0, 0.14)} ancla="seguimiento" />;
}

// =====================================================================================================================
// EL TELÉFONO DE LA TIENDA
// =====================================================================================================================

// ---- 4. Solo el aviso de WhatsApp (Deslizapp no manda notificaciones) ----

export function PantallaBloqueo() {
  return (
    <Capa style={pista({ sale: ventana("notificacion", 0.8, 1), s1: 0.06 })} className="lt-bloqueo text-white">
      <div className="flex flex-col items-center pt-[92px]">
        <p className="text-[17px] font-semibold opacity-90">martes, 14 de octubre</p>
        <p className="font-display text-[86px] leading-none font-semibold">3:43</p>
      </div>
      <div className="pista mx-3 mt-8 rounded-[22px] bg-white/85 p-3.5 text-[#111b21] shadow-lg" style={pista({ entra: ventana("notificacion", 0.08, 0.26), y0: "-60%" })}>
        <div className="presiona relative flex gap-3" style={pista({ entra: ventana("notificacion", 0.58, 0.64), sale: ventana("notificacion", 0.66, 0.72) })}>
          <span className="grid size-10 shrink-0 place-items-center rounded-[11px] bg-[#25d366] text-white">
            <span className="lt-icono size-6">
              <Icono nombre="wa" />
            </span>
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex items-center justify-between text-[14.5px]">
              <b className="flex items-center gap-1.5">
                {COMPRADORA_DEMO.nombre}
                <Ancla id="notificacion" tamano={24} />
              </b>
              <span className="text-[13px] text-black/50">ahora</span>
            </p>
            <p className="line-clamp-3 text-[14px] leading-snug">{MENSAJE_DEMO.split("\n").slice(0, 3).join(" ")}</p>
          </div>
          <Toque style={pista({ entra: ventana("notificacion", 0.52, 0.59), sale: ventana("notificacion", 0.66, 0.72), s0: 0.6 })} className="top-2 left-[40%]" />
        </div>
      </div>
      <p className="absolute inset-x-0 bottom-9 text-center text-[13px] opacity-75">Desliza hacia arriba para abrir</p>
      <BarraEstado claro hora="" />
    </Capa>
  );
}

export function PantallaChatTienda() {
  return (
    <Capa style={pista({ entra: ventana("whatsapp-tienda", 0, 0.14), y0: "4%", sale: ventana("acceso", 0, 0.14), x1: "-22%" })} className="flex flex-col bg-white">
      <CabeceraChat nombre={COMPRADORA_DEMO.nombre} avatar={<AvatarAna tamano={36} />} />
      <div className="relative flex flex-1 flex-col justify-end gap-2 overflow-hidden px-3 py-3" style={FONDO_CHAT}>
        <span className="self-center rounded-full bg-white/85 px-3 py-0.5 text-[12px] font-bold text-black/55">Hoy</span>
        <div className="pista" style={pista({ entra: ventana("whatsapp-tienda", 0.06, 0.18), y0: "10%" })}>
          <GloboPedido lado="entra" toque={pista({ entra: ventana("whatsapp-tienda", 0.62, 0.7), sale: ventana("whatsapp-tienda", 0.78, 0.86), s0: 0.6 })} />
        </div>
      </div>
      <div className="flex items-end gap-2 bg-[#f6f5f3] px-3 pt-2 pb-8">
        <div className="min-h-[40px] flex-1 rounded-[20px] bg-white px-3.5 py-2 text-[14px] text-black/40">Mensaje</div>
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#1daa61] text-white">
          <span className="lt-icono size-5">
            <Icono nombre="send" />
          </span>
        </span>
      </div>
      <BarraEstado />
    </Capa>
  );
}

/** El mismo enlace, abierto por la tienda: «¿Eres la tienda?» pide entrar con la cuenta de la tienda. */
export function PantallaPedidoTienda() {
  return (
    <>
      <PaginaPedido escena="acceso" tienda entra={ventana("acceso", 0, 0.14)} sale={ventana("gestion", 0.54, 0.58)} />
      <Velo entra={ventana("acceso", 0.3, 0.42)} sale={ventana("gestion", 0.47, 0.52)} />
      <div className="lt-hoja lt-hoja-compacta pista" style={pista({ entra: ventana("acceso", 0.3, 0.44), y0: "100%", sale: ventana("gestion", 0, 0.1), y1: "100%" })}>
        <div className="mx-auto mt-2 h-[5px] w-10 rounded-full bg-borde-pastilla" />
        <div className="flex items-center justify-between px-5 pt-3">
          <h3 className="flex items-center gap-2 font-display text-[24px]">
            ¿Eres la tienda?
            <Ancla id="eres-tienda" tamano={28} />
          </h3>
          <span className="grid size-9 place-items-center rounded-full bg-superficie-hundida text-[20px]">×</span>
        </div>
        <div className="relative px-5 pt-2 pb-9">
          <div className="pista flex flex-col gap-3" style={pista({ sale: ventana("acceso", 0.74, 0.78) })}>
            <p className="text-[16px] leading-snug">Entra con tu cuenta de Deslizapp y registra este pedido desde aquí.</p>
            <span className="presiona relative flex h-[52px] items-center justify-center rounded-full bg-accion text-[16px] font-extrabold text-sobre-accion" style={pista({ entra: ventana("acceso", 0.62, 0.67), sale: ventana("acceso", 0.69, 0.74) })}>
              Entrar con Google
            </span>
            <p className="text-[14px] leading-snug text-texto-secundario">La primera vez en este teléfono te pide elegir tu cuenta de Google. Después vuelves directo a este pedido.</p>
          </div>
          <Toque style={pista({ entra: ventana("acceso", 0.58, 0.64), sale: ventana("acceso", 0.7, 0.75), s0: 0.6 })} className="top-[72px] left-1/2 -ml-[26px]" />
          <p className="pista absolute inset-x-5 top-6 py-6 text-center text-[16px] text-texto-secundario" style={pista({ entra: ventana("acceso", 0.76, 0.8) })}>
            Revisando tu sesión…
          </p>
        </div>
      </div>
    </>
  );
}

// ---- 5. Gestión: «Pedido del catálogo», Pedidos › Nuevos, Confirmar y Despachar ----

function LineaProducto({ p, quitar = false }: { p: (typeof PRODUCTOS_DEMO)[number]; quitar?: boolean }) {
  return (
    <li className="flex items-center gap-3 px-3.5 py-2.5">
      <Mini src={p.mini} tamano={46} fondo="var(--fondo)" />
      <div className="min-w-0 flex-1">
        <div className="flex justify-between gap-2 text-[15.5px] font-extrabold">
          <span className="truncate">{p.nombre}</span>
          <span>{pesos(p.precio * p.cantidad)}</span>
        </div>
        <p className="text-[13.5px] text-texto-secundario">
          ×{p.cantidad}
          {quitar && <span className="ml-3 font-extrabold text-texto">Quitar</span>}
        </p>
      </div>
    </li>
  );
}

function NavPanel({ nuevos }: { nuevos: CSSProperties }) {
  const items = [
    { n: "Inicio", I: IconoInicio },
    { n: "Catálogo", I: IconoCatalogo },
    { n: "Pedidos", I: IconoPedidos },
    { n: "Clientes", I: IconoClientes },
    { n: "Promos", I: IconoPromos },
  ];
  return (
    <div className="absolute inset-x-3 bottom-6 flex h-[64px] items-center justify-around rounded-full bg-white px-1 shadow-[0_10px_24px_-10px_rgba(16,54,42,0.45)]">
      {items.map(({ n, I }) => (
        <span key={n} className={`relative flex flex-col items-center gap-0.5 rounded-full px-3 py-1.5 text-[11px] font-bold ${n === "Pedidos" ? "bg-marca-rosa" : ""}`}>
          <I tamano={22} />
          {n}
          {n === "Pedidos" && (
            <span className="pista absolute -top-0.5 right-1" style={nuevos}>
              <Contador valor={1} atencion />
            </span>
          )}
        </span>
      ))}
    </div>
  );
}

export function PantallaGestion() {
  const v = (a: number, b: number) => ventana("gestion", a, b);
  const confirma = en("gestion", 0.9);
  const despacha = en("cierre", 0.3);
  return (
    <>
      {/* Panel › Pedidos */}
      <Capa style={pista({ entra: v(0.5, 0.57), x0: "100%" })} className="bg-fondo text-texto">
        <div className="flex items-center gap-2.5 px-5 pt-[60px]">
          <AvatarTienda tamano={40} />
          <div className="leading-tight">
            <b className="block text-[16px]">{TIENDA_DEMO.nombre}</b>
            <small className="text-[13px] text-texto-secundario">Tu tienda</small>
          </div>
        </div>
        <h3 className="px-5 pt-4 font-display text-[30px] leading-tight">Pedidos</h3>
        <p className="px-5 text-[15px] text-texto-secundario">Del suspiro al chat. Y del chat, aquí.</p>
        <div className="flex gap-2 overflow-hidden px-5 pt-3.5 text-[14px] font-bold whitespace-nowrap">
          <span className="flex h-9 items-center gap-1.5 rounded-full bg-accion px-3.5 text-sobre-accion">
            Nuevos
            <span className="pista" style={pista({ sale: [confirma, confirma + 0.02] })}>
              <Contador valor={1} atencion />
            </span>
          </span>
          <span className="flex h-9 items-center gap-1.5 rounded-full border border-borde-pastilla bg-white px-3.5">
            Por despachar
            <span className="pista" style={pista({ entra: [confirma, confirma + 0.02], sale: [despacha, despacha + 0.02] })}>
              <Contador valor={1} />
            </span>
          </span>
          <span className="flex h-9 items-center rounded-full border border-borde-pastilla bg-white px-3.5">Despachados</span>
        </div>
        <div className="presiona relative mx-5 mt-3.5 rounded-[22px] border border-linea bg-white p-4" style={pista({ entra: v(0.62, 0.65), sale: v(0.66, 0.69) })}>
          <div className="flex items-center gap-3">
            <AvatarAna />
            <div className="min-w-0 flex-1 leading-tight">
              <b className="block text-[16px]">{COMPRADORA_DEMO.nombre}</b>
              <small className="text-[13.5px] text-texto-secundario">#{NUMERO_PEDIDO_DEMO} · Hoy</small>
            </div>
            <Etiqueta tono="exito">Al contado</Etiqueta>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex -space-x-2">
                {PEDIDO_DEMO.map((p) => (
                  <Mini key={p.id} src={p.mini} tamano={34} fondo="var(--superficie-hundida)" className="ring-2 ring-white" />
                ))}
              </span>
              <span className="text-[13.5px] text-texto-secundario">{UNIDADES_DEMO} productos</span>
            </div>
            <b className="flex items-center gap-2 font-display text-[20px]">
              <Ancla id="pedidos" tamano={24} />
              {pesos(TOTAL_DEMO)}
            </b>
          </div>
          <Toque style={pista({ entra: v(0.58, 0.63), sale: v(0.67, 0.71), s0: 0.6 })} className="top-[30%] left-[40%]" />
        </div>
        <NavPanel nuevos={pista({ sale: [confirma, confirma + 0.02] })} />
        <BarraEstado />
      </Capa>

      {/* Hoja del pedido (hoja-pedido.tsx): Recibido → Confirmado → Despachado */}
      <Velo entra={v(0.67, 0.75)} />
      <div className="lt-hoja pista" style={pista({ entra: v(0.67, 0.77), y0: "100%" })}>
        <div className="mx-auto mt-2 h-[5px] w-10 rounded-full bg-borde-pastilla" />
        <div className="flex items-center justify-between px-5 pt-3">
          <h3 className="flex items-center gap-2 font-display text-[24px]">
            Pedido #{NUMERO_PEDIDO_DEMO}
            <Ancla id="hoja-pedido" tamano={26} />
          </h3>
          <span className="grid size-9 place-items-center rounded-full bg-superficie-hundida text-[20px]">×</span>
        </div>
        <div className="flex items-center gap-2 px-5 pt-3">
          {["Recibido", "Confirmado", "Despachado"].map((paso, n) => (
            <span key={paso} className="relative flex flex-1 flex-col gap-1.5 text-[12.5px] font-bold">
              <span className="relative h-[5px] overflow-hidden rounded-full bg-borde-pastilla">
                {n === 0 && <span className="absolute inset-0 bg-accion" />}
                {n === 1 && <span className="llena absolute inset-0 bg-accion" style={pista({ entra: [confirma - 0.01, confirma + 0.04] })} />}
                {n === 2 && <span className="llena absolute inset-0 bg-accion" style={pista({ entra: [despacha - 0.01, despacha + 0.04] })} />}
              </span>
              {paso}
            </span>
          ))}
        </div>
        <ul className="mx-5 mt-3 divide-y divide-linea rounded-[22px] border border-linea bg-white">
          {PEDIDO_DEMO.map((p) => (
            <LineaProducto key={p.id} p={p} />
          ))}
          <li className="flex justify-between px-3.5 py-2.5 font-display text-[20px]">
            <span>Total</span>
            <span>{pesos(TOTAL_DEMO)}</span>
          </li>
        </ul>
        <div className="relative px-5 pt-4 pb-9">
          <span className="pista block" style={pista({ sale: [confirma - 0.02, confirma] })}>
            <span className="presiona flex h-[54px] items-center justify-center rounded-full bg-accion text-[16px] font-extrabold text-sobre-accion" style={pista({ entra: v(0.84, 0.87), sale: v(0.87, 0.89) })}>
              Confirmar pedido
            </span>
          </span>
          <span className="pista absolute inset-x-5 top-4" style={pista({ entra: [confirma, confirma + 0.02], sale: [despacha, despacha + 0.02] })}>
            <span className="presiona flex h-[54px] items-center justify-center gap-2 rounded-full bg-resalte text-[16px] font-extrabold text-sobre-resalte" style={pista({ entra: ventana("cierre", 0.22, 0.27), sale: ventana("cierre", 0.27, 0.3) })}>
              <Ancla id="despachar" tamano={26} />
              Despachar pedido
            </span>
          </span>
          <span className="pista absolute inset-x-5 top-4 flex h-[54px] items-center justify-center gap-2 rounded-full bg-accion-suave text-[16px] font-extrabold text-exito-texto" style={pista({ entra: [despacha, despacha + 0.03] })}>
            Despachado
          </span>
          <p className="pista mt-2 text-center font-mano text-[20px] text-atencion-texto" style={pista({ entra: [despacha, despacha + 0.04] })}>
            al despachar, el stock se actualiza solito
          </p>
          <Toque style={pista({ entra: v(0.8, 0.85), sale: v(0.88, 0.92), s0: 0.6 })} className="top-[18px] left-1/2 -ml-[26px]" />
          <Toque style={pista({ entra: ventana("cierre", 0.17, 0.23), sale: ventana("cierre", 0.3, 0.36), s0: 0.6 })} className="top-[18px] left-[62%]" />
        </div>
      </div>

      {/* «Pedido del catálogo» (registrar-solicitud.tsx): la tienda lo registra */}
      <div className="lt-hoja lt-hoja-grande pista" style={pista({ entra: v(0.04, 0.14), y0: "100%", sale: v(0.47, 0.52), y1: "100%" })}>
        <div className="mx-auto mt-2 h-[5px] w-10 rounded-full bg-borde-pastilla" />
        <div className="flex items-center justify-between px-5 pt-3">
          <h3 className="flex items-center gap-2 font-display text-[24px]">
            Pedido del catálogo
            <Ancla id="registrar" tamano={26} />
          </h3>
          <span className="grid size-9 place-items-center rounded-full bg-superficie-hundida text-[20px]">×</span>
        </div>
        <div className="relative flex-1">
          <div className="pista flex flex-col gap-3 px-5 pt-2" style={pista({ sale: v(0.36, 0.38) })}>
            <p className="text-[13.5px] text-texto-secundario">
              #{CODIGO_DEMO} · hace 2 min · {UNIDADES_DEMO} productos
            </p>
            <ul className="divide-y divide-linea rounded-[22px] border border-linea bg-white">
              {PEDIDO_DEMO.map((p) => (
                <LineaProducto key={p.id} p={p} quitar />
              ))}
            </ul>
            <div className="flex justify-between px-1 text-[17px] font-extrabold">
              <span>Total</span>
              <span>{pesos(TOTAL_DEMO)}</span>
            </div>
            <p className="text-[13.5px] font-extrabold">¿Quién te escribió?</p>
            <div className="relative h-[64px]">
              <span className="pista absolute inset-0 flex items-center justify-between rounded-[16px] border-[1.5px] border-borde-campo bg-white px-3.5 text-[15px] text-texto-secundario" style={pista({ sale: v(0.22, 0.24) })}>
                Busca o crea un cliente
                <IconoChevronDerecha tamano={20} />
              </span>
              <span className="pista absolute inset-0 flex items-center gap-3 rounded-[22px] border border-linea bg-white px-3" style={pista({ entra: v(0.22, 0.24) })}>
                <AvatarAna tamano={38} />
                <span className="min-w-0 flex-1 leading-tight">
                  <b className="block text-[15.5px]">{COMPRADORA_DEMO.nombre}</b>
                  <small className="text-[12.5px] text-texto-secundario">Cliente nuevo: se guarda al registrar</small>
                </span>
              </span>
              <Toque style={pista({ entra: v(0.15, 0.19), sale: v(0.21, 0.24), s0: 0.6 })} className="top-[6px] left-[40%]" />
            </div>
            <span className="presiona relative flex h-[52px] items-center justify-center rounded-full bg-accion text-[16px] font-extrabold text-sobre-accion" style={pista({ entra: v(0.29, 0.32), sale: v(0.33, 0.36) })}>
              Registrar pedido
              <Toque style={pista({ entra: v(0.26, 0.3), sale: v(0.33, 0.37), s0: 0.6 })} className="top-0 left-1/2 -ml-[26px]" />
            </span>
            <span className="text-center text-[15px] font-extrabold text-peligro">No es un pedido</span>
          </div>
          <div className="pista absolute inset-x-5 top-6 flex flex-col items-center gap-1 text-center" style={pista({ entra: v(0.37, 0.4), y0: "10px" })}>
            <p className="font-display text-[22px]">Registrado.</p>
            <p className="max-w-[300px] text-[15px] text-texto-secundario">Ya está en Pedidos › Nuevos. Confírmalo cuando lo tengas listo.</p>
            <span className="presiona relative mt-4 flex h-[52px] w-full items-center justify-center rounded-full bg-accion text-[16px] font-extrabold text-sobre-accion" style={pista({ entra: v(0.42, 0.44), sale: v(0.45, 0.47) })}>
              Ver pedido
              <Toque style={pista({ entra: v(0.4, 0.43), sale: v(0.45, 0.48), s0: 0.6 })} className="top-0 left-1/2 -ml-[26px]" />
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

export type IdTelefono = "compradora" | "tienda";

/** Qué teléfono y qué pantallas dibuja cada escena en la versión en pasos (sin animación). */
export const PANTALLAS_DE: Record<IdEscena, { telefono: IdTelefono; pantallas: (() => ReactNode)[] }> = {
  bienvenida: { telefono: "compradora", pantallas: [PantallaCatalogo] },
  explorar: { telefono: "compradora", pantallas: [PantallaCatalogo] },
  revisar: { telefono: "compradora", pantallas: [PantallaCatalogo] },
  "whatsapp-comprador": { telefono: "compradora", pantallas: [PantallaChatCompradora] },
  seguimiento: { telefono: "compradora", pantallas: [PantallaPedidoCompradora] },
  cambio: { telefono: "tienda", pantallas: [PantallaBloqueo] },
  notificacion: { telefono: "tienda", pantallas: [PantallaBloqueo] },
  "whatsapp-tienda": { telefono: "tienda", pantallas: [PantallaChatTienda] },
  acceso: { telefono: "tienda", pantallas: [PantallaPedidoTienda] },
  gestion: { telefono: "tienda", pantallas: [PantallaPedidoTienda, PantallaGestion] },
  cierre: { telefono: "tienda", pantallas: [PantallaGestion] },
};

export function PantallasCompradora() {
  return (
    <>
      <PantallaCatalogo />
      <PantallaChatCompradora />
      <PantallaPedidoCompradora />
    </>
  );
}

export function PantallasTienda() {
  return (
    <>
      <PantallaBloqueo />
      <PantallaChatTienda />
      <PantallaPedidoTienda />
      <PantallaGestion />
    </>
  );
}
