"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { IconoCheck } from "./iconos";

type Toast = { id: number; texto: string };

const Contexto = createContext<((texto: string) => void) | null>(null);

/** Avisos breves ("Despachado.", "Publicado.") que bajan desde arriba, como en el prototipo. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const temporizador = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const mostrar = useCallback((texto: string) => {
    clearTimeout(temporizador.current);
    setToast({ id: Date.now(), texto });
    temporizador.current = setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => () => clearTimeout(temporizador.current), []);

  return (
    <Contexto.Provider value={mostrar}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-[calc(14px+env(safe-area-inset-top))] z-[60] mx-auto flex max-w-[480px] justify-center px-4"
      >
        {toast && (
          <div
            key={toast.id}
            className="flex max-w-full animate-[bajar-aviso_.3s_cubic-bezier(.2,.8,.3,1)] items-center gap-2.5 rounded-[20px] bg-bosque px-4 py-3 text-[14.5px] font-bold text-papel shadow-[0_14px_30px_-12px_rgba(23,75,58,0.6)]"
          >
            <span className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full bg-mandarina text-bosque-oscuro">
              <IconoCheck tamano={16} strokeWidth={3} />
            </span>
            <span>{toast.texto}</span>
          </div>
        )}
      </div>
    </Contexto.Provider>
  );
}

export function useToast() {
  const mostrar = useContext(Contexto);
  if (!mostrar) throw new Error("useToast() debe usarse dentro de <ToastProvider>.");
  return mostrar;
}
