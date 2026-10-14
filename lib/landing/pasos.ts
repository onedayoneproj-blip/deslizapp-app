// Los pasos de la demo de la landing (referencias/landing/ajustes-lewis-2.md y -3.md): cada deslizamiento lleva a un paso y su
// animación se completa sola. Aquí está todo lo que Lewis puede querer ajustar: el texto de cada burbuja, en qué teléfono pasa,
// qué hace el ♥, los capítulos del índice y cuánto dura la animación del paso. Los teléfonos (app/demo-landing) saben qué hacer en cada paso por su id.
// Puro (sin React): lo prueban tests/landing.test.mjs y scripts/probar-landing.mjs.

import { TOTAL_DEMO, pesos, totalHasta } from "./pedido-demo";

export type IdPaso =
  | "intro"
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

/** Las anclas de un viaje del ♥ entre teléfonos (cada teléfono sabe qué elemento real es: window.__dzAncla en app/demo-landing). */
export type IdAncla = "seguimiento" | "bloqueo";

/**
 * Lo que hace el ♥ en un paso (referencias/landing/ajustes-lewis-3.md §3): es el dedo de la demo.
 * - «toque»: el teléfono avisa antes de cada toque (MENSAJE_TOQUE); el ♥ aparece, va al sitio, hace el pulso y se va.
 * - «viaje»: lleva el pedido de un sitio a otro (de un teléfono al otro) y se desvanece al llegar.
 * - «no»: no se ve.
 */
export type Dedo = "no" | "toque" | "viaje";

export type Paso = {
  id: IdPaso;
  /** Capítulo del índice del recorrido (CAPITULOS_NOMBRES). */
  capitulo: number;
  /** Rosa (compradora) o verde (tienda), a pantalla completa. */
  lado: Lado;
  telefono: IdTelefono;
  /** La burbuja del paso (un mensaje enviado de WhatsApp): el texto y, si hay, su segunda frase. La portada no lleva: invita a
   *  deslizar su pantalla de bloqueo (ajustes-lewis-7.md §3). */
  burbuja: { texto: string; remate?: string } | null;
  /** Las rayas finas del indicador (ajustes-lewis-7.md §1): una por toque del ♥, o una por fase con tiempo propio si el paso no
   *  tiene toques. probar-landing comprueba que los toques reales coinciden. */
  fases: number;
  dedo: Dedo;
  /** Solo con dedo «viaje»: de qué ancla de qué teléfono sale el ♥ y a cuál llega. */
  viaje?: { desde: [IdTelefono, IdAncla]; hasta: [IdTelefono, IdAncla] };
  /** Cuánto dura la animación del paso (ms), con los toques del ♥ incluidos. */
  duracion: number;
};

/** El índice del recorrido, al borde derecho: una palabra por capítulo. */
export const CAPITULOS_NOMBRES = ["Elige", "Envía", "Sigue", "Te llega", "Registra", "Despacha"] as const;
export const CAPITULOS = CAPITULOS_NOMBRES.length;

/** Lo que tarda el ♥ en llegar al sitio de un toque; el teléfono espera esto antes de que el componente reaccione. */
export const DEDO_LLEGA = 480;

