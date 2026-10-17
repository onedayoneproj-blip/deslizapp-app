/* eslint-disable @next/next/no-img-element -- los iconos de la app: imágenes estáticas de tamaño fijo, sin optimizador */
import "./cambio-lado.css";

/**
 * El cambio de lado de «Cómo funciona» (docs/prompts/conoce-portada-narrativa.md): una pantalla propia, sin teléfono, para pasar de quien
 * compra a la tienda. Los iconos de la app (rosa: quien compra; verde: la tienda) se intercambian de lugar y de tamaño, el fondo pasa
 * de rosa a verde y el texto de «Pidió en segundos.» a «Así lo ve Tu Tienda.». Cada texto lleva sus dos versiones apiladas y el
 * escenario decide cuál se ve (data-cambio: «antes» al llegar y «despues» un momento más tarde, controlador.tsx), así el cambio es un
 * fundido y el alto no salta. Sin movimiento reducido, solo se ve el final. Decoración + texto: el texto final se lee.
 */
export function CambioLado() {
  return (
    <div className="cl" data-cambio-lado>
      <p className="cl-antes">
        <span className="cl-frase" data-fase="antes">así lo vio quien compra</span>
        <span className="cl-frase" data-fase="despues">y del otro lado…</span>
      </p>
      <div className="cl-iconos" aria-hidden="true">
        <img src="/landing/icono-verde.webp" alt="" width={180} height={180} className="cl-icono cl-icono-verde" />
        <img src="/landing/icono-rosa.webp" alt="" width={180} height={180} className="cl-icono cl-icono-rosa" />
      </div>
      <h2 className="cl-titulo">
        <span className="cl-frase" data-fase="antes">Pidió en segundos.</span>
        <span className="cl-frase" data-fase="despues">Así lo ve Tu Tienda.</span>
      </h2>
      <p className="cl-texto">
        <span className="cl-frase" data-fase="antes">Eligió, le dio aaah y te mandó el pedido por WhatsApp.</span>
        <span className="cl-frase" data-fase="despues">El pedido te llega completo: qué quiere, cuánto y a quién se lo mandas.</span>
      </p>
    </div>
  );
}
