import { ETIQUETA_RETOQUE_BETA } from "@/lib/config";
import { Etiqueta } from "../ui";

/** «Beta» junto a todo lo que habla de retocar: el retoque no es automático, y por eso tarda. Tono `atencion` (5:1, AA). */
export function EtiquetaBeta() {
  return <Etiqueta tono="atencion">{ETIQUETA_RETOQUE_BETA}</Etiqueta>;
}
