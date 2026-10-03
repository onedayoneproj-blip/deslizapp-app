"use client";

import { useEffect, useMemo, useState } from "react";
import { copiarTexto, guardarArchivo } from "@/lib/portapapeles";
import { pdfDeJpeg } from "@/lib/pdf-imagen";
import { generarImagenFactura, type ImagenFactura } from "@/lib/imagen-factura";
import type { Cliente, PedidoConItems, Producto, Tienda } from "@/lib/types";
import { Hoja } from "../hoja";
import { useToast } from "../toast";
import { Boton, TarjetaDocumento, type TonoEtiqueta } from "../ui";

export function AccionesFactura({ pedido, cliente, tienda, productos }: { pedido: PedidoConItems; cliente: Cliente | null; tienda: Tienda; productos: Producto[] }) {
  const toast = useToast();
  const [factura, setFactura] = useState<ImagenFactura | null>(null);
  const [preparando, setPreparando] = useState(true);
  const [descargaAbierta, setDescargaAbierta] = useState(false);
  const nombreArchivo = useMemo(() => `factura-pedido-${pedido.numero}-${tienda.slug}`, [pedido.numero, tienda.slug]);
  const nombreCliente = cliente?.nombre ?? "tu cliente";
  const caption = `¡Hola, ${nombreCliente}! Te comparto el comprobante de tu pedido #${pedido.numero} de ${tienda.nombre}. ¡Gracias por tu compra!`;

  useEffect(() => {
    let vigente = true;
    generarImagenFactura({ pedido, cliente, tienda, productos })
      .then((imagen) => vigente && setFactura(imagen))
      .catch(() => vigente && toast("No pudimos preparar el comprobante. Inténtalo de nuevo."))
      .finally(() => vigente && setPreparando(false));
    return () => {
      vigente = false;
    };
  }, [pedido, cliente, tienda, productos, toast]);

  const descargarPng = () => {
    if (!factura) return;
    guardarArchivo(factura.blob, `${nombreArchivo}.png`);
    setDescargaAbierta(false);
    toast("Factura guardada como imagen.");
  };

  const descargarPdf = () => {
    if (!factura) return;
    factura
      .jpegParaPdf()
      .then(pdfDeJpeg)
      .then((pdf) => {
        guardarArchivo(pdf, `${nombreArchivo}.pdf`);
        setDescargaAbierta(false);
        toast("Factura guardada como PDF.");
      })
      .catch(() => toast("No pudimos armar el PDF. Inténtalo otra vez."));
  };

  const compartir = () => {
    if (!factura) return;
    const archivo = new File([factura.blob], `${nombreArchivo}.png`, { type: "image/png" });
    if (typeof navigator.share !== "function" || !navigator.canShare?.({ files: [archivo] })) {
      guardarArchivo(factura.blob, `${nombreArchivo}.png`);
      void copiarTexto(caption).then((ok) => toast(ok ? "Imagen guardada y texto copiado para compartir." : "Imagen guardada; no pudimos copiar el texto."));
      return;
    }
    void copiarTexto(caption).then((ok) => ok && toast("Te copiamos el texto por si la app que elijas no lo incluye."));
    void navigator.share({ files: [archivo], text: caption, title: `Factura · ${tienda.nombre}` }).catch((error: unknown) => {
      if (!(error instanceof DOMException && error.name === "AbortError")) toast("No pudimos compartir la factura. Inténtalo otra vez.");
    });
  };

  // "Al contado" y "Pagado" en éxito; "A crédito" (con deuda) en atención
  const etiqueta: { texto: string; tono: TonoEtiqueta } =
    pedido.pagoModo !== "credito" ? { texto: "Al contado", tono: "exito" } : pedido.saldo > 0 ? { texto: "A crédito", tono: "atencion" } : { texto: "Pagado", tono: "exito" };

  return (
    <>
      <TarjetaDocumento
        titulo={`Factura #${pedido.numero}`}
        etiqueta={etiqueta}
        alDescargar={() => setDescargaAbierta(true)}
        alCompartir={compartir}
        descargando={preparando || !factura}
        compartiendo={preparando || !factura}
      />
      {preparando && <p role="status" className="text-center text-etiqueta font-normal text-texto-secundario">Preparamos tu factura para descargarla o compartirla.</p>}
      <Hoja abierta={descargaAbierta} alCerrar={() => setDescargaAbierta(false)} titulo="Descargar factura" altura="auto">
        <div className="flex flex-col gap-3">
          <p className="text-center text-secundario text-texto-secundario">Elige cómo quieres guardarla.</p>
          <Boton tamano="grande" anchoCompleto onClick={descargarPdf} deshabilitado={!factura}>
            Descargar como PDF
          </Boton>
          <Boton jerarquia="secundario" tamano="grande" anchoCompleto onClick={descargarPng} deshabilitado={!factura}>
            Descargar como imagen
          </Boton>
          <p className="text-center text-etiqueta font-normal text-texto-secundario">Es un comprobante de venta; no tiene valor fiscal.</p>
        </div>
      </Hoja>
    </>
  );
}
