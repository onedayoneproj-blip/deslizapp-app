import { Foto } from "../foto";
import { IconoEnlace } from "../iconos";
import "./perfil-tienda.css";

const FOTOS_PERFIL = ["/landing/feed-termo.webp", "/landing/feed-tote.webp", "/landing/feed-gorra.webp"];

/**
 * El perfil de una tienda en una red social (genérica: sin el logo ni la interfaz exacta de Instagram), con el enlace de su
 * catálogo en la bio. Es la pantalla `perfil` de «Cómo funciona» (docs/prompts/conoce-portada-narrativa.md,
 * referencias/landing/conoce-narrativa/Perfil.dc.html) y la vista previa de «Tu catálogo en el link de tu bio» en /planes. Es
 * decoración: quien la usa la esconde a los lectores de pantalla y dice lo mismo con texto. El ancho lo pone quien la usa.
 */
export function PerfilTienda({
  usuario = "tutienda.rd",
  nombre = "Tu Tienda",
  iniciales = "TT",
  bio = ["Gorras, termos y totes 🇩🇴", "Envíos a todo el país"],
  enlace = "deslizapp.com/tutienda",
  fotos = FOTOS_PERFIL,
}: {
  usuario?: string;
  nombre?: string;
  iniciales?: string;
  bio?: string[];
  enlace?: string;
  fotos?: string[];
}) {
  return (
    <div className="pt">
      <div className="pt-usuario">{usuario}</div>
      <div className="pt-cabeza">
        <span className="pt-aro">
          <span className="pt-avatar">{iniciales}</span>
        </span>
        <span className="pt-cifras">
          <span>
            <b>48</b>publicaciones
          </span>
          <span>
            <b>2.3 mil</b>seguidores
          </span>
        </span>
      </div>
      <div className="pt-bio">
        <b>{nombre}</b>
        {bio.map((linea) => (
          <span key={linea}>{linea}</span>
        ))}
      </div>
      <div className="pt-enlace">
        <IconoEnlace tamano={14} strokeWidth={2.4} />
        {enlace}
      </div>
      <div className="pt-fotos">
        {fotos.map((src) => (
          <Foto key={src} src={src} alt="" className="pt-foto" sizes="80px" />
        ))}
      </div>
    </div>
  );
}
