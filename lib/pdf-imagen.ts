// PDF de una página con una imagen JPEG a página completa, sin librerías: un PDF mínimo válido.
// Se usa para el cupón imprimible ("Exportar como imagen · PDF"). Solo cliente.

/** Lee el ancho y alto del JPEG (marcador SOF). */
function medirJpeg(b: Uint8Array): { ancho: number; alto: number } {
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) {
      i++;
      continue;
    }
    const m = b[i + 1];
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { alto: (b[i + 5] << 8) | b[i + 6], ancho: (b[i + 7] << 8) | b[i + 8] };
    i += 2 + ((b[i + 2] << 8) | b[i + 3]);
  }
  throw new Error("JPEG inválido");
}

/** PDF de una página de `ancho` puntos (540 pt = 7,5 in) y el alto que pida la proporción de la imagen. */
export async function pdfDeJpeg(jpeg: Blob, ancho = 540): Promise<Blob> {
  const datos = new Uint8Array(await jpeg.arrayBuffer());
  const img = medirJpeg(datos);
  const alto = Math.round((ancho * img.alto) / img.ancho);
  const enc = new TextEncoder();
  const partes: Uint8Array[] = [];
  const offsets: number[] = [];
  let largo = 0;
  const poner = (x: string | Uint8Array) => {
    const u = typeof x === "string" ? enc.encode(x) : x;
    partes.push(u);
    largo += u.length;
  };
  const objeto = (n: number, cuerpo: string | Uint8Array[]) => {
    offsets[n] = largo;
    poner(`${n} 0 obj\n`);
    if (typeof cuerpo === "string") poner(cuerpo);
    else cuerpo.forEach(poner);
    poner("\nendobj\n");
  };
  poner("%PDF-1.4\n");
  objeto(1, "<< /Type /Catalog /Pages 2 0 R >>");
  objeto(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  objeto(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${ancho} ${alto}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);
  objeto(4, [
    enc.encode(`<< /Type /XObject /Subtype /Image /Width ${img.ancho} /Height ${img.alto} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${datos.length} >>\nstream\n`),
    datos,
    enc.encode("\nendstream"),
  ]);
  const contenido = `q ${ancho} 0 0 ${alto} 0 0 cm /Im0 Do Q`;
  objeto(5, `<< /Length ${contenido.length} >>\nstream\n${contenido}\nendstream`);
  const xref = largo;
  poner(`xref\n0 6\n0000000000 65535 f \n${[1, 2, 3, 4, 5].map((n) => `${String(offsets[n]).padStart(10, "0")} 00000 n \n`).join("")}`);
  poner(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(partes as BlobPart[], { type: "application/pdf" });
}
