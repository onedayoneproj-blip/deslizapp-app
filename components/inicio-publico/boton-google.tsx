"use client";

import { useState } from "react";
import { entrarConGoogle } from "@/lib/data/sesion";
import { LogoGoogle } from "../panel/pantalla-entrada";

/** «Iniciar sesión»: el mismo flujo de Google que «Entrar con Google» de /entrar (lib/data/sesion.ts, con `dz_volver`). */
export function BotonGoogle() {
  const [entrando, setEntrando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const entrar = async () => {
    setEntrando(true);
    setAviso(null);
    const problema = await entrarConGoogle();
    // Si todo va bien, el navegador ya se está yendo a Google: el botón se queda «Abriendo Google…».
    if (problema) {
      setAviso(problema);
      setEntrando(false);
    }
  };
  return (
    <>
      <button type="button" className="ini-google tocable" onClick={() => void entrar()} disabled={entrando} data-cta="iniciar-sesion">
        <LogoGoogle tamano={22} />
        {entrando ? "Abriendo Google…" : "Iniciar sesión"}
      </button>
      {aviso && (
        <p role="alert" className="ini-aviso">
          {aviso}
        </p>
      )}
    </>
  );
}
