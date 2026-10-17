/* eslint-disable @next/next/no-img-element -- la captura del catálogo: imagen estática de tamaño fijo, sin optimizador */
import { TelefonoMockup } from "./telefono-mockup";
import "./cambio-lado.css";

/**
 * El cambio de lado de «Cómo funciona»: una pantalla propia entre quien compra y la tienda. Arranca en rosa con el teléfono de quien
 * compra (el catálogo) y «Pidió en segundos.»; al segundo, el teléfono gira 180° y por detrás aparece el panel de Tu Tienda con el aviso
 * «Nuevo · Ana», mientras una ola verde sube y cubre el fondo; el texto viejo se desvanece y entra «Así lo ve Tu Tienda.» en papel sobre el
 * verde. Todo son animaciones de CSS que arrancan al entrar al paso (cambio-lado.css) y se repiten limpias cada vez; sin animar (llegada
 * directa, movimiento reducido) se ve el final. El controlador solo pasa el fondo de la landing de rosa a verde (data-lado) a mitad de la ola.
 * Decoración + texto: el texto final se lee; los teléfonos son decoración.
 */
export function CambioLado() {
  return (
    <div className="cl" data-cambio-lado>
      <div className="cl-ola" aria-hidden="true" />
      <div className="cl-escena" aria-hidden="true">
        <div className="cl-carta">
          <div className="cl-cara cl-frente">
            <TelefonoMockup marco="titanio" className="cl-tm">
              <img src="/landing/catalogo/termo.webp" alt="" width={393} height={852} className="cl-catalogo" decoding="async" />
            </TelefonoMockup>
          </div>
          <div className="cl-cara cl-dorso">
            <TelefonoMockup className="cl-tm">
              <div className="cl-panel">
                <b className="cl-panel-titulo">Pedidos</b>
                <span className="cl-aviso">
                  <span>🔔 Nuevo · Ana</span>
                  <small>2 productos · RD$1,500</small>
                </span>
                <span className="cl-fila" />
                <span className="cl-fila" />
              </div>
            </TelefonoMockup>
          </div>
        </div>
      </div>
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
