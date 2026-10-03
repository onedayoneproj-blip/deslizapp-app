import type { ReactNode } from "react";
import { Boton } from "./boton";
import { clases } from "./comunes";

export type TonoAviso = "neutro" | "atencion" | "exito" | "peligro";

const TONO: Record<TonoAviso, string> = {
  neutro: "bg-superficie-hundida text-texto",
  atencion: "bg-atencion-suave text-texto",
  exito: "bg-accion-suave text-texto",
  peligro: "bg-atencion-suave font-bold text-peligro",
};

/**
 * Aviso en línea (docs/09 §8): información o advertencia sobre lo que se ve. No flota ni se va solo. `radio-m`, relleno 12 × 16.
 * Si necesita acción, lleva un botón terciario al final (nunca un texto subrayado). El de peligro se anuncia (role="alert").
 */
export function Aviso({
  tono = "neutro",
  icono,
  accion,
  children,
  className,
}: {
  tono?: TonoAviso;
  icono?: ReactNode;
  accion?: { texto: string; alTocar: () => void };
  children: ReactNode;
  className?: string;
}) {
  return (
    <div role={tono === "peligro" ? "alert" : undefined} className={clases("flex items-start gap-2.5 rounded-radio-m px-4 py-3 text-cuerpo", TONO[tono], className)}>
      {icono && <span className="mt-0.5 shrink-0">{icono}</span>}
      <div className="min-w-0 flex-1">{children}</div>
      {accion && (
        <Boton jerarquia="terciario" tamano="compacto" onClick={accion.alTocar} className="-my-1.5 -mr-2">
          {accion.texto}
        </Boton>
      )}
    </div>
  );
}
