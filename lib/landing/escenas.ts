// Tabla de tiempos de la demo de la landing. El scroll es el reloj: cada escena dura `pantallas` alturas de pantalla de
// desplazamiento (× ESCALA_SCROLL). Para cambiar el ritmo basta con tocar esta tabla; la UI lee de aquí sus ventanas.
// También aquí: el recorrido del ♥ (HILO), el hilo de toda la demo (referencias/landing/ajustes-lewis-1.md §6).
// Puro (sin React): lo prueban tests/landing.test.mjs y scripts/probar-landing.mjs.

import { PEDIDO_DEMO, PRODUCTOS_DEMO, totalHasta } from "./pedido-demo";

export type IdEscena =
  | "bienvenida"
  | "explorar"
  | "revisar"
  | "whatsapp-comprador"
  | "seguimiento"
  | "cambio"
  | "notificacion"
  | "whatsapp-tienda"
  | "acceso"
  | "gestion"
  | "cierre";

export type Lado = "compras" | "tienda";

export type Escena = {
  id: IdEscena;
  /** Cuánto scroll dura, en pantallas. */
  pantallas: number;
  /** De qué lado va el relato: rosa para la compradora, verde para la tienda (docs/09). */
  lado: Lado;
  /** Capítulo (1 a CAPITULOS) del contador «01 / 06». */
  capitulo: number;
  /** El titular, en dos líneas (la segunda es el remate, en color). */
  titulo: string;
  remate: string;
  apoyo: string;
  /** Punto de la escena (0 a 1) que se muestra en la versión sin animación. */
  foto: number;
};

/** Multiplica la duración de todas las escenas (1 = una pantalla de scroll por unidad). */
export const ESCALA_SCROLL = 0.8;
export const CAPITULOS = 6;

export const ESCENAS: Escena[] = [
  { id: "bienvenida", pantallas: 1, lado: "compras", capitulo: 1, titulo: "Hola, esto es Deslizapp.", remate: "Desliza y mira.", apoyo: "Un pedido de verdad, de principio a fin.", foto: 0.5 },
  { id: "explorar", pantallas: 3.4, lado: "compras", capitulo: 1, titulo: "Desliza.", remate: "Dale aaah.", apoyo: "Lo que no te gusta, pasa. Lo que sí, va a tu pedido.", foto: 0.95 },
  { id: "revisar", pantallas: 1.4, lado: "compras", capitulo: 2, titulo: "Tu pedido,", remate: "con todo en su sitio.", apoyo: "Productos, cantidades y total antes de enviarlo.", foto: 0.5 },
  { id: "whatsapp-comprador", pantallas: 1.6, lado: "compras", capitulo: 2, titulo: "Lo pides allá.", remate: "Llega con fotos.", apoyo: "El mensaje sale armado, con el total y el enlace del pedido.", foto: 0.6 },
  { id: "seguimiento", pantallas: 1.3, lado: "compras", capitulo: 3, titulo: "Abre el enlace", remate: "y mira cómo va.", apoyo: "Tu pedido se queda ahí, con su estado.", foto: 0.6 },
  { id: "cambio", pantallas: 1.2, lado: "tienda", capitulo: 4, titulo: "Ahora te toca a ti,", remate: "como tienda.", apoyo: "El mismo pedido, del otro lado.", foto: 0.8 },
  { id: "notificacion", pantallas: 1, lado: "tienda", capitulo: 4, titulo: "Te piden allá.", remate: "Te llega aquí.", apoyo: "Por WhatsApp, como siempre. Pero ordenado.", foto: 0.55 },
  { id: "whatsapp-tienda", pantallas: 1.1, lado: "tienda", capitulo: 4, titulo: "Sin «¿cuál era?».", remate: "Fotos, total y enlace.", apoyo: "Todo el pedido en un solo mensaje.", foto: 0.55 },
  { id: "acceso", pantallas: 1.3, lado: "tienda", capitulo: 5, titulo: "¿Eres la tienda?", remate: "Entra con tu cuenta.", apoyo: "Solo la cuenta de la tienda puede gestionar el pedido.", foto: 0.6 },
  { id: "gestion", pantallas: 2.4, lado: "tienda", capitulo: 5, titulo: "Te llega organizado.", remate: "Tú lo preparas.", apoyo: "Lo registras, queda en Pedidos y lo confirmas.", foto: 0.3 },
  { id: "cierre", pantallas: 1.3, lado: "tienda", capitulo: 6, titulo: "Despachado.", remate: "El stock se actualizó solito.", apoyo: "Y Ana lo ve en su enlace.", foto: 0.7 },
];

