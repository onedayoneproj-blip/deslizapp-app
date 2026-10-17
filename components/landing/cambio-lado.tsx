/* eslint-disable @next/next/no-img-element -- la captura del teléfono de quien compra: imagen estática de tamaño fijo, sin optimizador */
import { Bloqueo } from "./whatsapp";
import { altoPagina } from "./mockups";
import { TelefonoMockup } from "./telefono-mockup";
import "./cambio-lado.css";

/**
 * El cambio de lado de «Cómo funciona», en dos piezas que cambio-lado.css anima juntas al llegar al paso `cambio-lado`:
 * - `CambioLado`: la pantalla de fondo (la ola verde que sube y el texto, de «Pidió en segundos.» a «Así lo ve Tu Tienda.»).
 * - `GiroTelefono`: el teléfono, una caja 3D que se levanta y gira 180°. Por delante lleva el teléfono de quien compra (la captura del paso
 *   `seguimiento`) y, por detrás, la pantalla bloqueada de la tienda con el aviso de WhatsApp de Ana: la misma del paso `aviso`, que sigue
 *   desde ahí sin volver a meter otro teléfono (el teléfono real de la tienda ocupa el sitio de este, en el mismo tamaño).
 * Con data-anima="si" (llegar deslizando, también al volver) las animaciones arrancan desde el principio y se repiten limpias; sin animar
 * (llegada directa, movimiento reducido) se ve el final. Decoración + texto: el texto final se lee.
 */
export function CambioLado() {
  return (
    <div className="cl" data-cambio-lado>
      <div className="cl-ola" aria-hidden="true" />
      <div className="cl-textos">
        <p className="cl-antes">
          <span className="cl-frase" data-fase="antes">así lo vio quien compra</span>
          <span className="cl-frase" data-fase="despues">y del otro lado…</span>
        </p>
        <h2 className="cl-titulo">
          <span className="cl-frase" data-fase="antes">Pidió en segundos.</span>
          <span className="cl-frase" data-fase="despues">Así lo ve Tu Tienda.</span>
        </h2>
        <p className="cl-texto">
          <span className="cl-frase" data-fase="antes">Eligió, le dio aaah y te mandó el pedido por WhatsApp.</span>
          <span className="cl-frase" data-fase="despues">El pedido te llega completo: qué quiere, cuánto y a quién se lo mandas.</span>
        </p>
      </div>
    </div>
  );
}

/** Dentro de `.lt-zona` (landing.tsx): ocupa el sitio y el tamaño del teléfono de la tienda, para que el paso siguiente continúe desde él. */
export function GiroTelefono() {
  return (
    <div className="lg" aria-hidden="true">
      <div className="lg-sombra" />
      <div className="lg-cuerpo">
        <div className="lg-cara lg-frente">
          <TelefonoMockup marco="titanio" className="lg-tm">
            <img src="/landing/pasos/seguimiento.webp" alt="" width={393} height={852} className="lg-captura" decoding="async" />
            <span className="lg-brillo" />
          </TelefonoMockup>
        </div>
        <div className="lg-cara lg-dorso">
          <TelefonoMockup className="lg-tm">
            <div className="lg-hueco">
              <div className="lg-pantalla" style={{ height: altoPagina("tienda") }}>
                <Bloqueo aviso />
              </div>
            </div>
          </TelefonoMockup>
        </div>
        <div className="lg-canto lg-canto-d">
          <i style={{ top: "28%" }} />
        </div>
        <div className="lg-canto lg-canto-i">
          <i style={{ top: "20%" }} />
          <i style={{ top: "32%" }} />
        </div>
      </div>
    </div>
  );
}
