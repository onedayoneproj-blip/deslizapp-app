"use client";

import { EstadoVacio } from "@/components/estado-vacio";
import { IconoCorazon } from "@/components/iconos";
import { TituloPantalla } from "@/components/panel/titulo-pantalla";
import { useConsulta, useTiendaActiva } from "@/lib/data/consulta";
import { useData } from "@/lib/data/provider";

// Resumen (pantalla de inicio). Se construye en el paso 9; por ahora, un estado de espera.
export default function InicioPage() {
  const { getEventosAaah } = useData();
  const { tiendaId, tienda } = useTiendaActiva();
  const { data: eventos } = useConsulta(`eventos:${tiendaId}`, () => getEventosAaah(tiendaId));

  return (
    <>
      <TituloPantalla titulo="Inicio" subtitulo={tienda ? `Así va ${tienda.nombre}` : undefined} />
      <EstadoVacio
        icono={<IconoCorazon tamano={28} />}
        titulo="Tu resumen viene en camino."
        remate={
          eventos
            ? `${eventos.length} aaahs en las últimas dos semanas. Pronto, con gráfico y todo.`
            : "Pronto vas a saber qué suspira tu gente, sin hacer cuentas."
        }
        nota="ya casi"
      />
    </>
  );
}
