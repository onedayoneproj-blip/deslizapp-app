// La base de la demo de la landing: «Tu Tienda», sus tres productos, Ana como clienta y la solicitud del pedido (termo + tote,
// código CODIGO_DEMO). La usan los teléfonos de app/demo-landing con los componentes reales, en memoria (lib/data/demo.ts
// usarDemoEnMemoria): sin red y sin escribir en el navegador. Los datos salen de lib/landing/pedido-demo.ts.

import { construirDesdeSeed, type DB } from "../data/db";
import { catalogoPublicoDeDB, crearSolicitudEnDB, registrarSolicitudEnDB, verSolicitudDeDB } from "../data/catalogo";
import type { CatalogoPublico, Cliente, Producto, Tienda, VistaSolicitud } from "../types";
import { CODIGO_DEMO, COMPRADORA_DEMO, MINUTO_PEDIDO, PEDIDO_DEMO, PRODUCTOS_DEMO, TIENDA_DEMO } from "./pedido-demo";
import { minutosDeBurbuja } from "./pasos";
import { ZONA_HORARIA } from "../config";

/** El «ahora» de la historia: hoy a la hora del aviso (3:44 p. m.), para que el pedido de la tienda diga lo mismo que la pantalla bloqueada
 *  y las burbujas (un solo reloj, lib/landing/pedido-demo.ts). Ana lo envió dos minutos antes (3:42 p. m.). */
export function ahoraDemo(hoy: Date = new Date()): Date {
  const min = MINUTO_PEDIDO + minutosDeBurbuja("aviso");
  // La hora es la de la República Dominicana (ZONA_HORARIA, sin horario de verano: UTC−4), que es la que muestra la app.
  const [a, m, d] = new Intl.DateTimeFormat("en-CA", { timeZone: ZONA_HORARIA }).format(hoy).split("-").map(Number);
  return new Date(Date.UTC(a!, m! - 1, d!, Math.floor(min / 60) + 4, min % 60));
}

export const TIENDA_ID_DEMO = "b1000000-0000-4000-8000-00000000a001";
export const SLUG_DEMO = "tu-tienda";
const USUARIO_ID = "b2000000-0000-4000-8000-00000000a001";
const CLIENTA_ID = "b4000000-0000-4000-8000-00000000a001";
const SOLICITUD_ID = "b5000000-0000-4000-8000-00000000a001";
const productoId = (id: string) => `b3000000-0000-4000-8000-0000000000${["gorra", "termo", "tote"].indexOf(id) + 10}`;


let secuencia = 0;
const nuevoId = () => `b9000000-0000-4000-8000-${String(++secuencia).padStart(12, "0")}`;

/** Una base nueva con la solicitud lista para registrar. Cada llamada devuelve una copia independiente. */
export function dbBase(ahora: Date = ahoraDemo()): DB {
  const semilla = construirDesdeSeed(ahora.getTime());
  const plantilla = semilla.tiendas[0]!;
  const tienda: Tienda = {
    ...plantilla,
    id: TIENDA_ID_DEMO,
    slug: SLUG_DEMO,
    nombre: TIENDA_DEMO.nombre,
    nombreVendedora: null,
    logoUrl: null,
    fotoPerfilUrl: null,
    descripcion: "Gorras, termos y bolsos para el día a día.",
    instagram: null,
    // El catálogo pide un WhatsApp para «Enviar»; en la demo nunca se abre (el chat se dibuja).
    whatsapp: "18090000000",
    // Lo que dice la tienda al agregar (la personalización real de mensajes; el segundo de la app habla de perfumes).
    personalizacion: {
      mensajes: {
        al_agregar: [
          "¡Ay, qué buena elección! ¿Le agregas otro? Uno pa’ ti y otro pa’ regalar 😉",
          "Tu pedido se ve precioso 💕 Dale una vueltita más, que todavía hay cositas lindas esperándote.",
        ],
      },
    },
    onboarding: {},
    rubro: "general",
    rubros: ["general"],
    estado: "activa",
    catalogoEstado: "publicado",
    catalogoPublicadoEn: ahora.toISOString(),
  };
  const plantillaProducto = semilla.productos.find((p) => p.tiendaId === plantilla.id)!;
  const productos: Producto[] = PRODUCTOS_DEMO.map((p, i) => ({
    ...plantillaProducto,
    id: productoId(p.id),
    tiendaId: TIENDA_ID_DEMO,
    slug: p.id,
    nombre: p.nombre,
    precio: p.precio,
    fotos: [p.foto],
    medios: [{ tipo: "foto", url: p.foto, retocada: true }],
    rubro: null,
    categoria: null,
    stock: 6,
    likes: [38, 52, 41][i] ?? 30,
    orden: i + 1,
    opiniones: [],
    detalles: { descripcion: "Hecho para el día a día." },
    opciones: [],
    fotosPorValor: {},
    fichaUrl: null,
    porEncargo: false,
    encargoTexto: null,
    destacado: false,
    activo: true,
  }));
  const plantillaCliente = semilla.clientes.find((c) => c.tiendaId === plantilla.id)!;
  const ana: Cliente = { ...plantillaCliente, id: CLIENTA_ID, tiendaId: TIENDA_ID_DEMO, nombre: COMPRADORA_DEMO.nombre, telefono: null, nota: null, primerPedidoEn: ahora.toISOString(), avatarEmoji: null, avatarColor: null };
  let db: DB = {
    ...semilla,
    tiendas: [tienda],
    usuarios: [{ id: USUARIO_ID, tiendaId: TIENDA_ID_DEMO, email: "tutienda@ejemplo.com", nombre: TIENDA_DEMO.nombre, rol: "dueno" }],
    productos,
    pedidos: [],
    pedidoItems: [],
    abonos: [],
    ajustesInventario: [],
    clientes: [ana],
    promos: [],
    eventosAaah: [],
    jugadaEnvios: [],
    variantes: [],
    solicitudes: [],
    avisos: [],
    trabajosRetoque: [],
    marcasRetoque: {},
    equipos: {},
    nivelDemo: "dueno",
  };
  const items = PEDIDO_DEMO.map((p) => ({ productoId: productoId(p.id), varianteId: null, cantidad: p.cantidad }));
  // Hace un par de minutos, como en la escena del chat.
  const r = crearSolicitudEnDB(db, SLUG_DEMO, items, null, "landing", () => SOLICITUD_ID, new Date(ahora.getTime() - 2 * 60_000));
  db = { ...r.db, solicitudes: r.db.solicitudes.map((s) => (s.id === SOLICITUD_ID ? { ...s, codigo: CODIGO_DEMO } : s)) };
  return db;
}

/** La base con el pedido ya registrado (Ana como clienta): lo que hay después de «Registrar pedido». */
export function dbRegistrada(ahora: Date = ahoraDemo()): { db: DB; pedidoId: string } {
  secuencia = 0;
  const r = registrarSolicitudEnDB(dbBase(ahora), TIENDA_ID_DEMO, SOLICITUD_ID, { clienteId: CLIENTA_ID }, nuevoId, ahora.toISOString());
  return { db: r.db, pedidoId: r.pedido.id };
}

export function catalogoDemo(db: DB = dbBase()): CatalogoPublico {
  return catalogoPublicoDeDB(db, SLUG_DEMO, new Date());
}

export function vistaSolicitudDemo(db: DB = dbBase()): VistaSolicitud {
  return verSolicitudDeDB(db, CODIGO_DEMO, TIENDA_ID_DEMO, ahoraDemo().getTime())!;
}
