import { useLayoutEffect, useRef } from "react";
import { CURVA, DURACION, menosMovimiento } from "@/lib/movimiento";
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
 *   variables --contador / --contador-letra (hoy no se usan: si no caben, la fila se desplaza).
 */
export function Contador({
  valor,
  tamano,
  tono = "atencion",
  sobreActivo = false,
  oculto = false,
  className = "",
}: {
  valor: number;
  tamano: "barra" | "pastilla";
  tono?: "neutro" | "atencion";
  /** Solo para el tono neutro: el contador va dentro de una pastilla activa (fondo Bosque). */
  sobreActivo?: boolean;
  /**
   * El número ya lo dice el nombre accesible del botón que lo contiene (ej. la barra: "Pedidos, 2 nuevos"): no va
   * como texto del DOM (así el nombre visible del botón sigue siendo solo "Pedidos", WCAG 2.5.3) sino como
   * contenido CSS, con el mismo "pop" al cambiar.
   */
  oculto?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const primero = useRef(true);
  const texto = textoContador(valor);
  useLayoutEffect(() => {
    if (!oculto) return;
    if (primero.current) {
      primero.current = false;
      return;
    }
    const el = ref.current;
    if (!el || typeof el.animate !== "function") return;
    const cuadros = menosMovimiento()
      ? [{ opacity: 0.4 }, { opacity: 1 }]
      : [{ transform: "scale(0.8)" }, { transform: "scale(1.15)", offset: 0.6 }, { transform: "none" }];
    el.animate(cuadros, { duration: DURACION.normal, easing: CURVA.salida });
  }, [texto, oculto]);
  if (valor <= 0) return null;
  const medidas =
    tamano === "barra"
      ? "h-[18px] min-w-[18px] border-2 border-white px-1 text-[10.5px]"
      : "h-(--contador,20px) min-w-(--contador,20px) px-[5px] text-[length:var(--contador-letra,11.5px)] min-[390px]:h-(--contador,21px) min-[390px]:min-w-(--contador,21px) min-[390px]:text-[length:var(--contador-letra,12px)]";
  const colores =
    tono === "atencion" ? "bg-mandarina text-bosque-oscuro" : sobreActivo ? "bg-[rgb(255_249_238/0.2)] text-papel" : "bg-[#F1E8D6] text-bosque";
  const base = `inline-grid shrink-0 place-items-center rounded-full leading-none font-extrabold tracking-normal ${colores} ${medidas} ${className}`;
  if (oculto)
    return <span ref={ref} data-contador={tono} data-n={texto} aria-hidden="true" className={`${base} after:content-[attr(data-n)]`} />;
  return (
    <span data-contador={tono} className={base}>
      <Numero valor={texto} />
    </span>
  );
}
