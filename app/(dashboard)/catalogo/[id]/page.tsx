"use client";

import { use } from "react";
import { HojaVistaProducto } from "@/components/catalogo/hoja-producto";

export default function ProductoPage({ params }: PageProps<"/catalogo/[id]">) {
  const { id } = use(params);
  return <HojaVistaProducto productoId={id} />;
}
