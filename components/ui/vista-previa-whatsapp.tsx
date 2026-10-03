"use client";

import { useState } from "react";
import { horaCorta } from "@/lib/formato";
import { clases } from "./comunes";

/**
 * Vista previa de un mensaje de WhatsApp enviado (la del catálogo de clientes, vestida de Deslizapp): fondo `fondo` con el patrón
 * suave (public/chat/patron-whatsapp.svg), `radio-l` y borde `linea`; una burbuja a la derecha en `accion-suave` con el piquito, el
 * texto con sus saltos de línea y la hora con ✓✓ abajo a la derecha. Es solo para mirar: no se toca.
 */
export function VistaPreviaWhatsApp({ texto, hora, className }: { texto: string; hora?: string; className?: string }) {
  const [ahora] = useState(() => horaCorta(new Date()));
  return (
    <figure aria-label="Vista previa del mensaje" className={clases("vista-whatsapp rounded-radio-l border border-linea bg-fondo p-3", className)}>
      <div className="vista-whatsapp-burbuja relative ml-auto w-fit max-w-[86%] rounded-radio-s rounded-tr-none bg-accion-suave px-2.5 pt-1.5 pb-5 text-texto">
        <p className="text-cuerpo-chat whitespace-pre-line">{texto}</p>
        <span className="absolute right-2 bottom-1 flex items-center gap-1 text-contador font-normal text-texto-secundario">
          {hora ?? ahora}
          <span aria-hidden="true">✓✓</span>
        </span>
      </div>
    </figure>
  );
}
