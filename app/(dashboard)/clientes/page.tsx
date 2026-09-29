"use client";

import { EstadoVacio } from "@/components/estado-vacio";
import { TituloPantalla } from "@/components/panel/titulo-pantalla";
import { useConsulta } from "@/lib/data/consulta";
import { useData } from "@/lib/data/provider";

// Clientes. Se construye en el paso 7.
export default function ClientesPage() {
  const { tiendaActivaId, getClientes } = useData();
  const { data: clientes } = useConsulta(`clientes:${tiendaActivaId}`, () => getClientes(tiendaActivaId));

  return (
    <>
      <TituloPantalla titulo="Clientes" subtitulo="Los que ya dijeron aaah. Y los que están por decirlo." />
      <EstadoVacio
        ilustracion="clientes"
        titulo="Tu gente, toda en un lugar."
        remate={
          clientes
            ? `${clientes.length} personas ya te conocen. Pronto sabrás quién repite (spoiler: alguien repite).`
            : "Pronto sabrás quién repite (spoiler: alguien repite)."
        }
        nota="ya casi"
      />
    </>
  );
}
