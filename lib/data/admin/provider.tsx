"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { FuenteAdmin } from "./fuente-admin";
import { crearFuenteAdminDemoCompartida } from "./demo-compartida";
import { escribirDemoDesdeAdmin, leerDemoGuardada } from "../demo";
import { crearFuenteAdminSupabase } from "./supabase";
import { createClient } from "@/lib/supabase/client";

const ContextoAdmin = createContext<{ fuente: FuenteAdmin; demo: boolean } | null>(null);

/**
 * La demo crea exclusivamente su almacén local y comparte con la demo del panel de este navegador las tiendas, el taller
 * y la personalización; nunca instancia el cliente de Supabase.
 */
export function ProveedorAdmin({ children, demo = false }: { children: ReactNode; demo?: boolean }) {
  const [fuente] = useState<FuenteAdmin>(() =>
    demo ? crearFuenteAdminDemoCompartida(leerDemoGuardada, escribirDemoDesdeAdmin) : crearFuenteAdminSupabase(createClient()),
  );
  const valor = useMemo(() => ({ fuente, demo }), [fuente, demo]);
  return <ContextoAdmin.Provider value={valor}>{children}</ContextoAdmin.Provider>;
}

export function useAdmin(): FuenteAdmin {
  const valor = useContext(ContextoAdmin);
  if (!valor) throw new Error("useAdmin() debe usarse dentro de <ProveedorAdmin>.");
  return valor.fuente;
}

export function useAdminDemo() {
  const valor = useContext(ContextoAdmin);
  if (!valor) throw new Error("useAdminDemo() debe usarse dentro de <ProveedorAdmin>.");
  return valor.demo;
}
