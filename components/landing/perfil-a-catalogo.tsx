"use client";

import { useEffect, useRef } from "react";
import { BurstAaah } from "./burst-aaah";
import { NavegadorInstagram } from "./navegador-instagram";
import { PerfilTienda } from "./perfil-tienda";
import "./perfil-a-catalogo.css";

// Los cuadros del catálogo de «Tu Tienda» (393×852): las capturas de los pasos de «Cómo funciona» (public/landing/pasos) y la del tercer
// producto sin su «aaah» (scripts/generar-catalogo-bio.mjs). Cada producto se recorta a su banda (y 225–750) para deslizarlos como los
// reels del catálogo real, con la cabecera quieta encima.
const CUADROS = ["/landing/pasos/hola.webp", "/landing/pasos/pasa.webp", "/landing/catalogo/tote-sin-like.webp"];
const CUADRO_CON_LIKE = "/landing/pasos/aaah-tote.webp";

/* eslint-disable @next/next/no-img-element -- capturas estáticas de 393×852: tamaño fijo, sin optimizador */
/**
 * Del perfil al catálogo, en bucle (referencias/planes/instagram-perfil-a-catalogo/): el perfil de la tienda con su enlace; un toque en
 * el enlace (el círculo de toque de la landing); sube desde abajo la hoja del navegador, con su barra de progreso y un instante en
 * blanco; carga el catálogo; el teléfono se aleja hasta verse entero; el catálogo pasa de un producto al siguiente dos veces (con el
 * dedo) y, en el último, un toque en el ♥ con el «aaah» del catálogo; se queda un momento, el teléfono vuelve al zoom de antes y
 * empieza de nuevo (unos 12,5 s). Todo son animaciones de CSS (transform y opacity), sin iframes ni video. Se pausa cuando no se ve
 * (IntersectionObserver). Con movimiento reducido no se mueve: se ve el catálogo dentro del navegador, quieto. Es decoración: quien la
 * usa la esconde a los lectores de pantalla y dice lo mismo con texto.
 * Reutilizable: los pasos `perfil` y `navegador` de «Cómo funciona» (docs/prompts/conoce-portada-narrativa.md). Su ancho lo pone
 * quien la usa; su alto sale de la proporción del iPhone del mockup (640×1350).
 */
export function PerfilACatalogo({ className }: { className?: string }) {
  const caja = useRef<HTMLDivElement>(null);

  // Mientras no se ve, queda en pausa (y empieza desde el principio la primera vez que aparece).
  useEffect(() => {
    const el = caja.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observador = new IntersectionObserver(([e]) => {
      el.dataset.pausa = e?.isIntersecting ? "no" : "si";
    }, { threshold: 0.5 });
    observador.observe(el);
    return () => observador.disconnect();
  }, []);

  return (
    <div ref={caja} className={className ? `pc ${className}` : "pc"} data-pausa="si">
      {/* El teléfono de «Cómo funciona» (mockup-negro, 640×1350): su pantalla es el hueco y el marco con la isla va encima. */}
      <div className="pc-pantalla">
        <PerfilTienda sobreEnlace={<span className="pc-toque" />} />
        <div className="pc-hoja">
          <NavegadorInstagram>
            <div className="pc-catalogo">
              <div className="pc-tira">
                {CUADROS.map((src) => (
                  <div key={src} className="pc-banda">
                    <img src={src} alt="" width={393} height={852} decoding="async" />
                  </div>
                ))}
              </div>
              <div className="pc-cabecera">
                <img src={CUADROS[0]} alt="" width={393} height={852} decoding="async" />
              </div>
            </div>
            <img className="pc-final" src={CUADRO_CON_LIKE} alt="" width={393} height={852} decoding="async" />
            <BurstAaah className="pc-aaah" />
            <span className="pc-dedo" />
          </NavegadorInstagram>
        </div>
      </div>
      <img className="pc-marco" src="/landing/mockup-negro.webp" alt="" width={640} height={1350} decoding="async" />
    </div>
  );
}
