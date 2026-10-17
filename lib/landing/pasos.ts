// Los pasos de la demo de la landing (referencias/landing/ajustes-lewis-2.md y -3.md): cada deslizamiento lleva a un paso y su
// animación se completa sola. Aquí está todo lo que Lewis puede querer ajustar: el texto de cada burbuja, en qué teléfono pasa,
// qué hace el ♥, los capítulos del índice y cuánto dura la animación del paso. Los teléfonos (app/demo-landing) saben qué hacer en cada paso por su id.
// Puro (sin React): lo prueban tests/landing.test.mjs y scripts/probar-landing.mjs.

import { TOTAL_DEMO, horaDespues, pesos, relojDespues, totalHasta } from "./pedido-demo";

export type IdPaso =
  | "bienvenida"
  | "antes"
  | "dolor-dm"
  | "dolor-chats"
  | "solucion"
  | "post"
  | "enlace"
  | "hola"
  | "aaah"
  | "bolsa"
  | "whatsapp"
  | "seguimiento"
  | "cambio-lado"
  | "aviso"
  | "chat-tienda"
  | "registrar"
  | "pedidos"
  | "confirmar"
  | "despachar";

/** «inicio»: la bienvenida, en Bosque (sin el icono pequeño de la app). «antes»: el dolor del vendedor, en tonos neutros (arena); el rosa
 *  de quien compra y el verde de la tienda llegan después. */
export type Lado = "inicio" | "antes" | "compras" | "tienda";
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

/** Los iconos de la app (components/iconos.tsx) que pueden ir delante de una palabra de una burbuja (ajustes-lewis-12.md §2). */
export type IconoBurbuja = "clientes" | "bolsa" | "pedidos" | "catalogo" | "whatsapp" | "corazon" | "enlace" | "camion" | "moneda" | "etiqueta";
/** Como mucho dos iconos por burbuja. */
export const MAX_ICONOS_BURBUJA = 2;

export type Paso = {
  id: IdPaso;
  /** Capítulo del índice del recorrido (CAPITULOS_NOMBRES). */
  capitulo: number;
  /** Arena (antes), rosa (compradora) o verde (tienda), a pantalla completa. */
  lado: Lado;
  telefono: IdTelefono;
  /** Lo que no es la página real del teléfono (components/landing/escenas.tsx, separadores.tsx, cambio-lado.tsx y perfil-a-catalogo.tsx): el
   *  dolor del vendedor y el post se dibujan sobre el teléfono de la compradora; `bienvenida`, `antes`, `solucion`, `enlace` (del perfil al
   *  catálogo, una sola vez) y `cambio-lado` no llevan el teléfono de la demo, son pantallas propias. scripts/generar-pasos-landing.mjs no les saca captura. */
  escena?: "bienvenida" | "antes" | "solucion" | "dolor-dm" | "dolor-chats" | "post" | "enlace" | "cambio-lado";
  /** La burbuja del paso (un mensaje enviado de WhatsApp): el texto y, si hay, su segunda frase. `resalta`: las palabras que van
   *  en color de marca (ajustes-lewis-8.md §2): en compras, el texto mandarina de la marca; en tienda, verde Bosque. `cambio-lado`
   *  no lleva burbuja: su texto va en la propia pantalla. `iconos`: qué palabras (tal cual salen en
   *  el texto) llevan delante el icono de la app que las nombra, en su color (ajustes-lewis-12.md §2); como mucho dos. */
  burbuja: { texto: string; remate?: string; resalta?: string[]; iconos?: Record<string, IconoBurbuja> } | null;
  /** Los toques del ♥ de la demo en este paso (o fases con tiempo propio si no tiene): probar-landing comprueba que los toques reales coinciden. */
  fases: number;
  dedo: Dedo;
  /** Solo con dedo «viaje»: de qué ancla de qué teléfono sale el ♥ y a cuál llega. */
  viaje?: { desde: [IdTelefono, IdAncla]; hasta: [IdTelefono, IdAncla] };
  /** Cuánto dura la animación del paso (ms), con los toques del ♥ incluidos. */
  duracion: number;
};

