// Crear producto es una historia (docs/prompts/crear-producto-historia.md): una pregunta por pantalla. Ayudas para los scripts que
// antes llenaban la hoja de producto para crear (la hoja sigue para editar). Las fotos se suben y marcan igual que antes: es la
// misma tira (SeccionMedios) en el primer paso.

/** Abre /catalogo/nuevo y espera la historia (paso de la foto). */
export async function abrirHistoria(page, url) {
  await page.goto(`${url}/catalogo/nuevo`);
  await page.locator("[data-historia-producto]").waitFor();
}

/** Toca un botón de la historia («Seguir», «Atrás», «Seguir sin foto»…) y deja que llegue el paso. */
export async function tocarHistoria(page, boton) {
  await page.getByRole("button", { name: boton, exact: true }).click();
  await page.waitForTimeout(200);
}

/** Una foto de prueba (sin foto no se publica: regla de Lewis). */
export async function fotoDePrueba(page) {
  const b = await page.evaluate(() => {
    const l = document.createElement("canvas");
    l.width = l.height = 400;
    const x = l.getContext("2d");
    x.fillStyle = "#c97b4a";
    x.fillRect(0, 0, 400, 400);
    return l.toDataURL("image/png").split(",")[1];
  });
  await page.locator("[data-entrada-medios]").setInputFiles([{ name: "f.png", mimeType: "image/png", buffer: Buffer.from(b, "base64") }]);
  await page.locator("[data-marco-foto] img").waitFor();
}

/**
 * Desde el paso de la foto: escribe el nombre y el precio; queda en «¿Cuánto cuesta?». Si todavía no hay foto, sube una de prueba
 * (sin foto, «Publicar» queda apagado); con `sinFoto`, sigue sin ella (solo se podrá guardar sin publicar).
 */
export async function nombreYPrecio(page, nombre, precio, { sinFoto = false } = {}) {
  const vacia = (await page.getByRole("button", { name: "Seguir sin foto", exact: true }).count()) > 0;
  if (vacia && !sinFoto) await fotoDePrueba(page);
  await tocarHistoria(page, vacia && sinFoto ? "Seguir sin foto" : "Seguir");
  await page.locator("[data-campo-paso]").fill(nombre);
  await tocarHistoria(page, "Seguir");
  await page.locator("[data-campo-paso]").fill(precio);
}

/**
 * Desde el precio: el stock, «Así se ve en tu catálogo» y «Publicar» (o «Guardar sin publicar»). Con `esperar`, espera la
 * celebración (lo que en la hoja era volver a /catalogo).
 */
export async function hastaPublicar(page, { publicar = true, esperar = true } = {}) {
  await tocarHistoria(page, "Seguir");
  await tocarHistoria(page, "Seguir");
  await page.getByRole("button", { name: publicar ? "Publicar" : "Guardar sin publicar", exact: true }).click();
  if (esperar) await page.locator("[data-celebracion]").waitFor({ timeout: 15000 });
}

/** Cierra la historia con la ✕ (ya guardado no pregunta) y espera volver al catálogo. */
export async function cerrarHistoria(page, url) {
  await page.locator("[data-hoja-cabecera]").getByRole("button", { name: "Cerrar", exact: true }).click();
  await page.waitForURL(`${url}/catalogo`);
}
