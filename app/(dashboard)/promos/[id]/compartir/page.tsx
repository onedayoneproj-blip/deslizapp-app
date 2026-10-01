"use client";

import { use } from "react";
import { HojaCompartir } from "@/components/promos/hoja-compartir";

export default function CompartirPromoPage({ params, searchParams }: PageProps<"/promos/[id]/compartir">) {
  const { id } = use(params);
  const { desde } = use(searchParams);
  return <HojaCompartir promoId={id} desde={desde === "detalle" ? "detalle" : desde === "lista" ? "lista" : undefined} />;
}
