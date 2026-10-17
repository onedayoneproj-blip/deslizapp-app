import { INSTAGRAM_DESLIZAPP } from "@/lib/config";
import { CORREO_CONTACTO, ENLACE_INSTAGRAM } from "@/lib/landing/enlaces";
import { IconoInstagram, IconoSobre } from "../iconos";
import "./pie-contacto.css";

/**
 * El pie de contacto de las páginas públicas (`/`, /planes y el cierre de /conoce): una línea con el Instagram de Deslizapp y el correo de
 * contacto, en texto pequeño y con zonas táctiles de 44 px. Si no cabe, pasa a dos líneas. El nombre de Instagram y el enlace salen de
 * lib/config.ts y lib/landing/enlaces.ts. No se mide: así los datos del botón «Escríbenos» no se mezclan con los del pie.
 */
export function PieContacto({ className }: { className?: string }) {
  const instagram = (
    <>
      <IconoInstagram tamano={16} strokeWidth={2.2} />@{INSTAGRAM_DESLIZAPP}
    </>
  );
  return (
    <p className={className ? `pie-contacto ${className}` : "pie-contacto"}>
      <a href={ENLACE_INSTAGRAM} target="_blank" rel="noopener noreferrer" className="pie-contacto-enlace tocable" data-cta="pie-instagram">
        {instagram}
      </a>
      <span className="pie-contacto-punto" aria-hidden="true">
        ·
      </span>
      <a href={`mailto:${CORREO_CONTACTO}`} className="pie-contacto-enlace tocable" data-cta="pie-correo">
        <IconoSobre tamano={16} strokeWidth={2.2} />
        {CORREO_CONTACTO}
      </a>
    </p>
  );
}
