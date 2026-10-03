import { diasParaPagar, textoFechaDeuda } from "@/lib/credito";
import { formatearPesos } from "@/lib/formato";
import { IconoCalendario, IconoReloj } from "../iconos";
import { clases } from "./comunes";

const atrasada = (fecha: string | null, ahora: number) => {
  const dias = diasParaPagar(fecha, ahora);
  return dias !== null && dias < 0;
};

/**
 * La fecha de pago de una deuda (14 extrabold, `atencion-texto`): calendario + "Vie 9 oct", "Hoy", "Mañana" o "Sin fecha". Si ya
 * pasó: reloj `resalte` + "Atrasado 6 días", como texto, sin píldora (docs/09 §7).
 */
export function FechaDeuda({ fecha, ahora }: { fecha: string | null; ahora: number }) {
  const tarde = atrasada(fecha, ahora);
  return (
    <span className="flex items-center gap-1.5 text-secundario font-extrabold whitespace-nowrap text-atencion-texto">
      {tarde ? <IconoReloj tamano={16} strokeWidth={2.2} className="text-resalte" /> : <IconoCalendario tamano={16} strokeWidth={2.2} />}
      {textoFechaDeuda(fecha, ahora)}
    </span>
  );
}

/** Barra de lo abonado sobre el total: pista `linea`, relleno `accion`. Con 0 abonado queda solo la pista. 8 px; `mini`: 6 px. */
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
 * Deuda en una fila de lista agrupada (versión mini): el monto a la derecha, antes del chevron (16 extrabold, `atencion-texto`), con el
 * reloj `resalte` delante si está atrasada. Va en el `fin` de la fila; la barra mini (`BarraAbonado mini`) va debajo del texto.
 */
export function MontoDeuda({ saldo, fecha, ahora }: { saldo: number; fecha: string | null; ahora: number }) {
  return (
    <span className="flex items-center gap-1 text-cuerpo font-extrabold whitespace-nowrap text-atencion-texto">
      {atrasada(fecha, ahora) && <IconoReloj tamano={16} strokeWidth={2.2} className="text-resalte" />}
      {formatearPesos(saldo)}
    </span>
  );
}

/**
 * Bloque de deuda (docs/09 §7): todo lo que se debe se muestra igual en Pedidos y en Clientes. Va al final de su tarjeta, separado
 * por una `linea`: el monto ("Debe RD$X" con `prefijo`, solo "RD$X" en Clientes) con la fecha a la derecha, y la barra de lo abonado
 * sobre el total. La leyenda "Abonó RD$X de RD$Y" solo con `leyenda` (en el detalle: la tarjeta de Pago del pedido). Sin saldo no
 * hay bloque. `total` es lo que valen los pedidos con saldo; abonado = total − saldo.
 */
export function BloqueDeuda({
  saldo,
  total,
  fecha,
  ahora,
  prefijo = true,
  leyenda = false,
  separado = true,
  className,
}: {
  saldo: number;
  total: number;
  fecha: string | null;
  ahora: number;
  prefijo?: boolean;
  leyenda?: boolean;
  separado?: boolean;
  className?: string;
}) {
  if (saldo <= 0) return null;
  const abonado = Math.max(0, total - saldo);
  return (
    <div className={clases("flex flex-col gap-2", separado && "mt-3 border-t border-linea pt-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <span className="text-destacado whitespace-nowrap text-atencion-texto">
          {prefijo ? "Debe " : ""}
          {formatearPesos(saldo)}
        </span>
        <FechaDeuda fecha={fecha} ahora={ahora} />
      </div>
      <BarraAbonado abonado={abonado} total={total} />
      {leyenda && <p className="text-secundario text-texto-secundario">{abonado > 0 ? `Abonó ${formatearPesos(abonado)} de ${formatearPesos(total)}` : "Sin abonos todavía"}</p>}
    </div>
  );
}
