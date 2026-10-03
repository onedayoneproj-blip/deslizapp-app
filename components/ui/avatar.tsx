import { iniciales } from "@/lib/formato";
import { Foto } from "../foto";
import { clases } from "./comunes";

/**
 * Avatar (docs/09 §11): persona = redondo `marca-rosa` con iniciales en Fredoka; tienda = cuadrado `radio-m` `accion` con
 * iniciales o su logo. 44 px en filas, 64 en la cabecera de un detalle. Junto al nombre es decorativo (aria-hidden); con
 * `solo`, lleva el nombre como etiqueta accesible.
 */
export function Avatar({
  nombre,
  tipo = "persona",
  tamano = "normal",
  foto,
  solo = false,
}: {
  nombre: string;
  tipo?: "persona" | "tienda";
  tamano?: "normal" | "grande";
  foto?: string | null;
  /** Va sin el nombre al lado: se anuncia con el nombre. */
  solo?: boolean;
}) {
  const accesible = solo ? { role: "img", "aria-label": nombre } : { "aria-hidden": true };
  return (
    <span
      {...accesible}
      className={clases(
        "relative grid shrink-0 place-items-center overflow-hidden font-display",
        tamano === "grande" ? "size-16 text-titulo-hoja" : "size-(--alto-avatar) text-cuerpo",
        tipo === "persona" ? "rounded-full bg-marca-rosa text-texto" : "rounded-radio-m bg-accion text-sobre-accion",
      )}
    >
      {foto ? <Foto src={foto} alt="" className="absolute inset-0" sizes={tamano === "grande" ? "64px" : "44px"} /> : iniciales(nombre)}
    </span>
  );
}