type Tramo = { escena: Escena; inicio: number; fin: number };

const TRAMOS: Tramo[] = (() => {
  let t = 0;
  return ESCENAS.map((escena) => {
    const inicio = t;
    t += escena.pantallas;
    return { escena, inicio, fin: t };
  });
})();

/** Duración total de la demo, en unidades de progreso (las de `pantallas`). */
export const DURACION = TRAMOS[TRAMOS.length - 1]!.fin;

function tramo(id: IdEscena): Tramo {
  const t = TRAMOS.find((x) => x.escena.id === id);
  if (!t) throw new Error(`Escena desconocida: ${id}`);
  return t;
}

/** Un instante de una escena (0 = empieza, 1 = termina), en unidades de progreso de toda la demo. */
export function en(id: IdEscena, local: number): number {
  const t = tramo(id);
  return t.inicio + (t.fin - t.inicio) * local;
}

/** Una ventana [desde, hasta] dentro de una escena, en unidades de progreso de toda la demo. */
export function ventana(id: IdEscena, desde: number, hasta: number): [number, number] {
  return [en(id, desde), en(id, hasta)];
}

/** Cada producto del feed tiene un tercio de «explorar»: aparece, («Lo quiero» si va al pedido) y se va. */
export function momentoProducto(i: number, desde: number, hasta: number): [number, number] {
  const n = PRODUCTOS_DEMO.length;
  return ventana("explorar", (i + desde) / n, (i + hasta) / n);
}

/** Dentro de su tercio: cuándo toca «Lo quiero» y cuándo el producto ya está en la bolsa. */
export const TOCA_LIKE = 0.3;
export const AGREGA_EN = 0.72;

/** Cuándo entra a la bolsa el producto n del pedido (0 = el primero que le gustó). */
export function agregadoEn(n: number): number {
  const i = PRODUCTOS_DEMO.indexOf(PEDIDO_DEMO[n]!);
  return momentoProducto(i, AGREGA_EN, AGREGA_EN + 0.01)[0];
}

/** El cruce de persona dentro de «cambio»: sale el teléfono de la compradora y entra el de la tienda. */
export const CRUCE = { sale: ventana("cambio", 0.1, 0.5), entra: ventana("cambio", 0.35, 0.72), fondo: ventana("cambio", 0.2, 0.6) };

/** La escena que se ve en un punto del progreso. */
export function escenaEn(p: number): Escena {
  return (TRAMOS.find((t) => p < t.fin) ?? TRAMOS[TRAMOS.length - 1]!).escena;
}

export type EstadoDemo = { escena: IdEscena; bolsa: number; total: number; codigoVisible: boolean; lado: Lado; capitulo: number };

/** El estado discreto de la demo en un punto (lo leen las pruebas y los atributos data-* del escenario). */
export function estadoDemo(p: number): EstadoDemo {
  const escena = escenaEn(p);
  const bolsa = PEDIDO_DEMO.filter((_, n) => p >= agregadoEn(n)).length;
  return { escena: escena.id, bolsa, total: totalHasta(bolsa), codigoVisible: p >= en("whatsapp-comprador", 0.3), lado: escena.lado, capitulo: escena.capitulo };
}

/** El punto de progreso que muestra cada escena en la versión sin animación. */
export const fotoDe = (e: Escena) => en(e.id, e.foto);

// ---------------------------------------------------------------------------------------------------------------------
// El ♥: un solo elemento por encima de los teléfonos. Descansa en un ancla (un elemento con data-ancla dentro de una
// pantalla) y viaja de una a la siguiente. Su tamaño es el del ancla.
// ---------------------------------------------------------------------------------------------------------------------

