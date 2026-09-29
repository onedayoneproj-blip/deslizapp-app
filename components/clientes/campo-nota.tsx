import { MAX_NOTA } from "@/lib/data/clientes";

/** Nota del cliente (talla, gustos, cómo entregarle…), con contador. Máx. MAX_NOTA caracteres. */
export function CampoNota({ valor, alCambiar, etiqueta = "Nota" }: { valor: string; alCambiar: (v: string) => void; etiqueta?: string }) {
  return (
    <label className="flex flex-col gap-1.5 text-[13.5px] font-bold">
      <span>
        {etiqueta} <span className="font-semibold text-suave">(opcional)</span>
      </span>
      <textarea
        value={valor}
        onChange={(e) => alCambiar(e.target.value.slice(0, MAX_NOTA))}
        maxLength={MAX_NOTA}
        rows={2}
        placeholder="Talla, gustos, cuándo entregarle…"
        className="w-full min-w-0 resize-none rounded-2xl border-[1.5px] border-borde bg-white px-3.5 py-3 text-base font-normal text-bosque outline-none placeholder:text-suave/70 focus:border-bosque"
      />
      <span className="self-end text-[12px] font-semibold text-suave">
        {valor.length}/{MAX_NOTA}
      </span>
    </label>
  );
}
