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

/** Desde el paso de la foto (con o sin fotos): escribe el nombre y el precio; queda en «¿Cuánto cuesta?». */
export async function nombreYPrecio(page, nombre, precio) {
  const sinFoto = page.getByRole("button", { name: "Seguir sin foto", exact: true });
  await tocarHistoria(page, (await sinFoto.count()) ? "Seguir sin foto" : "Seguir");
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
