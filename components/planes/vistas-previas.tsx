import { HORA_DEMO } from "@/lib/landing/pedido-demo";
import { ejemploClientes, ejemploPedido, ejemploPedidoAnterior, EJEMPLO_EXISTENCIAS } from "@/lib/planes/ejemplos-incluye";
import type { IdIncluye } from "@/lib/planes/incluye";
import { DetalleStock } from "../catalogo/detalle-stock";
import { MiniaturaProducto } from "../catalogo/miniatura-producto";
import { BurbujaChat } from "../chat/burbuja-chat";
import { PerfilACatalogo } from "../landing/perfil-a-catalogo";
import { TextoMensaje, VistaPreviaEnlace } from "../landing/whatsapp";
import { ChipEstado } from "../pedidos/comunes";
import { TarjetaPedido } from "../pedidos/tarjeta-pedido";
import { FilaLista, ListaAgrupada } from "../ui";
import { AbonoAnimado } from "./abono-animado";
import { Animada } from "./animada";
import "./vistas-animadas.css";

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
        <Animada className="pl-wa">
          {/* La tienda ve cómo llega el pedido: «escribiendo…», el mensaje con la vista previa del enlace (el de «Cómo funciona») y su respuesta. */}
          <BurbujaChat lado="recibido" hora="" className="pl-escribe pl-wa-escribe">
            <i />
            <i />
            <i />
          </BurbujaChat>
          <BurbujaChat lado="recibido" bloque hora={HORA_DEMO} className="pl-wa-pedido">
            <VistaPreviaEnlace diferida compacta />
            <TextoMensaje className="pt-1.5" />
          </BurbujaChat>
          <BurbujaChat lado="enviado" checks="grises-a-azules" hora={HORA_DEMO} className="pl-wa-respuesta">
            ¡Listo! Te lo mando hoy 💚
          </BurbujaChat>
        </Animada>
      );
    case "panel": {
      const { pedido, cliente, fotos } = ejemploPedido(ahora);
      const anterior = ejemploPedidoAnterior(ahora);
      return (
        <Animada className="pl-pn">
          {/* Entra un pedido nuevo, se despacha y bajan las existencias. */}
          <div className="pl-pn-nuevo">
            <TarjetaPedido
              ahora={ahora}
              pedido={pedido}
              cliente={cliente}
              productos={fotos}
              sinEnlace
              etiqueta={
                <span className="pl-pn-estados">
                  <span className="pl-pn-nuevo-estado">
                    <ChipEstado estado="nuevo" />
                  </span>
                  <span className="pl-pn-despachado">
                    <ChipEstado estado="despachado" />
                  </span>
                </span>
              }
            />
            <span className="pl-toque" />
          </div>
          <div className="pl-pn-resto">
            <TarjetaPedido ahora={ahora} pedido={anterior.pedido} cliente={anterior.cliente} productos={fotos} sinEnlace etiqueta={<ChipEstado estado="despachado" />} />
            <ListaAgrupada>
              <FilaLista
                inicio={<MiniaturaProducto producto={EJEMPLO_EXISTENCIAS[0]} />}
                titulo={EJEMPLO_EXISTENCIAS[0].nombre}
                detalle={
                  <span className="pl-pn-stock">
                    <span className="pl-pn-antes">
                      <DetalleStock producto={{ activo: true, stock: 3 }} />
                    </span>
                    <span className="pl-pn-despues">
                      <DetalleStock producto={{ activo: true, stock: 2 }} />
                    </span>
                  </span>
                }
              />
            </ListaAgrupada>
          </div>
        </Animada>
      );
    }
    case "clientes":
      return <AbonoAnimado ahora={ahora} fecha={ejemploClientes(ahora)[0].cuenta.fechaAcordada} />;
  }
}
