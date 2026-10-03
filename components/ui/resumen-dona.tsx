import type { ReactNode } from "react";
import { IconoChevronDerecha } from "../iconos";
import { FilaLista, ListaAgrupada } from "./lista";
import { Tarjeta } from "./tarjeta";

/** Una fila de la leyenda de un resumen con dona. Con `valor` > 0 y `alTocar` se toca (y lleva chevron); en 0 no. */
export type FilaResumen = {
  id: string;
  nombre: string;
  /** Debajo del nombre: el porcentaje del total u otra explicación corta. */
  subtitulo?: string;
  valor: number;
  /** Punto de color delante (el mismo del anillo). Sin `color`, la fila no lleva punto. */
  color?: string;
  /** El punto es un aro (el grupo "sin" algo, que el anillo muestra pálido). */
  aro?: boolean;
  alTocar?: () => void;
};

/** Un cuadro de los "otros grupos": atajos con ícono que llevan a la pantalla de atrás. */
export type CuadroResumen = {
  id: string;
  nombre: string;
  subtitulo: string;
  valor: number;
  /** Ícono de línea suelto (sin círculo ni fondo), junto a la cifra. */
  icono: ReactNode;
  alTocar?: () => void;
};

function Cuadro({ cuadro: q, unidad }: { cuadro: CuadroResumen; unidad: string }) {
  const tocable = q.valor > 0 && Boolean(q.alTocar);
  const contenido = (
    <>
      <span className="flex items-center gap-2">
        <span aria-hidden="true" className="text-texto">
          {q.icono}
        </span>
        <b className={`font-display text-titulo-hoja ${tocable ? "" : "text-texto-secundario"}`}>{q.valor}</b>
      </span>
      <span className="mt-1 flex items-center gap-2">
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-secundario font-bold">{q.nombre}</span>
          <span className="text-etiqueta text-texto-secundario">{q.subtitulo}</span>
        </span>
        {tocable && <IconoChevronDerecha aria-hidden="true" tamano={20} strokeWidth={2.2} className="shrink-0 text-texto-secundario" />}
      </span>
    </>
  );
  return tocable ? (
    <Tarjeta onClick={q.alTocar} etiqueta={`${q.nombre}: ${q.valor} ${unidad}, ${q.subtitulo}. Ver en la lista`}>
      {contenido}
    </Tarjeta>
  ) : (
    <Tarjeta>{contenido}</Tarjeta>
  );
}

function Fila({ fila: f }: { fila: FilaResumen }) {
  const tocable = f.valor > 0 && Boolean(f.alTocar);
  return (
    <FilaLista
      inicio={
        f.color ? (
          <span aria-hidden="true" className={`block size-3.5 rounded-full ${f.aro ? "border-[1.5px] border-borde-campo" : ""}`} style={{ background: f.color }} />
        ) : undefined
      }
      titulo={f.nombre}
      detalle={f.subtitulo}
      fin={tocable ? f.valor : <span className="text-texto-secundario">{f.valor}</span>}
      onClick={tocable ? f.alTocar : undefined}
      etiqueta={tocable ? `${f.nombre}: ${f.valor}${f.subtitulo ? `, ${f.subtitulo}` : ""}. Ver` : undefined}
    />
  );
}

/**
 * Hoja de resumen con dona (docs/09 §7, "Hoja de resumen con dona"): una sola forma para "Tus clientes", "Tu inventario" y las que
 * vengan. Arriba la dona (112 px, la pone quien la usa) con, a su derecha, un título dinámico en Fredoka y una línea secundaria; debajo
 * la leyenda como lista agrupada con punto de color (punto · nombre · porcentaje · número · chevron: tocables solo las filas con algo; su
 * vista interna la maneja quien la usa), después los `otros` grupos como cuadros de 2 × 2 con ícono suelto junto a la cifra, que llevan a la
 * pantalla de atrás (solo se tocan con valor > 0) y, al final, las acciones de la hoja (`children`).
 */
export function ResumenDona({
  encabezado,
  dona,
  etiquetaDona,
  titulo,
  linea,
  leyenda,
  etiquetaLeyenda,
  otros,
  unidadOtros = "elementos",
  children,
}: {
  /** Lo que va arriba de todo, antes de la dona (la Tarjeta de jugada en Clientes). */
  encabezado?: ReactNode;
  dona: ReactNode;
  /** Lo que dice la dona a los lectores de pantalla. */
  etiquetaDona: string;
  titulo: ReactNode;
  linea?: ReactNode;
  leyenda: FilaResumen[];
  etiquetaLeyenda: string;
  otros?: CuadroResumen[];
  /** Plural de lo que cuentan los cuadros ("clientes"), para su nombre accesible. */
  unidadOtros?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5">
      {encabezado}
      <div className="flex items-center gap-5">
        <div role="img" aria-label={etiquetaDona} className="shrink-0">
          {dona}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-titulo-hoja text-texto">{titulo}</h3>
          {linea && <p className="mt-1 text-secundario text-texto-secundario">{linea}</p>}
        </div>
      </div>
      <ListaAgrupada etiqueta={etiquetaLeyenda}>
        {leyenda.map((f) => (
          <Fila key={f.id} fila={f} />
        ))}
      </ListaAgrupada>
      {otros && otros.length > 0 && (
        <div className="grid grid-cols-2 gap-2.5">
          {otros.map((q) => (
            <Cuadro key={q.id} cuadro={q} unidad={unidadOtros} />
          ))}
        </div>
      )}
      {children}
    </div>
  );
}
