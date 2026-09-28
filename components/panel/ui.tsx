"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { HojaPlan } from "./hoja-plan";

type PanelUI = { abrirPlan: () => void };

const Contexto = createContext<PanelUI | null>(null);

/** Estado de interfaz compartido por todo el panel (hoy: la hoja de Plan y créditos). */
export function PanelUIProvider({ children }: { children: ReactNode }) {
  const [planAbierto, setPlanAbierto] = useState(false);
  const abrirPlan = useCallback(() => setPlanAbierto(true), []);
  const cerrarPlan = useCallback(() => setPlanAbierto(false), []);
  const valor = useMemo(() => ({ abrirPlan }), [abrirPlan]);

  return (
    <Contexto.Provider value={valor}>
      {children}
      <HojaPlan abierta={planAbierto} alCerrar={cerrarPlan} />
    </Contexto.Provider>
  );
}

export function usePanelUI(): PanelUI {
  const valor = useContext(Contexto);
  if (!valor) throw new Error("usePanelUI() debe usarse dentro de <PanelUIProvider>.");
  return valor;
}
