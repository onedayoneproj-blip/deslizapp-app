"use client";

import { EstadoVacio } from "@/components/estado-vacio";
import { TituloPantalla } from "@/components/panel/titulo-pantalla";
import { useConsulta, useTiendaActiva } from "@/lib/data/consulta";
import { useData } from "@/lib/data/provider";
import { saludo } from "@/lib/formato";

// Resumen (pantalla de inicio). Se construye en el paso 9; por ahora, un estado de espera.
export default function InicioPage() {
  const { getEventosAaah, getDueno } = useData();
  const { tiendaId, tienda } = useTiendaActiva();
  const { data: eventos } = useConsulta(`eventos:${tiendaId}`, () => getEventosAaah(tiendaId));
  const { data: dueno } = useConsulta(`dueno:${tiendaId}`, () => getDueno(tiendaId));
  const nombre = dueno?.nombre ?? tienda?.nombre;

  return (
    <>
      <TituloPantalla
        titulo={
          <>
            {saludo()}
            {nombre ? `, ${nombre}` : ""}
            <span className="text-mandarina">.</span>
          </>
        }
        subtitulo="Así va tu tienda estos 7 días."
      />
      <EstadoVacio
        ilustracion="inicio"
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
