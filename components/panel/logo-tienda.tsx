import type { Tienda } from "@/lib/types";
import { iniciales } from "@/lib/formato";
import { Foto } from "../foto";

type Props = { tienda: Pick<Tienda, "nombre" | "logoUrl" | "circulo">; tamano?: number };

const MANDARINA = "#FF834F";
const ROSA = "#F5C9D6";
const BOSQUE = "#174B3A";
const PAPEL = "#FFF9EE";

/** Foto de la tienda circular (en Rosa Suave con iniciales si no tiene foto). */
function Avatar({ tienda, tamano }: Props & { tamano: number }) {
  const estilo = { width: tamano, height: tamano };
  if (tienda.logoUrl) {
    return (
      <span style={estilo} className="block shrink-0 overflow-hidden rounded-full">
        <Foto src={tienda.logoUrl} alt={`Logo de ${tienda.nombre}`} className="h-full w-full" sizes={`${Math.ceil(tamano)}px`} />
      </span>
    );
  }
  return (
    <span style={{ ...estilo, fontSize: tamano < 56 ? 14 : Math.round(tamano * 0.3) }} className="grid shrink-0 place-items-center rounded-full bg-rosa font-extrabold text-bosque" aria-hidden="true">
      {iniciales(tienda.nombre)}
    </span>
  );
}

/**
 * Tres aros pegados alrededor del avatar (por dentro mandarina, en medio rosa, por fuera verde) y el sello verde con el corazón
 * rosa montado abajo a la derecha (opción 6, referencias/circulo/LEEME.md). Mide `tamano` por fuera: la foto se reduce. Solo en el
 * panel, nunca a los compradores.
 */
function AvatarConAro({ tienda, tamano }: Props & { tamano: number }) {
  const grande = tamano >= 56;
  const aro = grande ? 4 : Math.max(1.5, Math.min(2, tamano * 0.04));
  const borde = grande ? 3 : 1.5;
  const interior = tamano - 2 * (3 * aro + borde);
  const sello = Math.round(tamano * 0.43);
  const centro = (tamano / 2) * (1 + Math.SQRT1_2);
  return (
    <span
      style={{ width: tamano, height: tamano, padding: aro, background: BOSQUE }}
      className="relative block shrink-0 rounded-full"
      data-aro-circulo=""
      role="img"
      aria-label={`${tienda.nombre}, del Círculo Deslizapp`}
    >
      <span style={{ padding: aro, background: ROSA }} className="block h-full w-full rounded-full">
        <span style={{ padding: aro, background: MANDARINA }} className="block h-full w-full rounded-full">
          <span style={{ padding: borde, background: PAPEL }} className="grid h-full w-full place-items-center rounded-full">
            <Avatar tienda={tienda} tamano={interior} />
          </span>
        </span>
      </span>
      <span
        style={{ width: sello, height: sello, left: centro - sello / 2, top: centro - sello / 2, background: BOSQUE, border: `${grande ? 2 : 1.5}px solid ${PAPEL}` }}
        className="absolute grid place-items-center rounded-full"
        aria-hidden="true"
      >
        <svg width={sello * 0.6} height={sello * 0.6} viewBox="0 0 24 24" fill={ROSA} stroke="none">
          <path d="M12 20.3s-7.3-4.4-9.2-8.9C1.3 7.9 3.4 4.6 6.8 4.6c2.1 0 3.5 1.1 5.2 3 1.7-1.9 3.1-3 5.2-3 3.4 0 5.5 3.3 4 6.8-1.9 4.5-9.2 8.9-9.2 8.9z" />
        </svg>
      </span>
    </span>
  );
}

/** El avatar de la tienda; con aro mientras la tienda sea del Círculo Deslizapp (aunque ya no tenga descuento). */
export function LogoTienda({ tienda, tamano = 42 }: Props) {
  if (tienda.circulo) return <AvatarConAro tienda={tienda} tamano={tamano} />;
  return <Avatar tienda={tienda} tamano={tamano} />;
}
