import { portada } from "@/lib/tienda/catalogo";
import type { ProductoPublico } from "@/lib/types";

/** Carátula de una colección: la foto del primer producto como carta de frente, con 1 o 2 cartas sólidas detrás que asoman
 *  a la derecha (mazo cerrado). Las de atrás llevan un recorte transparente con la forma de la de adelante (docs/09, «Superposición»). */
export function MazoColeccion({ productos }: { productos: ProductoPublico[] }) {
  const detras = productos.length >= 3 ? 2 : 1;
  return (
    <span className="mazo" aria-hidden="true">
      {detras === 2 && <i className="mz mz2" />}
      <i className="mz mz1" />
      <img loading="lazy" src={portada(productos[0])} alt="" />
    </span>
  );
}
