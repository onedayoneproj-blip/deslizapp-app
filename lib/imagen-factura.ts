import { cargarFuentesMarca, familiaTexto, familiaTitulo } from "./fuentes-marca";
import { formatearPesos, iniciales } from "./formato";
import { coloresCupon, contraste, TEXTO_OSCURO, TEXTO_CLARO } from "./marca";
import { ZONA_HORARIA } from "./config";
import type { Cliente, PedidoConItems, Producto, Tienda } from "./types";

/** Papel de documento: la factura es SIEMPRE blanca y opaca (también con la app en modo oscuro), por eso no usa un token de tema. */
const PAPEL_DOCUMENTO = "#ffffff";
const ANCHO = 1080;
const MARGEN_TICKET = 130;
const ANCHO_TICKET = 820;

export type ImagenFactura = {
  blob: Blob;
  jpegParaPdf: () => Promise<Blob>;
};

type Entrada = {
  pedido: PedidoConItems;
  cliente: Cliente | null;
  tienda: Tienda;
  productos: Producto[];
};

function cargarImagen(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolver) => {
    const imagen = new Image();
    imagen.crossOrigin = "anonymous";
    imagen.onload = () => resolver(imagen);
    imagen.onerror = () => resolver(null);
    imagen.src = src;
  });
}

function blobDe(canvas: HTMLCanvasElement, tipo: string, calidad?: number): Promise<Blob> {
  return new Promise((resolver, rechazar) => {
    canvas.toBlob((blob) => (blob ? resolver(blob) : rechazar(new Error("No se pudo crear el archivo."))), tipo, calidad);
  });
}

function dibujarLinea(ctx: CanvasRenderingContext2D, texto: string, x: number, y: number, fuente: string, color: string, alineacion: CanvasTextAlign = "left") {
  ctx.font = fuente;
  ctx.fillStyle = color;
  ctx.textAlign = alineacion;
  ctx.fillText(texto, x, y);
}

function ajustarTexto(ctx: CanvasRenderingContext2D, texto: string, anchoMaximo: number): string {
  if (ctx.measureText(texto).width <= anchoMaximo) return texto;
  let corto = texto;
  while (corto.length > 1 && ctx.measureText(`${corto}…`).width > anchoMaximo) corto = corto.slice(0, -1);
  return `${corto.trimEnd()}…`;
}

function dibujarLineaSeparadora(ctx: CanvasRenderingContext2D, izquierda: number, derecha: number, y: number, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 7]);
  ctx.beginPath();
  ctx.moveTo(izquierda, y);
  ctx.lineTo(derecha, y);
  ctx.stroke();
  ctx.restore();
}

function codigoBarras(ctx: CanvasRenderingContext2D, texto: string, centro: number, y: number, tinta: string) {
  let x = centro - 210;
  let semilla = [...texto].reduce((total, caracter) => (total * 31 + caracter.charCodeAt(0)) >>> 0, 7);
  ctx.fillStyle = tinta;
  while (x < centro + 210) {
    semilla = (semilla * 1103515245 + 12345) >>> 0;
    const ancho = 2 + ((semilla >> 8) % 4);
    const espacio = 2 + ((semilla >> 12) % 4);
    ctx.fillRect(x, y, Math.min(ancho, centro + 210 - x), 64);
    x += ancho + espacio;
  }
}

