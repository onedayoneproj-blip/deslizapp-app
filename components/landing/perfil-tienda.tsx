import type { ReactNode } from "react";
import { Foto } from "../foto";
import { IconoEnlace } from "../iconos";
import "./perfil-tienda.css";

const FOTOS_PERFIL = ["/landing/feed-termo.webp", "/landing/feed-tote.webp", "/landing/feed-gorra.webp", "/landing/feed-gorra.webp", "/landing/feed-termo.webp", "/landing/feed-tote.webp"];

/**
 * El perfil de una tienda en una red social, en modo oscuro como en la grabación de Lewis (referencias/planes/instagram-perfil-a-catalogo/):
 * «‹ usuario ···», la foto, el nombre, publicaciones, seguidores y seguidos, la bio, el enlace azul con su cadena, «Seguir» y «Mensaje»,
 * y la cuadrícula con las fotos de los productos. Genérico: sin el logo ni la interfaz exacta de Instagram. Es la pantalla `perfil` de
 * «Cómo funciona» (docs/prompts/conoce-portada-narrativa.md) y parte de la vista previa de «Tu catálogo en el link de tu bio» en /planes.
 *
 * Todo se mide en `cqw` (centésimas del ancho de la propia pantalla) y con `aspect-ratio`: se ve igual de grande o de chica sin estirarse
 * ni aplastarse. Es decoración: quien la usa la esconde a los lectores de pantalla. `sobreEnlace` va dentro del enlace (el círculo de toque).
 */
export function PerfilTienda({
  usuario = "tutienda.rd",
  nombre = "Tu Tienda",
  iniciales = "TT",
  bio = ["Gorras, termos y totes 🇩🇴", "Envíos a todo el país"],
  enlace = "deslizapp.com/tutienda",
  fotos = FOTOS_PERFIL,
  sobreEnlace,
}: {
  usuario?: string;
  nombre?: string;
  iniciales?: string;
  bio?: string[];
  enlace?: string;
  fotos?: string[];
  sobreEnlace?: ReactNode;
}) {
  return (
    <div className="pt">
      <div className="pt-arriba">
        <svg viewBox="0 0 24 24" className="pt-atras" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 5l-7 7 7 7" />
        </svg>
        <b>{usuario}</b>
        <span className="pt-mas">···</span>
      </div>
      <div className="pt-cabeza">
        <span className="pt-avatar">{iniciales}</span>
        <div className="pt-datos">
          <b className="pt-nombre">{nombre}</b>
          <span className="pt-cifras">
            <span>
              <b>6</b>publicaciones
            </span>
            <span>
              <b>248</b>seguidores
            </span>
            <span>
              <b>3</b>seguidos
            </span>
          </span>
        </div>
      </div>
      <div className="pt-bio">
        {bio.map((linea) => (
          <span key={linea}>{linea}</span>
        ))}
      </div>
      <div className="pt-enlace-caja">
        <span className="pt-enlace">
          <IconoEnlace tamano={14} strokeWidth={2.2} />
          {enlace}
          {sobreEnlace}
        </span>
      </div>
      <div className="pt-botones">
        <span className="pt-seguir">Seguir</span>
        <span className="pt-mensaje">Mensaje</span>
      </div>
      <div className="pt-pestana">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 3h5v5H3zM9.5 3h5v5h-5zM16 3h5v5h-5zM3 9.5h5v5H3zM9.5 9.5h5v5h-5zM16 9.5h5v5h-5zM3 16h5v5H3zM9.5 16h5v5h-5zM16 16h5v5h-5z" />
        </svg>
      </div>
      <div className="pt-fotos">
        {fotos.map((src, i) => (
          <Foto key={i} src={src} alt="" className="pt-foto" sizes="80px" />
        ))}
      </div>
    </div>
  );
}
