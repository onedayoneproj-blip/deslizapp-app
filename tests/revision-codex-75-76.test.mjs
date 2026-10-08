// Arreglos de la revisión de Codex en #75 y #76 (docs/prompts/arreglos-revision-codex-75-76.md): la ficha tras un corte,
// los límites del zoom con el tamaño real de la imagen y los 3 casos de la búsqueda con precio.
import "./cargar-ts.mjs";
import assert from "node:assert/strict";
import { test } from "node:test";
const Z = await import("../lib/tienda/zoom.ts");
const { buscarCatalogo, buscarConPrecio, leerPrecio } = await import("../lib/tienda/busqueda.ts");
const { crearFuenteSupabase } = await import("../lib/data/supabase.ts");

// ---- Zoom ----

test("zoom: una ficha alargada solo se mueve lo que sobresale del área (contain)", () => {
  // Área 300×500 y una ficha 1000×4000: ajustada mide 125×500 (franjas vacías a los lados).
  const natural = { ancho: 1000, alto: 4000 };
  assert.deepEqual(Z.contenida(300, 500, natural), { ancho: 125, alto: 500 });
  const cerca = Z.alternar(Z.AJUSTADA, { x: 0, y: 0 }, 300, 500, natural);
  assert.equal(cerca.k, Z.K_TOQUE);
  // 2.5 × 125 = 312.5 de ancho: sobresalen 12.5 → 6.25 por lado. A lo alto, 2.5 × 500 = 1250 → 375 por lado.
  const lejos = Z.mover(cerca, 1000, -1000, 300, 500, natural);
  assert.equal(lejos.x, 6.25);
  assert.equal(lejos.y, -375);
  // Con un zoom que todavía cabe a lo ancho (k = 2 → 250 < 300), a lo ancho no se mueve.
  const dos = Z.pellizcar(Z.AJUSTADA, { x: 0, y: 0 }, 100, { x: 0, y: 0 }, 200, 300, 500, natural);
  assert.equal(dos.k, 2);
  assert.equal(Z.mover(dos, 80, 0, 300, 500, natural).x, 0);
});

test("zoom: una ficha apaisada no se mueve a lo alto más allá de su borde", () => {
  const natural = { ancho: 2000, alto: 1000 }; // en 300×500 mide 300×150
  const v = Z.mover({ x: 0, y: 0, k: 2 }, 0, 999, 300, 500, natural);
  assert.equal(v.y, 0, "2 × 150 = 300 < 500: cabe a lo alto");
  assert.equal(Z.mover({ x: 0, y: 0, k: 4 }, 999, 999, 300, 500, natural).y, (4 * 150 - 500) / 2);
});

test("zoom: sin tamaño real (no cargó) se usa el área, como antes", () => {
  const v = Z.mover({ x: 0, y: 0, k: 2 }, 999, 999, 300, 500);
  assert.deepEqual(v, { k: 2, x: 150, y: 250 });
  assert.deepEqual(Z.contenida(300, 500, { ancho: 0, alto: 0 }), { ancho: 300, alto: 500 });
});

// ---- Búsqueda ----

const prod = (id, nombre, precio, extra = {}) => ({
  id, slug: id, nombre, rubro: "accesorios", categoria: null, precio, precioPromo: null, detalles: {}, opciones: [], variantes: [], medios: [], ...extra,
});
const variante = (id, talla, precio, disponibilidad = "disponible") => ({ id, valores: { Talla: talla }, precio, precioPromo: null, disponibilidad, quedan: null });
const cat = (productos, t = { rubro: "accesorios", rubros: ["accesorios"] }) => ({ tienda: t, productos });

test("búsqueda: el precio solo cuenta presentaciones que se pueden pedir (si todas están agotadas, todas)", () => {
  const opciones = [{ nombre: "Talla", valores: ["S", "M"] }];
  const c = cat([
    prod("camisa", "Camisa", 900, { opciones, variantes: [variante("s", "S", 900, "agotado"), variante("m", "M", 1500)] }),
    prod("blusa", "Blusa", 800, { opciones, variantes: [variante("s2", "S", 800, "agotado"), variante("m2", "M", 1600, "agotado")] }),
    prod("gorra", "Gorra", 500),
  ]);
  const menos = buscarCatalogo(c, "menos de 1000").map((p) => p.id);
  assert.ok(!menos.includes("camisa"), "la de RD$900 está agotada: la camisa se ve «Desde RD$1,500»");
  assert.ok(menos.includes("blusa"), "todo agotado: cuentan todas, como el «Desde»");
  assert.ok(buscarCatalogo(c, "mas de 1400").map((p) => p.id).includes("camisa"));
});

