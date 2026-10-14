// Los pasos de la demo de la landing (referencias/landing/ajustes-lewis-2.md): cada deslizamiento lleva a un paso y su
// animación se completa sola. Aquí está todo lo que Lewis puede querer ajustar: el texto de cada burbuja, en qué teléfono pasa,
// dónde queda el ♥ y cuánto dura la animación del paso. Los teléfonos (app/demo-landing) saben qué hacer en cada paso por su id.
// Puro (sin React): lo prueban tests/landing.test.mjs y scripts/probar-landing.mjs.

import { TOTAL_DEMO, pesos, totalHasta } from "./pedido-demo";

export type IdPaso =
  | "hola"
  | "pasa"
  | "aaah-termo"
  | "aaah-tote"
  | "bolsa"
  | "whatsapp"
  | "seguimiento"
  | "cambio"
  | "aviso"
  | "chat-tienda"
  | "eres-tienda"
  | "registrar"
  | "pedidos"
  | "confirmar"
  | "despachar";

export type Lado = "compras" | "tienda";
export type IdTelefono = "compradora" | "tienda";

/** Dónde descansa el ♥ (cada teléfono sabe qué elemento real es: window.__dzAncla en app/demo-landing). */
export type IdAncla =
  | "burst-termo"
  | "bolsa"
  | "tu-pedido"
  | "chat"
  | "seguimiento"
  | "bloqueo"
  | "aviso"
  | "eres-tienda"
  | "registrar"
  | "pedidos"
  | "hoja-pedido"
  | "despachar";

export type Paso = {
  id: IdPaso;
  /** Capítulo del contador «01 / 06». */
  capitulo: number;
  /** Rosa (compradora) o verde (tienda), a pantalla completa. */
  lado: Lado;
  telefono: IdTelefono;
  /** La burbuja de chat del paso: de Deslizapp (izquierda, blanca) o de una persona (derecha, verde). */
  burbuja: { de: "deslizapp" | "compradora" | "tienda"; texto: string; remate?: string };
  /** Dónde termina el ♥ en este paso (null: todavía no existe). */
  ancla: IdAncla | null;
  /** Si el ♥ nace en este paso: dónde aparece (sobre el «aaah» real) antes de ir a su ancla. */
  naceEn?: IdAncla;
  /** Cuánto dura la animación del teléfono en este paso (ms): el ♥ espera `esperaHilo` y viaja hasta el final. */
  duracion: number;
  esperaHilo: number;
};

export const CAPITULOS = 6;

