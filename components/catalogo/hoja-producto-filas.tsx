"use client";

import { useEffect, useRef } from "react";
import { Hoja } from "../hoja";
import { MENSAJE_VISTA_PREVIA, type DatosVistaPrevia } from "../tienda/vista-previa-reel";

/**
 * «Vista previa»: el reel real del catálogo del comprador (`components/tienda/reel.tsx`, con su CSS, el tema de la tienda y su
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
    <Hoja abierta={abierta} alCerrar={alCerrar} titulo="Vista previa" tituloOculto altura="grande">
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
