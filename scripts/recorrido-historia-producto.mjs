import { join } from "node:path";

// Recorridos reales de la historia; las suites conservan sus aserciones sobre datos y edición.
export const historia = (page) => page.locator("[data-historia-crear]");
export const rama = (page) => page.locator("[data-presentaciones-historia]");
export const enHistoria = async (page) => await historia(page).count() > 0;
export async function nuevoHastaPrecio(page, url, nombre, precio, archivo = join(process.cwd(), "public/catalogos/esencias-michel/fotos/yara-rosa.jpg")) {
  await page.goto(`${url}/catalogo/nuevo`);
  await historia(page).waitFor();
  if (archivo) {
    await page.locator("[data-entrada-medios]").setInputFiles(archivo);
    await page.locator("[data-foto-principal]").waitFor();
  }
  await completarNombrePrecio(page, nombre, precio);
}
export async function completarNombrePrecio(page, nombre, precio) {
  await page.getByRole("button", { name: "Seguir", exact: true }).click();
  await page.getByRole("textbox", { name: "Nombre del producto", exact: true }).fill(nombre);
  await page.getByRole("button", { name: "Seguir", exact: true }).click();
  await page.getByRole("textbox", { name: "Precio (RD$)", exact: true }).fill(precio);
}
export async function abrirRama(page) {
  await page.getByRole("button", { name: "Tiene tallas o colores", exact: true }).click();
  await rama(page).waitFor();
}
export async function volverAEjes(page) {
  const etapa = await rama(page).getAttribute("data-etapa");
  if (etapa === "stock") await page.getByRole("button", { name: "Cambiar qué cambia", exact: true }).click();
  while (await rama(page).getAttribute("data-etapa") !== "ejes") await page.getByRole("button", { name: "Atrás", exact: true }).click();
}
export async function vaciarEjes(page) {
  await volverAEjes(page);
  const elegidos = rama(page).getByRole("group", { name: "Qué cambia", exact: true }).locator('[role="checkbox"][aria-checked="true"]');
  while (await elegidos.count()) await elegidos.first().click();
}
export async function quitarEje(page, eje) {
  await volverAEjes(page);
  const b = rama(page).getByRole("checkbox", { name: eje, exact: true });
  if (await b.getAttribute("aria-checked") === "true") await b.click();
}
export async function irAValores(page, eje) {
  await volverAEjes(page);
  const b = rama(page).getByRole("checkbox", { name: eje, exact: true });
  if (!(await b.count())) {
    await rama(page).getByRole("button", { name: "+ Otra", exact: true }).click();
    await rama(page).getByRole("textbox", { name: "Qué otra cosa cambia", exact: true }).fill(eje);
    await rama(page).getByRole("button", { name: "Agregar", exact: true }).click();
  } else if (await b.getAttribute("aria-checked") !== "true") await b.click();
  await page.getByRole("button", { name: "Seguir", exact: true }).click();
  while (!(await rama(page).locator(`[data-eje="${eje}"]`).count())) await page.getByRole("button", { name: "Seguir", exact: true }).click();
}
export async function elegirValoresHistoria(page, eje, valores) {
  const seccion = rama(page).locator(`[data-eje="${eje}"]`);
  for (const v of valores) {
    const casilla = seccion.getByRole("checkbox", { name: v, exact: true });
    if (await casilla.count()) {
      if (await casilla.getAttribute("aria-checked") !== "true") await casilla.click();
    } else {
      await seccion.getByRole("radio", { name: "+ Otro", exact: true }).click();
      const caja = seccion.getByRole("textbox", { name: /^Otro / });
      await caja.fill(v);
      await caja.press("Enter");
    }
  }
}
export async function elegirEjeValores(page, eje, valores) {
  await irAValores(page, eje);
  await elegirValoresHistoria(page, eje, valores);
  await volverAEjes(page);
}
export async function irACantidades(page) {
  for (let i = 0; i < 4 && await rama(page).getAttribute("data-etapa") !== "stock"; i++) {
    await page.getByRole("button", { name: "Seguir", exact: true }).click();
    if (await page.getByRole("alertdialog").count()) return;
  }
  await rama(page).locator("[data-resumen-presentaciones], input").first().waitFor();
}
export async function publicarHistoria(page) {
  await page.getByRole("button", { name: "Publicar", exact: true }).click();
  await page.getByText("¡Ya está en tu catálogo!", { exact: true }).last().waitFor();
}
