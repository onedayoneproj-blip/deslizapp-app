"use client";

import { Boton } from "@/components/ui";

export function EstadoAdmin({ cargando, error, reintentar }: { cargando: boolean; error: string | null; reintentar: () => void }) {
  if (cargando) return <div aria-label="Cargando" className="space-y-3" role="status"><div className="h-28 animate-pulse rounded-radio-l bg-superficie-hundida" /><div className="h-24 animate-pulse rounded-radio-l bg-superficie-hundida" /></div>;
  if (error) return <div role="alert" className="rounded-radio-l border border-linea bg-superficie p-5"><p className="mb-3">No pudimos cargar esta información.</p><Boton onClick={reintentar}>Reintentar</Boton></div>;
  return null;
}
