"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Hoja } from "../hoja";
import { IconoChevronAbajo, IconoChevronDerecha } from "../iconos";
import { MENSAJE_VISTA_PREVIA, type DatosVistaPrevia } from "../tienda/vista-previa-reel";

/**
 * Una fila de «Más opciones» que se pliega: muestra su valor cerrada y, al tocarla, se abre en el mismo lugar. Abrir y cerrar es
 * instantáneo (nada de animar la altura) y no toca el foco de ningún campo.
 */
export function FilaPlegable({ id, titulo, detalle, abierta, alAlternar, children }: { id: string; titulo: string; detalle?: ReactNode; abierta: boolean; alAlternar: () => void; children: ReactNode }) {
  return (
    <li className="border-t border-linea first:border-t-0" data-fila-plegable={id}>
      <button
        type="button"
        aria-expanded={abierta}
        aria-controls={`fila-${id}`}
        onClick={alAlternar}
        className="tocable flex min-h-15 w-full items-center gap-3 px-4 text-left outline-none focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-foco"
      >
        <span className="flex min-w-0 flex-1 flex-col py-2">
          <span className="truncate text-destacado text-texto">{titulo}</span>
          {detalle && <span className="truncate text-secundario text-texto-secundario">{detalle}</span>}
        </span>
        {abierta ? <IconoChevronAbajo tamano={20} strokeWidth={2.2} className="shrink-0 text-texto-secundario" /> : <IconoChevronDerecha tamano={20} strokeWidth={2.2} className="shrink-0 text-texto-secundario" />}
      </button>
      {abierta && (
        <div id={`fila-${id}`} className="px-4 pb-4">
          {children}
        </div>
      )}
    </li>
  );
}

/**
 * «Cómo se ve»: el reel real del catálogo del comprador (`components/tienda/reel.tsx`, con su CSS, el tema de la tienda y su
 * cabecera) montado a pantalla completa con el borrador. Va en un iframe del mismo sitio (`/vista-previa-catalogo`): el catálogo se
 * desplaza como una página entera y así no se pisa con los estilos ni el scroll del panel. Sin pedir ni escribir nada.
 */
export function HojaComoSeVe({ abierta, alCerrar, datos, visible }: { abierta: boolean; alCerrar: () => void; datos: () => DatosVistaPrevia | null; visible: boolean }) {
  const marco = useRef<HTMLIFrameElement>(null);
  const ultimos = useRef(datos);
  useEffect(() => {
    ultimos.current = datos;
  });
  useEffect(() => {
    if (!abierta) return;
    const alMensaje = (e: MessageEvent) => {
      if (e.origin !== location.origin || e.source !== marco.current?.contentWindow || e.data?.tipo !== `${MENSAJE_VISTA_PREVIA}-listo`) return;
      const d = ultimos.current();
      if (d) marco.current?.contentWindow?.postMessage({ tipo: MENSAJE_VISTA_PREVIA, datos: d }, location.origin);
    };
    window.addEventListener("message", alMensaje);
    return () => window.removeEventListener("message", alMensaje);
  }, [abierta]);
  return (
    <Hoja abierta={abierta} alCerrar={alCerrar} titulo="Cómo se ve" tituloOculto altura="grande">
      <div className="absolute inset-0 overflow-hidden rounded-t-[30px] bg-black" data-como-se-ve="">
        <iframe ref={marco} src="/vista-previa-catalogo" title="Así lo verá tu cliente" className="size-full border-0" />
        {!visible && (
          <p className="absolute inset-x-4 bottom-[max(1rem,var(--safe-abajo))] rounded-radio-m bg-atencion-suave p-3 text-center text-secundario font-bold text-atencion-texto">
            Está oculto: nadie lo ve en el catálogo.
          </p>
        )}
      </div>
    </Hoja>
  );
}
