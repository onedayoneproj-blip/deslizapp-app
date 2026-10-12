// Crear producto «como una historia»: los pasos, qué deja seguir, «¿Cuándo llega?» y la celebración.
import "./cargar-ts.mjs";
import assert from "node:assert/strict";
import { test } from "node:test";
const H = await import("../lib/historia-producto.ts");

test("los pasos con barra: un servicio se salta el stock", () => {
  assert.deepEqual(H.pasosDeHistoria(), ["foto", "nombre", "precio", "stock", "vista"]);
  assert.deepEqual(H.pasosDeHistoria(true), ["foto", "nombre", "precio", "vista"]);
});

test("seguir y atrás recorren la historia sin saltos raros", () => {
  assert.equal(H.pasoSiguiente("foto"), "nombre");
  assert.equal(H.pasoSiguiente("precio"), "stock");
  assert.equal(H.pasoSiguiente("precio", true), "vista");
  assert.equal(H.pasoSiguiente("vista"), "listo");
  assert.equal(H.pasoSiguiente("listo"), "listo");
  assert.equal(H.pasoAnterior("foto"), null);
  assert.equal(H.pasoAnterior("vista"), "stock");
  assert.equal(H.pasoAnterior("vista", true), "precio");
  assert.equal(H.pasoAnterior("listo"), null);
});

test("las barras: llenas las hechas y la actual; en la celebración, todas", () => {
  assert.equal(H.barrasLlenas("foto"), 1);
  assert.equal(H.barrasLlenas("stock"), 4);
  assert.equal(H.barrasLlenas("vista", true), 4);
  assert.equal(H.barrasLlenas("listo"), 5);
});

test("qué deja seguir: la foto es opcional; nombre, precio y cuándo llega (por encargo) no", () => {
  const d = { nombre: "", precio: "", porEncargo: false, encargoTexto: "" };
  assert.equal(H.puedeSeguir("foto", d), true);
  assert.equal(H.puedeSeguir("nombre", d), false);
  assert.equal(H.puedeSeguir("nombre", { ...d, nombre: "  " }), false);
  assert.equal(H.puedeSeguir("nombre", { ...d, nombre: "Hoodie" }), true);
  assert.equal(H.puedeSeguir("precio", { ...d, precio: "0" }), false);
  assert.equal(H.puedeSeguir("precio", { ...d, precio: "1450" }), true);
  assert.equal(H.puedeSeguir("stock", d), true);
  assert.equal(H.puedeSeguir("stock", { ...d, stock: 0 }), false, "con 0 y sin encargo no sigue (la vista previa diría «Agotado»)");
  assert.equal(H.puedeSeguir("stock", { ...d, stock: 3 }), true);
  assert.equal(H.puedeSeguir("stock", { ...d, porEncargo: true }), false);
  assert.equal(H.puedeSeguir("stock", { ...d, porEncargo: true, encargoTexto: "Llega en 1 mes" }), true);
});

test("por encargo, el paso de stock pregunta cuándo llega", () => {
  assert.equal(H.textosDelPaso("stock").titulo, "¿Cuántos tienes ahora?");
  assert.equal(H.textosDelPaso("stock", true).titulo, "¿Cuándo llega?");
  // Sin exclamaciones fuera de la celebración (docs/11).
  for (const p of ["foto", "nombre", "precio", "stock", "vista"]) assert.ok(!H.textosDelPaso(p).titulo.includes("!"));
  // Los textos del lienzo (referencias/crear-producto/historia.dc.html).
  assert.deepEqual(H.textosDelPaso("foto"), { titulo: "Empieza por la foto", ayuda: "La primera será la portada. Puedes sumar más después." });
  assert.equal(H.textosDelPaso("vista").titulo, "así se ve en tu catálogo");
});

