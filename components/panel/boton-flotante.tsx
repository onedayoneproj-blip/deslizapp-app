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
          className="pointer-events-auto flex h-[54px] items-center gap-2 rounded-full bg-resalte pr-5 pl-4 text-cuerpo font-extrabold text-sobre-resalte shadow-flotante tocable outline-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco"
        >
          <IconoMas tamano={22} />
          {texto}
          {detalle && (
            <span className="text-etiqueta opacity-80">
              · {detalle}
            </span>
          )}
        </Link>
      </div>
    </>
  );
}
