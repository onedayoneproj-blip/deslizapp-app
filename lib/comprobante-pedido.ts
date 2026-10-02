import { ZONA_HORARIA } from "./config";
import { formatearPesos } from "./formato";
import type { Cliente, PedidoConItems } from "./types";

type FormatoComprobante = "pdf" | "png";
type Linea =
  | { tipo: "texto"; texto: string; tamano: number; color: string; negrita?: boolean; alineacion?: CanvasTextAlign; espacioAntes?: number }
  | { tipo: "regla"; espacioAntes?: number };

const VERDE = "#174b3a";
const SUAVE = "#4f6a5e";
const ANCHO = 595;
const MARGEN = 44;

function dividirTexto(texto: string, limite: number): string[] {
  const palabras = texto.split(/\s+/);
  const lineas: string[] = [];
  let actual = "";
  for (const palabra of palabras) {
    const siguiente = actual ? `${actual} ${palabra}` : palabra;
    if (siguiente.length > limite && actual) {
      lineas.push(actual);
      actual = palabra;
    } else {
      actual = siguiente;
    }
  }
  if (actual) lineas.push(actual);
  return lineas;
}

function prepararLineas({ pedido, cliente, tiendaNombre }: { pedido: PedidoConItems; cliente: Cliente | null; tiendaNombre: string }): Linea[] {
  const fecha = new Intl.DateTimeFormat("es-DO", { timeZone: ZONA_HORARIA, dateStyle: "long" }).format(
    new Date(pedido.despachadoEn ?? pedido.creadoEn),
  );
  const subtotal = pedido.items.reduce((total, item) => total + item.precioUnitario * item.cantidad, 0);
  const descuento = Math.max(0, subtotal - pedido.total);
  const texto = (contenido: string, opciones: Partial<Extract<Linea, { tipo: "texto" }>> = {}): Linea => ({
    tipo: "texto",
    texto: contenido,
    tamano: 11,
    color: SUAVE,
    ...opciones,
  });
  const lineas: Linea[] = [
    ...dividirTexto(`Deslizapp · ${tiendaNombre}`, 54).map((linea) => texto(linea, { tamano: 11, alineacion: "center", color: SUAVE })),
    texto("Comprobante de venta", { tamano: 20, negrita: true, alineacion: "center", color: VERDE, espacioAntes: 8 }),
    texto(`Pedido #${pedido.numero}`, { tamano: 12, negrita: true, alineacion: "center", color: VERDE, espacioAntes: 3 }),
    { tipo: "regla", espacioAntes: 17 },
    texto(`Fecha: ${fecha}`, { color: VERDE }),
    ...dividirTexto(`Cliente: ${cliente?.nombre ?? "Cliente sin nombre"}`, 72).map((linea, indice) =>
      texto(linea, { color: VERDE, espacioAntes: indice === 0 ? 5 : 0 }),
    ),
  ];

  if (cliente?.telefono) lineas.push(texto(`Teléfono: ${cliente.telefono}`, { espacioAntes: 5 }));
  lineas.push({ tipo: "regla", espacioAntes: 14 }, texto("DETALLE", { tamano: 9, negrita: true, color: SUAVE }));

  for (const item of pedido.items) {
    lineas.push(
      ...dividirTexto(item.nombreProducto, 72).map((linea, indice) =>
        texto(linea, { tamano: 11, negrita: true, color: VERDE, espacioAntes: indice === 0 ? 10 : 0 }),
      ),
      texto(`${item.cantidad} × ${formatearPesos(item.precioUnitario)}     ${formatearPesos(item.precioUnitario * item.cantidad)}`, {
        tamano: 10,
        color: SUAVE,
        espacioAntes: 3,
      }),
    );
  }

  lineas.push({ tipo: "regla", espacioAntes: 13 }, texto(`Subtotal     ${formatearPesos(subtotal)}`, { alineacion: "right", color: SUAVE }));
  if (descuento > 0) {
    lineas.push(texto(`Descuento${pedido.codigoPromo ? ` · ${pedido.codigoPromo}` : ""}     -${formatearPesos(descuento)}`, {
      alineacion: "right",
      espacioAntes: 5,
    }));
  }
  lineas.push(
    texto(`TOTAL     ${formatearPesos(pedido.total)}`, { tamano: 15, negrita: true, color: VERDE, alineacion: "right", espacioAntes: 8 }),
    { tipo: "regla", espacioAntes: 14 },
    texto("PAGO", { tamano: 9, negrita: true, color: SUAVE }),
    texto(`Forma de pago     ${pedido.pagoModo === "credito" ? "A crédito" : "Contado"}`, { espacioAntes: 8 }),
    texto(`Abonado     ${formatearPesos(pedido.pagado)}`, { espacioAntes: 5 }),
    texto(`Saldo pendiente     ${formatearPesos(pedido.saldo)}`, { espacioAntes: 5 }),
    texto("Gracias por tu compra.", { tamano: 10, alineacion: "center", espacioAntes: 24 }),
  );
  return lineas;
}

function alturaDe(linea: Linea): number {
  return linea.tipo === "regla" ? 8 + (linea.espacioAntes ?? 0) : linea.tamano * 1.5 + (linea.espacioAntes ?? 0);
}

