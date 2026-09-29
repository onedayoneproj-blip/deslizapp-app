"use client";

import { useEffect } from "react";
import { datosCupon } from "@/lib/cupon";
import { iniciales } from "@/lib/formato";
import { cargarFuentesMarca, familiaTexto, familiaTitulo } from "@/lib/fuentes-marca";
import { coloresCupon, contraste, hexARgb, TEXTO_OSCURO, type Marca } from "@/lib/marca";
import { estadoPromo } from "@/lib/promos";
import type { EstadoPromo, Producto, Promo, Tienda } from "@/lib/types";

// Cupón con la MARCA DE LA TIENDA (lo que ve el cliente final): mismo formato que la opción C
// (referencias/promos-cupon/opcion-c-ticket-verde.dc.html) pero con los colores y las fuentes de la tienda.
// Es la base de la imagen para compartir y del PDF. El panel sigue usando TarjetaPromo (marca Deslizapp).

const MASCARA =
  "radial-gradient(circle 10px at 116px 0, #0000 98%, #000) top / 100% 51% no-repeat, radial-gradient(circle 10px at 116px 100%, #0000 98%, #000) bottom / 100% 51% no-repeat";

const alfa = (hex: string, a: number) => {
  const [r, g, b] = hexARgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};

/** Color para el nombre de la tienda sobre el fondo crema: el principal si se lee bien; si no, oscuro. */
const sobreCrema = (principal: string) => (contraste(principal, "#FFF9EE") >= 4.5 ? principal : TEXTO_OSCURO);

export function CuponTienda({
  promo,
  marca,
  tienda,
  estado = estadoPromo(promo),
  producto,
  productosDeColeccion = 0,
  usos = null,
  mostrarTienda = true,
}: {
  promo: Promo;
  marca: Marca;
  tienda: Pick<Tienda, "nombre" | "logoUrl">;
  estado?: EstadoPromo;
  producto?: Producto;
  productosDeColeccion?: number;
  usos?: number | null;
  mostrarTienda?: boolean;
}) {
  // Las fuentes del estilo se cargan solo cuando se muestra un cupón con esa marca
  useEffect(() => {
    void cargarFuentesMarca(marca.estilo);
  }, [marca.estilo]);

  const c = coloresCupon(marca);
  const d = datosCupon(promo, estado, { producto, productosDeColeccion, usos });
  const titulo = familiaTitulo(marca.estilo);
  const texto = familiaTexto(marca.estilo);
  const etiqueta = `${tienda.nombre}: ${d.esCodigo ? `código ${d.titulo}` : d.titulo}, ${d.porcentaje}% de descuento, ${d.fechas}`;

  return (
    <div role="img" aria-label={etiqueta} className="flex flex-col gap-3" data-cupon-tienda="" style={{ fontFamily: texto }}>
      {mostrarTienda && (
        <div className="flex items-center gap-2.5">
          {tienda.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- data URL o SVG del seed, sin optimizar
            <img src={tienda.logoUrl} alt="" className="h-10 w-10 shrink-0 rounded-[12px] object-cover" />
          ) : (
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] text-[15px] font-bold" style={{ background: c.fondo, color: c.acento, fontFamily: titulo }}>
              {iniciales(tienda.nombre)}
            </span>
          )}
          <span className="truncate text-[19px] font-bold" style={{ fontFamily: titulo, color: sobreCrema(c.fondo) }}>
            {tienda.nombre}
          </span>
        </div>
      )}
      <div style={{ filter: `drop-shadow(0 8px 12px ${alfa(c.fondo, 0.25)})` }}>
        <div className="relative flex h-[148px] rounded-[18px]" style={{ background: c.fondo, color: c.texto, WebkitMask: MASCARA, mask: MASCARA }}>
          <div className="flex w-[116px] flex-none flex-col items-center justify-center gap-0.5">
            <span className="text-[44px] leading-none font-bold" style={{ fontFamily: titulo, color: c.acento }} data-porcentaje="">
              {d.porcentaje}%
            </span>
            <span className="text-[10px] font-bold tracking-[0.1em]" style={{ color: alfa(c.texto, 0.8) }}>
              {d.bajoPorcentaje}
            </span>
          </div>
          <div aria-hidden="true" className="absolute top-[18px] bottom-[18px] left-[115px] border-l-2 border-dashed" style={{ borderColor: alfa(c.texto, 0.4) }} />
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 py-4 pr-[18px] pl-[26px]">
            <span className="text-[11px] font-bold tracking-[0.1em] uppercase" style={{ color: alfa(c.texto, 0.85) }}>
              {d.tipo}
            </span>
            {d.esCodigo ? (
              <span
                className="max-w-full self-start truncate rounded-[10px] border-2 border-dashed px-3 py-1 text-[20px] leading-[1.2] font-semibold tracking-[0.08em]"
                style={{ fontFamily: titulo, borderColor: c.acento, color: c.texto }}
              >
                {d.titulo}
              </span>
            ) : (
              <span className="truncate text-[21px] leading-[1.15] font-semibold" style={{ fontFamily: titulo }} data-titulo="">
                {d.titulo}
              </span>
            )}
            <span className="truncate text-[14px]" style={{ color: alfa(c.texto, 0.85) }}>
              {d.detalle}
            </span>
            <div className="mt-1 flex items-center justify-between gap-2 text-[13px] font-semibold" style={{ color: alfa(c.texto, 0.92) }}>
              <span className="truncate">{d.fechas}</span>
              {d.aviso && <span className="shrink-0">{d.aviso}</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** La marca guardada de una tienda. */
export const marcaDeTienda = (t: Pick<Tienda, "marcaColorPrincipal" | "marcaColorAcento" | "marcaEstilo">): Marca => ({
  principal: t.marcaColorPrincipal,
  acento: t.marcaColorAcento,
  estilo: t.marcaEstilo,
});
