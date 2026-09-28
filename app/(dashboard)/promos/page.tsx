"use client";

import { EstadoVacio } from "@/components/estado-vacio";
import { IconoPromos } from "@/components/iconos";
import { TituloPantalla } from "@/components/panel/titulo-pantalla";
import { useConsulta } from "@/lib/data/consulta";
import { useData } from "@/lib/data/provider";

// Promos. Se construye en el paso 8.
export default function PromosPage() {
  const { tiendaActivaId, getPromos } = useData();
  const { data: promos } = useConsulta(`promos:${tiendaActivaId}`, () => getPromos(tiendaActivaId));
  const activas = promos?.filter((p) => p.estado === "activa").length ?? 0;

  return (
    <>
      <TituloPantalla titulo="Promos" subtitulo="Ponle un descuento y mira cómo se deslizan." />
      <EstadoVacio
        icono={<IconoPromos tamano={28} />}
        titulo="Las promos se están poniendo guapas."
        remate={
          promos
            ? `${activas} ${activas === 1 ? "activa" : "activas"} ahora mismo. Muy pronto las armas desde aquí, en dos toques.`
            : "Muy pronto las armas desde aquí, en dos toques."
        }
        nota="ya casi"
      />
    </>
  );
}
