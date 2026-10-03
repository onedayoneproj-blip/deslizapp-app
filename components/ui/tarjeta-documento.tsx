import { IconoCompartir, IconoDescargar } from "../iconos";
import { Boton } from "./boton";
import { Etiqueta, type TonoEtiqueta } from "./etiqueta";

/**
 * Tarjeta de documento (factura, recibo; Tarjeta.md): miniatura de papel a la izquierda, título `destacado` con su etiqueta de
 * estado debajo, y abajo dos botones con texto del mismo ancho: "Descargar" secundario y "Compartir" principal, de 44 px. Nunca
 * botones de solo icono para estas acciones. `descargando` / `compartiendo` ponen el botón en estado cargando.
 */
export function TarjetaDocumento({
  titulo,
  etiqueta,
  alDescargar,
  alCompartir,
  descargando = false,
  compartiendo = false,
}: {
  titulo: string;
  etiqueta?: { texto: string; tono: TonoEtiqueta };
  alDescargar: () => void;
  alCompartir: () => void;
  descargando?: boolean;
  compartiendo?: boolean;
}) {
  return (
    <section aria-label={titulo} className="flex flex-col gap-3.5 rounded-radio-l border border-linea bg-superficie p-4">
      <div className="flex items-center gap-3.5">
        {/* Miniatura de papel: decorativa */}
        <div aria-hidden="true" className="flex h-16.5 w-13 shrink-0 flex-col justify-between rounded-[6px] border border-borde-pastilla bg-fondo px-[7px] py-2">
          <span className="h-1 w-3/5 rounded-full bg-accion" />
          <span className="flex flex-col gap-1">
            <span className="h-[3px] w-full rounded-full bg-borde-pastilla" />
            <span className="h-[3px] w-full rounded-full bg-borde-pastilla" />
            <span className="h-[3px] w-[70%] rounded-full bg-borde-pastilla" />
          </span>
          <span className="h-1 w-1/2 self-end rounded-full bg-accion" />
        </div>
        <div className="flex min-w-0 flex-col items-start gap-1.5">
          <p className="truncate text-destacado text-texto">{titulo}</p>
          {etiqueta && <Etiqueta tono={etiqueta.tono}>{etiqueta.texto}</Etiqueta>}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <Boton jerarquia="secundario" anchoCompleto icono={<IconoDescargar tamano={18} />} onClick={alDescargar} cargando={descargando}>
          Descargar
        </Boton>
        <Boton anchoCompleto icono={<IconoCompartir tamano={18} />} onClick={alCompartir} cargando={compartiendo}>
          Compartir
        </Boton>
      </div>
    </section>
  );
}
