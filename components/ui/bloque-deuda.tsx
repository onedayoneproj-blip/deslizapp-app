import { diasParaPagar, textoAtraso, textoFechaDeuda } from "@/lib/credito";
import { formatearPesos } from "@/lib/formato";
import { IconoCalendario } from "../iconos";
import { clases } from "./comunes";
import { Etiqueta } from "./etiqueta";

/** La fecha de pago de una deuda: calendario + "Paga el sáb 10 oct"; si ya pasó, la etiqueta urgente "Atrasado N días". */
export function FechaDeuda({ fecha, ahora, tamano = "normal" }: { fecha: string | null; ahora: number; tamano?: "normal" | "mini" }) {
  const dias = diasParaPagar(fecha, ahora);
  const atraso = dias !== null && dias < 0 ? -dias : 0;
  if (atraso > 0) return <Etiqueta tono="urgente">{textoAtraso(atraso)}</Etiqueta>;
  return (
    <span className={clases("flex items-center gap-1.5 font-extrabold whitespace-nowrap text-atencion-texto", tamano === "mini" ? "text-etiqueta" : "text-secundario")}>
      <IconoCalendario tamano={16} strokeWidth={2.2} />
      {textoFechaDeuda(fecha, ahora)}
    </span>
  );
}

/** Barra de lo abonado sobre el total: pista `linea`, relleno `accion`. Con 0 abonado queda solo la pista. */
export function BarraAbonado({ abonado, total, mini = false }: { abonado: number; total: number; mini?: boolean }) {
  const porcentaje = total > 0 ? Math.min(100, Math.round((Math.max(0, abonado) / total) * 100)) : 0;
  return (
    <div
      role="progressbar"
      aria-label="Abonado"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={abonado}
      className={clases("overflow-hidden rounded-full bg-linea", mini ? "h-1.5" : "h-2")}
    >
      <div className="h-full rounded-full bg-accion" style={{ width: `${porcentaje}%` }} />
    </div>
  );
}

/**
 * Bloque de deuda (docs/09 §7): todo lo que se debe se muestra igual en Pedidos y en Clientes. Va al final de su tarjeta, separado
 * por una `linea`. Tres partes: "Debe RD$X" con la fecha (o la etiqueta urgente "Atrasado N días"), una barra con lo abonado sobre
 * el total, y la leyenda "Abonó RD$X de RD$Y". `mini` (filas de historial): sin leyenda, barra de 6 px. Sin saldo no hay bloque.
 * `total` es lo que valen los pedidos con saldo; abonado = total − saldo. `separado`: lleva su línea y espacio arriba.
 */
export function BloqueDeuda({
  saldo,
  total,
  fecha,
  ahora,
  tamano = "normal",
  separado = true,
  className,
}: {
  saldo: number;
  total: number;
  fecha: string | null;
  ahora: number;
  tamano?: "normal" | "mini";
  separado?: boolean;
  className?: string;
}) {
  if (saldo <= 0) return null;
  const mini = tamano === "mini";
  const abonado = Math.max(0, total - saldo);
  return (
    <div className={clases("flex flex-col gap-2", separado && "mt-3 border-t border-linea pt-3", className)}>
      <div className={clases("flex items-center justify-between gap-x-3 gap-y-1", mini && "flex-wrap")}>
        <span className={clases("font-extrabold whitespace-nowrap text-atencion-texto", mini ? "text-cuerpo" : "text-destacado")}>Debe {formatearPesos(saldo)}</span>
        <FechaDeuda fecha={fecha} ahora={ahora} tamano={tamano} />
      </div>
      <BarraAbonado abonado={abonado} total={total} mini={mini} />
      {!mini && <p className="text-secundario text-texto-secundario">{abonado > 0 ? `Abonó ${formatearPesos(abonado)} de ${formatearPesos(total)}` : "Sin abonos todavía"}</p>}
    </div>
  );
}
