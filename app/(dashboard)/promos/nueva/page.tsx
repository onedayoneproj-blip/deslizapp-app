"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { HojaPromo } from "@/components/promos/hoja-promo";

// /promos/nueva            → promo nueva
// /promos/nueva?copiar=ID  → duplica una promo (típicamente una terminada) como nueva
function Nueva() {
  const copiar = useSearchParams().get("copiar");
  return <HojaPromo copiarDe={copiar ?? undefined} />;
}

export default function NuevaPromoPage() {
  return (
    <Suspense>
      <Nueva />
    </Suspense>
  );
}
