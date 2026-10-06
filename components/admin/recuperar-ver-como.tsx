"use client";

import { useState } from "react";
import { Boton } from "@/components/ui";
import { HAY_SUPABASE } from "@/lib/supabase/config";
import { entrarConGoogle } from "@/lib/data/sesion";

export function RecuperarVerComo({ sesionId, tiendaId }: { sesionId?: string; tiendaId?: string }) {
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [entrando, setEntrando] = useState(false);
  const recuperar = async () => {
    setOcupado(true); setError("");
    try {
      const r = await fetch("/api/admin/ver-como", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ accion: "recuperar", sesionId }) });
      if (!r.ok) throw new Error("No pudimos cerrar la sesión. El panel sigue bloqueado; inténtalo otra vez cuando vuelva la conexión.");
      window.location.assign(tiendaId ? `/admin/tiendas/${encodeURIComponent(tiendaId)}` : "/admin/tiendas");
    } catch (e) { setError(e instanceof Error ? e.message : "No pudimos cerrar la sesión."); }
    finally { setOcupado(false); }
  };
  const volverAEntrar = async () => {
    setEntrando(true); setError("");
    const problema = await entrarConGoogle();
    if (problema) { setError(problema); setEntrando(false); }
  };
  return <main className="mx-auto grid min-h-dvh max-w-[480px] content-center gap-4 bg-fondo p-6 text-texto">
    <p className="font-display text-titulo-pantalla font-bold text-bosque">Tu vista está bloqueada</p>
    <p className="text-texto-secundario">No podemos confirmar el cierre de Ver como. Por seguridad, no se muestran datos de la tienda hasta cerrar la sesión.</p>
    {error && <p role="alert" className="rounded-radio-m bg-atencion-suave p-3 text-atencion-texto">{error}</p>}
    <Boton anchoCompleto cargando={ocupado} onClick={recuperar}>Reintentar cierre</Boton>
    {HAY_SUPABASE && <Boton anchoCompleto jerarquia="secundario" deshabilitado={entrando} onClick={() => void volverAEntrar()}>{entrando ? "Abriendo Google…" : "Volver a entrar con Google"}</Boton>}
  </main>;
}
