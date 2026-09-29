"use client";

import { use } from "react";
import { HojaCliente } from "@/components/clientes/hoja-cliente";

export default function ClientePage({ params }: PageProps<"/clientes/[id]">) {
  const { id } = use(params);
  return <HojaCliente clienteId={id} />;
}
