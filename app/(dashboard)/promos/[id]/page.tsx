"use client";

import { use } from "react";
import { HojaDetallePromo } from "@/components/promos/hoja-detalle-promo";

export default function PromoPage({ params, searchParams }: PageProps<"/promos/[id]">) {
  const { id } = use(params);
  const { desde } = use(searchParams);
  return <HojaDetallePromo promoId={id} desdeLista={desde === "lista"} />;
}
