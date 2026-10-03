"use client";

import Link from "next/link";
import { useRef, useState, type ComponentProps, type MouseEvent, type ReactNode } from "react";
import { IconoWhatsApp } from "../iconos";
import { clases, FOCO, TOQUE_44 } from "./comunes";

export type JerarquiaBoton = "principal" | "secundario" | "terciario" | "peligro" | "resalte";
export type TamanoBoton = "grande" | "normal" | "compacto";

const JERARQUIA: Record<JerarquiaBoton, string> = {
  principal: "border-accion bg-accion text-sobre-accion",
  secundario: "border-accion bg-superficie text-accion",
  terciario: "border-transparent bg-transparent text-accion",
  peligro: "border-peligro bg-transparent text-peligro",
  resalte: "border-resalte bg-resalte text-sobre-resalte",
};
/** Relleno de peligro: SOLO el botón final de una Alerta. */
const PELIGRO_RELLENO = "border-peligro bg-peligro text-sobre-peligro";

const TAMANO: Record<TamanoBoton, string> = {
  grande: "h-(--alto-boton-grande) text-destacado",
  normal: "h-(--alto-control) text-cuerpo font-extrabold",
  compacto: `h-(--alto-compacto) text-secundario font-extrabold ${TOQUE_44}`,
};
// El relleno horizontal va aparte (uno solo por botón: dos clases px-* a la vez no se pisan de forma fiable)
const PX: Record<TamanoBoton, string> = { grande: "px-6", normal: "px-5", compacto: "px-3.5" };
const PX_TERCIARIO: Record<TamanoBoton, string> = { grande: "px-3", normal: "px-2", compacto: "px-2" };

type Comun = {
  jerarquia?: JerarquiaBoton;
  tamano?: TamanoBoton;
  /** Icono a la izquierda (de components/iconos.tsx). */
  icono?: ReactNode;
  anchoCompleto?: boolean;
  /** Muestra tres puntos y no responde a toques (evita el doble envío). */
  cargando?: boolean;
  deshabilitado?: boolean;
  /** Solo con jerarquia="terciario": "peligro" pone el texto en `peligro` (Cancelar pedido, Borrar abono), sin contorno. */
  tono?: "neutro" | "peligro";
  /** "Escribir por WhatsApp": siempre compacto, relleno `accion` y con el icono de WhatsApp (docs/09 §5). */
  whatsapp?: boolean;
  /** Solo con jerarquia="peligro" dentro de una Alerta: relleno de peligro. */
  relleno?: boolean;
  /**
   * Se ve como botón pero no lo es: un <span> decorativo para cuando todo lo que lo rodea ya es el botón (la Tarjeta de jugada). Sin
   * foco ni toque propios; el nombre accesible lo lleva el contenedor.
   */
  soloVista?: boolean;
  className?: string;
  children: ReactNode;
};

type ComoBoton = Comun & Omit<ComponentProps<"button">, "children" | "className" | "disabled"> & { href?: undefined };
type ComoEnlace = Comun & Omit<ComponentProps<"a">, "children" | "className" | "href"> & {
  href: string;
  /** Solo rutas internas: false para abrir hojas sin volver arriba de la página (como el resto de enlaces de hojas de la app). */
  scroll?: boolean;
};

/**
 * Botón píldora del sistema (docs/09 §5, referencias/sistema-de-diseno/componentes/Boton.md).
 * Con `href` es un enlace (Link de Next para rutas internas; <a> para direcciones externas). Si `onClick` devuelve una
 * promesa, el botón se bloquea hasta que termine: un segundo toque no repite la acción.
 */