export type IdAncla =
  | "like-termo"
  | "bolsa"
  | "tu-pedido"
  | "chat-compradora"
  | "seguimiento"
  | "notificacion"
  | "chat-tienda"
  | "eres-tienda"
  | "registrar"
  | "pedidos"
  | "hoja-pedido"
  | "despachar";

export type Descanso = { ancla: IdAncla; desde: number; hasta: number };

const indiceTermo = PRODUCTOS_DEMO.findIndex((p) => p.id === "termo");

export const HILO: Descanso[] = [
  { ancla: "like-termo", desde: momentoProducto(indiceTermo, TOCA_LIKE + 0.06, 0)[0], hasta: momentoProducto(indiceTermo, 0.5, 0)[0] },
  { ancla: "bolsa", desde: agregadoEn(0), hasta: en("revisar", 0.1) },
  { ancla: "tu-pedido", desde: en("revisar", 0.3), hasta: en("revisar", 0.66) },
  { ancla: "chat-compradora", desde: en("whatsapp-comprador", 0.42), hasta: en("whatsapp-comprador", 0.72) },
  { ancla: "seguimiento", desde: en("seguimiento", 0.22), hasta: en("cambio", 0.15) },
  { ancla: "notificacion", desde: en("notificacion", 0.3), hasta: en("notificacion", 0.56) },
  { ancla: "chat-tienda", desde: en("whatsapp-tienda", 0.28), hasta: en("whatsapp-tienda", 0.62) },
  { ancla: "eres-tienda", desde: en("acceso", 0.46), hasta: en("acceso", 0.92) },
  { ancla: "registrar", desde: en("gestion", 0.14), hasta: en("gestion", 0.42) },
  { ancla: "pedidos", desde: en("gestion", 0.58), hasta: en("gestion", 0.66) },
  { ancla: "hoja-pedido", desde: en("gestion", 0.78), hasta: en("cierre", 0.12) },
  { ancla: "despachar", desde: en("cierre", 0.22), hasta: DURACION + 1 },
];

/** Cuándo aparece el ♥ (el «Lo quiero» del termo) y cuándo se vuelve check (al despachar). */
export const HILO_APARECE: [number, number] = [momentoProducto(indiceTermo, TOCA_LIKE, 0)[0], HILO[0]!.desde];
export const HILO_VERDE: [number, number] = ventana("cambio", 0.35, 0.6);
export const HILO_CHECK: [number, number] = ventana("cierre", 0.3, 0.4);
/** El segundo «Lo quiero» (el tote) se suma al mismo ♥: late y muestra un «2». */
export const HILO_SUMA: [number, number] = [agregadoEn(1) - 0.06, agregadoEn(1)];

export type PosicionHilo = { de: IdAncla; a: IdAncla; t: number };

const suave = (t: number) => t * t * (3 - 2 * t);

/** Dónde está el ♥ en un punto: entre dos anclas (`t` 0 = en `de`, 1 = en `a`), ya suavizado. */
export function hiloEn(p: number): PosicionHilo {
  if (p <= HILO[0]!.hasta) return { de: HILO[0]!.ancla, a: HILO[0]!.ancla, t: 0 };
  for (let i = 0; i < HILO.length; i++) {
    const d = HILO[i]!;
    if (p >= d.desde && p <= d.hasta) return { de: d.ancla, a: d.ancla, t: 0 };
    const sig = HILO[i + 1];
    if (sig && p > d.hasta && p < sig.desde) return { de: d.ancla, a: sig.ancla, t: suave((p - d.hasta) / (sig.desde - d.hasta)) };
  }
  const ultimo = HILO[HILO.length - 1]!;
  return { de: ultimo.ancla, a: ultimo.ancla, t: 0 };
}

/** El ancla más cercana en el tiempo (para dibujar el ♥ quieto en la versión sin animación). */
export function anclaEn(p: number): IdAncla {
  const h = hiloEn(p);
  return h.t < 0.5 ? h.de : h.a;
}
