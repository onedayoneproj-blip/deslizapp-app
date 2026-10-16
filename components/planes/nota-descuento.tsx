import { textoMenosCirculo } from "@/lib/circulo";

/**
 * La nota a mano del descuento de las primeras tiendas, junto al selector de /planes y solo en «Anual» (opción E,
 * referencias/planes/descuento-nota-a-mano.dc.html): «primeras tiendas: -30%» en Caveat, girada unos -6°, con una flechita dibujada a
 * mano que baja hacia el botón «Anual». Al aparecer, la nota hace un fundido corto y la flecha se dibuja (pagina-planes.css). Solo
 * decorativa: el pie de cada tarjeta lo dice en texto.
 */
export function NotaDescuento() {
  return (
    <>
      <span className="pl-nota-mano" aria-hidden="true" data-nota-mano="">
        primeras tiendas: <span className="pl-nota-mano-menos">{textoMenosCirculo}</span>
      </span>
      <svg className="pl-flecha" width="34" height="30" viewBox="0 0 34 30" fill="none" stroke="#F5C9D6" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
        <path d="M4 2c6 12 14 18 26 22" pathLength="1" />
        <path d="M22 26l8-2-3-8" pathLength="1" className="pl-flecha-punta" />
      </svg>
    </>
  );
}