/** El índice del recorrido, al borde derecho: una palabra por capítulo. */
export const CAPITULOS_NOMBRES = ["Antes", "Enlace", "Elige", "Envía", "Sigue", "Te llega", "Registra", "Despacha"] as const;
export const CAPITULOS = CAPITULOS_NOMBRES.length;

/** Lo que tarda el ♥ en llegar al sitio de un toque; el teléfono espera esto antes de que el componente reaccione. */
export const DEDO_LLEGA = 480;

/** Lo que tarda «Del perfil al catálogo» (components/landing/perfil-a-catalogo.tsx) en llegar al catálogo abierto y dar su «aaah», una sola vez. */
const ENLACE_MS = 10500;

export const PASOS: Paso[] = [
  // La historia empieza en el dolor de quien vende (docs/prompts/conoce-portada-narrativa.md): dos pantallas neutras, y el color de la
  // marca entra con el post de la tienda. Del enlace del perfil al catálogo en el navegador de Instagram, y de ahí a la app.
  // Tres separadores sin teléfono presentan cada tema (referencias/landing/conoce-narrativa/LEEME.md): `bienvenida` (Bosque) y `antes` (arena)
  // abren «Antes», y `solucion` (rosa) abre «Enlace». Sus textos van en la propia pantalla (separadores.tsx).
  { id: "bienvenida", capitulo: 1, lado: "inicio", telefono: "compradora", escena: "bienvenida", burbuja: null, dedo: "no", fases: 1, duracion: 3600 },
  { id: "antes", capitulo: 1, lado: "antes", telefono: "compradora", escena: "antes", burbuja: null, dedo: "no", fases: 1, duracion: 4000 },
  { id: "dolor-dm", capitulo: 1, lado: "antes", telefono: "compradora", escena: "dolor-dm", burbuja: { texto: "Te escriben por Instagram: capturas y «¿precio?».", remate: "Y tú: “escríbeme al WhatsApp”.", resalta: ["capturas"] }, dedo: "no", fases: 1, duracion: 2400 },
  { id: "dolor-chats", capitulo: 1, lado: "antes", telefono: "compradora", escena: "dolor-chats", burbuja: { texto: "Ahora multiplícalo por todos tus chats.", remate: "Precios repetidos, notas sueltas y pedidos perdidos.", resalta: ["todos tus chats"] }, dedo: "no", fases: 1, duracion: 2400 },
  { id: "solucion", capitulo: 2, lado: "compras", telefono: "compradora", escena: "solucion", burbuja: null, dedo: "no", fases: 1, duracion: 3600 },
  { id: "post", capitulo: 2, lado: "compras", telefono: "compradora", escena: "post", burbuja: { texto: "Tu Tienda publica como siempre.", remate: "La diferencia: el pedido se hace en su catálogo.", resalta: ["Tu Tienda"], iconos: { catálogo: "catalogo" } }, dedo: "no", fases: 1, duracion: 1200 },
  { id: "enlace", capitulo: 2, lado: "compras", telefono: "compradora", escena: "enlace", burbuja: { texto: "Tu cliente toca el link de tu bio y tu catálogo se abre ahí mismo, dentro de Instagram.", remate: "Sin descargar nada. También desde tus estados.", resalta: ["link de tu bio", "tu catálogo"], iconos: { "link de tu bio": "enlace", "tu catálogo": "catalogo" } }, dedo: "no", fases: 1, duracion: ENLACE_MS },
  // «hola» y «pasa» en uno: el catálogo se abre en la gorra y, un momento después, la pasa para llegar al termo.
  { id: "hola", capitulo: 3, lado: "compras", telefono: "compradora", burbuja: { texto: "Así lo ve tu cliente: desliza como en los Reels.", remate: "Lo que no le gusta, pasa.", resalta: ["pasa"] }, dedo: "no", fases: 1, duracion: 2400 },
  // «aaah» del termo y del tote en uno: dos toques del ♥.
  { id: "aaah", capitulo: 3, lado: "compras", telefono: "compradora", burbuja: { texto: "Lo que le gusta: aaah.", remate: `Va directo a su pedido, que ya suma ${pesos(TOTAL_DEMO)}.`, resalta: ["aaah", pesos(TOTAL_DEMO)], iconos: { aaah: "corazon", [pesos(TOTAL_DEMO)]: "moneda" } }, dedo: "toque", fases: 2, duracion: 5200 },
  { id: "bolsa", capitulo: 4, lado: "compras", telefono: "compradora", burbuja: { texto: "Su pedido,", remate: "con todo en su sitio.", resalta: ["en su sitio"], iconos: { "Su pedido": "pedidos" } }, dedo: "toque", fases: 1, duracion: 1300 },
  { id: "whatsapp", capitulo: 4, lado: "compras", telefono: "compradora", burbuja: { texto: "Lo envía por WhatsApp.", remate: "A tu tienda le llega con fotos y el enlace.", resalta: ["WhatsApp"], iconos: { WhatsApp: "whatsapp", enlace: "enlace" } }, dedo: "toque", fases: 2, duracion: 2900 },
  { id: "seguimiento", capitulo: 5, lado: "compras", telefono: "compradora", burbuja: { texto: "Con el enlace", remate: "ve cómo va su pedido.", resalta: ["cómo va"], iconos: { enlace: "enlace" } }, dedo: "toque", fases: 1, duracion: 1500 },
  // El cambio de lado: una pantalla propia, sin teléfono (components/landing/cambio-lado.tsx). Arranca rosa («Pidió en segundos.») y a los
  // CAMBIO_LADO_MS se vuelve verde («Así lo ve Tu Tienda.»); `lado` es el del final, el que se ve al llegar sin animación.
  { id: "cambio-lado", capitulo: 6, lado: "tienda", telefono: "tienda", escena: "cambio-lado", burbuja: null, dedo: "no", fases: 1, duracion: 2400 },
  { id: "aviso", capitulo: 6, lado: "tienda", telefono: "tienda", burbuja: { texto: "Te piden allá.", remate: "Te llega aquí.", resalta: ["Te llega aquí"] }, dedo: "no", fases: 1, duracion: 1000 },
  { id: "chat-tienda", capitulo: 6, lado: "tienda", telefono: "tienda", burbuja: { texto: "Fotos, total y enlace.", remate: "Sin «¿cuál era?».", resalta: ["¿cuál era?"], iconos: { total: "moneda", enlace: "enlace" } }, dedo: "toque", fases: 1, duracion: 1500 },
  // «¿Eres la tienda?» y «Registrar» en uno: el enlace del pedido, entrar con la cuenta y registrarlo (seis toques).
  { id: "registrar", capitulo: 7, lado: "tienda", telefono: "tienda", burbuja: { texto: "Entras con tu cuenta y el pedido te llega organizado.", remate: "Lo registras en un toque.", resalta: ["tu cuenta", "organizado"] }, dedo: "toque", fases: 6, duracion: 7100 },
  { id: "pedidos", capitulo: 7, lado: "tienda", telefono: "tienda", burbuja: { texto: "Queda en Pedidos,", remate: "como nuevo.", resalta: ["Pedidos"], iconos: { Pedidos: "pedidos" } }, dedo: "toque", fases: 1, duracion: 1400 },
  { id: "confirmar", capitulo: 8, lado: "tienda", telefono: "tienda", burbuja: { texto: "Lo confirmas", remate: "cuando lo tengas listo.", resalta: ["listo"] }, dedo: "toque", fases: 2, duracion: 2500 },
  { id: "despachar", capitulo: 8, lado: "tienda", telefono: "tienda", burbuja: { texto: "Despachado.", remate: "El stock se actualizó solito.", resalta: ["solito"], iconos: { Despachado: "camion", stock: "etiqueta" } }, dedo: "toque", fases: 1, duracion: 2000 },
];

