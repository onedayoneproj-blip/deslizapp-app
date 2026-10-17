import { situacionVariantes, type ProductoInventario } from "@/lib/inventario-catalogo";

/** La segunda línea de un producto: con variantes, su situación corta ("L · Arena agotada · 11 en total"); si no, el stock. */
export function DetalleStock({ producto: p }: { producto: ProductoInventario }) {
  const s = situacionVariantes(p);
  if (s) {
    return (
      <>
        {s.resaltado && <b className="font-extrabold text-atencion-texto">{s.resaltado}</b>}
        {s.resaltado ? " · " : ""}
        {s.resto}
      </>
    );
  }
  return <>{p.stock === null ? "Sin cantidad guardada" : p.stock === 0 ? "Agotado" : p.stock === 1 ? "Queda 1" : `${p.stock} en stock`}</>;
}
