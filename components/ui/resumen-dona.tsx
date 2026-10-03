import type { ReactNode } from "react";
import { FilaLista, ListaAgrupada } from "./lista";

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
 * la leyenda como lista agrupada (punto · nombre · porcentaje · número · chevron: tocables solo las filas con algo), después otros
 * grupos en una segunda lista igual (`otros`, sin punto) y, al final, las acciones de la hoja (`children`).
 */
export function ResumenDona({
  dona,
  etiquetaDona,
  titulo,
  linea,
  leyenda,
  etiquetaLeyenda,
  otros,
  etiquetaOtros,
  children,
}: {
  dona: ReactNode;
  /** Lo que dice la dona a los lectores de pantalla. */
  etiquetaDona: string;
  titulo: ReactNode;
  linea?: ReactNode;
  leyenda: FilaResumen[];
  etiquetaLeyenda: string;
  otros?: FilaResumen[];
  etiquetaOtros?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5">
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
        <ListaAgrupada etiqueta={etiquetaOtros}>
          {otros.map((f) => (
            <Fila key={f.id} fila={f} />
          ))}
        </ListaAgrupada>
      )}
      {children}
    </div>
  );
}
