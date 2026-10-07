"use client";
import { useEffect, useRef, useState } from "react";
import { NOMBRE_TIPO, type Rubro } from "@/lib/rubros";

/** Menú flotante «Catálogo» de la hoja Colecciones: superficie del comprador, con los colores y la fuente de la tienda. */
export function MenuCatalogo({
  catalogos,
  activo,
  alElegir,
}: {
  catalogos: readonly Rubro[];
  activo: Rubro | null;
  alElegir: (r: Rubro | null) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const boton = useRef<HTMLButtonElement>(null);
  const tarjeta = useRef<HTMLDivElement>(null);
  // Escape cierra primero el menú: va en captura para llegar antes que el de la hoja.
  useEffect(() => {
    if (!abierto) return;
    const tecla = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      setAbierto(false);
      boton.current?.focus();
    };
    window.addEventListener("keydown", tecla, true);
    tarjeta.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus();
    return () => window.removeEventListener("keydown", tecla, true);
  }, [abierto]);
  const opciones: { rubro: Rubro | null; nombre: string }[] = [
    { rubro: null, nombre: "Todo" },
    ...catalogos.map((r) => ({ rubro: r, nombre: NOMBRE_TIPO[r] })),
  ];
  return (
    <div className="mc">
      <button
        ref={boton}
        type="button"
        className="mc-fila"
        aria-haspopup="menu"
        aria-expanded={abierto}
        onClick={() => setAbierto((a) => !a)}
      >
        <span>Catálogo</span>
        <span className="mc-val">
          {activo ? NOMBRE_TIPO[activo] : "Todo"}
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
        </span>
      </button>
      {abierto && (
        <>
          <button type="button" className="mc-fondo" aria-label="Cerrar el menú" tabIndex={-1} onClick={() => setAbierto(false)} />
          <div
            ref={tarjeta}
            className="mc-tarjeta"
            role="menu"
            aria-label="Ver por catálogo"
            onKeyDown={(e) => {
              const items = [...e.currentTarget.querySelectorAll<HTMLElement>('[role="menuitemradio"]')];
              const i = items.indexOf(document.activeElement as HTMLElement);
              if (e.key === "ArrowDown") items[(i + 1) % items.length]?.focus();
              else if (e.key === "ArrowUp") items[(i - 1 + items.length) % items.length]?.focus();
              else return;
              e.preventDefault();
            }}
          >
            {opciones.map((o) => (
              <button
                key={o.rubro ?? "todo"}
                type="button"
                role="menuitemradio"
                aria-checked={activo === o.rubro}
                className="mc-op"
                onClick={() => {
                  setAbierto(false);
                  alElegir(o.rubro);
                }}
              >
                <span>{o.nombre}</span>
                {activo === o.rubro && (
                  <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="m5 12 5 5 9-10" /></svg>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