/** ¿La burbuja trae tanto texto que necesita letra menor y más sitio (landing.css `data-larga`)? */
export const burbujaLarga = (p: Paso) => (p.burbuja ? `${p.burbuja.texto} ${p.burbuja.remate ?? ""}`.length > 110 : false);

/** Las burbujas cuentan la historia con un solo reloj (pedido-demo.ts): minuto a minuto, y la de `whatsapp` es la hora a la que Ana envía el
 *  pedido. Los minutos que hay de la burbuja de un paso a esa hora. */
export const minutosDeBurbuja = (id: IdPaso) => {
  const con = PASOS.filter((p) => p.burbuja);
  return con.findIndex((p) => p.id === id) - con.findIndex((p) => p.id === "whatsapp");
};
/** La hora de la burbuja de un paso («3:44 p. m.»). */
export const horaDeBurbuja = (id: IdPaso) => horaDespues(minutosDeBurbuja(id));
/** El reloj grande de la pantalla bloqueada de la tienda: la hora de la burbuja `aviso`, que es cuando le llega el aviso. */
export const RELOJ_AVISO = relojDespues(minutosDeBurbuja("aviso"));
/** Cuánto hace que Ana envió el pedido, en el aviso de la pantalla bloqueada. */
export const HACE_AVISO = `hace ${minutosDeBurbuja("aviso")} min`;

