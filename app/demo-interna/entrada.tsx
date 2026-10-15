"use client";
import { useState } from "react";
import { Boton } from "@/components/ui";
export function EntrarDemoInterna() {
  const [error, setError] = useState(false);
  return <main className="mx-auto max-w-md p-6"><h1 className="font-display text-2xl">Pruebas internas</h1><p className="my-4">Tiendas y herramientas con datos ficticios separados de la demo pública.</p><Boton onClick={async () => {
    const r = await fetch("/api/demo-interna", { method: "POST" });
    if (!r.ok) { setError(true); return; }
    window.location.assign("/catalogo");
  }}>Abrir el sandbox interno</Boton>{error && <p role="alert">No se pudo comprobar el acceso.</p>}</main>;
}
