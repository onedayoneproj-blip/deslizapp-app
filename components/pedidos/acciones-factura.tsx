"use client";

import { useEffect, useMemo, useState } from "react";
import { copiarTexto, descargarArchivo, guardarArchivo } from "@/lib/portapapeles";
import { pdfDeJpeg } from "@/lib/pdf-imagen";
import { generarImagenFactura, type ImagenFactura } from "@/lib/imagen-factura";
import type { Cliente, PedidoConItems, Producto, Tienda } from "@/lib/types";
import { Hoja } from "../hoja";
import { useToast } from "../toast";
import { IconoDescargar } from "../iconos";
import { Aviso, Boton, TarjetaDocumento } from "../ui";
import { etiquetaDePago } from "./comunes";

export function AccionesFactura({ pedido, cliente, tienda, productos }: { pedido: PedidoConItems; cliente: Cliente | null; tienda: Tienda; productos: Producto[] }) {
  const toast = useToast();
  const [factura, setFactura] = useState<ImagenFactura | null>(null);
  const [preparando, setPreparando] = useState(true);
  const [fallo, setFallo] = useState(false);
  const [intento, setIntento] = useState(0);
  const [vistaAbierta, setVistaAbierta] = useState(false);
  // Archivo que se está generando ahora (el botón tocado muestra su carga y ninguno responde mientras tanto)
  const [trabajando, setTrabajando] = useState<"pdf" | "png" | null>(null);
  const nombreArchivo = `factura-${pedido.numero}`;
  const nombreCliente = cliente?.nombre ?? "tu cliente";
  const caption = `¡Hola, ${nombreCliente}! Te comparto el comprobante de tu pedido #${pedido.numero} de ${tienda.nombre}. ¡Gracias por tu compra!`;

  useEffect(() => {
    let vigente = true;
    generarImagenFactura({ pedido, cliente, tienda, productos })
      .then((imagen) => vigente && setFactura(imagen))
      .catch(() => vigente && (setFallo(true), toast("No pudimos preparar el comprobante. Inténtalo de nuevo.")))
      .finally(() => vigente && setPreparando(false));
    return () => {
      vigente = false;
    };
  }, [pedido, cliente, tienda, productos, toast, intento]);

  // La vista previa es el MISMO archivo que se descarga: el PNG que genera `generarImagenFactura`
  const urlVista = useMemo(() => (factura ? URL.createObjectURL(factura.blob) : null), [factura]);
  useEffect(() => () => void (urlVista && URL.revokeObjectURL(urlVista)), [urlVista]);

  const terminar = (entregado: boolean) => {
    if (!entregado) return;
    setVistaAbierta(false);
    toast("Factura descargada");
  };

  const descargarPng = async () => {
    if (!factura || trabajando) return;
    setTrabajando("png");
    try {
      terminar(await descargarArchivo(factura.blob, `${nombreArchivo}.png`));
    } finally {
      setTrabajando(null);
    }
  };

  const descargarPdf = async () => {
    if (!factura || trabajando) return;
    setTrabajando("pdf");
    try {
      const pdf = await pdfDeJpeg(await factura.jpegParaPdf());
      terminar(await descargarArchivo(pdf, `${nombreArchivo}.pdf`));
    } catch {
      toast("No pudimos armar el PDF. Inténtalo otra vez.");
    } finally {
      setTrabajando(null);
    }
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

  // La misma etiqueta de pago que la hoja del pedido; aquí un pedido a crédito sin saldo se llama "Pagado"
  const etiqueta = etiquetaDePago(pedido, true);

  return (
    <>
      <TarjetaDocumento
        titulo={`Factura #${pedido.numero}`}
        etiqueta={etiqueta}
        alDescargar={() => setVistaAbierta(true)}
        alCompartir={compartir}
        compartiendo={preparando || !factura}
      />
      {preparando && <p role="status" className="text-center text-etiqueta font-normal text-texto-secundario">Preparamos tu factura para descargarla o compartirla.</p>}
      <Hoja abierta={vistaAbierta} alCerrar={() => setVistaAbierta(false)} titulo={`Factura #${pedido.numero}`} altura="auto">
        <div className="flex flex-col gap-4">
          {fallo ? (
            <Aviso tono="peligro" accion={{ texto: "Reintentar", alTocar: () => (setFallo(false), setPreparando(true), setIntento((n) => n + 1)) }}>
              No pudimos preparar la factura.
            </Aviso>
          ) : urlVista && !preparando ? (
            <div className="mx-auto max-h-[55vh] w-full overflow-y-auto overscroll-contain rounded-radio-s border border-linea bg-superficie shadow-flotante">
              {/* eslint-disable-next-line @next/next/no-img-element -- blob local: es el archivo que se descarga */}
              <img src={urlVista} alt={`Vista previa de la factura del pedido #${pedido.numero}`} className="block w-full" />
            </div>
          ) : (
            <div role="status" aria-label="Preparando la factura" className="esqueleto mx-auto aspect-3/4 max-h-[55vh] w-full rounded-radio-s" />
          )}
          <div className="grid grid-cols-2 gap-3">
            <Boton tamano="grande" anchoCompleto icono={<IconoDescargar tamano={20} />} onClick={descargarPdf} cargando={trabajando === "pdf"} deshabilitado={!factura || trabajando === "png"}>
              PDF
            </Boton>
            <Boton jerarquia="secundario" tamano="grande" anchoCompleto icono={<IconoDescargar tamano={20} />} onClick={descargarPng} cargando={trabajando === "png"} deshabilitado={!factura || trabajando === "pdf"}>
              Imagen
            </Boton>
          </div>
          <p className="text-center text-etiqueta font-normal text-texto-secundario">Es un comprobante de venta; no tiene valor fiscal.</p>
        </div>
      </Hoja>
    </>
  );
}
