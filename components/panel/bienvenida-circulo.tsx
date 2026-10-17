"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { DESCUENTO_CIRCULO } from "@/lib/circulo";
import { almacenDelNavegador, debeMostrarBienvenida, marcarBienvenidaVista } from "@/lib/circulo-bienvenida";
import type { DatosCupon } from "@/lib/cupon";
import { useConsulta } from "@/lib/data/consulta";
import { useData } from "@/lib/data/provider";
import type { Tienda } from "@/lib/types";
import { IconoBolsa, IconoChat, IconoChispa, IconoCorazon } from "../iconos";
import { TicketPromo } from "../promos/ticket-promo";
import { LogoTienda } from "./logo-tienda";
import "./bienvenida-circulo.css";

const BENEFICIOS: { icono: ReactNode; titulo: string; texto: string }[] = [
  { icono: <IconoChispa tamano={24} />, titulo: "Estrena las funciones", texto: "Pruébalas antes que nadie." },
  { icono: <IconoBolsa tamano={24} />, titulo: "Tu bienvenida viene con extras", texto: "Créditos y regalos de merch." },
  { icono: <IconoChat tamano={24} />, titulo: "Habla directo con Lewis", texto: "Una conversación, sin tanta vuelta." },
  { icono: <IconoCorazon tamano={24} />, titulo: "Tu aro se queda contigo", texto: "El sello del Círculo es tuyo para siempre." },
];

/** El cupón de la bienvenida: el 30 % sale de DESCUENTO_CIRCULO, y no lleva precio (ese sale de la base, en /planes). */
const CUPON: DatosCupon = {
  porcentaje: String(DESCUENTO_CIRCULO),
  bajoPorcentaje: "DE DESCUENTO",
  tipo: "Círculo Deslizapp",
  titulo: "En tu plan anual",
  esCodigo: false,
  detalle: "Tu primer año",
  fechas: "Al pagar el año",
  aviso: null,
};

// Colores de la marca fijos: la bienvenida es crema también en modo oscuro (referencias/circulo/tarjeta-planes.dc.html).
const SIN_ENSANCHAR = { fontStretch: "100%" } as const;

/**
 * La pantalla de bienvenida (presentacional): el aro grande con la entrada y las ondas, el cupón del 30 % y los cuatro beneficios.
 * Va a pantalla completa por encima del panel. `alEntrar` la cierra.
 */
export function PantallaBienvenidaCirculo({ tienda, alEntrar }: { tienda: Pick<Tienda, "nombre" | "logoUrl" | "circulo">; alEntrar: () => void }) {
  const entrar = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    entrar.current?.focus({ preventScroll: true });
    const alTeclear = (e: KeyboardEvent) => e.key === "Escape" && alEntrar();
    document.addEventListener("keydown", alTeclear);
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", alTeclear);
      document.body.style.overflow = antes;
    };
  }, [alEntrar]);

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="bienvenida-circulo-titulo" data-bienvenida-circulo="" className="bienvenida-c fixed inset-0 z-[70] overflow-y-auto overscroll-contain bg-marca-papel text-marca-bosque">
      <div className="mx-auto flex min-h-full max-w-[480px] flex-col items-center px-[18px] pt-[calc(44px+env(safe-area-inset-top))] pb-[calc(24px+env(safe-area-inset-bottom))] text-center">
        {/* Las ondas del aro crecen ~1,45 veces: el aro lleva aire alrededor y nada lo recorta. */}
        <div className="my-3">
          <LogoTienda tienda={tienda} tamano={120} animacion="ondas" />
        </div>
        <span className="mt-6 text-xs font-bold tracking-[0.22em] uppercase">Eres del Círculo</span>
        <h2 id="bienvenida-circulo-titulo" style={SIN_ENSANCHAR} className="mt-2 font-display text-[34px] leading-[1.05] font-bold">
          Llegaste primero.
          <br />
          Te toca más.
        </h2>
        <p className="mt-2 font-mano text-[27px] leading-[1.05] font-bold text-mandarina-texto">Como los Close Friends de Instagram, pero con beneficios.</p>

        <div className="mt-5 w-full text-left">
          <TicketPromo d={CUPON} apagado={false} />
        </div>

        <ul className="mt-5 flex w-full flex-col gap-3 text-left">
          {BENEFICIOS.map((b) => (
            <li key={b.titulo} className="flex items-center gap-3.5">
              <span className="grid h-[52px] w-[52px] flex-none place-items-center rounded-2xl bg-[#FBE4EB]">{b.icono}</span>
              <span>
                <b style={SIN_ENSANCHAR} className="block font-display text-lg leading-[1.15] font-bold">
                  {b.titulo}
                </b>
                <span className="mt-0.5 block text-[14.5px] text-[#4F6A5E]">{b.texto}</span>
              </span>
            </li>
          ))}
        </ul>

        {/* Bosque sobre crema fijo (no el token de acción, que cambia en modo oscuro). */}
        <button ref={entrar} type="button" onClick={alEntrar} style={SIN_ENSANCHAR} className="mt-6 h-14 w-full rounded-full bg-marca-bosque font-display text-xl font-bold text-marca-papel">
          Entrar
        </button>
      </div>
    </div>
  );
}

/**
 * Monta la bienvenida en el panel: la primera vez que la titular (dueña de una tienda del Círculo) lo abre en este dispositivo.
 * Las colaboradoras y quien mira como otra persona no la ven. `alCerrar` avisa al encabezado para que el aro haga su entrada.
 */
export function BienvenidaCirculo({ alCerrar }: { alCerrar: () => void }) {
  const { usuarioId, soloMirar, getTiendas, getMiPermiso } = useData();
  const { data: tiendas } = useConsulta("tiendas", getTiendas);
  const delCirculo = (tiendas ?? []).filter((t) => t.circulo);
  const claves = delCirculo.map((t) => t.id).join(",");
  // La titular es la dueña de la tienda, no una colaboradora: la base dice el rol de cada una. Mirando como otra persona no se pregunta.
  const { data: propias } = useConsulta(`circulo-titular:${claves}:${soloMirar}`, async () => {
    if (soloMirar || delCirculo.length === 0) return [] as Tienda[];
    const permisos = await Promise.all(delCirculo.map((t) => getMiPermiso(t.id).catch(() => null)));
    return delCirculo.filter((_, i) => permisos[i]?.rol === "dueno");
  });
  const [cerrada, setCerrada] = useState(false);

  // Los datos llegan después de montar (nunca en el servidor), así que leer el almacén aquí no desajusta la hidratación.
  const tienda = propias?.[0];
  const mostrar = !cerrada && !!tienda && debeMostrarBienvenida({ usuarioId, soloMirar, esTitularDelCirculo: true, almacen: almacenDelNavegador() });
  const entrar = () => {
    if (usuarioId) marcarBienvenidaVista(almacenDelNavegador(), usuarioId);
    setCerrada(true);
    alCerrar();
  };
  if (!mostrar || typeof document === "undefined") return null;
  return createPortal(<PantallaBienvenidaCirculo tienda={tienda} alEntrar={entrar} />, document.body);
}
