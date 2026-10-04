import type { TemaCatalogo } from "./tema";
import type { VistaSolicitud } from "../types";
import { dinero } from "./carrito";
const loadImg = (src: string): Promise<HTMLImageElement | null> =>
  new Promise((resolve) => {
    if (!src) return resolve(null);
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => resolve(i);
    i.onerror = () => resolve(null);
    i.src = src;
  });
export async function invoiceCanvas(o: VistaSolicitud, tema?: TemaCatalogo) {
  // factura estilo "ticket": recibo de papel con bordes recortados
  await Promise.all(
    [
      '500 62px "Cormorant Garamond"',
      'italic 500 62px "Cormorant Garamond"',
      "500 23px Manrope",
      "700 25px Manrope",
      "800 56px Manrope",
    ].map((f) => (document.fonts ? document.fonts.load(f).catch(() => {}) : 0)),
  );
  const it = o.items,
    total = o.total;
  const INK = tema?.colores.ink ?? "#2A1A22",
    INK2 = tema?.colores.ink2 ?? "#4A3841",
    MUT = tema?.colores.muted ?? "#7C6770",
    ACC = tema?.colores.accent ?? "#A3325C",
    LINE = tema?.colores.line ?? "#E6D5CF",
    BG = tema?.colores.bg ?? "#F7EDE9";
  const fuente = (f: string) => f === "Figtree" ? "DZ Figtree" : f === "Fredoka" ? "DZ Fredoka" : f;
  const DSP = `"${fuente(tema?.fuentes.display ?? "Cormorant Garamond")}",Georgia,serif`,
    BODY = `"${fuente(tema?.fuentes.body ?? "Manrope")}",system-ui,sans-serif`;
  await Promise.all([document.fonts.load("500 62px "+DSP),document.fonts.load("700 25px "+BODY)]);
  const W = 1080,
    PX = 160,
    PW = 760,
    L = PX + 64,
    R = PX + PW - 64,
    CX = W / 2,
    ROW = 98;
  const H = 70 + 505 + it.length * ROW + 610 + 70;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const x = c.getContext("2d");
  if (!x) throw new Error("No pudimos preparar el recibo.");
  const txt = (
    s: string,
    X: number,
    Y: number,
    font: string,
    color: string,
    align: CanvasTextAlign = "left",
  ) => {
    x.font = font;
    x.fillStyle = color;
    x.textAlign = align;
    x.fillText(s, X, Y);
  };
  const spaced = (
    s: string,
    X: number,
    Y: number,
    font: string,
    color: string,
    sp: number,
  ) => {
    // texto con espaciado entre letras, centrado
    x.font = font;
    x.fillStyle = color;
    x.textAlign = "left";
    const ws = [...s].map((ch) => x.measureText(ch).width),
      tw = ws.reduce((a, b) => a + b, 0) + sp * (s.length - 1);
    let cx = X - tw / 2;
    [...s].forEach((ch, i) => {
      x.fillText(ch, cx, Y);
      cx += ws[i] + sp;
    });
  };
  const dash = (Y: number) => {
    x.save();
    x.strokeStyle = LINE;
    x.lineWidth = 3;
    x.setLineDash([10, 7]);
    x.beginPath();
    x.moveTo(L, Y);
    x.lineTo(R, Y);
    x.stroke();
    x.restore();
  };
  // papel con bordes recortados
  x.fillStyle = BG;
  x.fillRect(0, 0, W, H);
  x.save();
  x.shadowColor = "rgba(42,26,34,.12)";
  x.shadowBlur = 40;
  x.shadowOffsetY = 20;
  x.fillStyle = "#fff";
  x.fillRect(PX, 70, PW, H - 140);
  x.restore();
  x.fillStyle = BG;
  for (let cx = PX + 18; cx < PX + PW; cx += 36) {
    x.beginPath();
    x.arc(cx, 70, 14, 0, Math.PI * 2);
    x.fill();
    x.beginPath();
    x.arc(cx, H - 70, 14, 0, Math.PI * 2);
    x.fill();
  }
  // marca
  const iso = await loadImg(
    o.tienda.fotoPerfilUrl ?? o.tienda.logoUrl ?? "/tienda/original-0.jpg",
  );
  x.save();
  x.beginPath();
  x.arc(CX, 188, 48, 0, Math.PI * 2);
  x.fillStyle = ACC;
  x.fill();
  x.clip();
  if (iso) x.drawImage(iso, CX - 48, 140, 96, 96);
  x.restore();
  x.font = `500 62px ${DSP}`;
  const w1 = x.measureText("Esencias ").width;
  x.font = `italic 500 62px ${DSP}`;
  const w2 = x.measureText("Michel").width;
  if (o.tienda.nombre === "Esencias Michel") {
    txt("Esencias ", CX - (w1 + w2) / 2, 305, `500 62px ${DSP}`, INK);
    txt("Michel", CX - (w1 + w2) / 2 + w1, 305, `italic 500 62px ${DSP}`, ACC);
  } else txt(o.tienda.nombre, CX, 305, `500 62px ${DSP}`, INK, "center");
  spaced("RECIBO DE PEDIDO", CX, 350, `700 19px ${BODY}`, MUT, 6);
  // datos
  const when =
    new Date(o.creadaEn).toLocaleString("es-DO", {
      timeZone: "America/Santo_Domingo",
      day: "numeric",
      month: "short",
      year: "numeric",
    }) +
    " · " +
    new Date(o.creadaEn).toLocaleTimeString("es-DO", {
      timeZone: "America/Santo_Domingo",
      hour: "numeric",
      minute: "2-digit",
    });
  [
    ["Pedido", "#" + o.codigo.toUpperCase()],
    ["Fecha", when],
    ["WhatsApp", o.tienda.whatsapp ?? "A coordinar con la tienda"],
  ].forEach(([k, v], i) => {
    txt(k, L, 410 + i * 42, `500 23px ${BODY}`, INK2);
    txt(v, R, 410 + i * 42, `700 23px ${BODY}`, INK, "right");
  });
  dash(533);
  // perfumes
  let y = 560;
  for (const p of it) {
    const im = await loadImg(p.foto ?? "");
    x.save();
    x.beginPath();
    x.arc(L + 37, y + 49, 37, 0, Math.PI * 2);
    x.clip();
    if (im) x.drawImage(im, L, y + 12, 74, 74);
    x.restore();
    x.font = `500 33px ${DSP}`;
    let name = p.nombre;
    while (x.measureText(name).width > R - L - 94 - 150 && name.length > 4)
      name = name.slice(0, -2) + "…";
    txt(name, L + 94, y + 44, `500 33px ${DSP}`, INK);
    txt(
      `${p.varianteTexto ?? ""}${p.porEncargo ? " · Por encargo" : ""}${p.cantidad > 1 ? " × " + p.cantidad : ""}`,
      L + 94,
      y + 74,
      `500 20px ${BODY}`,
      MUT,
    );
    txt(
      dinero(p.precioUnitario * p.cantidad),
      R,
      y + 58,
      `700 25px ${BODY}`,
      INK,
      "right",
    );
    y += ROW;
  }
  y += 20;
  dash(y);
  // totales
  y += 58;
  txt(
    `Subtotal · ${it.length} ${it.length === 1 ? "producto" : "productos"}`,
    L,
    y,
    `500 23px ${BODY}`,
    INK2,
  );
  txt(dinero(total), R, y, `500 23px ${BODY}`, INK2, "right");
  y += 44;
  txt("Envío", L, y, `500 23px ${BODY}`, INK2);
  txt("A coordinar", R, y, `500 23px ${BODY}`, INK2, "right");
  y += 80;
  x.save();
  x.font = `800 21px ${BODY}`;
  x.fillStyle = INK;
  x.textAlign = "left";
  let tx = L;
  for (const ch of "TOTAL") {
    x.fillText(ch, tx, y - 8);
    tx += x.measureText(ch).width + 5;
  }
  x.restore();
  txt(dinero(total), R, y, `800 56px ${BODY}`, INK, "right");
  y += 46;
  dash(y);
  // agradecimiento
  y += 90;
  txt(
    "¡Gracias por tu compra!",
    CX,
    y,
    `italic 500 52px ${DSP}`,
    ACC,
    "center",
  );
  y += 50;
  txt(
    "Tu pedido, a un chat de distancia. ¡Que lo disfrutes! 💕",
    CX,
    y,
    `500 21px ${BODY}`,
    INK2,
    "center",
  );
  // código de barras con el número del pedido
  y += 52;
  let bx = CX - 210,
    seed = [...o.codigo].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7) >>> 0;
  x.fillStyle = INK;
  while (bx < CX + 206) {
    seed = (seed * 1103515245 + 12345) >>> 0;
    const bw = 2 + ((seed >> 8) % 4),
      gap = 2 + ((seed >> 12) % 4);
    x.fillRect(bx, y, Math.min(bw, CX + 210 - bx), 70);
    bx += bw + gap;
  }
  y += 100;
  spaced(o.codigo.toUpperCase(), CX, y, `700 20px ${BODY}`, MUT, 8);
  y += 46;
  txt(
    "Documento sin valor fiscal" + (location.host ? " · " + location.host : ""),
    CX,
    y,
    `500 17px ${BODY}`,
    MUT,
    "center",
  );
  return c;
}
export function pdfFromJpeg(
  jpg: Uint8Array<ArrayBuffer>,
  w: number,
  h: number,
) {
  // PDF de una página con la factura (sin librerías)
  const enc = (s: string) => new TextEncoder().encode(s),
    parts: Uint8Array<ArrayBuffer>[] = [],
    offs: number[] = [];
  let len = 0;
  const push = (b: Uint8Array<ArrayBuffer>) => {
    parts.push(b);
    len += b.length;
  };
  const PW = 595.28,
    PH = (PW * h) / w;
  push(enc("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n"));
  const obj = (n: number, body: string, stream?: Uint8Array<ArrayBuffer>) => {
    offs[n] = len;
    push(enc(`${n} 0 obj\n${body}\n`));
    if (stream) {
      push(enc("stream\n"));
      push(stream);
      push(enc("\nendstream\n"));
    }
    push(enc("endobj\n"));
  };
  const content = enc(
    `q ${PW.toFixed(2)} 0 0 ${PH.toFixed(2)} 0 0 cm /Im0 Do Q`,
  );
  obj(1, "<< /Type /Catalog /Pages 2 0 R >>");
  obj(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  obj(
    3,
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW.toFixed(2)} ${PH.toFixed(2)}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`,
  );
  obj(
    4,
    `<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>`,
    jpg,
  );
  obj(5, `<< /Length ${content.length} >>`, content);
  const xref = len;
  push(
    enc(
      `xref\n0 6\n0000000000 65535 f \n${[1, 2, 3, 4, 5].map((n) => String(offs[n]).padStart(10, "0") + " 00000 n \n").join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`,
    ),
  );
  return new Blob(parts, { type: "application/pdf" });
}

export async function descargarRecibo(o: VistaSolicitud, tipo: "png" | "pdf", tema?: TemaCatalogo) {
  const c = await invoiceCanvas(o, tema);
  const imagen = await new Promise<Blob>((resolve, reject) =>
    c.toBlob(
      (b) =>
        b ? resolve(b) : reject(new Error("No pudimos preparar el recibo.")),
      tipo === "png" ? "image/png" : "image/jpeg",
      0.92,
    ),
  );
  const blob =
    tipo === "png"
      ? imagen
      : pdfFromJpeg(
          new Uint8Array(await imagen.arrayBuffer()),
          c.width,
          c.height,
        );
  const file = new File([blob], `Recibo-${o.codigo}.${tipo}`, {
    type: blob.type,
  });
  if (
    navigator.canShare?.({ files: [file] }) &&
    matchMedia("(pointer:coarse)").matches
  ) {
    try {
      await navigator.share({
        files: [file],
        title: "Recibo · " + o.tienda.nombre,
      });
      return;
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