export const PASOS: Paso[] = [
  // La portada: el video, el icono y el teléfono bloqueado asomando (al deslizar, se desbloquea y entra el catálogo).
  { id: "intro", capitulo: 1, lado: "compras", telefono: "compradora", burbuja: null, dedo: "no", fases: 0, duracion: 600 },
  { id: "hola", capitulo: 1, lado: "compras", telefono: "compradora", burbuja: { texto: "Este es el catálogo de La Vuelta.", remate: "Así lo ve Ana, que va a comprar." }, dedo: "no", fases: 1, duracion: 700 },
  { id: "pasa", capitulo: 1, lado: "compras", telefono: "compradora", burbuja: { texto: "Lo que no te gusta,", remate: "pasa." }, dedo: "no", fases: 1, duracion: 900 },
  { id: "aaah-termo", capitulo: 1, lado: "compras", telefono: "compradora", burbuja: { texto: "Lo que te gusta: dale aaah.", remate: "Va directo a tu pedido." }, dedo: "toque", fases: 1, duracion: 2400 },
  { id: "aaah-tote", capitulo: 1, lado: "compras", telefono: "compradora", burbuja: { texto: "Uno más.", remate: `Tu pedido ya suma ${pesos(TOTAL_DEMO)}.` }, dedo: "toque", fases: 1, duracion: 2600 },
  { id: "bolsa", capitulo: 2, lado: "compras", telefono: "compradora", burbuja: { texto: "Tu pedido,", remate: "con todo en su sitio." }, dedo: "toque", fases: 1, duracion: 1300 },
  { id: "whatsapp", capitulo: 2, lado: "compras", telefono: "compradora", burbuja: { texto: "Lo envías por WhatsApp.", remate: "Le llega con fotos y el enlace." }, dedo: "toque", fases: 2, duracion: 2900 },
  { id: "seguimiento", capitulo: 3, lado: "compras", telefono: "compradora", burbuja: { texto: "Abre el enlace", remate: "y mira cómo va." }, dedo: "toque", fases: 1, duracion: 1500 },
  { id: "cambio", capitulo: 4, lado: "tienda", telefono: "tienda", burbuja: { texto: "Ahora te toca a ti,", remate: "como tienda." }, dedo: "viaje", viaje: { desde: ["compradora", "seguimiento"], hasta: ["tienda", "bloqueo"] }, fases: 1, duracion: 1700 },
  { id: "aviso", capitulo: 4, lado: "tienda", telefono: "tienda", burbuja: { texto: "Te piden allá.", remate: "Te llega aquí." }, dedo: "no", fases: 1, duracion: 1000 },
  { id: "chat-tienda", capitulo: 4, lado: "tienda", telefono: "tienda", burbuja: { texto: "Fotos, total y enlace.", remate: "Sin «¿cuál era?»." }, dedo: "toque", fases: 1, duracion: 1500 },
  { id: "eres-tienda", capitulo: 5, lado: "tienda", telefono: "tienda", burbuja: { texto: "¿Eres la tienda?", remate: "Entra con tu cuenta." }, dedo: "toque", fases: 2, duracion: 2500 },
  { id: "registrar", capitulo: 5, lado: "tienda", telefono: "tienda", burbuja: { texto: "Te llega organizado.", remate: "Lo registras en un toque." }, dedo: "toque", fases: 4, duracion: 4600 },
  { id: "pedidos", capitulo: 5, lado: "tienda", telefono: "tienda", burbuja: { texto: "Queda en Pedidos,", remate: "como nuevo." }, dedo: "toque", fases: 1, duracion: 1400 },
  { id: "confirmar", capitulo: 6, lado: "tienda", telefono: "tienda", burbuja: { texto: "Lo confirmas", remate: "cuando lo tengas listo." }, dedo: "toque", fases: 2, duracion: 2500 },
  { id: "despachar", capitulo: 6, lado: "tienda", telefono: "tienda", burbuja: { texto: "Despachado.", remate: "El stock se actualizó solito." }, dedo: "toque", fases: 1, duracion: 2000 },
];

export const indicePaso = (id: IdPaso) => PASOS.findIndex((p) => p.id === id);
/** El primer paso de un capítulo (1..CAPITULOS): adonde lleva tocarlo en el índice. */
export const primerPasoDe = (capitulo: number) => PASOS.findIndex((p) => p.capitulo === capitulo);

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
/** Del teléfono a la página: va a tocar aquí (el ♥ va y hace el pulso) o lleva el pedido hasta aquí (el ♥ viaja y se va). */
export const MENSAJE_TOQUE = "dz-landing-toque";
export const MENSAJE_VIAJE = "dz-landing-viaje";
export type MensajeDedo = { tipo: typeof MENSAJE_TOQUE | typeof MENSAJE_VIAJE; x: number; y: number };
