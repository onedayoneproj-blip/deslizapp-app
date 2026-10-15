"use client";

import { useState } from "react";
import { useSesion } from "@/lib/data/provider";
import { entrarConGoogle, verDemo } from "@/lib/data/sesion";
import { LogoGoogle } from "../panel/pantalla-entrada";

/**
 * «Iniciar sesión»: el mismo flujo de Google que tenía /entrar (lib/data/sesion.ts, con `dz_volver`). Encima, en una tarjeta crema,
 * el aviso de la entrada si lo hay (`?error_login=1`, «Tu sesión se cerró…») o el del propio botón si no se pudo salir a Google.
 */
export function BotonGoogle() {
  const sesion = useSesion();
  const [entrando, setEntrando] = useState(false);
  const [problema, setAviso] = useState<string | null>(null);
  const aviso = problema ?? (sesion?.tipo === "entrada" ? sesion.aviso : null);
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
      {aviso && (
        <p role="alert" className="ini-aviso" data-aviso-entrada>
          {aviso}
        </p>
      )}
      <button type="button" className="ini-google tocable" onClick={() => void entrar()} disabled={entrando} data-cta="iniciar-sesion">
        <LogoGoogle tamano={22} />
        {entrando ? "Abriendo Google…" : "Iniciar sesión"}
      </button>
    </>
  );
}

/** «Ver demo» de siempre, ahora como enlace pequeño: la app con datos de prueba (lib/data/sesion.ts). */
export function EnlaceDemo() {
  return (
    <button type="button" className="ini-demo tocable" onClick={verDemo} data-cta="demo">
      Probar la app con datos de prueba
    </button>
  );
}
