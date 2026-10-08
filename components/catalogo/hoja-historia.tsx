"use client";

import { useEffect, useMemo, useState } from "react";
import { ENCUADRE_INICIAL, difuminadoPorDefecto, type AjusteFoto, type Medida } from "@/lib/encuadre-historia";
import { copiarTexto, descargarArchivo, guardarArchivo } from "@/lib/portapapeles";
import {
  AVISO_INSTAGRAM, AVISO_SIN_PUBLICAR, OPCIONES_INICIALES, catalogoAbre, datosHistoria, direccionEnLineas, enlaceProductoHistoria, fotoDeHistoria,
  textoWhatsAppHistoria, tienePresentaciones, type OpcionesHistoria,
} from "@/lib/historia";
import { generarImagenHistoria, imagenesStickers, medirFoto, type EntradaImagenHistoria } from "@/lib/imagen-historia";
import { INCLINACION_STICKER, NOMBRE_STICKER, alternarSticker, stickersIniciales, stickersOfrecidos, textoSticker, type IdSticker, type StickerPuesto } from "@/lib/stickers-historia";
import type { Producto, Promo, Tienda } from "@/lib/types";
import { Hoja } from "../hoja";
import { AjustarFotoHistoria } from "./ajustar-foto-historia";
import { IconoCheck, IconoEstadoWhatsApp, IconoHistoria } from "../iconos";
import { useToast } from "../toast";
import { Aviso, Boton, Interruptor } from "../ui";

type Clave = { entradaBase: unknown; ajuste: unknown };
const sinAbortar = (e: unknown) => !(e instanceof DOMException && e.name === "AbortError");

