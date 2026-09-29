"use client";

import { EstadoVacio } from "@/components/estado-vacio";
import { IconoPedidos } from "@/components/iconos";
import { Pantalla } from "@/components/pantalla";
import { TituloPantalla } from "@/components/panel/titulo-pantalla";
import { useConsulta } from "@/lib/data/consulta";
import { useData } from "@/lib/data/provider";

// Pedidos. Se construye en el paso 6.
export default function PedidosPage() {
  const { tiendaActivaId, getPedidos } = useData();
  const { data: pedidos } = useConsulta(`pedidos:${tiendaActivaId}`, () => getPedidos(tiendaActivaId));
  const nuevos = pedidos?.filter((p) => p.estado === "nuevo").length ?? 0;
  const porDespachar = pedidos?.filter((p) => p.estado === "por_despachar").length ?? 0;

  return (
    <Pantalla>
      <TituloPantalla titulo="Pedidos" subtitulo="Del suspiro al chat. Y del chat, aquí." />
      {pedidos && nuevos + porDespachar === 0 ? (
        <EstadoVacio icono={<IconoPedidos tamano={28} />} titulo="Todo al día." remate="Disfruta el silencio. Dura poco." />
      ) : (
        <EstadoVacio
          icono={<IconoPedidos tamano={28} />}
          titulo="Tus pedidos, en fila y sin drama."
          remate={
            pedidos
              ? `${nuevos} ${nuevos === 1 ? "nuevo" : "nuevos"} y ${porDespachar} por despachar. La pantalla para despacharlos llega en un momento.`
              : "La pantalla para despacharlos llega en un momento."
          }
          nota="ya casi"
        />
      )}
    </Pantalla>
  );
}
