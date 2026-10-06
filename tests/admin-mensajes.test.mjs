import "./cargar-ts.mjs";
import assert from "node:assert/strict";
import { test } from "node:test";

const { enlaceWhatsAppAdmin, mensajeGeneralTienda } =
  await import("../lib/admin/mensajes.ts");

test("mensaje de ficha usa nombres disponibles sin inventar ofertas", () => {
  assert.equal(
    mensajeGeneralTienda("Esencias Michel", "Lewis"),
    "¡Hola, Lewis! ¿Cómo va todo con Esencias Michel? Si necesitas una mano con Deslizapp, aquí estoy.",
  );
  assert.equal(
    mensajeGeneralTienda("Esencias Michel", " "),
    "¡Hola! ¿Cómo va todo con Esencias Michel? Si necesitas una mano con Deslizapp, aquí estoy.",
  );
});

test("el enlace prepara un mensaje editable y no crea URL sin teléfono", () => {
  assert.equal(
    enlaceWhatsAppAdmin("+1 (809) 555-1234", "Hola, ¿cómo va?"),
    "https://wa.me/18095551234?text=Hola%2C%20%C2%BFc%C3%B3mo%20va%3F",
  );
  assert.equal(enlaceWhatsAppAdmin(null, "Hola"), null);
  assert.equal(enlaceWhatsAppAdmin("---", "Hola"), null);
});
