"use client";

import { useEffect, useRef } from "react";
import { NavegadorInstagram } from "./navegador-instagram";
import { PerfilTienda } from "./perfil-tienda";
import "./perfil-a-catalogo.css";

/** La captura del catálogo de «Tu Tienda» (la del paso `hola` de «Cómo funciona», 393×852): lo que carga dentro del navegador. */
const CAPTURA_CATALOGO = "/landing/pasos/hola.webp";

/**
 * Del perfil al catálogo, en bucle (referencias/planes/instagram-perfil-a-catalogo/): el perfil de la tienda con su enlace; un toque en
 * el enlace (el círculo de toque de la landing); sube desde abajo la hoja del navegador, con su barra de progreso y un instante en
 * blanco; carga el catálogo y se queda unos 3 segundos; y vuelve a empezar. Todo son animaciones de CSS (transform y opacity), sin
 * iframes ni video. Se pausa cuando no se ve (IntersectionObserver). Con movimiento reducido no se mueve: se ve el catálogo dentro
 * del navegador, quieto. Es decoración: quien la usa la esconde a los lectores de pantalla y dice lo mismo con texto.
 * Reutilizable: los pasos `perfil` y `navegador` de «Cómo funciona» (docs/prompts/conoce-portada-narrativa.md). Su ancho lo pone
 * quien la usa; su alto sale de la proporción de un teléfono.
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
      <PerfilTienda sobreEnlace={<span className="pc-toque" />} />
      <div className="pc-hoja">
        <NavegadorInstagram>
          {/* eslint-disable-next-line @next/next/no-img-element -- captura estática de 393×852: tamaño fijo, sin optimizador */}
          <img className="pc-captura" src={CAPTURA_CATALOGO} alt="" width={393} height={852} decoding="async" />
        </NavegadorInstagram>
      </div>
      <span className="pc-isla" />
    </div>
  );
}
