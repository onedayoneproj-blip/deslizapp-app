import type { HTMLAttributes, ReactNode } from "react";
import "./burbuja-chat.css";

/** Los dos trazos del doble check (viewBox 18×11). */
function Trazos({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 18 11">
      <path className="bc-check bc-check-1" pathLength={1} d="M1 5.4l3.8 4L11.2 1.4" />
      <path className="bc-check bc-check-2" pathLength={1} d="M7 7.6l1.8 1.8L15.2 1.4" />
    </svg>
  );
}

/**
 * El doble check. «azules»: el «leído» de siempre. «grises-a-azules»: dos checks encimados, uno gris y uno azul (`.bc-leido`), para que
 * quien anima la burbuja pase de «recibido» a «leído» con solo opacity; en reposo se ve el azul.
 */
function Checks({ tipo }: { tipo: "azules" | "grises-a-azules" }) {
  if (tipo === "azules") return <Trazos className="bc-checks" />;
  return (
    <span className="bc-checks-par">
      <Trazos className="bc-checks bc-gris" />
      <Trazos className="bc-checks bc-leido" />
    </span>
  );
}

/**
 * Un mensaje de WhatsApp (ajustes-lewis-4.md y -8.md de la landing): la burbuja de «Cómo funciona» y del chat de /planes.
 * - `enviado`: verde claro (#D9FDD3), la hora con el doble check y la cola de una pieza abajo a la derecha.
 * - `recibido`: la misma forma reflejada: blanca, la hora sin check y la cola abajo a la izquierda.
 * La cola (`cola`) es solo del último mensaje de cada grupo. Quien la coloca (la landing la apila y la anima; el chat la deja en
 * el flujo) la posiciona con su `className`; el resto de atributos (`data-*`) pasan al contenedor. Sin `aria-live`: lo pone quien
 * agrupa las burbujas.
 */
export function BurbujaChat({
  lado = "enviado",
  cola = true,
  hora,
  bloque = false,
  checks = "azules",
  children,
  className,
  ...resto
}: {
  lado?: "enviado" | "recibido";
  cola?: boolean;
  /** La hora que se ve abajo. Es decoración (aria-hidden): el mensaje dice lo mismo sin ella. */
  hora: string;
  /** El contenido lleva bloques (una vista previa de enlace, varios párrafos): va en un <div> en vez de en un <p>. */
  bloque?: boolean;
  /** Solo en `enviado`: ver Checks. */
  checks?: "azules" | "grises-a-azules";
  children: ReactNode;
  className?: string;
} & Omit<HTMLAttributes<HTMLDivElement>, "children" | "className">) {
  return (
    <div {...resto} className={className ? `bc ${className}` : "bc"} data-bc={lado} data-cola={cola ? "si" : "no"}>
      {bloque ? (
        <div className="bc-texto">
          {children}
          <span className="bc-hueco" aria-hidden="true" />
        </div>
      ) : (
        <p className="bc-texto">
          {children}
          <span className="bc-hueco" aria-hidden="true" />
        </p>
      )}
      <span className="bc-hora" aria-hidden="true">
        {hora}
        {lado === "enviado" && <Checks tipo={checks} />}
      </span>
      {/* La cola: sale de la esquina de abajo con una curva continua y se afina hacia fuera (r8-cola-burbuja-referencia.webp) */}
      <svg className="bc-cola" viewBox="0 0 34 22" aria-hidden="true">
        <path d="M18 0V9C18 15 20.8 19.6 30 22C22 22.8 16.6 21.6 13.2 19.4C9.4 21.2 4.6 22 0 22V0Z" />
      </svg>
    </div>
  );
}
