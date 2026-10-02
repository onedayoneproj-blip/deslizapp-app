"use client";

import { use } from "react";
import { HojaPedidoNuevo } from "@/components/pedidos/hoja-pedido-nuevo";

export default function NuevoPedidoPage({ searchParams }: PageProps<"/pedidos/nuevo">) {
  const { producto } = use(searchParams);
  return <HojaPedidoNuevo productoInicialId={typeof producto === "string" ? producto : undefined} />;
}