export const PASOS: Paso[] = [
  { id: "hola", capitulo: 1, lado: "compras", telefono: "compradora", burbuja: { de: "deslizapp", texto: "Hola, esto es Deslizapp.", remate: "Desliza y mira cómo funciona." }, ancla: null, duracion: 600, esperaHilo: 0 },
  { id: "pasa", capitulo: 1, lado: "compras", telefono: "compradora", burbuja: { de: "deslizapp", texto: "Lo que no te gusta,", remate: "pasa." }, ancla: null, duracion: 900, esperaHilo: 0 },
  { id: "aaah-termo", capitulo: 1, lado: "compras", telefono: "compradora", burbuja: { de: "deslizapp", texto: "Lo que te gusta: dale aaah.", remate: "Va directo a tu pedido." }, ancla: "bolsa", naceEn: "burst-termo", duracion: 1900, esperaHilo: 900 },
  { id: "aaah-tote", capitulo: 1, lado: "compras", telefono: "compradora", burbuja: { de: "deslizapp", texto: "Uno más.", remate: `Tu pedido ya suma ${pesos(TOTAL_DEMO)}.` }, ancla: "bolsa", duracion: 1900, esperaHilo: 0 },
  { id: "bolsa", capitulo: 2, lado: "compras", telefono: "compradora", burbuja: { de: "deslizapp", texto: "Tu pedido,", remate: "con todo en su sitio." }, ancla: "tu-pedido", duracion: 900, esperaHilo: 450 },
  { id: "whatsapp", capitulo: 2, lado: "compras", telefono: "compradora", burbuja: { de: "deslizapp", texto: "Lo envías por WhatsApp.", remate: "Le llega con fotos y el enlace." }, ancla: "chat", duracion: 1400, esperaHilo: 700 },
  { id: "seguimiento", capitulo: 3, lado: "compras", telefono: "compradora", burbuja: { de: "deslizapp", texto: "Abre el enlace", remate: "y mira cómo va." }, ancla: "seguimiento", duracion: 1100, esperaHilo: 500 },
  { id: "cambio", capitulo: 4, lado: "tienda", telefono: "tienda", burbuja: { de: "deslizapp", texto: "Ahora te toca a ti,", remate: "como tienda." }, ancla: "bloqueo", duracion: 1300, esperaHilo: 200 },
  { id: "aviso", capitulo: 4, lado: "tienda", telefono: "tienda", burbuja: { de: "deslizapp", texto: "Te piden allá.", remate: "Te llega aquí." }, ancla: "aviso", duracion: 1000, esperaHilo: 450 },
  { id: "chat-tienda", capitulo: 4, lado: "tienda", telefono: "tienda", burbuja: { de: "deslizapp", texto: "Fotos, total y enlace.", remate: "Sin «¿cuál era?»." }, ancla: "chat", duracion: 1100, esperaHilo: 500 },
  { id: "eres-tienda", capitulo: 5, lado: "tienda", telefono: "tienda", burbuja: { de: "deslizapp", texto: "¿Eres la tienda?", remate: "Entra con tu cuenta." }, ancla: "eres-tienda", duracion: 1400, esperaHilo: 800 },
  { id: "registrar", capitulo: 5, lado: "tienda", telefono: "tienda", burbuja: { de: "deslizapp", texto: "Te llega organizado.", remate: "Lo registras en un toque." }, ancla: "registrar", duracion: 2600, esperaHilo: 500 },
  { id: "pedidos", capitulo: 5, lado: "tienda", telefono: "tienda", burbuja: { de: "deslizapp", texto: "Queda en Pedidos,", remate: "como nuevo." }, ancla: "pedidos", duracion: 1000, esperaHilo: 450 },
  { id: "confirmar", capitulo: 6, lado: "tienda", telefono: "tienda", burbuja: { de: "deslizapp", texto: "Lo confirmas", remate: "cuando lo tengas listo." }, ancla: "hoja-pedido", duracion: 1500, esperaHilo: 500 },
  { id: "despachar", capitulo: 6, lado: "tienda", telefono: "tienda", burbuja: { de: "deslizapp", texto: "Despachado.", remate: "El stock se actualizó solito." }, ancla: "despachar", duracion: 1500, esperaHilo: 0 },
];

export const indicePaso = (id: IdPaso) => PASOS.findIndex((p) => p.id === id);

/** Lo que tiene que estar a la vista en un paso (lo leen las pruebas y los atributos data-* de la página). */
export function estadoPaso(i: number) {
  const p = PASOS[Math.max(0, Math.min(PASOS.length - 1, i))]!;
  const bolsa = i >= indicePaso("aaah-tote") ? 2 : i >= indicePaso("aaah-termo") ? 1 : 0;
  return { id: p.id, capitulo: p.capitulo, lado: p.lado, telefono: p.telefono, bolsa, total: totalHasta(bolsa), codigoVisible: i >= indicePaso("whatsapp") };
}

/** El mensaje que la página le manda a cada teléfono (mismo origen, por postMessage). */
export const MENSAJE_PASO = "dz-landing-paso";
export const MENSAJE_LISTO = "dz-landing-listo";
export type MensajePaso = { tipo: typeof MENSAJE_PASO; paso: number; animar: boolean };