/** «Tu historia»: vista previa de la imagen (1080×1920, hecha en el teléfono), tres interruptores y «Compartir». Solo lectura: no escribe en la base. */
export function HojaHistoria({ producto, promos, tienda, alCerrar }: { producto: Producto; promos: Promo[]; tienda: Tienda; alCerrar: () => void }) {
  const toast = useToast();
  const [opciones, setOpciones] = useState<OpcionesHistoria>(OPCIONES_INICIALES);
  /** Cada imagen guarda con qué opciones se hizo (`para`): si cambian, ya no vale y no se puede compartir hasta que salga la nueva. */
  const [hecha, setHecha] = useState<{ blob: Blob; url: string; para: Clave } | null>(null);
  const [falloPara, setFalloPara] = useState<Clave | null>(null);
  const [dondeAbierta, setDondeAbierta] = useState(false);
  const [ajustando, setAjustando] = useState(false);
  const [natural, setNatural] = useState<Medida | null>(null);
  /** Cómo va la foto. null mientras se lee su tamaño (de él sale el fondo difuminado por defecto). */
  const [ajuste, setAjuste] = useState<AjusteFoto | null>(null);
  /** Los stickers puestos. Vienen marcados los que el producto sugiere (nuevo, últimas unidades). */
  const [stickers, setStickers] = useState<StickerPuesto[]>(() => stickersIniciales(producto));
  const [dibujosStickers, setDibujosStickers] = useState<Record<string, { url: string; ancho: number; alto: number }>>({});
  const ofrecidos = useMemo(() => stickersOfrecidos(producto), [producto]);

  const foto = fotoDeHistoria(producto);
  const conPresentaciones = tienePresentaciones(producto);
  const enlace = enlaceProductoHistoria(tienda.urlCatalogo, producto.slug);
  const direccion = useMemo(() => direccionEnLineas(tienda.urlCatalogo), [tienda.urlCatalogo]);
  const abre = catalogoAbre(tienda);
  const datos = useMemo(() => datosHistoria(producto, promos, opciones), [producto, promos, opciones]);

  useEffect(() => {
    if (!foto) return;
    let vigente = true;
    void medirFoto(foto).then((m) => {
      if (!vigente) return;
      setNatural(m);
      setAjuste({ difuminado: difuminadoPorDefecto(m), encuadre: ENCUADRE_INICIAL });
    });
    return () => {
      vigente = false;
    };
  }, [foto]);

  useEffect(() => {
    let vigente = true;
    void imagenesStickers(ofrecidos.map((id) => ({ id, texto: textoSticker(id, producto) }))).then((m) => vigente && setDibujosStickers(m));
    return () => {
      vigente = false;
    };
  }, [ofrecidos, producto]);

  const entradaBase = useMemo<Omit<EntradaImagenHistoria, "ajuste" | "soloTarjeta"> | null>(
    () => (foto ? { datos, foto, logoUrl: tienda.fotoPerfilUrl ?? tienda.logoUrl, nombreTienda: tienda.nombre, direccion, stickers } : null),
    [datos, foto, tienda.fotoPerfilUrl, tienda.logoUrl, tienda.nombre, direccion, stickers],
  );

  useEffect(() => {
    if (!entradaBase || !ajuste) return;
    let vigente = true;
    let url: string | null = null;
    const clave: Clave = { entradaBase, ajuste };
    generarImagenHistoria({ ...entradaBase, ajuste }).then(
      (blob) => {
        if (!vigente) return;
        url = URL.createObjectURL(blob);
        setHecha({ blob, url, para: clave });
      },
      () => vigente && setFalloPara(clave),
    );
    return () => {
      vigente = false;
      if (url) setTimeout(() => URL.revokeObjectURL(url!), 0);
    };
  }, [entradaBase, ajuste]);

  const esActual = (c: Clave | null | undefined) => !!c && c.entradaBase === entradaBase && c.ajuste === ajuste;
  const imagen = esActual(hecha?.para) ? hecha : null;
  const fallo = esActual(falloPara);
  const cambiar = (k: keyof OpcionesHistoria) => (v: boolean) => setOpciones((o) => ({ ...o, [k]: v }));
  const nombreArchivo = `historia-${producto.slug}.jpg`;

  /** Menú de compartir del sistema con la imagen. Sin soporte para archivos: descarga la imagen y copia el enlace. */
  const enviar = (texto: string | undefined, copiarEnlace: boolean) => {
    if (!imagen) return;
    const archivo = new File([imagen.blob], nombreArchivo, { type: imagen.blob.type });
    const puede = typeof navigator.share === "function" && navigator.canShare?.({ files: [archivo] });
    if (!puede) {
      guardarArchivo(imagen.blob, nombreArchivo);
      if (enlace) void copiarTexto(enlace).then((ok) => toast(ok ? "Imagen guardada y enlace copiado." : "Imagen guardada; no pudimos copiar el enlace."));
      else toast("Imagen guardada.");
      return;
    }
    if (copiarEnlace && enlace) void copiarTexto(enlace).then((ok) => ok && toast(AVISO_INSTAGRAM));
    navigator.share({ files: [archivo], ...(texto ? { text: texto } : {}), title: producto.nombre }).catch((e: unknown) => {
      if (sinAbortar(e)) toast("No pudimos compartir la imagen. Inténtalo otra vez.");
    });
  };

  return (
    <>
      <Hoja abierta alCerrar={alCerrar} titulo="Tu historia" altura="auto">
        <div className="flex flex-col gap-4">
          <div className="mx-auto aspect-[9/16] w-[180px] overflow-hidden rounded-radio-m bg-superficie-hundida shadow-sm">
            {imagen ? (
              // eslint-disable-next-line @next/next/no-img-element -- vista previa de un blob local
              <img src={imagen.url} alt={`Vista previa de la historia de ${producto.nombre}`} className="h-full w-full object-cover" />
            ) : fallo ? (
              <p role="alert" className="grid h-full place-items-center px-3 text-center text-secundario text-peligro">No pudimos preparar la imagen.</p>
            ) : (
              <p role="status" className="grid h-full place-items-center px-3 text-center text-secundario text-texto-secundario">Preparando…</p>
            )}
          </div>

          <Boton jerarquia="secundario" anchoCompleto deshabilitado={!natural || !ajuste} onClick={() => setAjustando(true)}>Ajustar foto</Boton>

          <div className="rounded-radio-l bg-superficie px-4 py-3 ring-1 ring-linea">
            <p className="text-destacado text-texto">Stickers</p>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
              {ofrecidos.map((id) => (
                <BotonSticker
                  key={id}
                  id={id}
                  dibujo={dibujosStickers[`${id}|${textoSticker(id, producto)}`]}
                  puesto={stickers.some((s) => s.id === id)}
                  alTocar={() => setStickers((l) => alternarSticker(l, id, producto))}
                />
              ))}
            </div>
          </div>

          <ul className="rounded-radio-l bg-superficie px-4 ring-1 ring-linea">
            <Fila texto="Precio" valor={opciones.precio} alCambiar={cambiar("precio")} />
            {conPresentaciones && <Fila texto="Presentaciones" valor={opciones.presentaciones} alCambiar={cambiar("presentaciones")} />}
            <Fila texto="Foto de tu tienda" valor={opciones.fotoTienda} alCambiar={cambiar("fotoTienda")} />
          </ul>

          {!abre && <Aviso tono="atencion">{AVISO_SIN_PUBLICAR}</Aviso>}
          <Boton anchoCompleto tamano="grande" icono={<IconoHistoria tamano={20} />} deshabilitado={!imagen} onClick={() => setDondeAbierta(true)}>
            Compartir
          </Boton>
        </div>
      </Hoja>

      {ajustando && entradaBase && natural && ajuste && (
        <AjustarFotoHistoria
          entrada={entradaBase}
          natural={natural}
          inicial={ajuste}
          stickersIniciales={stickers}
          alListo={(a, puestos) => { setAjuste(a); setStickers(puestos); setAjustando(false); }}
          alCancelar={() => setAjustando(false)}
        />
      )}

      {dondeAbierta && (
        <Hoja abierta alCerrar={() => setDondeAbierta(false)} titulo="¿Dónde la compartes?" altura="auto">
          <div className="flex flex-col gap-3">
            <Destino
              icono={<span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#e6f9ee] text-[#1faa59]"><IconoEstadoWhatsApp tamano={26} /></span>}
              titulo="Estado de WhatsApp"
              detalle="El enlace va en el texto"
              alTocar={() => { setDondeAbierta(false); enviar(enlace ? textoWhatsAppHistoria(producto.nombre, enlace) : undefined, false); }}
            />
            <Destino
              icono={<span className="grid size-11 shrink-0 place-items-center rounded-full bg-superficie-hundida text-texto"><IconoHistoria tamano={26} /></span>}
              titulo="Historia de Instagram"
              detalle="Copiamos el enlace: pégalo con el sticker «Enlace»"
              alTocar={() => { setDondeAbierta(false); enviar(undefined, true); }}
            />
            <Boton jerarquia="terciario" anchoCompleto onClick={() => {
              setDondeAbierta(false);
              // En la app instalada en iPhone la descarga directa no siempre anda: descargarArchivo usa la hoja de compartir
              if (imagen) void descargarArchivo(imagen.blob, nombreArchivo).then((ok) => ok && toast("Imagen guardada."));
            }}>
              Guardar la imagen
            </Boton>
          </div>
        </Hoja>
      )}
    </>
  );
}

function Fila({ texto, valor, alCambiar }: { texto: string; valor: boolean; alCambiar: (v: boolean) => void }) {
  return (
    <li className="flex min-h-14 items-center justify-between gap-3 border-b border-linea last:border-b-0">
      <span className="text-destacado text-texto">{texto}</span>
      <Interruptor encendido={valor} alCambiar={alCambiar} etiqueta={texto} />
    </li>
  );
}

function Destino({ icono, titulo, detalle, alTocar }: { icono: React.ReactNode; titulo: string; detalle: string; alTocar: () => void }) {
  return (
    <button type="button" onClick={alTocar} className="tocable flex min-h-16 items-center gap-3 rounded-radio-l bg-superficie px-4 py-2 text-left ring-1 ring-linea">
      {icono}
      <span className="min-w-0">
        <span className="block text-destacado text-texto">{titulo}</span>
        <span className="block text-secundario text-texto-secundario">{detalle}</span>
      </span>
    </button>
  );
}

/** Un sticker de la fila: se ve como sticker (borde blanco, sombra, inclinado) y marca con un check cuando está puesto. */
function BotonSticker({ id, dibujo, puesto, alTocar }: { id: IdSticker; dibujo?: { url: string; ancho: number; alto: number }; puesto: boolean; alTocar: () => void }) {
  const alto = 64;
  return (
    <button
      type="button"
      aria-pressed={puesto}
      aria-label={NOMBRE_STICKER[id]}
      data-sticker-boton={id}
      onClick={alTocar}
      className="tocable relative grid min-h-11 min-w-11 place-items-center p-1"
    >
      {dibujo ? (
        // eslint-disable-next-line @next/next/no-img-element -- sticker dibujado en el teléfono
        <img
          src={dibujo.url}
          alt=""
          draggable={false}
          style={{ height: alto, width: (dibujo.ancho / dibujo.alto) * alto, transform: `rotate(${INCLINACION_STICKER[id]}deg)`, opacity: puesto ? 1 : 0.55 }}
        />
      ) : (
        <span className="block" style={{ height: alto, width: alto }} />
      )}
      {puesto && (
        <span className="absolute right-0 top-0 grid size-5 place-items-center rounded-full bg-accion text-white ring-2 ring-superficie">
          <IconoCheck tamano={12} strokeWidth={3.5} />
        </span>
      )}
    </button>
  );
}