export const indicePaso = (id: IdPaso) => PASOS.findIndex((p) => p.id === id);
/** El primer paso de un capítulo (1..CAPITULOS): adonde lleva tocarlo en el índice. */
export const primerPasoDe = (capitulo: number) => PASOS.findIndex((p) => p.capitulo === capitulo);

/** Lo que tiene que estar a la vista en un paso (lo leen las pruebas y los atributos data-* de la página). */
export function estadoPaso(i: number) {
  const p = PASOS[Math.max(0, Math.min(PASOS.length - 1, i))]!;
  const bolsa = i >= indicePaso("aaah") ? 2 : 0;
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

// ---------------------------------------------------------------------------------------------------------------------------------------
// El avance por capítulos: un segmento de la barra y un deslizamiento por capítulo. Dentro de un capítulo, los pasos avanzan solos (cuando
// termina la animación de un paso y pasa el tiempo de leer su burbuja, sigue el siguiente). Puro: lo prueban tests/landing.test.mjs y
// scripts/probar-landing.mjs.

/** Cuánto se deja para leer la burbuja de un paso, una vez terminada su animación: 1,8 s más 0,04 s por carácter, con tope de 4 s. Un
 *  paso sin burbuja (un separador, el cambio de lado) trae su texto en pantalla: 2 s. */
export const lecturaMs = (p: Paso) => {
  if (!p.burbuja) return 2000;
  const letras = p.burbuja.texto.length + (p.burbuja.remate ? p.burbuja.remate.length + 1 : 0);
  return Math.min(4000, Math.round(1800 + 40 * letras));
};

/** Los índices de los pasos de un capítulo (1..CAPITULOS), en orden. */
export const pasosDeCapitulo = (capitulo: number) => PASOS.flatMap((p, i) => (p.capitulo === capitulo ? [i] : []));

/**
 * La línea de tiempo de un capítulo, en ms desde que empieza: `inicios[k]` es cuándo entra su paso k (el anterior termina su animación y su
 * lectura) y `total`, cuándo termina la animación del último: el segmento de la barra se llena justo ahí y sale «Desliza ↑». El último
 * paso no lleva tiempo de lectura (no hay siguiente paso que esperar).
 */
export function lineaDelCapitulo(capitulo: number): { pasos: number[]; inicios: number[]; total: number } {
  const pasos = pasosDeCapitulo(capitulo);
  const inicios: number[] = [];
  let t = 0;
  pasos.forEach((i, k) => {
    inicios.push(t);
    t += PASOS[i]!.duracion + (k < pasos.length - 1 ? lecturaMs(PASOS[i]!) : 0);
  });
  return { pasos, inicios, total: t };
}
