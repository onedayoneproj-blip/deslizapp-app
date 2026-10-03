import { IconoCheck } from "../iconos";
import { clases } from "./comunes";

/**
 * Check de selección en círculo (el mismo de `Opcion`): marcado, relleno `accion` con la palomita; sin marcar, solo el aro.
 * Decorativo: el que lo contiene (fila con role="checkbox") dice el estado.
 */
export function CheckSeleccion({ marcado, className }: { marcado: boolean; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={clases(
        "grid size-5 shrink-0 place-items-center rounded-full",
        marcado ? "mov-pop-aparece bg-accion text-sobre-accion" : "border-[1.5px] border-borde-campo",
        className,
      )}
    >
      {marcado && <IconoCheck tamano={13} strokeWidth={3} />}
    </span>
  );
}
