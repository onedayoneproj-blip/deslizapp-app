import { Suspense } from "react";
import { PantallaTrabajo } from "@/components/admin/pantalla-trabajo";

// Suspense: la pantalla lee ?ver= y ?tienda= (useSearchParams).
export default function TrabajoPage() {
  return <Suspense><PantallaTrabajo /></Suspense>;
}
