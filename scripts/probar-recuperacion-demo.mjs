// Auth caducada solo en la copia temporal de probar-demo-interna.
import assert from "node:assert/strict";
import { navegador, URL } from "./navegador-catalogo.mjs";
const b = await navegador();
try {
 for (const ruta of ["/", "/entrar", "/catalogo"]) {
  const c = await b.newContext({ serviceWorkers: "block" });
  try {
   await c.addCookies([{ name: "deslizapp-demo-interna", value: "1", url: URL, httpOnly: true }, { name: "sesion-google-fixture", value: "conservar", url: URL, httpOnly: true }]);
   const p = await c.newPage(); p.setDefaultTimeout(30000); p.setDefaultNavigationTimeout(120000);
   await p.goto(URL + ruta);
   await p.waitForURL(URL + "/entrar");
   await p.getByRole("button", { name: "Probar la app con datos de prueba", exact: true }).waitFor();
   const cookies = await c.cookies();
   assert.ok(!cookies.some(x => x.name === "deslizapp-demo-interna"));
   assert.equal(cookies.find(x => x.name === "sesion-google-fixture")?.value, "conservar");
   await p.reload();
   await p.getByRole("button", { name: "Probar la app con datos de prueba", exact: true }).waitFor();
   assert.ok(!await p.getByText("Admin de la demo", { exact: true }).count());
   console.log(`✓ ${ruta}: cookie interna caducada retirada, entrada disponible tras recargar y sesión ajena conservada`);
  } finally { await c.close(); }
 }
} finally { await b.close(); }
