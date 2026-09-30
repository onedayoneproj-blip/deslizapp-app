"use client";

import { mensajeGracias, enlaceWhatsAppCliente, resumenDeSaldado } from "@/lib/credito";
import { formatearPesos } from "@/lib/formato";
import type { PedidoConItems } from "@/lib/types";
import { IconoWhatsApp } from "../iconos";

const CONFETI = [
  { izq: "6%", color: "bg-mandarina", retraso: "0s" },
  { izq: "18%", color: "bg-rosa", retraso: "0.6s" },
  { izq: "30%", color: "bg-menta", retraso: "1.2s" },
  { izq: "44%", color: "bg-mandarina", retraso: "0.3s" },
  { izq: "58%", color: "bg-rosa", retraso: "1.6s" },
  { izq: "70%", color: "bg-menta", retraso: "0.9s" },
  { izq: "84%", color: "bg-mandarina", retraso: "2s" },
  { izq: "94%", color: "bg-rosa", retraso: "0.4s" },
];

/**
 * Celebración cuando un abono deja el pedido en cero (referencias/credito-abonos/Saldado.dc.html): tarjeta verde con confeti,
 * el sello "SALDADO" y el texto a mano. Se muestra por única vez (lo decide quien la usa). Sin movimiento, queda quieta.
 */
export function TarjetaSaldado({
  pedido,
  nombreCliente,
  telefono,
  vendedora,
  tienda,
}: {
  pedido: PedidoConItems;
  nombreCliente: string;
  telefono: string | null;
  vendedora: string;
  tienda: string;
}) {
  const { abonos, dias } = resumenDeSaldado(pedido);
  const primerNombre = nombreCliente.split(" ")[0] || "Tu cliente";
  return (
    <section aria-label="Pedido saldado" className="mov-aparece relative min-h-[190px] overflow-hidden rounded-[22px] bg-bosque px-[18px] py-5 text-papel">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {CONFETI.map((c, i) => (
          <span key={i} className={`cre-confeti absolute -top-3 h-2 w-2 rounded-[2px] ${c.color}`} style={{ left: c.izq, animationDelay: c.retraso }} />
        ))}
      </div>
      <div
        aria-hidden="true"
        className="cre-sello absolute top-[18px] right-3 flex h-[92px] w-[92px] items-center justify-center rounded-full border-[3px] border-mandarina font-display text-[17px] tracking-[0.04em] text-mandarina min-[390px]:right-4 min-[390px]:h-[108px] min-[390px]:w-[108px] min-[390px]:text-xl"
      >
        SALDADO
      </div>
      <p className="relative font-mano text-[30px] leading-none text-rosa min-[390px]:text-[32px]">¡Terminó de pagar!</p>
      <p aria-live="polite" className="relative mt-2.5 max-w-[62%] text-[14px] leading-snug min-[390px]:max-w-[200px]">
        {primerNombre} pagó los {formatearPesos(pedido.total)} en {abonos} {abonos === 1 ? "abono" : "abonos"}, en {dias} {dias === 1 ? "día" : "días"}.
      </p>
      <div className="relative mt-4 h-2.5 overflow-hidden rounded-[5px] bg-papel/15">
        <div className="h-full w-full rounded-[5px] bg-mandarina" />
      </div>
      {telefono && (
        <a
          href={enlaceWhatsAppCliente(telefono, mensajeGracias({ cliente: nombreCliente, vendedora, tienda, total: pedido.total }))}
          target="_blank"
          rel="noreferrer"
          className="tocable relative mt-4 flex h-12 items-center justify-center gap-2 rounded-full border-[1.5px] border-papel/70 text-[15px] font-extrabold text-papel"
        >
          <IconoWhatsApp tamano={18} />
          Darle las gracias por WhatsApp
        </a>
      )}
    </section>
  );
}
