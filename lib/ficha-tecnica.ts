// Ficha técnica y descripción (docs/prompts/ficha-tecnica.md): las reglas puras, para el panel y para el catálogo.
import { LARGO_DESCRIPCION } from "./rubros";

/** Lo que se hará con la ficha al guardar el producto: nada, subir esta foto (data URL) o quitarla. */
export type BorradorFicha = { tipo: "igual" } | { tipo: "nueva"; foto: string } | { tipo: "quitada" };

/** Hay algo que guardar en la ficha. */
export const fichaCambiada = (b: BorradorFicha) => b.tipo !== "igual";

/** La foto de la ficha que se ve en la tarjeta: la nueva, o la guardada si no se la quitó. */
export function fichaVisible(actual: string | null | undefined, b: BorradorFicha): string | null {
  if (b.tipo === "nueva") return b.foto;
  if (b.tipo === "quitada") return null;
  return actual ?? null;
}

/** «43 / 600». */
export const contadorDescripcion = (texto: string) => `${texto.length} / ${LARGO_DESCRIPCION}`;

/** El borrador tras tocar «Quitar»: una ficha guardada se quita al guardar; una que aún no se subió solo se descarta. */
export const borradorAlQuitar = (actual: string | null | undefined): BorradorFicha => (actual ? { tipo: "quitada" } : { tipo: "igual" });

/** Los Detalles por rubro solo se piden en un producto que ya los tiene (cualquier llave distinta de `descripcion`). */
export const tieneDetallesPorRubro = (detalles: Record<string, unknown> | null | undefined) =>
  Object.keys(detalles ?? {}).some((k) => k !== "descripcion");

const LARGO_CORTO = 78;

/**
 * El texto del reel (sin el «…», que es el botón que abre el detalle). Con descripción: se corta en una palabra completa. Sin
 * descripción pero con Detalles de siempre (Esencias Michel) conserva el texto de siempre; sin ninguno de los dos, null: ni texto ni «…».
 */
export function textoCortoDelReel(detalles: Record<string, unknown> | null | undefined, textoPorDefecto: string): string | null {
  const d = detalles ?? {};
  const descripcion = typeof d.descripcion === "string" ? d.descripcion.trim() : "";
  if (!descripcion && !tieneDetallesPorRubro(d)) return null;
  const txt = descripcion || textoPorDefecto;
  return txt.length > LARGO_CORTO
    ? txt
        .slice(0, LARGO_CORTO)
        .replace(/\s+\S*$/, "")
        .replace(/[,.:;]$/, "")
    : txt;
}

/** La forma del botón de la ficha en el reel: círculo (con presentaciones), píldora (sin ellas) o ninguno (sin ficha). */
export function formaBotonFicha(p: { fichaUrl?: string | null }, conPresentaciones: boolean): "circulo" | "pildora" | null {
  if (!p.fichaUrl) return null;
  return conPresentaciones ? "circulo" : "pildora";
}
