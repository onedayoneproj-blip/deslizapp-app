"use client";

import { useEffect, useState } from "react";
import { Hoja } from "@/components/hoja";
import { Boton, BotonIcono } from "@/components/ui";
import { IconoDescargar } from "@/components/iconos";
import { useAdmin } from "@/lib/data/admin/provider";
import { bajarFoto, bajarTodas } from "@/lib/admin/descargas";
import type { ProductoAdmin } from "@/lib/admin/tipos";

type Foto = { url: string; nombre: string; producto: string };

/** «Ver sus fotos»: las fotos de los productos de una tienda, para bajarlas una por una o todas juntas. */
export function HojaFotosTienda({ tienda, alCerrar }: { tienda: { id: string; nombre: string; slug: string } | null; alCerrar: () => void }) {
  const fuente = useAdmin();
  const [productos, setProductos] = useState<ProductoAdmin[] | null>(null);
  const [error, setError] = useState(false);
  const [avance, setAvance] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const id = tienda?.id;

  useEffect(() => {
    if (!id) return;
    let vigente = true;
    const t = window.setTimeout(() => {
      setProductos(null);
      setError(false);
      setAviso(null);
      fuente.productosTienda(id).then(
        (p) => vigente && setProductos(p),
        () => vigente && setError(true),
      );
    }, 0);
    return () => {
      vigente = false;
      window.clearTimeout(t);
    };
  }, [fuente, id]);

  const fotos: Foto[] =
    productos?.flatMap((p) =>
      p.medios
        .filter((m) => m.tipo === "foto")
        .map((m, i, todas) => ({ url: m.url, producto: p.nombre, nombre: todas.length > 1 ? `${p.nombre} ${i + 1}` : p.nombre })),
    ) ?? [];

  const todas = async () => {
    if (avance || !tienda) return;
    setAviso(null);
    const r = await bajarTodas(fotos, `fotos-${tienda.slug}`, (n, total) => setAvance(`Bajando ${Math.min(n + 1, total)} de ${total}…`));
    setAvance(null);
    setAviso(
      r.fallidas
        ? `${r.fallidas === 1 ? "Una foto no se pudo bajar" : `${r.fallidas} fotos no se pudieron bajar`}. Bájalas una por una.`
        : r.enZip
          ? "Listo: quedaron en un .zip."
          : "Listo: se bajaron una por una (eran muchas para un .zip).",
    );
  };

  return (
    <Hoja protegerAtras abierta={!!tienda} alCerrar={alCerrar} titulo={tienda ? `Fotos de ${tienda.nombre}` : "Fotos"}>
      <div className="px-5 pb-6">
        {!productos && !error && <div role="status" aria-label="Cargando fotos" className="grid grid-cols-3 gap-2">{[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="aspect-square animate-pulse rounded-radio-m bg-superficie-hundida" />)}</div>}
        {error && <p role="alert" className="text-texto-secundario">No pudimos traer sus fotos. Cierra y vuelve a abrir.</p>}
        {productos && fotos.length === 0 && <p className="text-texto-secundario">Todavía no tiene fotos en sus productos.</p>}
        {fotos.length > 0 && (
          <>
            <p className="mb-3 text-secundario text-texto-secundario">{fotos.length} {fotos.length === 1 ? "foto" : "fotos"} de {productos!.length} {productos!.length === 1 ? "producto" : "productos"}.</p>
            <ul className="grid grid-cols-3 gap-2">
              {fotos.map((f, i) => (
                <li key={`${f.url}-${i}`} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element -- fotos de Storage o de la demo (data URL) */}
                  <img src={f.url} alt={f.nombre} loading="lazy" className="aspect-square w-full rounded-radio-m bg-superficie-hundida object-cover" />
                  <span className="absolute right-1 bottom-1"><BotonIcono etiqueta={`Bajar ${f.nombre}`} onClick={() => void bajarFoto(f.url, f.nombre)} className="shadow-sm"><IconoDescargar tamano={18} /></BotonIcono></span>
                </li>
              ))}
            </ul>
            <div className="mt-4">
              <Boton anchoCompleto icono={<IconoDescargar tamano={20} />} cargando={!!avance} onClick={() => void todas()}>{avance ?? "Bajar todas"}</Boton>
            </div>
          </>
        )}
        <p aria-live="polite" className="mt-3 text-secundario text-texto-secundario">{aviso}</p>
      </div>
    </Hoja>
  );
}
