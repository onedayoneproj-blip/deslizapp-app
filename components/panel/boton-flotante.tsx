import Link from "next/link";
import { IconoMas } from "../iconos";

/** Botón flotante Mandarina ("+ Producto", "+ Pedido"…), encima de la barra inferior. */
export function BotonFlotante({
  href,
  texto,
  detalle,
}: {
  href: string;
  texto: string;
  detalle?: string;
}) {
  return (
    <>
      {/* Reserva el lugar del botón al final del contenido: así no tapa el último elemento */}
      <div aria-hidden="true" className="h-[calc(54px+12px)]" />
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--nav-abajo)+12px)] z-20 mx-auto flex max-w-[480px] justify-end px-[18px]">
        <Link
          href={href}
          scroll={false}
          className="pointer-events-auto flex h-[54px] items-center gap-2 rounded-full bg-mandarina pr-5 pl-4 text-[15.5px] font-extrabold text-bosque-oscuro shadow-[0_10px_24px_-10px_rgba(23,75,58,0.6)] tocable"
        >
          <IconoMas tamano={22} />
          {texto}
          {detalle && (
            <span className="text-[12.5px] font-bold opacity-80">
              · {detalle}
            </span>
          )}
        </Link>
      </div>
    </>
  );
}
