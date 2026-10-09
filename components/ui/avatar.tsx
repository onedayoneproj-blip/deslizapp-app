import { hexDeColor, type ColorAvatar } from "@/lib/avatar-cliente";
import { iniciales } from "@/lib/formato";
import { Foto } from "../foto";
import { IconoCorazon } from "../iconos";
import { clases } from "./comunes";

const TAMANO = { chat: "size-8.5 text-secundario", normal: "size-(--alto-avatar) text-cuerpo", grande: "size-16 text-titulo-hoja", nota: "size-22 text-titulo-pantalla", perfil: "size-28 text-cifra" } as const;
/** Tamaño del emoji (la mitad del círculo, como la referencia de Cliente nuevo). */
const EMOJI = { chat: 17, normal: 22, grande: 32, nota: 44, perfil: 56 } as const;
const FOTO = { chat: "34px", normal: "44px", grande: "64px", nota: "88px", perfil: "112px" } as const;

/**
 * Avatar (docs/09 §11): persona = redondo `marca-rosa` con iniciales en Fredoka; tienda = redondo `accion` con
 * iniciales o su logo (el círculo es solo de personas y tiendas; la foto de un producto es siempre cuadrada, ver MiniaturaProducto). 34 en la cabecera de la vista previa de WhatsApp, 44 px en filas, 64 en la cabecera de un detalle (88 cuando lleva la nota encima). Junto al nombre es
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
  emoji,
  color,
}: {
  nombre: string;
  tipo?: "persona" | "tienda";
  tamano?: "chat" | "normal" | "grande" | "nota" | "perfil";
  foto?: string | null;
  /** Va sin el nombre al lado: se anuncia con el nombre. */
  solo?: boolean;
  repite?: boolean;
  /** Sin persona (un pedido sin cliente): `superficie-hundida` con "?". */
  vacio?: boolean;
  /** Avatar de un cliente: un emoji en vez de las iniciales y/o un color de fondo (lib/avatar-cliente.ts). */
  emoji?: string | null;
  color?: ColorAvatar | null;
}) {
  const accesible = solo ? { role: "img", "aria-label": repite ? `${nombre}, repite` : nombre } : { "aria-hidden": true };
  return (
    <span {...accesible} className="relative inline-grid shrink-0">
      <span
        className={clases(
          "relative grid place-items-center overflow-hidden font-display",
          TAMANO[tamano],
          "rounded-full",
          repite && "corte [--corte-r:12px] [--corte-x:calc(100%_-_8px)] [--corte-y:calc(100%_-_8px)]",
          vacio ? "bg-superficie-hundida text-texto-secundario" : tipo === "persona" ? (color ? "text-texto" : "bg-marca-rosa text-texto") : "bg-accion text-sobre-accion",
          emoji && "font-normal",
        )}
        style={color && !vacio && tipo === "persona" ? { backgroundColor: hexDeColor(color) ?? undefined, ...(emoji ? { fontSize: EMOJI[tamano] } : null) } : emoji && !vacio ? { fontSize: EMOJI[tamano] } : undefined}
      >
        {vacio ? "?" : emoji ? <span aria-hidden="true" className="leading-none">{emoji}</span> : foto ? <Foto src={foto} alt="" className="absolute inset-0" sizes={FOTO[tamano]} /> : iniciales(nombre)}
      </span>
      {repite && (
        <span className="absolute -right-0.5 -bottom-0.5 grid size-5 place-items-center rounded-full bg-accion text-sobre-accion">
          <IconoCorazon tamano={11} fill="currentColor" strokeWidth={0} />
        </span>
      )}
    </span>
  );
}
