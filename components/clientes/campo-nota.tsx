import type { Ref } from "react";
import { MAX_NOTA } from "@/lib/data/clientes";
import { Campo } from "../ui";

/**
 * Nota del cliente (talla, gustos…): una línea, máx. MAX_NOTA (60) caracteres, con contador a la derecha de la ayuda. Solo la ve el
 * dueño (como burbuja en el detalle del cliente) y sirve para encontrarlo en el buscador.
 */
export function CampoNota({ valor, alCambiar, error, id, entrada }: { valor: string; alCambiar: (v: string) => void; error?: string; id?: string; entrada?: Ref<HTMLInputElement> }) {
  return (
    <Campo
      ref={entrada}
      id={id}
      etiqueta="Nota"
      type="text"
      value={valor}
      onChange={(e) => alCambiar(e.target.value.slice(0, MAX_NOTA))}
      maxLength={MAX_NOTA}
      placeholder="Talla, gustos, cuándo entregarle…"
      autoComplete="off"
      enterKeyHint="done"
      error={error}
      ayuda={
        <span className="flex items-start justify-between gap-3">
          <span>Solo tú la ves. Te ayuda a encontrarla en el buscador.</span>
          <span className="shrink-0 tabular-nums">
            {valor.length}/{MAX_NOTA}
          </span>
        </span>
      }
    />
  );
}
