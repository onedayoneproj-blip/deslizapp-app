"use client";

import { EstadoVacio } from "@/components/estado-vacio";
import { IconoCatalogo } from "@/components/iconos";
import { TituloPantalla } from "@/components/panel/titulo-pantalla";
import { useConsulta } from "@/lib/data/consulta";
import { useData } from "@/lib/data/provider";

// Catálogo. Se construye en el paso 4.
export default function CatalogoPage() {
  const { tiendaActivaId, getProductos } = useData();
  const { data: productos } = useConsulta(`productos:${tiendaActivaId}`, () => getProductos(tiendaActivaId));

  return (
    <>
      <TituloPantalla titulo="Catálogo" />
      <EstadoVacio
        icono={<IconoCatalogo tamano={28} />}
        titulo="Tu vitrina se está arreglando."
        remate={
          productos
            ? `Tus ${productos.length} productos ya están aquí. Solo falta la vitrina para lucirlos.`
            : "Tus productos ya están aquí. Solo falta la vitrina para lucirlos."
        }
        nota="ya casi"
      />
    </>
  );
}
