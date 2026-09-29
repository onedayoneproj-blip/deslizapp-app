"use client";

// Barra de pestañas inferior, inspirada en la de iOS (sin el vidrio transparente): ícono arriba,
// nombre siempre visible debajo y un selector Rosa Suave que se desliza a la pestaña activa.
// Se puede arrastrar el dedo por la barra: el selector sigue al dedo, la pestaña de debajo se
// resalta en vivo y al soltar se navega. Es un cambio deliberado del dueño respecto al
// prototipo (ver docs/04-pantallas.md): no volver a la píldora verde expandida.

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState, type ComponentType, type PointerEvent as EventoPuntero } from "react";
import { useConsulta } from "@/lib/data/consulta";
import { useData } from "@/lib/data/provider";
import { IconoCatalogo, IconoClientes, IconoInicio, IconoPedidos, IconoPromos } from "../iconos";

type Seccion = { href: string; nombre: string; Icono: ComponentType<{ tamano?: number; strokeWidth?: number }> };

const SECCIONES: Seccion[] = [
  { href: "/", nombre: "Inicio", Icono: IconoInicio },
  { href: "/catalogo", nombre: "Catálogo", Icono: IconoCatalogo },
  { href: "/pedidos", nombre: "Pedidos", Icono: IconoPedidos },
  { href: "/clientes", nombre: "Clientes", Icono: IconoClientes },
  { href: "/promos", nombre: "Promos", Icono: IconoPromos },
];
const N = SECCIONES.length;

/** Distancia horizontal (px) a partir de la cual un toque pasa a ser arrastre. */
const UMBRAL = 8;
/** Zona de los bordes de la pantalla donde no se empieza a arrastrar (gesto de volver del iPhone). */
const BORDE = 20;

