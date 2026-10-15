// Copia temporal con Auth autorizado; conserva las reglas de origen/query de producción.
import "../tests/cargar-ts.mjs";
import assert from "node:assert/strict";
import { construirDesdeSeed } from "../lib/data/db.ts";
import { navegador, URL } from "./navegador-catalogo.mjs";
const d = construirDesdeSeed(), id = "a1000000-0000-4000-8000-000000000001";
const tienda = d.tiendas.find(t => t.id === id);
tienda.onboarding = {}; tienda.catalogoEstado = "sin";
const producto = d.productos.find(p => p.tiendaId === id && p.activo && p.fotos.length);
const b = await navegador(), c = await b.newContext({ viewport: { width: 393, height: 852 }, serviceWorkers: "block" });
const remotas = [];
c.on("request", r => { if (/supabase\.co|wa\.me/.test(r.url())) remotas.push(r.url()); });
await c.addInitScript(({ d, id }) => {
 if (!localStorage.getItem("deslizapp-demo-v5")) localStorage.setItem("deslizapp-demo-v5", JSON.stringify(d));
 localStorage.setItem("deslizapp-sesion-v1", id); localStorage.setItem("deslizapp-modo-v1", "demo"); localStorage.setItem("deslizapp-version-vista", "99.0.0");
}, { d, id });
const p = await c.newPage(); p.setDefaultTimeout(30000); p.setDefaultNavigationTimeout(120000);
try {
 await p.goto(`${URL}/admin-demo/tiendas/${id}/catalogo`);
 const enlace = p.getByRole("link", { name: "Ver como lo verá un cliente", exact: true });
 assert.equal(await enlace.getAttribute("href"), `/tienda/${tienda.slug}?demo=interna`);
 const nueva = c.waitForEvent("page"); await enlace.click(); const comprador = await nueva;
 await comprador.waitForURL(`${URL}/tienda/${tienda.slug}?demo=interna`);
 await comprador.locator(`#r-${producto.slug}`).waitFor(); await comprador.reload(); await comprador.locator(`#r-${producto.slug}`).waitFor();
 console.log("✓ personalizador: abre y recarga el catálogo interno con la regla de origen de producción");
 await p.goto(URL);
 const guia = p.locator("[data-checklist]"); await guia.waitFor();
 await guia.getByRole("group", { name: "Capítulos de preparación" }).getByRole("button", { name: /Capítulo 3 ·/ }).click();
 await guia.getByRole("button", { name: /^Publica tu catálogo ·/ }).click();
 await p.getByRole("dialog").waitFor();
 assert.ok((await p.getByRole("dialog").innerText()).includes(`/tienda/${tienda.slug}?demo=interna`));
 console.log("✓ checklist: muestra la dirección interna al publicar");
 await comprador.goto(`${URL}/tienda/${tienda.slug}?demo`);
 assert.equal(await comprador.locator(`#r-${producto.slug}`).count(), 0);
 assert.deepEqual(remotas, []);
 console.log("✓ sin marca interna no carga el fixture; cero solicitudes a servicios reales");
} finally { await c.close(); await b.close(); }
