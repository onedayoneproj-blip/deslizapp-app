"use client";

import { use } from "react";
import { HojaPedido } from "@/components/pedidos/hoja-pedido";

export default function PedidoPage({ params }: PageProps<"/pedidos/[id]">) {
  const { id } = use(params);
  return <HojaPedido pedidoId={id} />;
}
