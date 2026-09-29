import { VistaPedidos } from "@/components/pedidos/vista-pedidos";

// Pedidos vive en el layout para que la pestaña elegida siga ahí al abrir y cerrar un pedido:
// /pedidos/nuevo y /pedidos/[id] solo agregan la hoja encima.
export default function PedidosLayout({ children }: LayoutProps<"/pedidos">) {
  return <VistaPedidos>{children}</VistaPedidos>;
}
