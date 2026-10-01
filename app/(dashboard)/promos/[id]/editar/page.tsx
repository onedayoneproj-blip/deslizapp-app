"use client";

import { use } from "react";
import { HojaPromo } from "@/components/promos/hoja-promo";

export default function EditarPromoPage({ params, searchParams }: PageProps<"/promos/[id]/editar">) {
  const { id } = use(params);
  const { desde } = use(searchParams);
  return <HojaPromo promoId={id} desdeDetalle={desde === "detalle"} />;
}
