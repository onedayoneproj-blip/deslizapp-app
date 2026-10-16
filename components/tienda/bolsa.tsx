"use client";
// La bolsa del catálogo: el botón «Pedido» con su contador (#bagDock) y la barra que aparece al agregar (#cartbar). Viven aquí
// para que la demo de la landing (components/landing/telefono-compradora.tsx) use exactamente las mismas que el catálogo.
// lib/tienda/movimiento.ts (volarPedido, transformarPedido) las busca por esos ids.

import type { CatalogoPublico } from "@/lib/types";
import { dinero } from "@/lib/tienda/carrito";
import { Icono } from "./iconos";

/** El botón «Pedido» del catálogo, con cuántos productos lleva. */
/** `enFinal`: sobre el reel de Deslizapp (pantalla completa) va arriba a la derecha, para no tapar sus botones. */
export function BotonPedido({ cantidad, oculto, enFinal = false, abrir }: { cantidad: number; oculto: boolean; enFinal?: boolean; abrir: () => void }) {
  return (
    <div className={"acts" + (oculto ? " off" : "") + (enFinal ? " en-final" : "")} id="bagDock">
      <button className="act send" data-order aria-label="Ver mi pedido" onClick={abrir}>
        <Icono nombre="bag" />
        <span>Pedido</span>
        <i className="cnt">{cantidad || ""}</i>
      </button>
    </div>
  );
}

/** La barra del pedido: el mensaje de la tienda (si la tienda lo deja), el resumen y «Enviar». */
export function BarraPedido({
  t,
  cantidad,
  total,
  nombre,
  conChat,
  enviando,
  abrir,
  enviar,
  cerrarChat,
}: {
  t: CatalogoPublico["tienda"];
  cantidad: number;
  total: number;
  /** «perfume» / «perfumes» (o «producto» con varios catálogos). */
  nombre: { singular: string; lista: string };
  conChat: boolean;
  enviando: boolean;
  abrir: () => void;
  enviar: () => void;
  cerrarChat: () => void;
}) {
  const mensajes = t.personalizacion.mensajes as Record<string, unknown> | undefined;
  return (
    <div className="cartbar in" id="cartbar">
      {conChat && (
        <div className="chat">
          <span className="av" aria-hidden="true" />
          <div className="bubble">
            <span className="who2">{t.nombreVendedora ?? t.nombre}</span>
            <p>
              {(Array.isArray(mensajes?.al_agregar)
                ? (mensajes.al_agregar as string[])[Math.min(cantidad - 1, (mensajes.al_agregar as string[]).length - 1)]
                : null) ??
                (cantidad === 1
                  ? "¡Ay, qué buena elección! ¿Le agregas otro? Uno pa’ ti y otro pa’ regalar 😉"
                  : cantidad === 2
                    ? "Tu pedido se ve precioso 💕 Dale una vueltita más, que todavía hay perfumes lindos esperándote."
                    : "¡Mi amor, tienes un gustazo! 😍 Si viste otro que te gustó, agrégalo y me lo mandas todo en un solo mensaje.")}
            </p>
            <button className="bclose" aria-label="Cerrar mensaje" onClick={cerrarChat}>
              ×
            </button>
          </div>
        </div>
      )}
      <div className="inner">
        <button className="sum" onClick={abrir}>
          <b>
            {cantidad} {cantidad === 1 ? nombre.singular : nombre.lista} · {dinero(total)}
          </b>
          <small>Ver o cambiar mi pedido</small>
        </button>
        <button className="btn primary" id="barSend" disabled={enviando} onClick={enviar}>
          <Icono nombre="wa" />
          Enviar
        </button>
      </div>
    </div>
  );
}
