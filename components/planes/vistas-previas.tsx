import { MENSAJE_DEMO, HORA_DEMO } from "@/lib/landing/pedido-demo";
import { ejemploClientes, ejemploPedido, EJEMPLO_EXISTENCIAS } from "@/lib/planes/ejemplos-incluye";
import type { IdIncluye } from "@/lib/planes/incluye";
import { BurbujaChat } from "../chat/burbuja-chat";
import { DetalleStock } from "../catalogo/detalle-stock";
import { MiniaturaProducto } from "../catalogo/miniatura-producto";
import { FilaCliente } from "../clientes/fila-cliente";
import { PerfilACatalogo } from "../landing/perfil-a-catalogo";
import { TarjetaPedido } from "../pedidos/tarjeta-pedido";
import { FilaLista, ListaAgrupada } from "../ui";

/**
 * La vista previa de cada tarjeta de «Todos los planes traen» (docs/prompts/planes-incluye-y-preguntas.md §1): las piezas reales de
 * la app (el perfil y el navegador de «Cómo funciona» en una animación, las burbujas y el mensaje del catálogo, la tarjeta de pedido, la fila de existencias y la de
 * cliente) con datos de ejemplo y sin acciones. Es decoración: el texto de abajo de cada tarjeta dice lo mismo, así que quien la monta
 * la esconde a los lectores de pantalla. Va en el servidor: lo único que se manda al navegador es el HTML.
 */
export function VistaPrevia({ id, ahora }: { id: IdIncluye; ahora: number }) {
  switch (id) {
    case "bio":
      return (
        <div className="pl-vp-bio">
          <PerfilACatalogo />
        </div>
      );
    case "whatsapp":
      return (
        <div className="pl-vp-chat">
          <BurbujaChat lado="enviado" hora={HORA_DEMO}>
            <span className="pl-vp-mensaje">{MENSAJE_DEMO}</span>
          </BurbujaChat>
          <BurbujaChat lado="recibido" hora={HORA_DEMO}>
            ¡Listo! Te lo mando hoy 💚
          </BurbujaChat>
        </div>
      );
    case "panel": {
      const { pedido, cliente, fotos } = ejemploPedido(ahora);
      return (
        <div className="pl-vp-panel">
          <TarjetaPedido ahora={ahora} pedido={pedido} cliente={cliente} productos={fotos} sinEnlace />
          <ListaAgrupada>
            {EJEMPLO_EXISTENCIAS.map((p) => (
              <FilaLista key={p.id} inicio={<MiniaturaProducto producto={p} />} titulo={p.nombre} detalle={<DetalleStock producto={p} />} />
            ))}
          </ListaAgrupada>
        </div>
      );
    }
    case "clientes":
      return (
        <div className="pl-vp-panel">
          <ListaAgrupada>
            {ejemploClientes(ahora).map(({ cliente, cuenta }) => (
              <FilaCliente key={cliente.id} cliente={cliente} cuenta={cuenta} ahora={ahora} senalRepite soloVista />
            ))}
          </ListaAgrupada>
        </div>
      );
  }
}