test("«¿Cuándo llega?»: las opciones rápidas se guardan como «Llega en …» y se reconocen al volver", () => {
  assert.equal(H.textoCuandoLlega("3 a 5 días"), "Llega en 3 a 5 días");
  for (const o of H.OPCIONES_CUANDO_LLEGA) {
    assert.ok(H.textoCuandoLlega(o).length <= 40);
    assert.equal(H.opcionDeCuandoLlega(H.textoCuandoLlega(o)), o);
  }
  assert.equal(H.opcionDeCuandoLlega("Llega el martes"), null);
  assert.equal(H.opcionDeCuandoLlega(""), null);
});

test("la celebración", () => {
  assert.equal(H.tituloCelebracion(true), "¡Ya está en tu catálogo!");
  assert.equal(H.lineaCelebracion(" Hoodie ", true), "Hoodie ya se puede deslizar.");
  assert.equal(H.lineaCelebracion("Hoodie", true, H.lineaArranque(1)), "Hoodie ya se puede deslizar. Van 1 de 5 para arrancar.");
  assert.match(H.lineaCelebracion("Hoodie", false), /sin publicar/);
  assert.equal(H.lineaArranque(1), "Van 1 de 5 para arrancar.");
  assert.equal(H.lineaArranque(4), "Van 4 de 5 para arrancar.");
  assert.equal(H.lineaArranque(5), null);
  assert.equal(H.lineaArranque(0), null);
});

test("con presentaciones: ¿en qué cambia?, una pregunta por cosa y sin paso de stock (7 barras con dos cosas)", () => {
  assert.deepEqual(H.pasosDeHistoria(false, 0), ["foto", "nombre", "precio", "cambia", "eje1", "eje2", "vista"]);
  assert.deepEqual(H.pasosDeHistoria(false, 2), ["foto", "nombre", "precio", "cambia", "eje1", "eje2", "vista"]);
  assert.deepEqual(H.pasosDeHistoria(false, 1), ["foto", "nombre", "precio", "cambia", "eje1", "vista"]);
  assert.equal(H.pasoSiguiente("eje1", false, 1), "vista");
  assert.equal(H.pasoSiguiente("eje1", false, 2), "eje2");
  assert.equal(H.pasoAnterior("vista", false, 2), "eje2");
  assert.equal(H.pasoAnterior("cambia", false, 0), "precio");
  assert.equal(H.barrasLlenas("cambia", false, 0), 4);
  assert.equal(H.barrasLlenas("listo", false, 2), 7);
});

test("el color se pregunta al final y se guarda primero", () => {
  const ejes = [{ nombre: "Color" }, { nombre: "Talla" }];
  assert.deepEqual(H.ordenDePreguntas(ejes).map((e) => e.nombre), ["Talla", "Color"]);
  assert.deepEqual(H.ordenParaGuardar([{ nombre: "Talla" }, { nombre: "Color" }]).map((e) => e.nombre), ["Color", "Talla"]);
});

test("la pregunta de cada cosa", () => {
  assert.deepEqual(H.textosDeEje("Talla", false), { titulo: "¿Qué tallas hay?", ayuda: "Toca las que vendes." });
  assert.deepEqual(H.textosDeEje("Color", true), { titulo: "¿Y qué colores?", ayuda: "Puedes poner una foto para cada uno." });
  assert.equal(H.textosDeEje("Material", false).titulo, "¿Qué materiales hay?");
  assert.equal(H.textosDeEje("Tamaño", true).ayuda, "Toca los que vendes.");
});

test("las presentaciones quitadas siguen quitadas al cambiar otros valores; vuelven solo si se reintroduce su valor", () => {
  const quitadas = ["Color=Negro|Talla=S", "Color=Rojo|Talla=M"];
  // Sumar Azul no trae de vuelta ninguna.
  assert.deepEqual(H.quitadasTrasCambiar(quitadas, "Color", ["Negro", "Rojo"], ["Negro", "Rojo", "Azul"]), quitadas);
  // Quitar un valor tampoco.
  assert.deepEqual(H.quitadasTrasCambiar(quitadas, "Talla", ["S", "M", "L"], ["S", "M"]), quitadas);
  // Rojo se había quitado del eje y se elige otra vez: vuelven sus combinaciones.
  assert.deepEqual(H.quitadasTrasCambiar(quitadas, "Color", ["Negro"], ["Negro", "Rojo"]), ["Color=Negro|Talla=S"]);
});

