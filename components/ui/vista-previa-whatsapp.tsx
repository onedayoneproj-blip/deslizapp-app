"use client";

import { useState } from "react";
import { horaCorta } from "@/lib/formato";
import { IconoWhatsApp } from "../iconos";
import { Avatar } from "./avatar";
import { clases } from "./comunes";

/**
 * Vista previa de un mensaje de WhatsApp (docs/09 §10): una ventanita de chat que nunca se confunde con la app. Recuadro
 * `superficie` con borde `borde-pastilla`, `radio-m` y sombra suave; arriba, la cabecera con el avatar (34 px) y el nombre de quien
 * lo recibe, con "WhatsApp" debajo. `sinDestinatario` (aún no se sabe a quién): el ícono de WhatsApp en un círculo
 * `superficie-hundida`, "Tu proveedor" y "Eliges a quién al enviar". Debajo, el fondo de chat (`chat-fondo` con el patrón de
 * corazones, public/chat/patron-whatsapp.svg) y la burbuja enviada (`chat-burbuja`) con su piquito, la hora y ✓✓.
 * Es solo para mirar: no se toca.
 */
export function VistaPreviaWhatsApp({
  texto,
  nombre,
  sinDestinatario = false,
  hora,
  className,
}: {
  texto: string;
  /** A quién le llega (el cliente). */
  nombre?: string;
  /** Todavía no se sabe a quién (se elige al enviar, como la lista de Por reponer). */
  sinDestinatario?: boolean;
  hora?: string;
  className?: string;
}) {
  const [ahora] = useState(() => horaCorta(new Date()));
  const titulo = sinDestinatario ? "Tu proveedor" : nombre;
  return (
    <figure
      aria-label={titulo ? `Vista previa del mensaje para ${titulo}` : "Vista previa del mensaje"}
      className={clases("vista-whatsapp overflow-hidden rounded-radio-m border border-borde-pastilla bg-superficie", className)}
    >
      {titulo && (
        <div className="flex items-center gap-2.5 border-b border-linea px-3 py-2">
          {sinDestinatario ? (
            <span aria-hidden="true" className="grid size-8.5 shrink-0 place-items-center rounded-full bg-superficie-hundida text-texto">
              <IconoWhatsApp tamano={18} />
            </span>
          ) : (
            <Avatar nombre={titulo} tamano="chat" />
          )}
          <span className="flex min-w-0 flex-col leading-tight">
            <b className="truncate text-secundario font-extrabold text-texto">{titulo}</b>
            <span className="truncate text-etiqueta font-normal text-texto-secundario">{sinDestinatario ? "Eliges a quién al enviar" : "WhatsApp"}</span>
          </span>
        </div>
      )}
      <div className="vista-whatsapp-chat bg-chat-fondo p-3">
        <div className="vista-whatsapp-burbuja relative ml-auto w-fit max-w-[86%] rounded-radio-s rounded-tr-none bg-chat-burbuja px-2.5 pt-1.5 pb-5 text-texto">
          <p className="text-cuerpo-chat whitespace-pre-line wrap-anywhere">{texto}</p>
          <span className="absolute right-2 bottom-1 flex items-center gap-1 text-contador font-normal text-texto-secundario">
            {hora ?? ahora}
            <span aria-hidden="true">✓✓</span>
          </span>
        </div>
      </div>
    </figure>
  );
}