/** Recibo visual basado en la factura del catálogo HTML; genera el PNG y conserva el lienzo para exportarlo a PDF. */
export async function generarImagenFactura({ pedido, cliente, tienda, productos }: Entrada): Promise<ImagenFactura> {
  await cargarFuentesMarca(tienda.marcaEstilo);
  const colores = coloresCupon({ principal: tienda.marcaColorPrincipal, acento: tienda.marcaColorAcento, estilo: tienda.marcaEstilo });
  const textoClaro = contraste(TEXTO_CLARO, colores.fondo) >= 4.5 ? TEXTO_CLARO : TEXTO_OSCURO;
  // El recibo se dibuja sobre papel blanco: no uses los tonos claros de marca como tinta.
  const tintaTexto = TEXTO_OSCURO;
  const tintaAcento = contraste(colores.acento, "#ffffff") >= 4.5 ? colores.acento : TEXTO_OSCURO;
  const titulo = familiaTitulo(tienda.marcaEstilo);
  const cuerpo = familiaTexto(tienda.marcaEstilo);
  const productosPorId = new Map(productos.map((producto) => [producto.id, producto]));
  const filas = await Promise.all(
    pedido.items.map(async (item) => ({ item, foto: productosPorId.get(item.productoId)?.fotos[0] ? await cargarImagen(productosPorId.get(item.productoId)!.fotos[0]!) : null })),
  );
  const logo = tienda.logoUrl ? await cargarImagen(tienda.logoUrl) : null;

  const ALTO = 70 + 505 + filas.length * 112 + 800 + 70;
  const IZQUIERDA = MARGEN_TICKET + 64;
  const DERECHA = MARGEN_TICKET + ANCHO_TICKET - 64;
  const CENTRO = ANCHO / 2;
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) throw new Error("No se pudo preparar la factura.");
  const lienzo = ctx.canvas;
  lienzo.width = ANCHO;
  lienzo.height = ALTO;

  // Fondo y papel con bordes recortados como el recibo del catálogo.
  ctx.fillStyle = PAPEL_DOCUMENTO;
  ctx.fillRect(0, 0, ANCHO, ALTO);
  ctx.save();
  ctx.shadowColor = "rgba(42,26,34,.12)";
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 20;
  ctx.fillStyle = "#fff";
  ctx.fillRect(MARGEN_TICKET, 70, ANCHO_TICKET, ALTO - 140);
  ctx.restore();
  ctx.fillStyle = PAPEL_DOCUMENTO;
  for (let x = MARGEN_TICKET + 18; x < MARGEN_TICKET + ANCHO_TICKET; x += 36) {
    ctx.beginPath(); ctx.arc(x, 70, 14, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x, ALTO - 70, 14, 0, Math.PI * 2); ctx.fill();
  }

  // Logo circular o iniciales de la tienda.
  ctx.save();
  ctx.beginPath();
  ctx.arc(CENTRO, 188, 48, 0, Math.PI * 2);
  ctx.fillStyle = colores.acento;
  ctx.fill();
  ctx.clip();
  if (logo) {
    ctx.drawImage(logo, CENTRO - 48, 140, 96, 96);
  } else {
    ctx.fillStyle = colores.fondo;
    ctx.fillRect(CENTRO - 48, 140, 96, 96);
    dibujarLinea(ctx, iniciales(tienda.nombre), CENTRO, 201, `700 30px ${cuerpo}`, textoClaro, "center");
  }
  ctx.restore();

  dibujarLinea(ctx, tienda.nombre, CENTRO, 305, `700 56px ${titulo}`, tintaAcento, "center");
  dibujarLinea(ctx, "RECIBO DE PEDIDO", CENTRO, 350, `700 19px ${cuerpo}`, tintaAcento, "center");

  const fecha = new Intl.DateTimeFormat("es-DO", { timeZone: ZONA_HORARIA, day: "numeric", month: "short", year: "numeric" }).format(
    new Date(pedido.despachadoEn ?? pedido.creadoEn),
  );
  const hora = new Intl.DateTimeFormat("es-DO", { timeZone: ZONA_HORARIA, hour: "numeric", minute: "2-digit" }).format(
    new Date(pedido.despachadoEn ?? pedido.creadoEn),
  );
  const detalles: [string, string][] = [
    ["Pedido", `#${pedido.numero}`],
    ["Fecha", `${fecha} · ${hora}`],
    ["Cliente", cliente?.nombre ?? "Cliente sin nombre"],
  ];
  if (cliente?.telefono) detalles.push(["WhatsApp", cliente.telefono]);
  let y = 410;
  for (const [etiqueta, valor] of detalles) {
    dibujarLinea(ctx, etiqueta, IZQUIERDA, y, `500 23px ${cuerpo}`, tintaTexto);
    ctx.font = `700 23px ${cuerpo}`;
    dibujarLinea(ctx, ajustarTexto(ctx, valor, 430), DERECHA, y, `700 23px ${cuerpo}`, tintaTexto, "right");
    y += 42;
  }
  y += 18;
  dibujarLineaSeparadora(ctx, IZQUIERDA, DERECHA, y, "#e6d5cf");
  y += 28;

  for (const { item, foto } of filas) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(IZQUIERDA + 37, y + 49, 37, 0, Math.PI * 2);
    ctx.clip();
    if (foto) {
      ctx.drawImage(foto, IZQUIERDA, y + 12, 74, 74);
    } else {
      ctx.fillStyle = "#f7ede9";
      ctx.fillRect(IZQUIERDA, y + 12, 74, 74);
      dibujarLinea(ctx, iniciales(item.nombreProducto), IZQUIERDA + 37, y + 57, `700 19px ${cuerpo}`, tintaTexto, "center");
    }
    ctx.restore();
    const inicioTexto = IZQUIERDA + 94;
    const espacioTexto = DERECHA - inicioTexto - 150;
    ctx.font = `600 33px ${titulo}`;
    let nombre = item.nombreProducto;
    while (ctx.measureText(nombre).width > espacioTexto && nombre.length > 4) nombre = `${nombre.slice(0, -2)}…`;
    dibujarLinea(ctx, nombre, inicioTexto, y + 44, `600 33px ${titulo}`, tintaTexto);
    dibujarLinea(ctx, `${item.cantidad} × ${formatearPesos(item.precioUnitario)}`, inicioTexto, y + 76, `500 20px ${cuerpo}`, tintaTexto);
    dibujarLinea(ctx, formatearPesos(item.cantidad * item.precioUnitario), DERECHA, y + 58, `700 25px ${cuerpo}`, tintaTexto, "right");
    y += 112;
  }

  y += 20;
  dibujarLineaSeparadora(ctx, IZQUIERDA, DERECHA, y, "#e6d5cf");
  const subtotal = pedido.items.reduce((total, item) => total + item.precioUnitario * item.cantidad, 0);
  const descuento = Math.max(0, subtotal - pedido.total);
  y += 58;
  dibujarLinea(ctx, `Subtotal · ${filas.length} ${filas.length === 1 ? "producto" : "productos"}`, IZQUIERDA, y, `500 23px ${cuerpo}`, tintaTexto);
  dibujarLinea(ctx, formatearPesos(subtotal), DERECHA, y, `500 23px ${cuerpo}`, tintaTexto, "right");
  if (descuento > 0) {
    y += 44;
    dibujarLinea(ctx, `Descuento${pedido.codigoPromo ? ` · ${pedido.codigoPromo}` : ""}`, IZQUIERDA, y, `500 23px ${cuerpo}`, tintaTexto);
    dibujarLinea(ctx, `-${formatearPesos(descuento)}`, DERECHA, y, `500 23px ${cuerpo}`, tintaTexto, "right");
  }
  y += 80;
  dibujarLinea(ctx, "TOTAL", IZQUIERDA, y - 8, `800 21px ${cuerpo}`, tintaTexto);
  dibujarLinea(ctx, formatearPesos(pedido.total), DERECHA, y, `800 56px ${cuerpo}`, tintaTexto, "right");
  y += 46;
  dibujarLineaSeparadora(ctx, IZQUIERDA, DERECHA, y, "#e6d5cf");

  y += 78;
  dibujarLinea(ctx, "PAGO", IZQUIERDA, y, `700 19px ${cuerpo}`, tintaAcento);
  y += 42;
  dibujarLinea(ctx, "Forma de pago", IZQUIERDA, y, `500 23px ${cuerpo}`, tintaTexto);
  dibujarLinea(ctx, pedido.pagoModo === "credito" ? "A crédito" : "Contado", DERECHA, y, `700 23px ${cuerpo}`, tintaTexto, "right");
  y += 42;
  dibujarLinea(ctx, "Abonado", IZQUIERDA, y, `500 23px ${cuerpo}`, tintaTexto);
  dibujarLinea(ctx, formatearPesos(pedido.pagado), DERECHA, y, `700 23px ${cuerpo}`, tintaTexto, "right");
  y += 42;
  dibujarLinea(ctx, "Saldo pendiente", IZQUIERDA, y, `500 23px ${cuerpo}`, tintaTexto);
  dibujarLinea(ctx, formatearPesos(pedido.saldo), DERECHA, y, `700 23px ${cuerpo}`, tintaTexto, "right");

  y += 88;
  dibujarLinea(ctx, "¡Gracias por tu compra!", CENTRO, y, `italic 500 52px ${titulo}`, tintaAcento, "center");
  y += 52;
  dibujarLinea(ctx, "Comprobante sin valor fiscal", CENTRO, y, `500 20px ${cuerpo}`, tintaTexto, "center");
  y += 50;
  const codigo = `PEDIDO${pedido.numero}`;
  codigoBarras(ctx, codigo, CENTRO, y, tintaTexto);
  y += 94;
  dibujarLinea(ctx, codigo, CENTRO, y, `700 20px ${cuerpo}`, tintaTexto, "center");

  const blob = await blobDe(lienzo, "image/png");
  return {
    blob,
    jpegParaPdf: () => blobDe(lienzo, "image/jpeg", 0.95),
  };
}
