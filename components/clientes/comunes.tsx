import { iniciales } from "@/lib/formato";

const COLORES = ["bg-rosa", "bg-menta", "bg-arena"];

/** Círculo con las iniciales; el color depende del nombre (siempre el mismo para la misma persona). */
export function Avatar({ nombre, tamano = 46 }: { nombre: string; tamano?: number }) {
  const color = COLORES[[...nombre].reduce((suma, c) => suma + c.charCodeAt(0), 0) % COLORES.length];
  return (
    <span
      style={{ width: tamano, height: tamano, fontSize: tamano * 0.37 }}
      className={`grid shrink-0 place-items-center rounded-full font-display text-bosque ${color}`}
    >
      {iniciales(nombre)}
    </span>
  );
}

export const EtiquetaRepite = () => (
  <span className="shrink-0 rounded-full bg-mandarina px-2 py-px text-[11px] font-extrabold text-bosque-oscuro">Repite</span>
);
