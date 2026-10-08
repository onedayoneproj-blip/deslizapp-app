import { portada } from "@/lib/tienda/catalogo";
import type { ProductoPublico } from "@/lib/types";

/** Colección como paquete de cartas abiertas en abanico: hasta 3 fotos de sus productos (cuadrados redondeados, giradas −8°, 0°, +8°).
 *  Con menos fotos, las cartas que faltan van «vacías» del color del tema. Decorativo: el nombre va aparte. */
export function AbanicoColeccion({ productos }: { productos: ProductoPublico[] }) {
  const fotos = productos.map(portada).filter(Boolean).slice(0, 3);
  // Atrás-izquierda, atrás-derecha, frente. Con 1 foto: solo el frente lleva foto; con 2: el frente y la de atrás a la izquierda.
  const cartas = [fotos[1] ?? null, fotos[2] ?? null, fotos[0] ?? null];
  const clases = ["abz-i", "abz-d", "abz-f"];
  return (
    <span className="abz" aria-hidden="true">
      {cartas.map((src, i) => (
        <span key={clases[i]} className={"abz-c " + clases[i] + (src ? "" : " vacia")}>
          {src ? <img loading="lazy" src={src} alt="" /> : null}
        </span>
      ))}
    </span>
  );
}
