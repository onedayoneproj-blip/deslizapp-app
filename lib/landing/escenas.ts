// Tabla de tiempos de la demo de la landing. El scroll es el reloj: cada escena dura `pantallas` alturas de pantalla de
// desplazamiento (× ESCALA_SCROLL). Para cambiar el ritmo basta con tocar esta tabla; la UI lee de aquí sus ventanas.
// Puro (sin React): lo prueban tests/landing.test.mjs y scripts/probar-landing.mjs.

import { PRODUCTOS_DEMO, totalHasta } from "./pedido-demo";

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

export type Escena = {
  id: IdEscena;
  /** Cuánto scroll dura, en pantallas. */
  pantallas: number;
  /** De qué lado va el relato: la compradora o la tienda. */
  lado: "compras" | "tienda" | null;
  titulo: string;
  /** Segunda línea del titular (el remate, en color). */
  remate?: string;
  apoyo: string;
  /** Punto de la escena (0 a 1) que se muestra en la versión sin animación. */
  foto: number;
};

/** Multiplica la duración de todas las escenas (1 = una pantalla de scroll por unidad). */
export const ESCALA_SCROLL = 0.8;

export const ESCENAS: Escena[] = [
  { id: "bienvenida", pantallas: 1, lado: null, titulo: "Hola, esto es Deslizapp.", apoyo: "Desliza y mira cómo funciona.", foto: 0.5 },
  { id: "explorar", pantallas: 4.2, lado: "compras", titulo: "Desliza. Encuentra.", remate: "Dale aaah.", apoyo: "«Lo quiero» lo pone directo en tu pedido.", foto: 0.86 },
  { id: "revisar", pantallas: 1.6, lado: "compras", titulo: "Tu pedido,", remate: "con todo en su sitio.", apoyo: "Productos, cantidades y total antes de enviarlo.", foto: 0.6 },
  { id: "whatsapp-comprador", pantallas: 1.7, lado: "compras", titulo: "Del catálogo a WhatsApp.", remate: "Con las fotos incluidas.", apoyo: "El mensaje sale armado, con el total y el enlace del pedido.", foto: 0.7 },
  { id: "seguimiento", pantallas: 1.4, lado: "compras", titulo: "Abre el enlace", remate: "y mira cómo va.", apoyo: "El pedido se queda ahí, con su estado.", foto: 0.6 },
  { id: "cambio", pantallas: 0.9, lado: null, titulo: "Ahora te toca a ti,", remate: "como tienda.", apoyo: "El mismo pedido, del otro lado.", foto: 0.85 },
  { id: "notificacion", pantallas: 1, lado: "tienda", titulo: "Te escribe por WhatsApp.", remate: "Como siempre.", apoyo: "Lo que cambia es lo que trae el mensaje.", foto: 0.55 },
  { id: "whatsapp-tienda", pantallas: 1.1, lado: "tienda", titulo: "Mismo pedido.", remate: "Sin «¿cuál era?».", apoyo: "Productos, total y el enlace, en un solo mensaje.", foto: 0.6 },
  { id: "acceso", pantallas: 1.4, lado: "tienda", titulo: "¿Eres la tienda?", remate: "Entra con tu cuenta.", apoyo: "Solo la cuenta de la tienda puede gestionar el pedido.", foto: 0.55 },
  { id: "gestion", pantallas: 2.6, lado: "tienda", titulo: "Te llega organizado.", remate: "Tú te encargas de prepararlo.", apoyo: "Lo registras, queda en Pedidos y cambias su estado.", foto: 0.3 },
  { id: "cierre", pantallas: 0.9, lado: "compras", titulo: "Confirmado.", remate: "Ana lo ve en su enlace.", apoyo: "Sin preguntar «¿y mi pedido?».", foto: 0.6 },
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

/** El momento de cada producto dentro de «explorar»: tres tiempos iguales (aparece, «Lo quiero», vuela a la bolsa). */
export function momentoProducto(i: number, desde: number, hasta: number): [number, number] {
  const n = PRODUCTOS_DEMO.length;
  return ventana("explorar", (i + desde) / n, (i + hasta) / n);
}

/** Cuándo cuenta la bolsa cada producto: al tocar «Lo quiero». */
export const AGREGA_EN = 0.42;

/** La escena que se ve en un punto del progreso. */
export function escenaEn(p: number): Escena {
  return (TRAMOS.find((t) => p < t.fin) ?? TRAMOS[TRAMOS.length - 1]!).escena;
}

export type EstadoDemo = { escena: IdEscena; bolsa: number; total: number; codigoVisible: boolean; lado: Escena["lado"] };

/** El estado discreto de la demo en un punto (lo leen las pruebas y los atributos data-* del escenario). */
export function estadoDemo(p: number): EstadoDemo {
  const escena = escenaEn(p);
  const bolsa = PRODUCTOS_DEMO.filter((_, i) => p >= momentoProducto(i, AGREGA_EN, AGREGA_EN + 0.01)[0]).length;
  return { escena: escena.id, bolsa, total: totalHasta(bolsa), codigoVisible: p >= en("whatsapp-comprador", 0.2), lado: escena.lado };
}

/** El punto de progreso que muestra cada escena en la versión sin animación. */
export const fotoDe = (e: Escena) => en(e.id, e.foto);
