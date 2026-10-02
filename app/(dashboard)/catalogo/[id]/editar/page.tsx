"use client";

import { use } from "react";
import { HojaProducto } from "@/components/catalogo/hoja-producto";

export default function EditarProductoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <HojaProducto productoId={id} desdeVistaPrevia />;
}
