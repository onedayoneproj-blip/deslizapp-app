"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

type Toast = { id: number; texto: string };

const Contexto = createContext<((texto: string) => void) | null>(null);

/** Confirmaciones breves ("Despachado.", "Llegó un pedido…") encima de la navegación inferior. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const temporizador = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const mostrar = useCallback((texto: string) => {
    clearTimeout(temporizador.current);
    setToast({ id: Date.now(), texto });
    temporizador.current = setTimeout(() => setToast(null), 3200);
  }, []);

  useEffect(() => () => clearTimeout(temporizador.current), []);

  return (
    <Contexto.Provider value={mostrar}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-40 flex justify-center px-4"
      >
        {toast && (
          <div
            key={toast.id}
            className="pointer-events-auto max-w-[440px] rounded-2xl bg-bosque px-4 py-3 text-sm font-medium text-papel shadow-lg"
          >
            {toast.texto}
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
