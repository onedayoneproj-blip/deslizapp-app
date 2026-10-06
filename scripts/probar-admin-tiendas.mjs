import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

const modulo = process.env.PLAYWRIGHT_MODULE;
if (!modulo) throw new Error("Define PLAYWRIGHT_MODULE con la ruta al módulo Playwright del entorno.");
const playwright = await import(pathToFileURL(modulo).href);
const chromium = playwright.chromium ?? playwright.default?.chromium;
if (!chromium) throw new Error("El módulo indicado no exporta chromium.");
const base = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const navegador = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium", args: ["--no-sandbox"] });
const ancho = [360, 390, 430];
const capturas = process.env.CAPTURE_DIR;

try {
  const sinSesion = await navegador.newPage();
  const noAdmin = await sinSesion.goto(`${base}/admin`, { waitUntil: "domcontentloaded" });
  assert.equal(noAdmin?.status(), 404, "Acceso directo sin sesión a /admin debe ser 404");
  const noAdminTienda = await sinSesion.goto(`${base}/admin/tiendas`, { waitUntil: "domcontentloaded" });
  assert.equal(noAdminTienda?.status(), 404, "Acceso directo sin sesión a ficha/lista admin debe ser 404");
  await sinSesion.close();

  for (const tema of ["light", "dark"]) {
    for (const width of ancho) {
      const contexto = await navegador.newContext({ viewport: { width, height: 844 }, colorScheme: tema });
      const pagina = await contexto.newPage();
      const supabase = [];
      pagina.on("request", request => { if (/supabase\.co|supabase\.in/.test(request.url())) supabase.push(request.url()); });
      const hoy = await pagina.goto(`${base}/admin-demo`, { waitUntil: "domcontentloaded" });
      assert.equal(hoy?.status(), 200, "Hoy Demo debe abrir sin sesión real");
      await pagina.getByRole("heading", { name: /Buenas .* Lewis/ }).waitFor();
      await pagina.getByText("Tiendas activas", { exact: true }).waitFor();
      if (tema === "dark") await pagina.evaluate(() => document.body.dataset.theme = "dark");
      assert.equal(await pagina.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `Hoy sin overflow ${width}/${tema}`);
      if (width === 390 && tema === "light" && capturas) {
        await pagina.addStyleTag({ content: "nextjs-portal { display: none !important }" });
        await pagina.setViewportSize({ width, height: 1100 });
        await pagina.screenshot({ path: `${capturas}/Hoy.png` });
      }
      if (width === 390 && tema === "light") {
        const manana = pagina.getByRole("button", { name: "Mañana" });
        const antes = await manana.count();
        if (antes > 0) {
          await manana.first().click();
          await pagina.waitForFunction(n => [...document.querySelectorAll("button")].filter(b => b.textContent?.trim() === "Mañana").length < n, antes).catch(async () => {
            await pagina.waitForTimeout(350);
          });
          assert.ok(await pagina.getByRole("button", { name: "Mañana" }).count() <= antes, "Posponer debe actualizar Hoy");
        }
      }

      console.log(`Navegador ${width}px ${tema}: Hoy OK`);
      await pagina.getByRole("link", { name: "Tiendas" }).click({ timeout: 5000 });
      await pagina.getByRole("heading", { name: "Tiendas" }).waitFor();
      await pagina.getByRole("searchbox", { name: "Buscar tiendas" }).fill("Esencias Michel", { timeout: 5000 });
      await pagina.getByRole("link", { name: /Esencias Michel/ }).first().waitFor();
      const filtroPrueba = pagina.getByRole("tab", { name: /En prueba/ });
      if (await filtroPrueba.count()) {
        await filtroPrueba.click();
        await pagina.getByRole("link", { name: /Esencias Michel.*prueba/ }).first().waitFor();
      }
      const desbordeTiendas = await pagina.evaluate(() => ({ total: document.documentElement.scrollWidth, width: innerWidth, elementos: [...document.querySelectorAll("body *")].map(e => ({ etiqueta: e.tagName, clase: typeof e.className === "string" ? e.className : "", texto: e.textContent?.trim().slice(0, 70), x: Math.round(e.getBoundingClientRect().x), derecha: Math.round(e.getBoundingClientRect().right) })).filter(e => e.derecha > innerWidth + 1).slice(0, 8) }));
      assert.equal(desbordeTiendas.total <= width + 1, true, `Tiendas sin overflow ${width}/${tema}: ${JSON.stringify(desbordeTiendas)}`);
      if (width === 390 && tema === "light" && capturas) {
        await pagina.setViewportSize({ width, height: 1100 });
        await pagina.screenshot({ path: `${capturas}/Tiendas.png` });
      }

      await pagina.getByRole("link", { name: /Esencias Michel/ }).first().click({ timeout: 5000 });
      await pagina.getByRole("heading", { name: "Esencias Michel" }).waitFor();
      const whatsappFicha = await pagina.getByRole("link", { name: "Escribirle" }).getAttribute("href");
      assert.match(whatsappFicha ?? "", /^https:\/\/wa\.me\/\d+\?text=/, "WhatsApp abre un borrador editable");
      assert.equal(await pagina.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `Ficha sin overflow ${width}/${tema}`);
      if (width === 390 && tema === "light" && capturas) {
        await pagina.setViewportSize({ width, height: 1300 });
        await pagina.screenshot({ path: `${capturas}/Tienda.png` });
      }
      assert.equal(supabase.length, 0, "Demo no debe contactar Supabase");
      await contexto.close();
    }
  }

  // Acciones mutables ejercidas exclusivamente sobre fixtures volátiles de Demo.
  const ctx = await navegador.newContext({ viewport: { width: 390, height: 844 } });
  const pagina = await ctx.newPage();
  const llamadasVerComo = [];
  pagina.on("request", request => { if (request.url().includes("/api/admin/ver-como")) llamadasVerComo.push(request.url()); });
  await pagina.goto(`${base}/admin-demo/tiendas/ad000000-0000-4000-8000-000000000001`, { waitUntil: "domcontentloaded" });
  await pagina.getByRole("heading", { name: /prueba/ }).waitFor();
  await pagina.getByRole("button", { name: "Ver como ella" }).click();
  await pagina.getByRole("alert").filter({ hasText: "Demo no consulta tiendas reales" }).waitFor();
  assert.equal(llamadasVerComo.length, 0, "Ver como desde Demo no debe llamar la API real");
  await pagina.getByRole("button", { name: "Ajustar créditos" }).click();
  await pagina.getByLabel("Cantidad (usa negativo para retirar)").fill("2");
  await pagina.getByLabel("Motivo").fill("Prueba automatizada aislada");
  await pagina.getByRole("button", { name: "Continuar" }).click();
  await pagina.getByRole("button", { name: "Confirmar" }).click();
  await pagina.getByText(/créditos/).waitFor();
  // Transferencia y pausa solo cambian el estado de esta tienda fixture, nunca una fila real.
  await pagina.getByRole("button", { name: "Pasar la tienda a otro dueño" }).click();
  await pagina.getByLabel("Correo del nuevo dueño").fill("michel@example.com");
  await pagina.getByRole("button", { name: "Continuar" }).click();
  await pagina.getByRole("button", { name: "Confirmar" }).click();
  await pagina.getByRole("button", { name: "Pausar tienda" }).click();
  await pagina.getByRole("button", { name: "Confirmar" }).click();
  await pagina.getByText(/pausada/i).waitFor();
  await ctx.close();
  console.log("Admin Demo: Hoy, filtros/búsqueda, ficha, ajustes de crédito de fixture, 360/390/430, claro/oscuro, sin tráfico Supabase ni overflow.");
} finally {
  await navegador.close();
}
