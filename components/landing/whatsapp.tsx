/* eslint-disable @next/next/no-img-element -- Ilustración de la demo (iframe de la landing): imágenes locales, sin optimizador. */
// Lo único que se dibuja en la demo de la landing: WhatsApp y la pantalla bloqueada del teléfono de la tienda (no son de la
// app). El mensaje es el de mensajePedido y la vista previa usa la imagen real del pedido (app/demo-landing/imagen).

import type { ReactNode } from "react";
import { Icono } from "../tienda/iconos";
import { COMPRADORA_DEMO, ENLACE_DEMO, HORA_DEMO, MENSAJE_DEMO, TIENDA_DEMO, VISTA_PREVIA_DEMO } from "@/lib/landing/pedido-demo";

export const IMAGEN_VISTA_PREVIA = "/demo-landing/imagen";

/**
 * El mensaje del pedido tal como llega a WhatsApp: la vista previa del enlace (miniatura, título y dominio) y el texto de mensajePedido.
 * `diferida`: la miniatura carga cuando la pantalla que la usa está cerca (por ejemplo la vista previa de /planes); en la demo, no.
 */
export function Globo({ sale, visible, diferida = false }: { sale: boolean; visible: boolean; diferida?: boolean }) {
  const lineas = MENSAJE_DEMO.split("\n");
  return (
    <div
      className={`dz-globo relative w-[86%] rounded-[14px] p-1 text-[14.5px] leading-[1.38] text-[#111b21] shadow-[0_1px_1px_rgba(0,0,0,0.12)] ${sale ? "ml-auto rounded-tr-[4px] bg-[#d9fdd3]" : "rounded-tl-[4px] bg-white"}`}
      data-visible={visible ? "" : undefined}
    >
      <div className="relative overflow-hidden rounded-[10px] bg-black/5">
        <img src={IMAGEN_VISTA_PREVIA} alt="" width={1200} height={630} loading={diferida ? "lazy" : undefined} decoding={diferida ? "async" : undefined} className="block aspect-[1200/630] w-full bg-[#fff9ee] object-cover" />
        <span data-ancla="chat" className="absolute top-2 right-2 size-[34px]" />
        <div className="px-2.5 py-2" data-vista-previa>
          <p className="text-[13.5px] font-bold">{VISTA_PREVIA_DEMO.titulo}</p>
          <p className="text-[12.5px] text-black/60">{VISTA_PREVIA_DEMO.descripcion}</p>
          <p className="text-[12px] text-black/45">{VISTA_PREVIA_DEMO.dominio}</p>
        </div>
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
        {sale && <span className="text-[#53bdeb]">✓✓</span>}
      </p>
    </div>
  );
}

function Cabecera({ nombre, inicial, color }: { nombre: string; inicial: string; color: string }) {
  return (
    <div className="flex items-center gap-2.5 bg-[#f6f5f3] px-3 pt-[54px] pb-2.5">
      <span className="inline-grid size-6 text-[#027eb5]">
        <Icono nombre="back" />
      </span>
      <span className="grid size-9 shrink-0 place-items-center rounded-full font-display text-[17px]" style={{ background: color, color: "#10362a" }}>
        {inicial}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[16px] font-bold text-[#111b21]">{nombre}</p>
        <p className="text-[12px] text-black/50">en línea</p>
      </div>
    </div>
  );
}

/** El chat de WhatsApp. `sale`: lo escribió Ana (su teléfono); si no, le llega a la tienda. */
export function ChatWhatsApp({ sale, enviado }: { sale: boolean; enviado: boolean }) {
  return (
    <div className="dz-chat flex h-full flex-col bg-white">
      <Cabecera nombre={sale ? TIENDA_DEMO.nombre : COMPRADORA_DEMO.nombre} inicial={sale ? TIENDA_DEMO.inicial : COMPRADORA_DEMO.inicial} color={sale ? "#ff834f" : "#f5c9d6"} />
      <div className="relative flex flex-1 flex-col justify-end gap-2 overflow-hidden px-3 py-3" style={{ backgroundColor: "#efe5d3", backgroundImage: "url(/chat/patron-whatsapp.svg)", backgroundSize: "180px" }}>
        <span className="self-center rounded-full bg-white/85 px-3 py-0.5 text-[12px] font-bold text-black/55">Hoy</span>
        <Globo sale={sale} visible={enviado} />
      </div>
      <div className="flex items-end gap-2 bg-[#f6f5f3] px-3 pt-2 pb-8">
        <div className="relative min-h-[40px] flex-1 overflow-hidden rounded-[20px] bg-white px-3.5 py-2 text-[14px] leading-snug">
          {/* Antes de enviar, el mensaje ya viene escrito (así abre WhatsApp desde el catálogo) */}
          <p className={`dz-borrador line-clamp-2 ${sale && !enviado ? "" : "dz-borrador-vacio"}`}>{sale && !enviado ? MENSAJE_DEMO : "Mensaje"}</p>
        </div>
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#1daa61] text-white" data-enviar-wa>
          <span className="inline-grid size-5">
            <Icono nombre="send" />
          </span>
        </span>
      </div>
    </div>
  );
}

/** La pantalla bloqueada de la tienda, con el aviso de WhatsApp (Deslizapp no manda notificaciones). */
export function Bloqueo({ aviso, children }: { aviso: boolean; children?: ReactNode }) {
  return (
    <div className="dz-bloqueo relative h-full text-white">
      <div className="flex flex-col items-center pt-[92px]">
        <p className="text-[17px] font-semibold opacity-90">martes, 14 de octubre</p>
        <p className="font-display text-[86px] leading-none">3:43</p>
      </div>
      <span data-ancla="bloqueo" className="absolute top-[300px] left-1/2 -ml-[30px] size-[60px]" />
      <div className="dz-aviso mx-3 mt-8 rounded-[22px] bg-white/85 p-3.5 text-[#111b21] shadow-lg" data-visible={aviso ? "" : undefined} data-aviso>
        <div className="flex gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-[11px] bg-[#25d366] text-white">
            <span className="inline-grid size-6">
              <Icono nombre="wa" />
            </span>
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex items-center justify-between text-[14.5px]">
              <b className="flex items-center gap-1.5">
                {COMPRADORA_DEMO.nombre}
                <span data-ancla="aviso" className="inline-block size-[24px]" />
              </b>
              <span className="text-[13px] text-black/50">ahora</span>
            </p>
            <p className="line-clamp-3 text-[14px] leading-snug">{MENSAJE_DEMO.split("\n").slice(0, 3).join(" ")}</p>
          </div>
        </div>
      </div>
      <p className="absolute inset-x-0 bottom-9 text-center text-[13px] opacity-75">Desliza hacia arriba para abrir</p>
      {children}
    </div>
  );
}
