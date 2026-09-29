import { Numero } from "./numero";

/** Texto del contador: a partir de 100 se muestra "99+". */
export function textoContador(valor: number): string {
  return valor > 99 ? "99+" : String(valor);
}

/**
 * Contador en círculo Mandarina con numeral Bosque en negrita: el de la barra de navegación (ícono
 * de Pedidos) y el de las pastillas de filtro (Segmentos). Con dos o tres cifras se estira a píldora
 * (ancho mínimo = alto) sin deformarse. En 0 no se muestra.
 * - tono "atencion" (por defecto, el de la barra): Mandarina con número Bosque; solo para lo que pide acción.
 * - tono "neutro": beige suave con número Bosque; sobre una pastilla activa (`sobreActivo`), crema translúcido
 *   con número crema. Mismo tamaño y forma: cambiar de tono no cambia el ancho.
 * - "barra": 18 px, con aro blanco (va encima del ícono).
 * - "pastilla": 20 px (21 px desde 390 px de ancho), al lado del nombre. Segmentos lo achica con las
 *   variables --contador / --contador-letra cuando las pastillas no caben.
 */
export function Contador({
  valor,
  tamano,
  tono = "atencion",
  sobreActivo = false,
  className = "",
}: {
  valor: number;
  tamano: "barra" | "pastilla";
  tono?: "neutro" | "atencion";
  /** Solo para el tono neutro: el contador va dentro de una pastilla activa (fondo Bosque). */
  sobreActivo?: boolean;
  className?: string;
}) {
  if (valor <= 0) return null;
  const medidas =
    tamano === "barra"
      ? "h-[18px] min-w-[18px] border-2 border-white px-1 text-[10.5px]"
      : "h-(--contador,20px) min-w-(--contador,20px) px-[5px] text-[length:var(--contador-letra,11.5px)] min-[390px]:h-(--contador,21px) min-[390px]:min-w-(--contador,21px) min-[390px]:text-[length:var(--contador-letra,12px)]";
  const colores =
    tono === "atencion" ? "bg-mandarina text-bosque-oscuro" : sobreActivo ? "bg-[rgb(255_249_238/0.2)] text-papel" : "bg-[#F1E8D6] text-bosque";
  return (
    <span data-contador={tono} className={`inline-grid shrink-0 place-items-center rounded-full leading-none font-extrabold tracking-normal ${colores} ${medidas} ${className}`}>
      <Numero valor={textoContador(valor)} />
    </span>
  );
}
