import { iniciales } from "@/lib/formato";
import { Foto } from "../foto";
import { IconoCorazon } from "../iconos";
import { clases } from "./comunes";

const TAMANO = { normal: "size-(--alto-avatar) text-cuerpo", grande: "size-16 text-titulo-hoja", nota: "size-22 text-titulo-pantalla" } as const;
const FOTO = { normal: "44px", grande: "64px", nota: "88px" } as const;

/**
 * Avatar (docs/09 §11): persona = redondo `marca-rosa` con iniciales en Fredoka; tienda = cuadrado `radio-m` `accion` con
 * iniciales o su logo. 44 px en filas, 64 en la cabecera de un detalle (88 cuando lleva la nota encima). Junto al nombre es
 * decorativo (aria-hidden); con `solo`, lleva el nombre como etiqueta accesible.
 * `repite`: la señal de cliente que repite (en vez de la etiqueta "Repite"): círculo `accion` de 20 px con un corazón relleno
 * `sobre-accion` y borde `superficie` de 2 px en la esquina inferior derecha. La palabra va en el aria-label de quien lo usa.
 */
export function Avatar({
  nombre,
  tipo = "persona",
  tamano = "normal",
  foto,
  solo = false,
  repite = false,
  vacio = false,
}: {
  nombre: string;
  tipo?: "persona" | "tienda";
  tamano?: "normal" | "grande" | "nota";
  foto?: string | null;
  /** Va sin el nombre al lado: se anuncia con el nombre. */
  solo?: boolean;
  repite?: boolean;
  /** Sin persona (un pedido sin cliente): `superficie-hundida` con "?". */
  vacio?: boolean;
}) {
  const accesible = solo ? { role: "img", "aria-label": repite ? `${nombre}, repite` : nombre } : { "aria-hidden": true };
  return (
    <span {...accesible} className="relative inline-grid shrink-0">
      <span
        className={clases(
          "relative grid place-items-center overflow-hidden font-display",
          TAMANO[tamano],
          vacio ? "rounded-full bg-superficie-hundida text-texto-secundario" : tipo === "persona" ? "rounded-full bg-marca-rosa text-texto" : "rounded-radio-m bg-accion text-sobre-accion",
        )}
      >
        {vacio ? "?" : foto ? <Foto src={foto} alt="" className="absolute inset-0" sizes={FOTO[tamano]} /> : iniciales(nombre)}
      </span>
      {repite && (
        <span className="absolute -right-0.5 -bottom-0.5 grid size-5 place-items-center rounded-full border-2 border-superficie bg-accion text-sobre-accion">
          <IconoCorazon tamano={11} fill="currentColor" strokeWidth={0} />
        </span>
      )}
    </span>
  );
}
