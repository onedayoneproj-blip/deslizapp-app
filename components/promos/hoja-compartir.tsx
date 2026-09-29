"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useConsulta, useTiendaActiva } from "@/lib/data/consulta";
import { useData } from "@/lib/data/provider";
import { generarImagenPromo } from "@/lib/imagen-promo";
import { enlacePromo, enlaceWhatsAppMensaje, mensajePromo } from "@/lib/mensajes-promo";
import { copiarImagen, copiarTexto, guardarArchivo, puedeCopiarImagen } from "@/lib/portapapeles";
import { estadoPromo } from "@/lib/promos";
import type { Producto, Promo, Tienda } from "@/lib/types";
import { Hoja } from "../hoja";
import { IconoWhatsApp } from "../iconos";
import { useToast } from "../toast";
import { TarjetaPromo } from "./tarjeta-promo";

/** "Compartir promo": texto, enlace e imagen para mandarle la promo a los clientes. Solo activas o programadas. */
export function HojaCompartir({ promoId }: { promoId: string }) {
  const router = useRouter();
  const { getPromos, getProductos } = useData();
  const { tiendaId, tienda } = useTiendaActiva();
  const cerrar = useCallback(() => router.push("/promos", { scroll: false }), [router]);
  const { data: promos } = useConsulta(`promos:${tiendaId}`, () => getPromos(tiendaId));
  const { data: productos } = useConsulta(`productos:${tiendaId}`, () => getProductos(tiendaId));
  if (!promos || !productos || !tienda) return null;

  const promo = promos.find((p) => p.id === promoId);
  if (!promo || estadoPromo(promo) === "terminada") {
    return (
      <Hoja abierta alCerrar={cerrar} titulo="Compartir promo">
        <div className="py-6 text-center">
          <p className="font-display text-xl">{promo ? "Esta promo ya terminó." : "Esta promo no vive aquí."}</p>
          <p className="mt-1 text-suave">{promo ? "Las promos terminadas no se comparten. Puedes duplicarla como nueva." : "Quizá es de otra tienda."}</p>
          <button type="button" onClick={cerrar} className="mt-5 h-12 w-full rounded-full bg-bosque font-extrabold text-papel">
            Volver a promos
          </button>
        </div>
      </Hoja>
    );
  }
  const producto = promo.productoId ? productos.find((p) => p.id === promo.productoId) : undefined;
  // "grande": tiene un campo de texto (el mensaje) y la hoja no cambia de tamaño con el teclado (HANDOFF.md)
  return (
    <Hoja abierta alCerrar={cerrar} titulo="Compartir promo" altura="grande">
      <Contenido promo={promo} tienda={tienda} producto={producto} productosDeColeccion={promo.coleccion ? productos.filter((p) => p.categoria === promo.coleccion).length : 0} />
    </Hoja>
  );
}

type Imagen = { blob: Blob; nombre: string };