test("búsqueda: «de X a Y» y «entre X y Y» son rango aunque X o Y estén escritos en el catálogo", () => {
  const c = cat([
    prod("sombrero", "Sombrero 2000", 650),
    prod("colonia", "Colonia", 1800, { detalles: { tamano: "500 ml" } }),
    prod("bolso", "Bolso", 2500),
  ]);
  assert.deepEqual(leerPrecio(c, "de 500 a 2000").precio, { tipo: "rango", min: 500, max: 2000 });
  assert.deepEqual(leerPrecio(c, "entre 500 y 2000").precio, { tipo: "rango", min: 500, max: 2000 });
  assert.deepEqual(buscarCatalogo(c, "de 500 a 2000").map((p) => p.id).sort(), ["colonia", "sombrero"]);
  // El número suelto sí se compara con el texto: «2000» es el sombrero.
  assert.equal(leerPrecio(c, "2000").precio, null);
});

test("búsqueda: la ✕ quita el precio ya reconocido aunque en otro tipo ese número sea texto", () => {
  const t = { rubro: "ropa", rubros: ["ropa", "perfumes"] };
  const c = cat(
    [
      prod("pantalon", "Pantalón", 1900, { rubro: "ropa" }),
      prod("camisa", "Camisa", 2100, { rubro: "ropa" }),
      prod("perfume", "Perfume 2000", 1500, { rubro: "perfumes" }),
    ],
    t,
  );
  const r = buscarConPrecio(c, "ropa 2000");
  assert.deepEqual(r.precio, { tipo: "cerca", valor: 2000 }, "en ropa, 2000 es precio");
  assert.equal(r.sinPrecio, "ropa", "la ✕ deja solo «ropa», no la misma consulta");
  assert.equal(buscarConPrecio(c, "ropa menos de 2000").sinPrecio, "ropa");
});

// ---- Ficha tras un corte de red ----

// Lo mínimo del navegador para comprimir la foto en Node.
globalThis.Image = class {
  naturalWidth = 10;
  naturalHeight = 10;
  set src(_v) { setTimeout(() => this.onload?.()); }
};
globalThis.document = {
  createElement: () => ({ width: 0, height: 0, getContext: () => ({ fillRect() {}, drawImage() {} }), toBlob: (ok, tipo) => ok(new Blob(["x"], { type: tipo })) }),
};
const PNG = "data:image/png;base64,iVBORw0KGgo=";
const BASE = "https://euihaeyfdlpvmbtfzvnt.supabase.co/storage/v1/object/public/productos/";

function cliente({ rpc, fichaTrasError }) {
  const borrados = [];
  let lecturas = 0;
  const fila = (ficha) => ({ id: "p", tienda_id: "t", nombre: "P", precio: 1, stock: 1, activo: true, fotos: [], medios: [], opciones: [], detalles: {}, ficha_url: ficha, producto_variantes: [], creado_en: "2026-10-08T00:00:00Z" });
  const consulta = () => {
    const q = { select: () => q, eq: () => q, maybeSingle: async () => {
      lecturas++;
      if (lecturas === 1) return { data: { ficha_url: null }, error: null };
      return typeof fichaTrasError === "function" ? fichaTrasError(fila) : { data: fila(fichaTrasError), error: null };
    } };
    return q;
  };
  const storage = { from: () => ({
    upload: async () => ({ error: null }),
    getPublicUrl: (ruta) => ({ data: { publicUrl: BASE + ruta } }),
    remove: async (rutas) => { borrados.push(...rutas); return { error: null }; },
  }) };
  return { c: { from: consulta, rpc, storage }, borrados };
}

const sinRed = async () => { throw new TypeError("Failed to fetch"); };

test("ficha: un error de red con la ficha ya guardada sigue como guardada y no borra el archivo", async () => {
  let subida = null;
  const { c, borrados } = cliente({
    rpc: async (_n, args) => { subida = args.p_url; throw new TypeError("Failed to fetch"); },
    fichaTrasError: (fila) => ({ data: fila(subida), error: null }),
  });
  const p = await crearFuenteSupabase(c, () => {}).guardarFicha("t", "p", PNG);
  assert.equal(p.fichaUrl, subida);
  assert.deepEqual(borrados, []);
});

test("ficha: un error de red sin confirmar (no se puede releer, o no quedó) conserva el archivo subido", async () => {
  for (const fichaTrasError of [null, () => { throw new TypeError("Failed to fetch"); }]) {
    const { c, borrados } = cliente({ rpc: sinRed, fichaTrasError });
    await assert.rejects(() => crearFuenteSupabase(c, () => {}).guardarFicha("t", "p", PNG), /conexión/);
    assert.deepEqual(borrados, [], "no se borra lo que pudo quedar guardado");
  }
});

test("ficha: un rechazo claro del servidor sí borra el archivo recién subido", async () => {
  const { c, borrados } = cliente({ rpc: async () => ({ data: null, error: { code: "22023", message: "ficha_invalida" } }), fichaTrasError: null });
  await assert.rejects(() => crearFuenteSupabase(c, () => {}).guardarFicha("t", "p", PNG));
  assert.equal(borrados.length, 1);
  assert.match(borrados[0], /^t\//);
});
