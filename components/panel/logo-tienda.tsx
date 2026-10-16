import type { CSSProperties } from "react";
import type { Tienda } from "@/lib/types";
import { iniciales } from "@/lib/formato";
import { Foto } from "../foto";
import { AroAnimado } from "./aro-animado";
import "./aro-circulo.css";

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

/** El corazón del «aaah» (el mismo trazado del icono `heart` del catálogo). */
const CORAZON = "M12 20.3s-7.3-4.4-9.2-8.9C1.3 7.9 3.4 4.6 6.8 4.6c2.1 0 3.5 1.1 5.2 3 1.7-1.9 3.1-3 5.2-3 3.4 0 5.5 3.3 4 6.8-1.9 4.5-9.2 8.9-9.2 8.9z";

/**
 * El sello del Círculo: círculo verde con el corazón rosa y borde crema (referencias/circulo/LEEME.md). Lo usa el aro del avatar (donde
 * lo coloca `.aro-c-sello`) y la línea de cada plan en /planes (con `filo`: un anillo mandarina por fuera).
 */
export function SelloCorazon({ tamano, borde, filo = 0, className, style }: { tamano: number; borde: number; filo?: number; className?: string; style?: CSSProperties }) {
  return (
    <span
      className={className}
      style={{ width: tamano, height: tamano, background: BOSQUE, border: `${borde}px solid ${PAPEL}`, boxSizing: "border-box", borderRadius: "50%", display: "grid", placeItems: "center", boxShadow: filo ? `0 0 0 ${filo}px ${MANDARINA}` : undefined, ...style }}
      aria-hidden="true"
    >
      <svg width={tamano * 0.6} height={tamano * 0.6} viewBox="0 0 24 24" fill={ROSA} stroke="none">
        <path d={CORAZON} />
      </svg>
    </span>
  );
}

/** `ninguna`: aro quieto (el de siempre). `entrada`: los aros salen desde el centro una vez. `ondas`: la entrada y después ondas en bucle. */
export type AnimacionAro = "ninguna" | "entrada" | "ondas";

/**
 * Tres aros pegados alrededor del avatar (por dentro mandarina, en medio rosa, por fuera verde) y el sello verde con el corazón
 * rosa montado abajo a la derecha (opción 6, referencias/circulo/LEEME.md). Mide `tamano` por fuera: la foto se reduce. Solo en el
 * panel, nunca a los compradores. Con `animacion` se mueve (./aro-circulo.css, solo transform y opacity); las ondas crecen hasta
 * ~1,45 veces por fuera del avatar: quien lo usa deja aire alrededor.
 */
function AvatarConAro({ tienda, tamano, animacion }: Props & { tamano: number; animacion: AnimacionAro }) {
  const grande = tamano >= 56;
  const aro = grande ? 4 : Math.max(1.5, Math.min(2, tamano * 0.04));
  const borde = grande ? 3 : 1.5;
  const interior = tamano - 2 * (3 * aro + borde);
  const sello = Math.round(tamano * 0.43);
  const centro = (tamano / 2) * (1 + Math.SQRT1_2);
  const etiqueta = `${tienda.nombre}, del Círculo Deslizapp`;
  const dentro = (
    <>
      {/* Las ondas, debajo de los aros fijos: nacen del aro mandarina. */}
      {([["mandarina", 0], ["rosa", 0.8], ["bosque", 1.6]] as const).map(([color, retraso]) => (
        <span key={color} className="aro-c-onda" data-onda={color} style={{ inset: 2 * aro, borderWidth: aro, ["--retraso" as string]: `${retraso}s` }} aria-hidden="true" />
      ))}
      {/* Verde por fuera, rosa en medio, mandarina por dentro; cada uno es su propio círculo. */}
      <span className="aro-c-anillo" data-aro="3" style={{ inset: 0, borderWidth: aro, borderColor: BOSQUE }} aria-hidden="true" />
      <span className="aro-c-anillo" data-aro="2" style={{ inset: aro, borderWidth: aro, borderColor: ROSA }} aria-hidden="true" />
      <span className="aro-c-anillo" data-aro="1" style={{ inset: 2 * aro, borderWidth: aro, borderColor: MANDARINA }} aria-hidden="true" />
      <span className="aro-c-foto" style={{ inset: 3 * aro, padding: borde, background: PAPEL }}>
        <Avatar tienda={tienda} tamano={interior} />
      </span>
      <SelloCorazon className="aro-c-sello" tamano={sello} borde={grande ? 2 : 1.5} style={{ left: centro - sello / 2, top: centro - sello / 2 }} />
    </>
  );
  const estilo = { width: tamano, height: tamano };
  if (animacion === "ninguna") {
    return (
      <span style={estilo} className="aro-c" data-aro-circulo="" role="img" aria-label={etiqueta}>
        {dentro}
      </span>
    );
  }
  return (
    <AroAnimado animacion={animacion} estilo={estilo} etiqueta={etiqueta}>
      {dentro}
    </AroAnimado>
  );
}

/** El avatar de la tienda; con aro mientras la tienda sea del Círculo Deslizapp (aunque ya no tenga descuento). */
export function LogoTienda({ tienda, tamano = 42, animacion = "ninguna" }: Props & { animacion?: AnimacionAro }) {
  if (tienda.circulo) return <AvatarConAro tienda={tienda} tamano={tamano} animacion={animacion} />;
  return <Avatar tienda={tienda} tamano={tamano} />;
}