function Contenido({ promo, tienda, producto, productosDeColeccion }: { promo: Promo; tienda: Tienda; producto?: Producto; productosDeColeccion: number }) {
  const toast = useToast();
  const estado = estadoPromo(promo);
  const [mensaje, setMensaje] = useState(() => mensajePromo(promo, estado, tienda, producto));
  const [imagen, setImagen] = useState<Imagen | null>(null);
  const [falloImagen, setFalloImagen] = useState(false);
  // Soporte del navegador: sin navigator.share (escritorio) no hay "Compartir…". Esta hoja solo existe en el
  // cliente (los datos se leen del navegador), así que se puede mirar directo.
  const [soporte] = useState(() => ({ compartir: typeof navigator.share === "function", copiarImagen: puedeCopiarImagen() }));
  const campoMensaje = useRef<HTMLTextAreaElement>(null);
  const enlace = enlacePromo(tienda, promo);

  // La imagen se genera UNA vez al abrir la hoja y queda en memoria: los botones no esperan nada antes del toque
  useEffect(() => {
    let vigente = true;
    generarImagenPromo({ promo, estado, tienda, producto, productosDeColeccion })
      .then((blob) => vigente && setImagen({ blob, nombre: `promo-${tienda.slug}.${blob.type === "image/jpeg" ? "jpg" : "png"}` }))
      .catch(() => vigente && setFalloImagen(true));
    return () => {
      vigente = false;
    };
    // Solo depende de la promo: el mensaje que se edita no cambia la imagen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promo.id]);

  const errorCopiar = () => toast("No pudimos copiarlo. Inténtalo de nuevo.");

  // OJO: cada acción llama a la API del navegador de inmediato (dentro del toque), sin await antes.
  const compartir = () => {
    const archivo = imagen ? new File([imagen.blob], imagen.nombre, { type: imagen.blob.type }) : null;
    const conArchivo = archivo && navigator.canShare?.({ files: [archivo] });
    navigator
      .share(conArchivo ? { files: [archivo], text: mensaje, title: promo.nombre } : { text: mensaje, title: promo.nombre })
      .catch((e: unknown) => {
        if (!(e instanceof DOMException && e.name === "AbortError")) toast("No pudimos compartirla. Inténtalo de nuevo.");
      });
  };
  const copiarMensaje = () => void copiarTexto(mensaje, campoMensaje.current).then((ok) => (ok ? toast("Texto copiado") : errorCopiar()));
  const copiarEnlace = () => void copiarTexto(enlace).then((ok) => (ok ? toast("Enlace copiado") : errorCopiar()));
  const copiarLaImagen = () => {
    if (imagen) void copiarImagen(imagen.blob).then((ok) => (ok ? toast("Imagen copiada") : errorCopiar()));
  };
  const guardarLaImagen = () => {
    if (imagen) guardarArchivo(imagen.blob, imagen.nombre);
  };

  const preparando = !imagen && !falloImagen;
  const boton = "tocable flex h-12 items-center justify-center gap-2 rounded-full border-[1.5px] border-bosque bg-white text-[15px] font-extrabold text-bosque disabled:opacity-50";
  const previa = useMemo(() => <TarjetaPromo promo={promo} producto={producto} productosDeColeccion={productosDeColeccion} />, [promo, producto, productosDeColeccion]);

  return (
    <div className="flex flex-col gap-4">
      {previa}

      {soporte.compartir && (
        <button
          type="button"
          onClick={compartir}
          className="tocable flex h-14 items-center justify-center rounded-full bg-mandarina text-[16.5px] font-extrabold text-bosque-oscuro"
        >
          Compartir…
        </button>
      )}

      <label className="flex flex-col gap-1.5 text-[13.5px] font-bold">
        Mensaje <span className="-mt-1 text-[12.5px] font-semibold text-suave">Puedes ajustarlo antes de copiarlo o enviarlo.</span>
        <textarea
          ref={campoMensaje}
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value)}
          rows={6}
          className="w-full min-w-0 resize-none rounded-2xl border-[1.5px] border-borde bg-white px-3.5 py-3 text-base leading-snug font-normal text-bosque outline-none focus:border-bosque"
        />
      </label>

      <div className="grid grid-cols-2 gap-2.5">
        <button type="button" onClick={copiarMensaje} className={boton}>
          Copiar texto
        </button>
        <button type="button" onClick={copiarEnlace} className={boton}>
          Copiar enlace
        </button>
        {soporte.copiarImagen && (
          <button type="button" onClick={copiarLaImagen} disabled={!imagen} className={boton}>
            Copiar imagen
          </button>
        )}
        <button type="button" onClick={guardarLaImagen} disabled={!imagen} className={`${boton} ${soporte.copiarImagen ? "" : "col-span-2"}`}>
          Guardar imagen
        </button>
      </div>
      {preparando && <p className="-mt-2 text-center text-[13px] font-semibold text-suave">Preparando la imagen…</p>}
      {falloImagen && <p className="-mt-2 text-center text-[13px] font-semibold text-[#b4432a]">No pudimos preparar la imagen. Puedes compartir el texto y el enlace.</p>}

      <a
        href={enlaceWhatsAppMensaje(mensaje)}
        target="_blank"
        rel="noreferrer"
        className="tocable flex h-12 items-center justify-center gap-2 rounded-full bg-bosque text-[15px] font-extrabold text-papel"
      >
        <IconoWhatsApp tamano={20} />
        Enviar por WhatsApp
      </a>
      <p className="-mt-1 truncate text-center text-[12.5px] text-suave">{enlace}</p>
    </div>
  );
}
