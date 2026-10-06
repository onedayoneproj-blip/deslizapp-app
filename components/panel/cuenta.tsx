"use client";

import { useState } from "react";
import { inicialesDeCuenta, type CuentaVista } from "@/lib/cuenta";
import { Boton } from "../ui";

/**
 * La cuenta en un círculo: la foto de Google (sin enviar el Referer; si falla o no hay, las iniciales en `marca-rosa`, como
 * `LogoTienda`). Se usa en el menú de la tienda y en el encabezado del admin.
 */
export function FotoCuenta({ cuenta, tamano = 44 }: { cuenta: CuentaVista; tamano?: number }) {
  const [fallo, setFallo] = useState<string | null>(null);
  const estilo = { width: tamano, height: tamano };
  if (cuenta.fotoUrl && fallo !== cuenta.fotoUrl) {
    return (
      <span style={estilo} className="block shrink-0 overflow-hidden rounded-full bg-marca-rosa">
        {/* eslint-disable-next-line @next/next/no-img-element -- foto remota de Google: <img> con referrerPolicy, sin pasar por el optimizador */}
        <img src={cuenta.fotoUrl} alt="" referrerPolicy="no-referrer" onError={() => setFallo(cuenta.fotoUrl)} className="size-full object-cover" />
      </span>
    );
  }
  return (
    <span style={estilo} aria-hidden="true" className="grid shrink-0 place-items-center rounded-full bg-marca-rosa text-secundario font-extrabold text-texto">
      {inicialesDeCuenta(cuenta)}
    </span>
  );
}

/** Foto, nombre y correo de la cuenta, y «Cerrar sesión» compacto a la derecha. */
export function FilaCuenta({ cuenta, etiquetaSalir, alSalir }: { cuenta: CuentaVista; etiquetaSalir: string; alSalir: () => void }) {
  return (
    <div className="flex items-center gap-3" data-cuenta="">
      <FotoCuenta cuenta={cuenta} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-extrabold text-texto">{cuenta.nombre}</span>
        {cuenta.email && <span className="block truncate text-secundario text-texto-secundario">{cuenta.email}</span>}
      </span>
      <Boton tamano="compacto" jerarquia="secundario" onClick={alSalir}>
        {etiquetaSalir}
      </Boton>
    </div>
  );
}
