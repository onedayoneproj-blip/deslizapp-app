// Pruebas del enlace del catálogo en línea (lib/enlace-catalogo.ts).
import assert from "node:assert/strict";
import { test } from "node:test";
import { enlaceCatalogo, mensajeCatalogo, urlWhatsAppCatalogo } from "../lib/enlace-catalogo.ts";

test("solo https válido cuenta como enlace", () => {
  const e = enlaceCatalogo("https://www.esenciasmichel.com/catalogo?x=1");
  assert.deepEqual(e, { href: "https://www.esenciasmichel.com/catalogo?x=1", dominio: "esenciasmichel.com", resto: "/catalogo?x=1" });
  assert.equal(enlaceCatalogo("https://deslizapp-app.vercel.app/catalogos/esencias-michel.html")?.dominio, "deslizapp-app.vercel.app");
  assert.equal(enlaceCatalogo("https://example.com")?.resto, "");
});

test("http, otros esquemas, vacíos y basura se tratan como sin enlace", () => {
  for (const malo of ["http://example.com", "javascript:alert(1)", "data:text/html,<b>x</b>", "ftp://x.com", "example.com", "", "   ", null, undefined, "https://", "https://localhost", "https://user:pw@example.com"]) {
    assert.equal(enlaceCatalogo(malo), null, String(malo));
  }
});

test("mensaje y enlace de WhatsApp", () => {
  assert.equal(mensajeCatalogo("Esencias Michel", "https://a.com/x"), "Mira el catálogo de Esencias Michel: https://a.com/x");
  const u = urlWhatsAppCatalogo("Luna & Co", "https://a.com/x?y=1&z=2");
  assert.ok(u.startsWith("https://wa.me/?text="));
  assert.equal(decodeURIComponent(u.split("text=")[1]), "Mira el catálogo de Luna & Co: https://a.com/x?y=1&z=2");
  assert.ok(!u.includes("&z=2")); // el & del enlace va codificado
});
