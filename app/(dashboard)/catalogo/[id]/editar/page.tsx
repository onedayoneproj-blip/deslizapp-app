"use client";

import { use } from "react";
import { HojaProducto } from "@/components/catalogo/hoja-producto";

export default function EditarProductoPage({ params, searchParams }: PageProps<"/catalogo/[id]/editar">) {
  const { id } = use(params);
  // «Ver producto» con más de 3 presentaciones lleva al Inventario: ?abrir=stock.
  const { abrir } = use(searchParams);
  return <HojaProducto productoId={id} desdeVistaPrevia abrirStock={abrir === "stock"} />;
}
