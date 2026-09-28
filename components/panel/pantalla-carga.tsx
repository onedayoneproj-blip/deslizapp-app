import { Isotipo } from "../marca";

/** Lo que se ve el instante en que el navegador lee los datos de la demo. */
export function PantallaCarga() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-[480px] flex-col items-center justify-center gap-3 bg-papel text-bosque">
      <Isotipo tamano={48} className="animate-bounce" />
      <p className="font-display text-2xl">Deslizaaah…</p>
    </div>
  );
}
