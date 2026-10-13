"use client";

import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { IconoReloj } from "../iconos";
import { Alerta } from "../ui/alerta";
import { clases, FOCO } from "../ui/comunes";

/**
 * «Publicar │ 🕒» de «Así se ve» (historia de crear producto): botón dividido. «Publicar» publica; el reloj («Publicar más
 * tarde») no guarda directo: abre la Alerta «¿Publicar más tarde?» y, al confirmar, guarda el producto oculto.
 * `cierreRef` es para el «atrás» del teléfono: si la alerta está abierta la cierra y devuelve true.
 */
export function BotonPublicar({
  alPublicar,
  alGuardar,
  cargando,
  deshabilitado,
  cierreRef,
}: {
  alPublicar: () => void;
  alGuardar: () => void | Promise<void>;
  cargando: boolean;
  deshabilitado: boolean;
  cierreRef: MutableRefObject<(() => boolean) | null>;
}) {
  const [confirmando, setConfirmando] = useState(false);
  const reloj = useRef<HTMLButtonElement>(null);
  const apagado = deshabilitado || cargando;

  useEffect(() => {
    cierreRef.current = () => {
      if (!confirmando) return false;
      setConfirmando(false);
      return true;
    };
  });
  useEffect(() => () => { cierreRef.current = null; }, [cierreRef]);

  return (
    <div className={clases("flex h-(--alto-boton-grande) min-w-0 flex-1 items-stretch overflow-hidden rounded-full border", apagado ? "border-linea bg-superficie-hundida text-texto-secundario" : "border-resalte bg-resalte text-sobre-resalte")} data-boton-publicar="">
      <button
        type="button" disabled={apagado} onClick={alPublicar} data-publicar=""
        className={clases("tocable min-w-0 flex-1 rounded-l-full px-4 text-destacado font-extrabold", FOCO)}
      >
        {cargando ? "…" : "Publicar"}
      </button>
      <span aria-hidden="true" className="my-3 w-px bg-current opacity-30" />
      <button
        ref={reloj} type="button" disabled={apagado} aria-label="Publicar más tarde" data-publicar-despues=""
        onClick={() => setConfirmando(true)}
        className={clases("tocable grid min-w-12 shrink-0 place-items-center rounded-r-full", FOCO)}
      >
        <IconoReloj tamano={22} strokeWidth={2.2} />
      </button>
      <Alerta
        abierta={confirmando}
        titulo="¿Publicar más tarde?"
        descripcion="Se guarda oculto. Lo encuentras en Catálogo > Ocultos para publicarlo cuando quieras."
        accion={{ texto: "Guardar para después", tono: "accion", alConfirmar: () => { setConfirmando(false); return alGuardar(); } }}
        alCancelar={() => setConfirmando(false)}
      />
    </div>
  );
}