function generarPdf(lineas: Linea[]): Blob {
  const altura = Math.ceil(70 + lineas.reduce((total, linea) => total + alturaDe(linea), 0));
  let arriba = 38;
  const comandos: string[] = [];
  for (const linea of lineas) {
    arriba += linea.espacioAntes ?? 0;
    if (linea.tipo === "regla") {
      const y = altura - arriba;
      comandos.push(`0.91 0.87 0.81 RG 0.8 w ${MARGEN} ${y} m ${ANCHO - MARGEN} ${y} l S`);
      arriba += 8;
      continue;
    }
    const y = altura - arriba - linea.tamano;
    const [r, g, b] = linea.color.match(/[a-f\d]{2}/gi)!.map((valor) => Number.parseInt(valor, 16) / 255);
    const font = linea.negrita ? "F2" : "F1";
    const anchoTexto = linea.texto.length * linea.tamano * 0.52;
    const x = linea.alineacion === "center" ? (ANCHO - anchoTexto) / 2 : linea.alineacion === "right" ? ANCHO - MARGEN - anchoTexto : MARGEN;
    comandos.push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg BT /${font} ${linea.tamano} Tf 1 0 0 1 ${x.toFixed(2)} ${y} Tm ${pdfTexto(linea.texto)} Tj ET`);
    arriba += alturaDe(linea) - (linea.espacioAntes ?? 0);
  }
  const contenido = comandos.join("\n");
  const objetos = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${ANCHO} ${altura}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
    `<< /Length ${contenido.length} >>\nstream\n${contenido}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n%deslizapp\n";
  const offsets = [0];
  objetos.forEach((objeto, indice) => {
    offsets.push(pdf.length);
    pdf += `${indice + 1} 0 obj\n${objeto}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([pdf], { type: "application/pdf" });
}

function pdfTexto(texto: string): string {
  const especiales: Record<number, number> = {
    0x20ac: 0x80, 0x201a: 0x82, 0x192: 0x83, 0x201e: 0x84, 0x2026: 0x85, 0x2020: 0x86,
    0x2021: 0x87, 0x2c6: 0x88, 0x2030: 0x89, 0x160: 0x8a, 0x2039: 0x8b, 0x152: 0x8c,
    0x17d: 0x8e, 0x2018: 0x91, 0x2019: 0x92, 0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95,
    0x2013: 0x96, 0x2014: 0x97, 0x2dc: 0x98, 0x2122: 0x99, 0x161: 0x9a, 0x203a: 0x9b,
    0x153: 0x9c, 0x17e: 0x9e, 0x178: 0x9f,
  };
  const hex = Array.from(texto, (caracter) => {
    const code = caracter.codePointAt(0)!;
    const winAnsi = especiales[code] ?? (code <= 0xff ? code : 0x3f);
    return winAnsi.toString(16).padStart(2, "0");
  }).join("");
  return `<${hex}>`;
}

async function generarPng(lineas: Linea[]): Promise<Blob> {
  const escala = 2;
  const margen = 72;
  const ancho = 900;
  const alto = Math.ceil(88 + lineas.reduce((total, linea) => total + alturaDe(linea) * 1.65, 0));
  const canvas = document.createElement("canvas");
  canvas.width = ancho * escala;
  canvas.height = alto * escala;
  const contexto = canvas.getContext("2d");
  if (!contexto) throw new Error("Canvas no disponible");
  contexto.scale(escala, escala);
  contexto.fillStyle = "#fff";
  contexto.fillRect(0, 0, ancho, alto);
  let arriba = 44;
  for (const linea of lineas) {
    arriba += (linea.espacioAntes ?? 0) * 1.65;
    if (linea.tipo === "regla") {
      const y = arriba + 4;
      contexto.strokeStyle = "#e8decf";
      contexto.lineWidth = 1.5;
      contexto.beginPath();
      contexto.moveTo(margen, y);
      contexto.lineTo(ancho - margen, y);
      contexto.stroke();
      arriba += 13;
      continue;
    }
    const size = linea.tamano * 1.65;
    contexto.fillStyle = linea.color;
    contexto.font = `${linea.negrita ? "700" : "400"} ${size}px Arial, sans-serif`;
    contexto.textAlign = linea.alineacion ?? "left";
    const x = linea.alineacion === "center" ? ancho / 2 : linea.alineacion === "right" ? ancho - margen : margen;
    const texto = linea.texto;
    const maximo = ancho - margen * 2;
    if (contexto.measureText(texto).width > maximo && linea.alineacion !== "center") {
      contexto.fillText(texto, x, arriba + size, maximo);
    } else {
      contexto.fillText(texto, x, arriba + size);
    }
    arriba += alturaDe(linea) * 1.65 - (linea.espacioAntes ?? 0) * 1.65;
  }
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("No se pudo crear la imagen");
  return blob;
}

function descargar(blob: Blob, nombre: string): void {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  enlace.style.display = "none";
  document.body.append(enlace);
  enlace.click();
  enlace.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export async function descargarComprobantePedido({
  pedido,
  cliente,
  tiendaNombre,
  formato,
}: {
  pedido: PedidoConItems;
  cliente: Cliente | null;
  tiendaNombre: string;
  formato: FormatoComprobante;
}): Promise<void> {
  const lineas = prepararLineas({ pedido, cliente, tiendaNombre });
  const blob = formato === "pdf" ? generarPdf(lineas) : await generarPng(lineas);
  const nombreTienda = tiendaNombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  descargar(blob, `comprobante-pedido-${pedido.numero}-${nombreTienda || "deslizapp"}.${formato}`);
}
