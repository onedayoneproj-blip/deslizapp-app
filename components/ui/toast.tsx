"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { clases, FOCO } from "./comunes";

// Toast del sistema de diseño (docs/09 §8, Toast.md). Todavía NO reemplaza a components/toast.tsx: queda listo para la migración.

const VISIBLE = 3000;
const SALIDA = 150; // --mov-rapida

export type OpcionesToast = {
  /** "Deshacer" u otra acción breve. */
  accion?: { texto: string; alTocar: () => void };
  /** Se queda hasta que se oculte (sin conexión, versión nueva). */
  persistente?: boolean;
};

type Estado = { id: number; texto: string; opciones: OpcionesToast; saliendo: boolean };
type Contexto = { mostrarToast: (texto: string, opciones?: OpcionesToast) => number; ocultarToast: (id?: number) => void };

const ContextoToast = createContext<Contexto | null>(null);

/** La tarjeta del toast, sin lógica (la usa el proveedor y la guía /diseno). */
export function VistaToast({ texto, accion, saliendo = false, className }: { texto: ReactNode; accion?: OpcionesToast["accion"]; saliendo?: boolean; className?: string }) {
  return (
    <div
      className={clases(
        saliendo ? "mov-desvanece" : "mov-sube-entra",
        "pointer-events-auto flex w-full items-center gap-3 rounded-radio-l bg-accion py-3 pr-3 pl-4.5 text-cuerpo font-bold text-sobre-accion shadow-flotante",
        className,
      )}
    >
      <span className="min-w-0 flex-1">{texto}</span>
      {accion && (
        <button
          type="button"
          onClick={accion.alTocar}
          className={clases(
            "tocable relative h-(--alto-compacto) shrink-0 rounded-full px-3 text-secundario font-extrabold text-sobre-accion after:absolute after:inset-x-0 after:-inset-y-1 after:content-['']",
            FOCO,
          )}
        >
          {accion.texto}
        </button>
      )}
    </div>
  );
}

/**
 * Proveedor único de toasts: uno a la vez (el nuevo reemplaza al anterior), abajo sobre la barra inferior, `role="status"`.
 * Se va solo a los 3 s salvo que sea persistente.
 */
export function ProveedorToast({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Estado | null>(null);
  const tiempo = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const contador = useRef(0);

  const ocultarToast = useCallback((id?: number) => {
    clearTimeout(tiempo.current);
    setToast((t) => (t && (id === undefined || t.id === id) ? { ...t, saliendo: true } : t));
    tiempo.current = setTimeout(() => setToast((t) => (t && (id === undefined || t.id === id) ? null : t)), SALIDA);
  }, []);

  const mostrarToast = useCallback(
    (texto: string, opciones: OpcionesToast = {}) => {
      clearTimeout(tiempo.current);
      const id = ++contador.current;
      setToast({ id, texto, opciones, saliendo: false });
      if (!opciones.persistente) tiempo.current = setTimeout(() => ocultarToast(id), VISIBLE);
      return id;
    },
    [ocultarToast],
  );

  useEffect(() => () => clearTimeout(tiempo.current), []);

  return (
    <ContextoToast.Provider value={{ mostrarToast, ocultarToast }}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--nav-abajo)+12px)] z-[60] mx-auto flex max-w-[480px] justify-center px-4"
      >
        {toast && (
          <VistaToast
            key={toast.id}
            texto={toast.texto}
            saliendo={toast.saliendo}
            accion={
              toast.opciones.accion && {
                texto: toast.opciones.accion.texto,
                alTocar: () => {
                  toast.opciones.accion?.alTocar();
                  ocultarToast(toast.id);
                },
              }
            }
          />
        )}
      </div>
    </ContextoToast.Provider>
  );
}

export function useToastUI() {
  const c = useContext(ContextoToast);
  if (!c) throw new Error("useToastUI() debe usarse dentro de <ProveedorToast>.");
  return c;
}