export function Boton(props: ComoBoton | ComoEnlace) {
  const { jerarquia: jerarquiaPedida = "principal", tamano: tamanoPedido = "normal", tono = "neutro", whatsapp = false, icono: iconoPedido, anchoCompleto, cargando = false, deshabilitado = false, relleno, soloVista = false, className, children, ...resto } = props;
  const jerarquia = whatsapp ? "principal" : jerarquiaPedida;
  const tamano = whatsapp ? "compacto" : tamanoPedido;
  const icono = whatsapp ? <IconoWhatsApp tamano={18} /> : iconoPedido;
  const [ocupado, setOcupado] = useState(false);
  // Candado síncrono: un segundo toque antes de volver a pintar tampoco pasa
  const enCurso = useRef(false);
  const bloqueado = deshabilitado || cargando || ocupado;
  const conPuntos = cargando || ocupado;

  const cls = clases(
    "tocable relative inline-flex shrink-0 items-center justify-center gap-2 rounded-full border-[1.5px] whitespace-nowrap select-none",
    FOCO,
    TAMANO[tamano],
    jerarquia === "terciario" ? PX_TERCIARIO[tamano] : PX[tamano],
    jerarquia === "peligro" && relleno ? PELIGRO_RELLENO : jerarquia === "terciario" && tono === "peligro" ? "border-transparent bg-transparent text-peligro" : JERARQUIA[jerarquia],
    anchoCompleto && "w-full",
    deshabilitado && "opacity-40",
    bloqueado ? "cursor-not-allowed" : "cursor-pointer",
    className,
  );
  const contenido = (
    <>
      {/* Mientras carga se conserva el ancho (el texto queda invisible debajo de los puntos) */}
      <span className={clases("inline-flex items-center gap-2", conPuntos && "opacity-0")}>
        {icono}
        {children}
      </span>
      {conPuntos && (
        <span className="ui-puntos absolute inset-0 flex items-center justify-center gap-1" aria-hidden="true">
          <span className="size-1.5 rounded-full bg-current" />
          <span className="size-1.5 rounded-full bg-current" />
          <span className="size-1.5 rounded-full bg-current" />
        </span>
      )}
    </>
  );

  if (soloVista) {
    return (
      <span aria-hidden="true" className={cls}>
        {contenido}
      </span>
    );
  }

  if (resto.href !== undefined) {
    const { href, onClick, scroll, ...a } = resto as ComoEnlace;
    const alTocar = (e: MouseEvent<HTMLAnchorElement>) => {
      if (bloqueado) {
        e.preventDefault();
        return;
      }
      onClick?.(e);
    };
    const externo = /^(https?:|mailto:|tel:)/.test(href);
    if (externo)
      return (
        <a {...a} href={href} onClick={alTocar} aria-disabled={bloqueado || undefined} className={cls}>
          {contenido}
        </a>
      );
    return (
      <Link {...a} href={href} scroll={scroll} onClick={alTocar} aria-disabled={bloqueado || undefined} className={cls}>
        {contenido}
      </Link>
    );
  }

  const { onClick, type = "button", ...b } = resto as ComoBoton;
  const alTocar = (e: MouseEvent<HTMLButtonElement>) => {
    if (bloqueado || enCurso.current) return;
    const r = onClick?.(e) as unknown;
    if (r instanceof Promise) {
      enCurso.current = true;
      setOcupado(true);
      r.finally(() => {
        enCurso.current = false;
        setOcupado(false);
      });
    }
  };
  return (
    <button
      {...b}
      type={type}
      onClick={alTocar}
      disabled={deshabilitado}
      aria-disabled={bloqueado || undefined}
      aria-busy={conPuntos || undefined}
      className={cls}
    >
      {contenido}
    </button>
  );
}

/** Botón redondo de solo icono (44 px, superficie-hundida): cerrar, volver. Siempre con etiqueta accesible. */
export function BotonIcono({
  etiqueta,
  tono = "neutro",
  children,
  className,
  ...resto
}: Omit<ComponentProps<"button">, "aria-label"> & {
  etiqueta: string;
  /** "accion": relleno `accion` (el + de un contador de cantidad); "neutro": `superficie-hundida`. */
  tono?: "neutro" | "accion";
}) {
  return (
    <button
      type="button"
      aria-label={etiqueta}
      {...resto}
      className={clases(
        "tocable grid size-(--alto-control) shrink-0 place-items-center rounded-full disabled:opacity-40",
        tono === "accion" ? "bg-accion text-sobre-accion" : "bg-superficie-hundida text-texto",
        FOCO,
        className,
      )}
    >
      {children}
    </button>
  );
}
