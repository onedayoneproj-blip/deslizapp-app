import type { HTMLAttributes, ReactNode, Ref } from "react";
import "./telefono-mockup.css";

/**
 * El iPhone de «Cómo funciona» (public/landing/mockup-negro.webp, 640×1350) para las pantallas decorativas de la landing y de /planes: su
 * pantalla es el hueco (mismas medidas y mismas esquinas que `.lt-hueco`) y el marco con la isla va encima. Un solo factor de escala: el
 * ancho lo pone quien lo usa y el alto sale de la proporción del mockup. Se puede recortar por abajo con un contenedor de overflow hidden.
 * Lo de adentro (`children`) mide en cqw si es su propio contenedor (los hijos de `.tm-pantalla` miden contra su ancho). `marco="titanio"`: el
 * del teléfono de quien compra en la demo (mockup-titanio.webp, 640×1325); por defecto, el negro de la tienda.
 */
export function TelefonoMockup({ children, className, ref, marco = "negro", ...resto }: { children: ReactNode; className?: string; ref?: Ref<HTMLDivElement>; marco?: "negro" | "titanio" } & Omit<HTMLAttributes<HTMLDivElement>, "children" | "className">) {
  return (
    <div {...resto} ref={ref} className={className ? `tm ${className}` : "tm"} data-marco={marco === "titanio" ? "titanio" : undefined}>
      <div className="tm-pantalla">{children}</div>
      {/* eslint-disable-next-line @next/next/no-img-element -- marco del teléfono: imagen estática, sin optimizador */}
      <img className="tm-marco" src={marco === "titanio" ? "/landing/mockup-titanio.webp" : "/landing/mockup-negro.webp"} alt="" width={640} height={marco === "titanio" ? 1325 : 1350} decoding="async" />
    </div>
  );
}
