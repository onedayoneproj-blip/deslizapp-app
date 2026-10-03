"use client";

import { useState } from "react";
import { Dona } from "../dona";
import { FUNCIONES } from "@/lib/funciones";
import { lecturaClientes, type FiltroClientes, type GrupoClientes, type ResumenClientes } from "@/lib/clientes-resumen";
import { porcentajeDe } from "@/lib/inventario-catalogo";
import { CARTAS_JUGADAS, lineaJugada, type Jugada } from "@/lib/proxima-jugada";
import { IconoBrote, IconoEditar, IconoEnlace, IconoLuna } from "../iconos";
import { HojaProximamente, ResumenDona, TarjetaJugada, TarjetaProximamente, type CuadroResumen, type FilaResumen } from "../ui";

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
  const [proximamente, setProximamente] = useState(false);
  return (
    <>
    <ResumenDona
      encabezado={
        // Lo primero que se ve es qué hacer hoy; la dona de abajo explica el porqué (docs/09 §7, punto 5).
        // Apagada (lib/funciones.ts): en su lugar, la tarjeta Próximamente; nada de la función real se monta.
        !FUNCIONES.proximaJugada ? (
          <TarjetaProximamente
            voz="Tu próxima jugada"
            titulo="Algo se está cocinando"
            linea="Pronto te diré a quién escribirle hoy."
            etiqueta="Próximamente: Tu próxima jugada. Algo se está cocinando. Ver más"
            alTocar={() => setProximamente(true)}
          />
        ) : <TarjetaJugada
          titulo={destacada?.nombre ?? null}
          linea={destacada ? lineaJugada(destacada.id, destacada.cantidad) : null}
          cartas={CARTAS_JUGADAS}
          destacada={destacada?.id}
          etiqueta={destacada ? `Tu próxima jugada: ${destacada.nombre}, ${destacada.cantidad} ${destacada.cantidad === 1 ? "cliente" : "clientes"}. Ver tus jugadas` : "Tu próxima jugada: la próxima conversación empieza aquí. Ver tus jugadas"}
          alTocar={alAbrirJugadas}
        />
      }
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
    </ResumenDona>
    {proximamente && (
      <HojaProximamente abierta alCerrar={() => setProximamente(false)} titulo="Tu próxima jugada" imagen="/ilustraciones/proxima-jugada/volver-a-saludar.webp">
        <p>Estamos afinando algo que te va a encantar. Cada día te va a decir a quién escribirle y qué decirle para que esa venta no se enfríe. Ya casi, ya casi.</p>
        <p className="text-secundario text-texto-secundario">Mientras tanto, sigue vendiendo. Aquí te aviso cuando esté lista.</p>
      </HojaProximamente>
    )}
    </>
  );
}
