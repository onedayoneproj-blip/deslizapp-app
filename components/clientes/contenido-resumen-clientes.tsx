"use client";

import { LuzJugada } from "./luz-jugada";
import { Dona } from "../dona";
import { lecturaClientes, type FiltroClientes, type GrupoClientes, type ResumenClientes } from "@/lib/clientes-resumen";
import { porcentajeDe } from "@/lib/inventario-catalogo";
import type { Jugada } from "@/lib/proxima-jugada";
import Image from "next/image";
import { IconoBrote, IconoEditar, IconoEnlace, IconoLuna } from "../iconos";
import { ResumenDona, type CuadroResumen, type FilaResumen } from "../ui";

export const SEGMENTOS_CLIENTES = [
  { id: "repiten", nombre: "Repiten", color: "var(--accion)" },
  { id: "una", nombre: "Compraron una vez", color: "var(--resalte)" },
  { id: "sin", nombre: "Sin comprar todavía", color: "var(--borde-pastilla)" },
] as const;

/** Nombre de cada grupo (leyenda, título de su vista interna). */
export const NOMBRE_GRUPO_CLIENTES: Record<GrupoClientes, string> = {
  todos: "Todos", repiten: "Repiten", una: "Compraron una vez", sin: "Sin comprar todavía",
  nuevos: "Nuevos", dormidos: "Dormidos", catalogo: "Del catálogo", manual: "A mano",
};

export function ContenidoResumenClientes({ resumen, alAbrirGrupo, alFiltrar, alAbrirJugadas, destacada }: {
  resumen: ResumenClientes; alAbrirGrupo: (grupo: GrupoClientes) => void; alFiltrar: (filtro: FiltroClientes) => void; alAbrirJugadas: (elemento: HTMLElement) => void; destacada: Jugada | null;
}) {
  const { cuentas: c, totalVendido } = resumen;
  const { titulo, linea } = lecturaClientes(resumen);
  const fila = (id: GrupoClientes, nombre: string, extra: Partial<FilaResumen>): FilaResumen => ({ id, nombre, valor: c[id as keyof typeof c], alTocar: () => alAbrirGrupo(id), ...extra });
  // Leyenda: la mezcla de la dona, con el porcentaje del total
  const leyenda = SEGMENTOS_CLIENTES.map((s) => fila(s.id, s.nombre, { color: s.color, aro: s.id === "sin", subtitulo: `${porcentajeDe(c[s.id], c.todos)} %` }));
  // Los demás grupos: atajos con ícono que cierran la hoja y filtran la pantalla de Clientes
  const cuadro = (id: "nuevos" | "dormidos" | "catalogo" | "manual", nombre: string, subtitulo: string, icono: CuadroResumen["icono"]): CuadroResumen => ({ id, nombre, subtitulo, icono, valor: c[id], alTocar: () => alFiltrar(id) });
  const otros = [
    cuadro("nuevos", "Nuevos", "primer pedido en 30 días", <IconoBrote />),
    cuadro("dormidos", "Dormidos", "sin comprar hace 60+ días", <IconoLuna />),
    cuadro("catalogo", "Del catálogo", "llegaron por el enlace", <IconoEnlace />),
    cuadro("manual", "A mano", "los agregaste tú", <IconoEditar />),
  ];
  return (
    <ResumenDona
      dona={
        <Dona tamano={112} grosor={12} pista="var(--superficie-hundida)" segmentos={SEGMENTOS_CLIENTES.map((s) => ({ valor: c[s.id], color: s.color }))}>
          <b className="font-display text-cifra">{c.todos}</b>
        </Dona>
      }
      etiquetaDona={`${c.todos} clientes; ${c.repiten} repiten, ${c.una} compraron una vez, ${c.sin} sin comprar. ${totalVendido > 0 ? `Los que repiten dejan el ${resumen.porcentajeRepiten} por ciento de tus ventas.` : "Sin ventas todavía."}`}
      titulo={titulo}
      linea={linea}
      leyenda={leyenda}
      etiquetaLeyenda="Tus clientes por tipo"
      otros={otros}
      unidadOtros="clientes"
    >
      <button type="button" onClick={(e) => alAbrirJugadas(e.currentTarget)}
        aria-label={`Tu próxima jugada. ${destacada ? `${destacada.nombre}: ${destacada.cantidad} clientes, ${destacada.porcentaje} por ciento.` : "Aún no hay jugadas disponibles."} Ver tus jugadas`}
        className="tocable relative isolate grid min-h-37 grid-cols-[minmax(0,1fr)_7rem] items-start gap-2 overflow-hidden rounded-radio-l border-[1.5px] border-borde-pastilla bg-accion-suave px-4 py-3.5 text-left outline-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco">
        <LuzJugada tarjeta />
        <span data-jugada-texto className="relative z-10 min-w-0">
          <span className="text-etiqueta font-extrabold uppercase tracking-wide text-exito-texto">Tu próxima jugada</span>
          <span className="mt-1 block font-display text-titulo-seccion text-texto">{destacada ? `${destacada.porcentaje} % ${destacada.id === "volver" ? "lleva tiempo sin comprar." : destacada.id === "segundo" ? "compró una sola vez." : destacada.id === "gracias" ? "volvió por más." : "espera su primer hola."}` : "La próxima conversación empieza aquí."}</span>
          <span className="mt-1.5 block text-etiqueta text-texto-secundario">{destacada ? `${destacada.cantidad} de tus ${c.todos} clientes. ${destacada.descripcion}` : "Cuando haya clientes disponibles, verás ideas para escribirles."}</span>
          <span className="mt-2 inline-flex min-h-11 items-center rounded-full bg-accion px-4 text-etiqueta font-extrabold text-sobre-accion">Ver tus jugadas</span>
        </span>
        <span data-jugada-baraja aria-hidden="true" className="relative z-10 block h-32 w-28">
          {(["volver-a-saludar", "segundo-aaah", "gracias-por-volver", "primer-hola"] as const).map((id, i) => <span key={id} className={`jugada-mini jugada-mini-${i}`}>
            <Image src={`/ilustraciones/proxima-jugada/${id}.webp`} alt="" fill sizes="70px" className="object-contain" />
          </span>)}
        </span>
      </button>
    </ResumenDona>
  );
}