function indiceDe(pathname: string) {
  const i = SECCIONES.findIndex(({ href }) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`)));
  return i === -1 ? 0 : i;
}

export function NavInferior() {
  const pathname = usePathname();
  const router = useRouter();
  const { tiendaActivaId, getPedidos } = useData();
  const { data: pedidos } = useConsulta(`pedidos:${tiendaActivaId}`, () => getPedidos(tiendaActivaId));
  const nuevos = pedidos?.filter((p) => p.estado === "nuevo").length ?? 0;

  const activa = indiceDe(pathname);
  // Toque: el selector se mueve al instante, antes de que la ruta termine de cambiar.
  const [tocada, setTocada] = useState<{ indice: number; desde: string } | null>(null);
  // Arrastre en curso: posición del selector en px y pestaña que queda debajo del dedo.
  const [arrastre, setArrastre] = useState<{ x: number; indice: number } | null>(null);

  const pista = useRef<HTMLDivElement>(null);
  const gesto = useRef<{ id: number; x0: number; y0: number; arrastrando: boolean } | null>(null);
  const ignorarClic = useRef(false);

  const seleccion = arrastre?.indice ?? (tocada && tocada.desde === pathname ? tocada.indice : activa);

  const posicionDesde = (clientX: number) => {
    const caja = pista.current!.getBoundingClientRect();
    const ancho = caja.width / N;
    const x = Math.min(Math.max(clientX - caja.left - ancho / 2, 0), ancho * (N - 1));
    return { x, indice: Math.round(x / ancho) };
  };

  const alApuntar = (e: EventoPuntero<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    // Cerca de los bordes de la pantalla solo se aceptan toques (el iPhone usa ese gesto para volver).
    if (e.clientX < BORDE || e.clientX > window.innerWidth - BORDE) return;
    gesto.current = { id: e.pointerId, x0: e.clientX, y0: e.clientY, arrastrando: false };
  };

  const alMover = (e: EventoPuntero<HTMLDivElement>) => {
    const g = gesto.current;
    if (!g || g.id !== e.pointerId) return;
    if (!g.arrastrando) {
      const dx = Math.abs(e.clientX - g.x0);
      if (dx < UMBRAL || dx < Math.abs(e.clientY - g.y0)) return;
      g.arrastrando = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    setArrastre(posicionDesde(e.clientX));
  };

  const alSoltar = (e: EventoPuntero<HTMLDivElement>) => {
    const g = gesto.current;
    gesto.current = null;
    if (!g || g.id !== e.pointerId || !g.arrastrando) return;
    const { indice } = posicionDesde(e.clientX);
    setArrastre(null);
    ignorarClic.current = true; // el clic que llega después del arrastre no cuenta
    window.setTimeout(() => (ignorarClic.current = false), 0);
    if (indice !== activa) {
      setTocada({ indice, desde: pathname });
      router.push(SECCIONES[indice]!.href);
    }
  };

  const alCancelar = () => {
    gesto.current = null;
    setArrastre(null);
  };

  return (
    <nav aria-label="Secciones" className="pointer-events-none fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[480px] px-3 pb-(--nav-margen)">
      <div className="pointer-events-auto h-(--nav-alto) rounded-[26px] border border-linea bg-white p-1.5 shadow-[0_8px_24px_-12px_rgba(23,75,58,0.35)]">
        <div
          ref={pista}
          onPointerDown={alApuntar}
          onPointerMove={alMover}
          onPointerUp={alSoltar}
          onPointerCancel={alCancelar}
          onLostPointerCapture={(e) => {
            // Al tomar la captura, el enlace tocado pierde la suya (captura implícita del toque):
            // eso no es cancelar. Solo cuenta si la pierde la propia barra.
            if (e.target === e.currentTarget && gesto.current) alCancelar();
          }}
          className="relative h-full touch-pan-y select-none"
        >
          {/* Selector Rosa Suave */}
          <span
            aria-hidden="true"
            className="absolute inset-y-0 left-0 w-1/5 motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-[cubic-bezier(.2,.8,.3,1)]"
            style={{
              transform: arrastre ? `translateX(${arrastre.x}px)` : `translateX(${seleccion * 100}%)`,
              transitionDuration: arrastre ? "0ms" : undefined,
            }}
          >
            <span className="mx-0.5 block h-full rounded-[20px] bg-rosa" />
          </span>

          <ul className="relative flex h-full">
            {SECCIONES.map(({ href, nombre, Icono }, i) => {
              const esActiva = i === activa;
              const resaltada = i === seleccion;
              const badge = href === "/pedidos" && nuevos > 0 ? nuevos : 0;
              return (
                <li key={href} className="min-w-0 flex-1">
                  <Link
                    href={href}
                    draggable={false}
                    aria-current={esActiva ? "page" : undefined}
                    aria-label={badge ? `${nombre}, ${badge} ${badge === 1 ? "pedido nuevo" : "pedidos nuevos"}` : undefined}
                    onClick={(e) => {
                      if (ignorarClic.current) {
                        e.preventDefault();
                        return;
                      }
                      if (i !== activa) setTocada({ indice: i, desde: pathname });
                    }}
                    className={`flex h-full flex-col items-center justify-center gap-[3px] rounded-[20px] outline-none focus-visible:ring-2 focus-visible:ring-bosque focus-visible:ring-inset motion-safe:transition-colors motion-safe:duration-200 ${
                      resaltada ? "text-bosque" : "text-tenue"
                    }`}
                  >
                    <span className="relative">
                      <Icono tamano={22} strokeWidth={resaltada ? 2.3 : 2} />
                      {badge > 0 && (
                        <span className="absolute -top-1.5 -right-3 grid h-[18px] min-w-[18px] place-items-center rounded-full border-2 border-white bg-mandarina px-1 text-[10.5px] leading-none font-extrabold text-bosque-oscuro">
                          {badge}
                        </span>
                      )}
                    </span>
                    <span className={`max-w-full truncate px-0.5 text-[11.5px] leading-none ${resaltada ? "font-extrabold" : "font-semibold"}`}>
                      {nombre}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </nav>
  );
}
