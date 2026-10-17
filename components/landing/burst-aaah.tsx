import type { CSSProperties } from "react";
import { Icono } from "../tienda/iconos";
import "./burst-aaah.css";

const COLORES = ["#F5C9D6", "#FF834F", "#FFF9EE", "#174B3A"];

/**
 * El «aaah» del «Lo quiero» del catálogo (el `.burst` de components/tienda/reel.tsx y app/tienda/catalogo.css): el corazón grande
 * en mandarina, diez partículas que salen en abanico y «aaah» debajo. Mismas medidas y mismos tiempos (1,1 s), pero en `cqw` para que
 * valga a cualquier tamaño de pantalla, y la línea de tiempo la pone quien lo usa (en `.pc` de perfil-a-catalogo.css, dentro de su
 * bucle): aquí solo está lo que se dibuja. Decoración: aria-hidden.
 */
export function BurstAaah({ aaah = "aaaah", className }: { aaah?: string; className?: string }) {
  return (
    <div className={className ? `ba ${className}` : "ba"} aria-hidden="true">
      <Icono nombre="heart" />
      {Array.from({ length: 10 }, (_, k) => (
        <i key={k} className={"ba-pp" + (k % 3 === 2 ? " sq" : "")} style={{ "--a": `${k * 36}deg`, "--c": COLORES[k % 4] } as CSSProperties} />
      ))}
      <span className="ba-aw">{aaah}</span>
    </div>
  );
}
