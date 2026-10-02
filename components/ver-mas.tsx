"use client";

import { useState } from "react";

/** Cuántos elementos se muestran de una vez en las listas largas (y cuántos más trae cada "Ver más"). */
export const PASO_LISTA = 30;

/**
 * Listas largas por tramos: muestra los primeros `paso` y, con "Ver más", `paso` más cada vez. Vuelve a empezar
 * cuando cambia `clave` (pestaña, búsqueda, tienda…). Solo recorta lo que se pinta: los contadores y totales
 * siguen saliendo de la lista completa.
 */
export function useVerMas<T>(lista: T[], clave: string, paso = PASO_LISTA) {
  const [estado, setEstado] = useState({ clave, cuantos: paso });
  // Al cambiar de pestaña, búsqueda o tienda, vuelve a empezar (ajuste de estado durante el render, sin efecto)
  if (estado.clave !== clave) setEstado({ clave, cuantos: paso });
  const cuantos = estado.clave === clave ? estado.cuantos : paso;
  return {
    visibles: lista.length > cuantos ? lista.slice(0, cuantos) : lista,
    quedan: Math.max(0, lista.length - cuantos),
    mostrados: Math.min(lista.length, cuantos),
    verMas: () => setEstado({ clave, cuantos: cuantos + paso }),
  };
}

/** Botón al final de la lista: "Ver más antiguos". Desaparece cuando no queda nada por mostrar. Sin animación por elemento. */
export function BotonVerMas({ quedan, mostrados, total, alTocar, texto = "Ver más antiguos", disabled = false }: { quedan?: number; mostrados?: number; total?: number; alTocar: (boton: HTMLButtonElement) => void; texto?: string; disabled?: boolean }) {
  if (quedan !== undefined && quedan <= 0) return null;
  return (
    <div className="flex flex-col items-center gap-1.5 pt-1 pb-2">
      <button
        type="button"
        data-ver-mas
        onClick={e => alTocar(e.currentTarget)}
        disabled={disabled}
        className="tocable flex h-12 items-center justify-center rounded-full border-[1.5px] border-bosque bg-white px-6 text-[15px] font-extrabold text-bosque disabled:opacity-55"
      >
        {texto}
      </button>
      {mostrados !== undefined && total !== undefined && <p className="text-[12.5px] font-semibold text-suave">
        Mostrando {mostrados} de {total}
      </p>}
    </div>
  );
}
