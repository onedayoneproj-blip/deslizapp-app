import { textoSelloCirculo } from "@/lib/circulo";
import { CAPAS_SELLO, PATH_SELLO, RELLENO_SELLO, VIEWBOX_SELLO } from "@/lib/planes/sello";

/**
 * El sello «-30 %» de las primeras tiendas (el Círculo), junto al selector de /planes en «Anual»: una estrella de 12 puntas redondeadas
 * con los bordes del aro (crema por dentro, y mandarina, rosa y verde alrededor, más un filo crema por fuera). Solo decorativo
 * (`aria-hidden`): la cinta de cada tarjeta lo dice en texto. El texto va centrado y con `textLength`, así nunca se sale del relleno.
 */
export function SelloCirculo() {
  return (
    <span className="pl-sello" aria-hidden="true" data-sello="circulo">
      <svg viewBox={VIEWBOX_SELLO} width="100%" height="100%" style={{ display: "block", overflow: "visible", transform: "rotate(-8deg)" }}>
        {CAPAS_SELLO.map((c) => (
          <path key={c.stroke} d={PATH_SELLO} fill="none" stroke={c.stroke} strokeWidth={c.ancho} strokeLinejoin="round" />
        ))}
        <path d={PATH_SELLO} fill={RELLENO_SELLO} stroke="none" />
        <g textAnchor="middle">
          <text x="0" y="-14" fill="#C24E18" fontSize="17" fontWeight="700" style={{ fontFamily: "var(--font-mano)" }} textLength="74" lengthAdjust="spacingAndGlyphs">
            primeras tiendas
          </text>
          <text x="0" y="17" fill="#174B3A" fontSize="34" fontWeight="700" style={{ fontFamily: "var(--font-display)", fontStretch: "100%" }}>
            {textoSelloCirculo}
          </text>
          <text x="0" y="33" fill="#174B3A" fontSize="10" fontWeight="800" letterSpacing="1.2" style={{ fontFamily: "var(--font-sans)" }} textLength="56" lengthAdjust="spacingAndGlyphs">
            EL 1.er AÑO
          </text>
        </g>
      </svg>
    </span>
  );
}
