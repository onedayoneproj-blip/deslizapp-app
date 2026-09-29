"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useConsulta, useTiendaActiva } from "@/lib/data/consulta";
import { useData } from "@/lib/data/provider";
import { generarImagenPromo, type ImagenPromo } from "@/lib/imagen-promo";
import { mensajePromo } from "@/lib/mensajes-promo";
import { pdfDeJpeg } from "@/lib/pdf-imagen";
import { copiarTexto, guardarArchivo } from "@/lib/portapapeles";
import { estadoPromo } from "@/lib/promos";
import type { Producto, Promo, Tienda } from "@/lib/types";
import { Hoja } from "../hoja";
import { useToast } from "../toast";
import { CuponTienda, marcaDeTienda } from "../marca-tienda/cupon-tienda";

/** "Compartir promo": vista previa con la marca de la tienda, mensaje y un solo botón "Enviar" para mandarle la promo a los clientes. Solo activas o programadas. */
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

function Contenido({ promo, tienda, producto, productosDeColeccion }: { promo: Promo; tienda: Tienda; producto?: Producto; productosDeColeccion: number }) {
  const toast = useToast();
  const estado = estadoPromo(promo);
  const [mensaje, setMensaje] = useState(() => mensajePromo(promo, estado, tienda, producto));
  const [editando, setEditando] = useState(false);
  const [imagen, setImagen] = useState<ImagenPromo | null>(null);
  const [falloImagen, setFalloImagen] = useState(false);
  const campoMensaje = useRef<HTMLTextAreaElement>(null);
  const nombreArchivo = `promo-${tienda.slug}`;

  // La imagen se genera UNA vez al abrir la hoja y queda en memoria: "Enviar" no espera nada antes del toque
  useEffect(() => {
    let vigente = true;
    generarImagenPromo({ promo, estado, tienda, marca: marcaDeTienda(tienda), producto, productosDeColeccion })
      .then((i) => vigente && setImagen(i))
      .catch(() => vigente && setFalloImagen(true));
    return () => {
      vigente = false;
    };
    // Solo depende de la promo: el mensaje que se edita no cambia la imagen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promo.id]);

  // El campo aparece con el toque de "Editar mensaje": el foco va en el mismo toque (HANDOFF.md, teclado en iPhone)
  const editar = () => {
    flushSync(() => setEditando(true));
    campoMensaje.current?.focus();
  };

  // OJO: la API del navegador se llama de inmediato (dentro del toque), sin await antes.
  const enviar = () => {
    if (typeof navigator.share !== "function") {
      // Escritorio: sin menú de compartir, se copia el mensaje
      void copiarTexto(mensaje, campoMensaje.current).then((ok) => toast(ok ? "Mensaje copiado" : "No pudimos copiarlo. Inténtalo de nuevo."));
      return;
    }
    const archivo = imagen ? new File([imagen.blob], `${nombreArchivo}.${imagen.blob.type === "image/jpeg" ? "jpg" : "png"}`, { type: imagen.blob.type }) : null;
    const conArchivo = archivo && navigator.canShare?.({ files: [archivo] });
    if (conArchivo) {
      // WhatsApp en iPhone a veces descarta el texto al recibir imagen + texto: se deja copiado por si no lo pega
      void copiarTexto(mensaje).then((ok) => ok && toast("Te copiamos el mensaje por si WhatsApp no lo pega"));
    }
    navigator
      .share(conArchivo ? { files: [archivo], text: mensaje, title: promo.nombre } : { text: mensaje, title: promo.nombre })
      .catch((e: unknown) => {
        if (!(e instanceof DOMException && e.name === "AbortError")) toast("No pudimos compartirla. Inténtalo de nuevo.");
      });
  };

  const exportar = (formato: "imagen" | "pdf") => {
    if (!imagen) return;
    if (formato === "imagen") {
      guardarArchivo(imagen.blob, `${nombreArchivo}.${imagen.blob.type === "image/jpeg" ? "jpg" : "png"}`);
      return;
    }
    imagen
      .jpegParaPdf()
      .then(pdfDeJpeg)
      .then((pdf) => guardarArchivo(pdf, `${nombreArchivo}.pdf`))
      .catch(() => toast("No pudimos armar el PDF. Inténtalo de nuevo."));
  };

  // Lo que ve el cliente: el cupón con la marca de la tienda (Mi marca), no la del panel
  const previa = useMemo(
    () => <CuponTienda promo={promo} marca={marcaDeTienda(tienda)} tienda={tienda} producto={producto} productosDeColeccion={productosDeColeccion} />,
    [promo, tienda, producto, productosDeColeccion],
  );
  const enlaceSuave = "tocable font-extrabold text-bosque underline underline-offset-2 disabled:opacity-50 disabled:no-underline";

  return (
    <div className="flex flex-col gap-4">
      {previa}

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-3 text-[13.5px] font-bold">
          Mensaje
          {!editando && (
            <button type="button" onClick={editar} className={`${enlaceSuave} text-[13.5px]`}>
              Editar mensaje
            </button>
          )}
        </div>
        {editando ? (
          <textarea
            ref={campoMensaje}
            aria-label="Mensaje"
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            rows={6}
            className="w-full min-w-0 resize-none rounded-2xl border-[1.5px] border-borde bg-white px-3.5 py-3 text-base leading-snug font-normal text-bosque outline-none focus:border-bosque"
          />
        ) : (
          <p data-mensaje className="truncate rounded-2xl border-[1.5px] border-borde bg-white px-3.5 py-3 text-[14.5px] text-suave">
            {mensaje}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={enviar}
        className="tocable flex h-14 items-center justify-center rounded-full bg-mandarina text-[16.5px] font-extrabold text-bosque-oscuro"
      >
        Enviar
      </button>

      <p className="text-center text-[13.5px] font-semibold text-suave">
        {falloImagen ? (
          <span className="text-peligro">No pudimos preparar la imagen. Aun así puedes enviar el mensaje.</span>
        ) : (
          <>
            Exportar como{" "}
            <button type="button" onClick={() => exportar("imagen")} disabled={!imagen} className={enlaceSuave}>
              imagen
            </button>{" "}
            ·{" "}
            <button type="button" onClick={() => exportar("pdf")} disabled={!imagen} className={enlaceSuave}>
              PDF
            </button>
            {!imagen && <span className="block text-[12.5px]">Preparando la imagen…</span>}
          </>
        )}
      </p>
    </div>
  );
}
