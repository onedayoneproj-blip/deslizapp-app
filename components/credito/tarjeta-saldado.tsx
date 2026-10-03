"use client";

import { mensajeGracias, enlaceWhatsAppCliente, resumenDeSaldado } from "@/lib/credito";
import { formatearPesos } from "@/lib/formato";
import type { PedidoConItems } from "@/lib/types";
import { IconoWhatsApp } from "../iconos";

const CONFETI = [
  { izq: "6%", color: "bg-marca-mandarina", retraso: "0s" },
  { izq: "18%", color: "bg-marca-rosa-fija", retraso: "0.6s" },
  { izq: "30%", color: "bg-marca-menta-apagada", retraso: "1.2s" },
  { izq: "44%", color: "bg-marca-mandarina", retraso: "0.3s" },
  { izq: "58%", color: "bg-marca-rosa-fija", retraso: "1.6s" },
  { izq: "70%", color: "bg-marca-menta-apagada", retraso: "0.9s" },
  { izq: "84%", color: "bg-marca-mandarina", retraso: "2s" },
  { izq: "94%", color: "bg-marca-rosa-fija", retraso: "0.4s" },
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
    <section aria-label="Pedido saldado" className="mov-aparece relative min-h-[190px] overflow-hidden rounded-radio-l bg-marca-bosque px-[18px] py-5 text-marca-papel">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {CONFETI.map((c, i) => (
          <span key={i} className={`cre-confeti absolute -top-3 h-2 w-2 rounded-xs ${c.color}`} style={{ left: c.izq, animationDelay: c.retraso }} />
        ))}
      </div>
      <div
        aria-hidden="true"
        className="cre-sello absolute top-[18px] right-3 flex h-[92px] w-[92px] items-center justify-center rounded-full border-[3px] border-marca-mandarina font-display text-cuerpo tracking-[0.04em] text-marca-mandarina min-[390px]:right-4 min-[390px]:h-[108px] min-[390px]:w-[108px] min-[390px]:text-titulo-seccion"
      >
        SALDADO
      </div>
      <p className="relative font-mano text-mano-celebracion text-marca-rosa-fija">¡Terminó de pagar!</p>
      <p aria-live="polite" className="relative mt-2.5 max-w-[62%] text-secundario min-[390px]:max-w-[200px]">
        {primerNombre} pagó los {formatearPesos(pedido.total)} en {abonos} {abonos === 1 ? "abono" : "abonos"}, en {dias} {dias === 1 ? "día" : "días"}.
      </p>
      <div className="relative mt-4 h-2.5 overflow-hidden rounded-full bg-marca-papel/15">
        <div className="h-full w-full rounded-full bg-marca-mandarina" />
      </div>
      {telefono && (
        <a
          href={enlaceWhatsAppCliente(telefono, mensajeGracias({ cliente: nombreCliente, vendedora, tienda, total: pedido.total }))}
          target="_blank"
          rel="noreferrer"
          className="tocable relative mt-4 flex h-12 items-center justify-center gap-2 rounded-full border-[1.5px] border-marca-papel/70 text-cuerpo font-extrabold text-marca-papel outline-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco"
        >
          <IconoWhatsApp tamano={18} />
          Darle las gracias por WhatsApp
        </a>
      )}
    </section>
  );
}
