import test from "node:test";
import assert from "node:assert/strict";
import { temaDeTienda, contraste } from "../lib/tienda/tema.ts";
import { mensajePedido, lineaDe } from "../lib/tienda/carrito.ts";
import "./cargar-ts.mjs";
const { catalogoPublicoDeDB } = await import("../lib/data/catalogo.ts");
const { construirDesdeSeed } = await import("../lib/data/db.ts");
test("tema derivado conserva AA para texto y acciones en cuatro estilos", () => {
  for (const marcaEstilo of ["elegante", "moderna", "divertida", "clasica"]) {
    const t = temaDeTienda({
      personalizacion: {},
      marcaEstilo,
      marcaColorPrincipal: "#D9B98C",
      marcaColorAcento: "#FFFFFF",
    });
    assert.ok(contraste(t.colores.ink, t.colores.bg) >= 4.5);
    assert.ok(contraste(t.colores.accent, "#FFFFFF") >= 4.5);
  }
});
test("catálogo: primero nuevos sin orden, luego orden; anonimiza stock y aísla tienda", () => {
  const db = construirDesdeSeed();
  const t = db.tiendas[0];
  db.productos
    .filter((p) => p.tiendaId === t.id)
    .forEach((p, i) => {
      p.orden = i;
      p.stock = 25;
    });
  db.productos.find((p) => p.tiendaId === t.id).orden = null;
  const c = catalogoPublicoDeDB(db, t.slug, new Date());
  assert.equal(c.productos[0].orden, null);
  assert.ok(
    c.productos.every(
      (p) => db.productos.find((x) => x.id === p.id).tiendaId === t.id,
    ),
  );
  assert.ok(c.productos.every((p) => p.quedan === null));
  assert.ok(c.productos.every((p) => Array.isArray(p.opiniones)));
});
test("WhatsApp usa valores confirmados, variantes, encargo y origen real; fallback sin enlace", () => {
  const t = { nombre: "Tienda", nombreVendedora: "Ana", personalizacion: {} };
  const items = [
    {
      nombre: "Camisa",
      varianteTexto: "Talla M · Negro",
      cantidad: 2,
      precioUnitario: 1000,
      porEncargo: true,
    },
  ];
  const m = mensajePedido(t, items, 2000, {
    codigo: "ABCDEF",
    origen: "https://preview.example",
  });
  assert.match(m, /Camisa · Talla M · Negro × 2/);
  assert.match(m, /Por encargo/);
  assert.match(
    m,
    /Mi pedido #ABCDEF:\nhttps:\/\/preview.example\/pedido\/ABCDEF/,
  );
  assert.doesNotMatch(mensajePedido(t, items, 2000), /pedido\//);
});
test("línea conserva identidad de variante, precio y sin stock exacto", () => {
  const p = {
    id: "p",
    slug: "p",
    nombre: "Camisa",
    precio: 100,
    precioPromo: null,
    medios: [],
    opciones: [{ nombre: "Talla", valores: ["M"] }],
    variantes: [
      {
        id: "v",
        valores: { Talla: "M" },
        precio: 150,
        precioPromo: 120,
        disponibilidad: "por_encargo",
      },
    ],
  };
  assert.deepEqual(lineaDe(p, "v"), {
    productoId: "p",
    varianteId: "v",
    cantidad: 1,
    slug: "p",
    nombre: "Camisa",
    varianteTexto: "Talla M",
    foto: null,
    precioUnitario: 120,
    porEncargo: true,
  });
});

const { detallesValidos } = await import("../lib/rubros.ts");
const { buscarCatalogo } = await import("../lib/tienda/busqueda.ts");
test("el seed importado respeta el contrato del formulario y permite ajustar inventario",()=>{
  const db=construirDesdeSeed();
  for(const p of db.productos)assert.ok(detallesValidos(db.tiendas.find(t=>t.id===p.tiendaId).rubro,p.detalles,p.tipo==="servicio"),p.slug);
});
test("búsqueda de perfumes conserva pesos, sinónimos y presupuesto del HTML",()=>{
  const db=construirDesdeSeed();db.promos=[];
  const c=catalogoPublicoDeDB(db,"esencias-michel",new Date());
  assert.equal(buscarCatalogo(c,"dulce")[0].slug,"urbantoy");
  assert.ok(buscarCatalogo(c,"2000").every(p=>p.precio<=2000));
  assert.ok(buscarCatalogo(c,"mayr").some(p=>p.slug==="mayar"));
  assert.ok(buscarCatalogo(c,"noche").length>0);
});
