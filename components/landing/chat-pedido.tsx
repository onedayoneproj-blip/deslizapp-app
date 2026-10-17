import { HORA_DEMO, MENSAJE_DEMO, VISTA_PREVIA_DEMO } from "@/lib/landing/pedido-demo";
import { BurbujaChat } from "../chat/burbuja-chat";
import "./chat-pedido.css";

/** Las primeras líneas del mensaje del pedido (el de mensajePedido, el que arma el catálogo): el saludo, los productos y el total. */
const LINEAS_MENSAJE = (() => {
  const lineas = MENSAJE_DEMO.split("\n");
  const total = lineas.findIndex((l) => l.startsWith("Total:"));
  return lineas.slice(0, total + 1).filter((l) => l.trim() !== "");
})();

/**
 * El chat de WhatsApp de una tienda cuando le llega un pedido, para dentro del teléfono del mockup (components/landing/telefono-mockup.tsx):
 * la cabecera con «‹», el avatar de la clienta, su nombre y «en línea» (o «escribiendo…»), el fondo del chat y, pegados abajo, el pedido
 * (un mensaje recibido, con la vista previa compacta del enlace y las primeras líneas del texto) y la respuesta de la tienda (enviada, con
 * hora y checks). Las burbujas son las compartidas (components/chat/burbuja-chat.tsx). Todo mide en cqw. Es decoración: quien la usa la esconde
 * a los lectores de pantalla. `escribiendo`: los tres puntos que quien lo anima pone debajo, donde va a aparecer el pedido.
 */
export function ChatPedido() {
  return (
    <div className="cw">
      <div className="cw-cabecera">
        <svg viewBox="0 0 24 24" className="cw-atras" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 5l-7 7 7 7" />
        </svg>
        <span className="cw-avatar">MP</span>
        <span className="cw-quien">
          <b>María P.</b>
          <span className="cw-estado">
            <span className="cw-estado-escribe">escribiendo…</span>
            <span className="cw-estado-linea">en línea</span>
          </span>
        </span>
      </div>
      <div className="cw-fondo" />
      <div className="cw-hoy">Hoy</div>
      <div className="cw-col">
        <BurbujaChat lado="recibido" bloque hora={HORA_DEMO} className="cw-pedido">
          <span className="cw-enlace">
            <span className="cw-miniatura">
              {/* eslint-disable-next-line @next/next/no-img-element -- la miniatura del pedido (app/demo-landing/imagen): imagen local, sin optimizador */}
              <img src="/demo-landing/imagen" alt="" width={1200} height={630} loading="lazy" decoding="async" />
            </span>
            <span className="cw-enlace-texto">
              <b>{VISTA_PREVIA_DEMO.titulo}</b>
              <span>{VISTA_PREVIA_DEMO.descripcion}</span>
              <span>{VISTA_PREVIA_DEMO.dominio}</span>
            </span>
          </span>
          <span className="cw-texto">
            {LINEAS_MENSAJE.map((l) => (
              <span key={l}>{l}</span>
            ))}
          </span>
        </BurbujaChat>
        <BurbujaChat lado="enviado" checks="grises-a-azules" hora={HORA_DEMO} className="cw-respuesta">
          ¡Listo! Te lo mando hoy 💚
        </BurbujaChat>
      </div>
      <BurbujaChat lado="recibido" hora="" className="pl-escribe cw-escribe">
        <i />
        <i />
        <i />
      </BurbujaChat>
    </div>
  );
}