test("el plan cuenta el producto recién creado aunque la consulta todavía no lo traiga", () => {
  const p = (id, activo = true) => ({ id, activo });
  assert.deepEqual(H.conLosCreados([p("a"), p("b")], []).map((x) => x.id), ["a", "b"]);
  assert.deepEqual(H.conLosCreados([p("a")], [p("n")]).map((x) => x.id), ["a", "n"]);
  // Cuando la consulta ya lo trae, no se repite.
  assert.deepEqual(H.conLosCreados([p("a"), p("n")], [p("n")]).map((x) => x.id), ["a", "n"]);
});

test("dejar de cambiar por una cosa suma las cantidades en lo que queda", () => {
  const p = (color, talla, stock, precio = null, activa = true) => ({ valores: { Color: color, Talla: talla }, stock, precio, activa });
  const r = H.juntarPorEjes([p("Negro", "S", 2), p("Blanco", "S", 3), p("Negro", "M", 1, 1200), p("Blanco", "M", 4, 1300), p("Rojo", "S", 9, null, false)], ["Talla"]);
  const s = r.find((x) => x.valores.Talla === "S");
  const m = r.find((x) => x.valores.Talla === "M");
  assert.deepEqual(s.valores, { Talla: "S" });
  assert.equal(s.stock, 5, "las ocultas no suman");
  assert.equal(m.stock, 5);
  assert.equal(m.precio, null, "precios distintos: vuelve al del producto");
  assert.equal(H.juntarPorEjes([p("Negro", "L", 1, 900), p("Blanco", "L", 1, 900)], ["Talla"])[0].precio, 900, "si valían lo mismo, sigue");
});

test("quitar una cosa con presentaciones quitadas: la junta sigue quitada solo si todas lo estaban", () => {
  const p = (color, talla, stock) => ({ valores: { Color: color, Talla: talla }, stock, precio: null, activa: true });
  const todas = [p("Negro", "S", 1), p("Blanco", "S", 2), p("Negro", "M", 3), p("Blanco", "M", 4)];
  const r1 = H.quitarEje(todas, ["Color=Negro|Talla=S"], ["Talla"]);
  assert.deepEqual(r1.quitadas, []);
  assert.equal(r1.pres.find((x) => x.valores.Talla === "S").stock, 2, "la quitada no suma");
  const r2 = H.quitarEje(todas, ["Color=Negro|Talla=S", "Color=Blanco|Talla=S"], ["Talla"]);
  assert.deepEqual(r2.quitadas, ["Talla=S"]);
  assert.deepEqual(r2.pres.map((x) => x.valores.Talla), ["M"]);
});

test("lo que se pierde al quitar un valor, y su aviso", () => {
  const p = (color, stock, precio = null, activa = true) => ({ valores: { Color: color }, stock, precio, activa });
  const pres = [p("Negro", 3, 1200), p("Negro", 2, null, false), p("Blanco", 0, 900)];
  assert.deepEqual(H.loQueSePierde(pres, "Color", "Negro"), { unidades: 3, precios: 1 });
  assert.deepEqual(H.loQueSePierde(pres, "Color", "Blanco"), { unidades: 0, precios: 1 });
  assert.equal(H.textoPerdida({ unidades: 6, precios: 0 }), "Se pierden 6 unidades del inventario.");
  assert.equal(H.textoPerdida({ unidades: 1, precios: 0 }), "Se pierde 1 unidad del inventario.");
  assert.equal(H.textoPerdida({ unidades: 3, precios: 1 }), "Se pierden 3 unidades del inventario y su precio propio.");
  assert.equal(H.textoPerdida({ unidades: 0, precios: 2 }), "Se pierden sus 2 precios propios.");
  assert.equal(H.totalDelBorrador(pres), 3);
});
