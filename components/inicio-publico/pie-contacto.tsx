import { INSTAGRAM_DESLIZAPP } from "@/lib/config";
import { CORREO_CONTACTO, ENLACE_INSTAGRAM } from "@/lib/landing/enlaces";
import type { Evento } from "@/lib/medicion/eventos";
import { IconoInstagram, IconoSobre } from "../iconos";
import { EnlaceMedido } from "./medicion";
import "./pie-contacto.css";

/**
 * El pie de contacto de las páginas públicas (`/`, /planes y el cierre de /conoce): una línea con el Instagram de Deslizapp y el correo de
 * contacto, en texto pequeño y con zonas táctiles de 44 px. Si no cabe, pasa a dos líneas. El nombre de Instagram y el enlace salen de
 * lib/config.ts y lib/landing/enlaces.ts. `eventoInstagram`: el evento de medición que ya existe para ese destino en esa página (el toque en
 * el Instagram cuenta como el de «Escríbenos»); el correo no se mide (ningún evento existente encaja). `tono`: «bosque» para fondos verdes.
 */
export function PieContacto({ eventoInstagram, className }: { eventoInstagram?: Evento; className?: string }) {
  const instagram = (
    <>
      <IconoInstagram tamano={16} strokeWidth={2.2} />@{INSTAGRAM_DESLIZAPP}
    </>
  );
  return (
    <p className={className ? `pie-contacto ${className}` : "pie-contacto"}>
      {eventoInstagram ? (
        <EnlaceMedido evento={eventoInstagram} href={ENLACE_INSTAGRAM} target="_blank" rel="noopener noreferrer" className="pie-contacto-enlace tocable" data-cta="pie-instagram">
          {instagram}
        </EnlaceMedido>
      ) : (
        <a href={ENLACE_INSTAGRAM} target="_blank" rel="noopener noreferrer" className="pie-contacto-enlace tocable" data-cta="pie-instagram">
          {instagram}
        </a>
      )}
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
