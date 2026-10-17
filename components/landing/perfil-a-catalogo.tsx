"use client";

import { useRef } from "react";
import { BurstAaah } from "./burst-aaah";
import { useEnPantalla } from "./en-pantalla";
import { NavegadorInstagram } from "./navegador-instagram";
import { PerfilTienda } from "./perfil-tienda";
import { TelefonoMockup } from "./telefono-mockup";
import "./perfil-a-catalogo.css";

// Los cuadros del catálogo de «Tu Tienda» (393×852): las capturas del catálogo de la demo (public/landing/catalogo, scripts/generar-catalogo-bio.mjs). Cada producto se recorta a su banda (y 225–750) para deslizarlos como los
// reels del catálogo real, con la cabecera quieta encima.
const CUADROS = ["/landing/catalogo/gorra.webp", "/landing/catalogo/termo.webp", "/landing/catalogo/tote-sin-like.webp"];
const CUADRO_CON_LIKE = "/landing/catalogo/tote-con-like.webp";

/* eslint-disable @next/next/no-img-element -- capturas estáticas de 393×852: tamaño fijo, sin optimizador */
/**
 * Del perfil al catálogo, en bucle (referencias/planes/instagram-perfil-a-catalogo/): el perfil de la tienda con su enlace; un toque en
 * el enlace (el círculo de toque de la landing); sube desde abajo la hoja del navegador, con su barra de progreso y un instante en
 * blanco; carga el catálogo; el teléfono se aleja hasta verse entero; el catálogo pasa de un producto al siguiente dos veces (con el
 * dedo) y, en el último, un toque en el ♥ con el «aaah» del catálogo; se queda un momento, el teléfono vuelve al zoom de antes y
 * empieza de nuevo (unos 12,5 s). Todo son animaciones de CSS (transform y opacity), sin iframes ni video. Se pausa cuando no se ve
 * (useEnPantalla). Con movimiento reducido no se mueve: se ve el catálogo dentro del navegador, quieto. Es decoración: quien la
 * usa la esconde a los lectores de pantalla y dice lo mismo con texto.
 * Reutilizable: el paso `enlace` de «Cómo funciona» (docs/prompts/conoce-recorte-y-arreglos.md) la usa con `unaVez`: corre una sola
 * vez cada vez que se llega al paso (perfil-a-catalogo.css) y se queda en el catálogo abierto, sin alejarse ni desvanecerse (la landing
 * ya la muestra entera). Su ancho lo pone quien la usa; su alto sale de la proporción del iPhone del mockup (640×1350).
 */
export function PerfilACatalogo({ className, unaVez = false }: { className?: string; unaVez?: boolean }) {
  const caja = useRef<HTMLDivElement>(null);

  // Mientras no se ve, queda en pausa (y empieza desde el principio la primera vez que aparece).
  // El teléfono va cortado por la vista previa (se ve poco más de la mitad): el umbral es menor que el de las otras tarjetas.
  const visible = useEnPantalla(caja, 0.4);

  return (
    <TelefonoMockup ref={caja} className={className ? `pc ${className}` : "pc"} data-pausa={visible || unaVez ? "no" : "si"} data-una-vez={unaVez ? "" : undefined}>
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
    </TelefonoMockup>
  );
}
