"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ZONA_HORARIA } from "@/lib/config";
import { formatearPesos } from "@/lib/formato";
import type { Cliente, PedidoConItems } from "@/lib/types";

export function FacturaPedido({ pedido, cliente, tiendaNombre }: { pedido: PedidoConItems; cliente: Cliente | null; tiendaNombre: string }) {
  const [lista, setLista] = useState(false);
  useEffect(() => setLista(true), []);

  if (!lista || pedido.estado !== "despachado") return null;

  const subtotal = pedido.items.reduce((total, item) => total + item.precioUnitario * item.cantidad, 0);
  const descuento = Math.max(0, subtotal - pedido.total);
  const fecha = new Intl.DateTimeFormat("es-DO", { timeZone: ZONA_HORARIA, dateStyle: "long" }).format(new Date(pedido.despachadoEn ?? pedido.creadoEn));

  return createPortal(
    <article data-factura-pedido aria-label={`Comprobante de venta del pedido #${pedido.numero}`}>
      <header className="factura-pedido-cabecera">
        <p>Deslizapp · {tiendaNombre}</p>
        <h1>Comprobante de venta</h1>
        <p>Pedido #{pedido.numero}</p>
      </header>
      <section className="factura-pedido-datos">
        <div><span>Fecha</span><strong>{fecha}</strong></div>
        <div><span>Cliente</span><strong>{cliente?.nombre ?? "Cliente sin nombre"}</strong></div>
        {cliente?.telefono && <div><span>Teléfono</span><strong>{cliente.telefono}</strong></div>}
      </section>
      <table className="factura-pedido-tabla">
        <thead><tr><th>Detalle</th><th>Cantidad</th><th>Precio</th><th>Total</th></tr></thead>
        <tbody>
          {pedido.items.map((item) => (
            <tr key={item.id}>
              <td>{item.nombreProducto}</td>
              <td>{item.cantidad}</td>
              <td>{formatearPesos(item.precioUnitario)}</td>
              <td>{formatearPesos(item.precioUnitario * item.cantidad)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <section className="factura-pedido-totales">
        <p><span>Subtotal</span><strong>{formatearPesos(subtotal)}</strong></p>
        {descuento > 0 && <p><span>Descuento{pedido.codigoPromo ? ` · ${pedido.codigoPromo}` : ""}</span><strong>−{formatearPesos(descuento)}</strong></p>}
        <p className="factura-pedido-total"><span>Total</span><strong>{formatearPesos(pedido.total)}</strong></p>
      </section>
      <section className="factura-pedido-pago">
        <h2>Pago</h2>
        <p><span>Forma de pago</span><strong>{pedido.pagoModo === "credito" ? "A crédito" : "Contado"}</strong></p>
        <p><span>Abonado</span><strong>{formatearPesos(pedido.pagado)}</strong></p>
        <p><span>Saldo pendiente</span><strong>{formatearPesos(pedido.saldo)}</strong></p>
      </section>
      <footer className="factura-pedido-pie">Gracias por tu compra.</footer>
    </article>,
    document.body,
  );
}
