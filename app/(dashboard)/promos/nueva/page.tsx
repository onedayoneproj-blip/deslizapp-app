"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { HojaPromo } from "@/components/promos/hoja-promo";

// /promos/nueva            → promo nueva
// /promos/nueva?copiar=ID  → duplica una promo (típicamente una terminada) como nueva
function Nueva() {
  const params = useSearchParams();
  const copiar = params.get("copiar");
  const tipo = params.get("tipo");
  const otroTipo = tipo === "codigo" || tipo === "producto" || tipo === "coleccion" ? tipo : undefined;
  return <HojaPromo copiarDe={copiar ?? undefined} otroTipo={otroTipo} />;
}

export default function NuevaPromoPage() {
  return (
    <Suspense>
      <Nueva />
    </Suspense>
  );
}
