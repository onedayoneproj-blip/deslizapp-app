"use client";

import { use } from "react";
import { HojaPromo } from "@/components/promos/hoja-promo";

export default function PromoPage({ params }: PageProps<"/promos/[id]">) {
  const { id } = use(params);
  return <HojaPromo promoId={id} />;
}
