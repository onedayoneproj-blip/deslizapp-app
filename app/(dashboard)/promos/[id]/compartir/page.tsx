"use client";

import { use } from "react";
import { HojaCompartir } from "@/components/promos/hoja-compartir";

export default function CompartirPromoPage({ params }: PageProps<"/promos/[id]/compartir">) {
  const { id } = use(params);
  return <HojaCompartir promoId={id} />;
}
