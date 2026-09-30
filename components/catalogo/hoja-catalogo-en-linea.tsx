"use client";

import { useRef } from "react";
import { copiarTexto } from "@/lib/portapapeles";
import { enlaceCatalogo, urlWhatsAppCatalogo } from "@/lib/enlace-catalogo";
import type { Tienda } from "@/lib/types";
import { Hoja } from "../hoja";
import { IconoCopiar, IconoEnlaceExterno, IconoWhatsApp } from "../iconos";
import { useToast } from "../toast";

/**
 * "Tu catálogo en línea": el enlace público de la tienda (tiendas.url_catalogo) con tres acciones — abrir, copiar y compartir por
 * WhatsApp — y un atajo para cambiarlo (abre Mi marca). El enlace se valida (https) antes de llegar aquí y solo se usa como
 * `href` o texto, nunca como HTML.
 */
export function HojaCatalogoEnLinea({
  abierta,
  alCerrar,
  tienda,
  alCambiarEnlace,
}: {
  abierta: boolean;
  alCerrar: () => void;
  tienda: Pick<Tienda, "nombre" | "urlCatalogo">;
  alCambiarEnlace: () => void;
}) {
  const toast = useToast();
  const respaldo = useRef<HTMLTextAreaElement>(null);
  const enlace = enlaceCatalogo(tienda.urlCatalogo);

  // Se llama dentro del toque, sin `await` antes: en iPhone el portapapeles lo exige.
  const copiar = () => {
    if (!enlace) return;
    void copiarTexto(enlace.href, respaldo.current).then((ok) =>
      toast(ok ? "Enlace copiado" : "No se pudo copiar. Mantén presionado el enlace para copiarlo."),
    );
  };

  const accion = "tocable flex h-[52px] w-full items-center justify-center gap-2.5 rounded-full text-[15.5px] font-extrabold";

  return (
    <Hoja abierta={abierta} alCerrar={alCerrar} titulo="Tu catálogo en línea">
      {enlace && (
        <div className="flex flex-col gap-3">
          <div className="rounded-[20px] border border-linea bg-white px-4 py-3">
            <p className="text-[12px] font-bold tracking-wider text-suave uppercase">Tu enlace</p>
            <p className="mt-0.5 flex min-w-0 text-[15px]">
              <span className="min-w-0 truncate">
                <span className="font-extrabold">{enlace.dominio}</span>
                <span className="text-suave">{enlace.resto}</span>
              </span>
            </p>
          </div>
          {/* Respaldo para copiar en navegadores que no dejan usar el portapapeles */}
          <textarea
            ref={respaldo}
            readOnly
            value={enlace.href}
            tabIndex={-1}
            aria-hidden="true"
            className="pointer-events-none absolute h-px w-px opacity-0"
          />

          <a href={enlace.href} target="_blank" rel="noopener noreferrer" className={`${accion} bg-bosque text-papel`}>
            <IconoEnlaceExterno tamano={20} />
            Abrir catálogo
          </a>
          <button type="button" onClick={copiar} className={`${accion} border-[1.5px] border-bosque bg-white text-bosque`}>
            <IconoCopiar tamano={20} />
            Copiar enlace
          </button>
          <a
            href={urlWhatsAppCatalogo(tienda.nombre, enlace.href)}
            target="_blank"
            rel="noopener noreferrer"
            className={`${accion} border-[1.5px] border-bosque bg-white text-bosque`}
          >
            <IconoWhatsApp tamano={20} />
            Compartir por WhatsApp
          </a>

          <button
            type="button"
            onClick={alCambiarEnlace}
            className="tocable mx-auto flex h-11 items-center px-3 text-[14px] font-extrabold text-bosque"
          >
            Cambiar enlace
          </button>
          <p className="text-center text-[12.5px] leading-snug text-suave">
            Por ahora tu catálogo se conecta por enlace. Pronto se actualizará solo con lo que cargues aquí.
          </p>
        </div>
      )}
    </Hoja>
  );
}
