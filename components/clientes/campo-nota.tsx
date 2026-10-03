import { MAX_NOTA } from "@/lib/data/clientes";
import { CampoMultilinea } from "../ui";

/** Nota del cliente (talla, gustos, cómo entregarle…), con contador. Máx. MAX_NOTA caracteres. */
export function CampoNota({ valor, alCambiar, etiqueta = "Nota" }: { valor: string; alCambiar: (v: string) => void; etiqueta?: string }) {
  return (
    <CampoMultilinea
      etiqueta={`${etiqueta} (opcional)`}
      value={valor}
      onChange={(e) => alCambiar(e.target.value.slice(0, MAX_NOTA))}
      maxLength={MAX_NOTA}
      placeholder="Talla, gustos, cuándo entregarle…"
      ayuda={`${valor.length}/${MAX_NOTA}`}
    />
  );
}
