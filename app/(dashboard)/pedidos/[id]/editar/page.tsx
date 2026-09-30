"use client";

import { use } from "react";
import { HojaPedidoNuevo } from "@/components/pedidos/hoja-pedido-nuevo";

export default function EditarPedidoPage({ params }: PageProps<"/pedidos/[id]/editar">) {
  const { id } = use(params);
  return <HojaPedidoNuevo pedidoId={id} />;
}
