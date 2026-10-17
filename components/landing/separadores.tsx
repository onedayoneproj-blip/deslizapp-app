/* eslint-disable @next/next/no-img-element -- los iconos de la app: imágenes estáticas de tamaño fijo, sin optimizador */
import type { CSSProperties } from "react";
import { IconoInstagram, IconoWhatsApp } from "../iconos";
import "./separadores.css";

/**
 * Los separadores de «Cómo funciona» (referencias/landing/conoce-narrativa/LEEME.md, «Separadores»): pantallas sin teléfono que presentan
 * cada tema, con el mismo patrón que `cambio-lado`. `bienvenida` (fondo Bosque), `antes` (arena, sin color de marca) y `solucion` (rosa).
 * Los tres están siempre en el escenario y se ven cuando el paso es el suyo (data-paso, separadores.css); al entrar, lo de siempre:
 * el texto sube con fundido, el icono entra con un pop y las burbujas, una a una. Con movimiento reducido, el estado final, quieto.
 * Los textos son los del LEEME, tal cual. Decoración + texto: el texto se lee.
 */
export function Separadores() {
  return (
    <>
      <Bienvenida />
      <Antes />
      <Solucion />
    </>
  );
}

const retraso = (s: number) => ({ "--d": `${s}s` }) as CSSProperties;

function Bienvenida() {
  return (
    <div className="sp sp-bienvenida" data-separador="bienvenida">
      <img src="/landing/icono-verde.webp" alt="" width={132} height={132} className="sp-icono sp-pop" style={retraso(0.1)} />
      <span className="sp-mano sp-sube" style={retraso(0.6)}>hola, esto es</span>
      <h1 className="sp-marca sp-sube" style={retraso(0.8)}>deslizapp</h1>
      <p className="sp-texto sp-sube" style={retraso(1.2)}>
        En un minuto te enseñamos cómo vender <b>sin tanta vuelta</b>.
      </p>
    </div>
  );
}

const BURBUJAS_ANTES = [
  { red: "instagram", texto: "¿precio?", lado: "izq", y: 0, x: 4 },
  { red: "whatsapp", texto: "¿lo tienes en negro?", lado: "der", y: 20, x: 2 },
  { red: "instagram", texto: "📷 foto", lado: "izq", y: 40, x: 14 },
  { red: "whatsapp", texto: "¿y el envío?", lado: "der", y: 60, x: 10 },
  { red: "instagram", texto: "¿cuál era? 😅", lado: "izq", y: 78, x: 24 },
] as const;

function Antes() {
  return (
    <div className="sp sp-antes" data-separador="antes">
      <div className="sp-notis">
        {BURBUJAS_ANTES.map((b, i) => (
          <span
            key={b.texto}
            className="sp-noti sp-sube"
            data-red={b.red}
            style={{ ...retraso(0.5 + i * 0.4), top: `${b.y}%`, [b.lado === "izq" ? "left" : "right"]: `${b.x}%` } as CSSProperties}
          >
            {b.red === "instagram" ? <IconoInstagram tamano={16} strokeWidth={2.2} /> : <IconoWhatsApp tamano={16} strokeWidth={2.2} />}
            {b.texto}
          </span>
        ))}
      </div>
      <div className="sp-pie">
        <span className="sp-mano sp-sube" style={retraso(0.1)}>antes de empezar…</span>
        <h2 className="sp-titulo sp-sube" style={retraso(0.25)}>
          Seguro esto
          <br />
          te suena.
        </h2>
        <p className="sp-texto sp-sube" style={retraso(2.5)}>Así se vende hoy por Instagram y WhatsApp.</p>
      </div>
    </div>
  );
}

function Solucion() {
  return (
    <div className="sp sp-solucion" data-separador="solucion">
      <div className="sp-cruzadas">
        <span className="sp-noti sp-tachada sp-sube" data-red="instagram" style={{ ...retraso(0.1), left: "-4%", top: "4%" }}>¿precio?</span>
        <span className="sp-noti sp-tachada sp-sube" data-red="instagram" style={{ ...retraso(0.2), right: "-10%", top: "60%" }}>¿cuál era?</span>
        <img src="/landing/icono-rosa.webp" alt="" width={128} height={128} className="sp-icono sp-pop" style={retraso(0.6)} />
      </div>
      <span className="sp-mano sp-sube" style={retraso(1.1)}>ahora, con Deslizapp…</span>
      <h2 className="sp-titulo sp-sube" style={retraso(1.3)}>
        Así lo
        <br />
        resolvemos.
      </h2>
      <p className="sp-texto sp-sube" style={retraso(1.7)}>Tu catálogo enseña fotos, precios y lo que queda. A ti te llega el pedido listo.</p>
    </div>
  );
}

/** Los tres, quietos, para la versión sin JavaScript. */
export function SeparadorQuieto({ id }: { id: "bienvenida" | "antes" | "solucion" }) {
  const t = {
    bienvenida: { mano: "hola, esto es", titulo: "deslizapp", texto: "En un minuto te enseñamos cómo vender sin tanta vuelta." },
    antes: { mano: "antes de empezar…", titulo: "Seguro esto te suena.", texto: "Así se vende hoy por Instagram y WhatsApp." },
    solucion: { mano: "ahora, con Deslizapp…", titulo: "Así lo resolvemos.", texto: "Tu catálogo enseña fotos, precios y lo que queda. A ti te llega el pedido listo." },
  }[id];
  return (
    <div className="sp-quieto" data-separador={id}>
      <span className="sp-mano">{t.mano}</span>
      <b className="sp-titulo">{t.titulo}</b>
      <span className="sp-texto">{t.texto}</span>
    </div>
  );
}
