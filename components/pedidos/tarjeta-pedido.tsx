import { textoFechaDeudaAccesible } from "@/lib/credito";
import type { ColorAvatar } from "@/lib/avatar-cliente";
import { formatearPesos, haceCuantoSinHora } from "@/lib/formato";
import { recortePila } from "@/lib/recorte";
import type { PedidoConItems, Producto } from "@/lib/types";
import { Foto } from "../foto";
import { Avatar, BloqueDeuda, Etiqueta, Tarjeta } from "../ui";
import { EtiquetaPago } from "./comunes";

/**
 * La tarjeta de un pedido en la lista de Pedidos. `sinEnlace`: la misma tarjeta sin llevar a ninguna parte (para mostrarla con datos
 * de ejemplo fuera del panel, como en /planes); en el panel no se pasa y es un enlace al pedido.
 */
export function TarjetaPedido({ ahora, pedido: p, cliente, productos, sinEnlace = false }: { ahora: number; pedido: PedidoConItems; cliente?: { nombre: string; repite: boolean; avatarEmoji?: string | null; avatarColor?: ColorAvatar | null }; productos: ReadonlyMap<string, Pick<Producto, "fotos">>; sinEnlace?: boolean }) {
  const unidades = p.items.reduce((suma, i) => suma + i.cantidad, 0);
  const aCredito = p.pagoModo === "credito" && p.estado !== "cancelado";
  const conDeuda = aCredito && p.saldo > 0;
  const nombre = cliente?.nombre ?? "Cliente sin nombre";
  return (
    <Tarjeta
      href={sinEnlace ? undefined : `/pedidos/${p.id}`}
      etiqueta={sinEnlace ? undefined : `Pedido #${p.numero} de ${nombre}${cliente?.repite ? ", repite" : ""}${conDeuda ? `. Debe ${formatearPesos(p.saldo)}, ${textoFechaDeudaAccesible(p.pagoFechaAcordada, ahora)}` : ""}`}
    >
      {/* El cliente primero: avatar, nombre y "#N · Ayer"; a la derecha, la forma de pago (cada pestaña ya es un estado) */}
      <div className="flex items-center gap-3">
        <Avatar nombre={nombre} emoji={cliente?.avatarEmoji} color={cliente?.avatarColor} repite={cliente?.repite} vacio={!cliente} />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-destacado text-texto">{nombre}</span>
          <span className="truncate text-secundario text-texto-secundario">
            #{p.numero} · {haceCuantoSinHora(p.creadoEn)}
          </span>
        </div>
        {/* Una sola etiqueta: en crédito saldado, "Pagado" en lugar de "A crédito" */}
        {aCredito && p.saldo === 0 ? <Etiqueta tono="exito">Pagado</Etiqueta> : <EtiquetaPago pedido={p} />}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex shrink-0 -space-x-2">
            {p.items.slice(0, 3).map((i, n, todos) => {
              const foto = productos.get(i.productoId)?.fotos[0];
              return (
                <span key={i.id} style={n < todos.length - 1 ? recortePila(36, 8, 10) : undefined} className="size-9 overflow-hidden rounded-radio-s bg-superficie-hundida">
                  {foto ? <Foto src={foto} alt="" className="h-full w-full" sizes="36px" /> : null}
                </span>
              );
            })}
          </div>
          <span className="min-w-0 truncate text-secundario text-texto-secundario">
            {unidades} {unidades === 1 ? "producto" : "productos"}
          </span>
          {p.items.some((i) => i.porEncargo) && <Etiqueta tono="atencion">Por encargo</Etiqueta>}
        </div>
        <span className="shrink-0 font-display text-titulo-seccion">{formatearPesos(p.total)}</span>
      </div>
      {conDeuda && <BloqueDeuda saldo={p.saldo} total={p.total} fecha={p.pagoFechaAcordada} ahora={ahora} />}
    </Tarjeta>
  );
}
