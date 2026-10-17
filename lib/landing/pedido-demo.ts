// El pedido ficticio de la landing (deslizapp.com): una sola fuente para precios, cantidades, fotos, mensajes y vistas.
// Tienda, compradora, productos y precios son inventados (referencias/landing/HANDOFF_DESLIZAPP.md §4; desde
// referencias/landing/ajustes-lewis-1.md el pedido lleva 2 productos: la gorra pasa sin like). El mensaje de WhatsApp
// y el estado que ve la compradora salen de las mismas funciones que usa el catálogo real.

import { estadoComprador } from "../pedido-catalogo";
import { dinero, mensajePedido } from "../tienda/carrito";
import type { CatalogoPublico } from "../types";

export type ProductoDemo = {
  id: string;
  nombre: string;
  precio: number;
  cantidad: number;
  /** La foto del feed (WebP 720×900, 4:5 como la tarjeta del reel, con su fondo), en public/landing. Las miniaturas la recortan. */
  foto: string;
  /** Fondo de la tarjeta del feed (tokens de marca). */
  fondo: string;
  /** ¿Ana le da «Lo quiero»? La gorra pasa sin like: así se ve que elige. */
  enPedido: boolean;
};

export const TIENDA_DEMO = { nombre: "Tu Tienda", inicial: "TT" };
export const COMPRADORA_DEMO = { nombre: "Ana", inicial: "A" };

/** Mismo formato que los códigos reales (lib/tienda/imagen-pedido.ts `codigoPedidoValido`): 10 caracteres sin 0, 1, I ni O. */
export const CODIGO_DEMO = "TT4K7Q2MZA";
/** Número del pedido en el panel de la tienda (los pedidos se numeran por tienda). */
export const NUMERO_PEDIDO_DEMO = 27;
/** Dominio que se ve en el mensaje. Es ilustrativo: en la landing no es un enlace. */
export const ORIGEN_DEMO = "https://deslizapp.com";
/** Un solo reloj para toda la historia: Ana envía el pedido a las 3:42 p. m. y todo lo demás (las burbujas, la pantalla bloqueada de la
 *  tienda) cuenta minutos a partir de ahí. */
export const MINUTO_PEDIDO = 15 * 60 + 42;
/** «3:44» de la hora que está `min` minutos después del pedido (y antes, si es negativo). */
export const relojDespues = (min: number) => {
  const m = MINUTO_PEDIDO + min;
  return `${((Math.floor(m / 60) + 11) % 12) + 1}:${String(m % 60).padStart(2, "0")}`;
};
/** «3:44 p. m.», como la hora de un mensaje de WhatsApp. */
export const horaDespues = (min: number) => `${relojDespues(min)} ${Math.floor((MINUTO_PEDIDO + min) / 60) % 24 >= 12 ? "p. m." : "a. m."}`;
export const HORA_DEMO = horaDespues(0);

export const PRODUCTOS_DEMO: ProductoDemo[] = [
  { id: "gorra", nombre: "Gorra verde", precio: 650, cantidad: 1, foto: "/landing/feed-gorra.webp", fondo: "var(--marca-rosa-fija)", enPedido: false },
  { id: "termo", nombre: "Termo rosado", precio: 950, cantidad: 1, foto: "/landing/feed-termo.webp", fondo: "var(--accion-suave)", enPedido: true },
  { id: "tote", nombre: "Tote bag crema y verde", precio: 550, cantidad: 1, foto: "/landing/feed-tote.webp", fondo: "var(--superficie-hundida)", enPedido: true },
];

/** Lo que termina en el pedido (en el orden en que Ana les da «Lo quiero»). */
export const PEDIDO_DEMO = PRODUCTOS_DEMO.filter((p) => p.enPedido);
export const TOTAL_DEMO = PEDIDO_DEMO.reduce((t, p) => t + p.precio * p.cantidad, 0);
export const UNIDADES_DEMO = PEDIDO_DEMO.reduce((t, p) => t + p.cantidad, 0);

/** Total acumulado después de agregar los primeros `n` productos del pedido a la bolsa. */
export const totalHasta = (n: number) => PEDIDO_DEMO.slice(0, n).reduce((t, p) => t + p.precio * p.cantidad, 0);

export const pesos = dinero;

// Lo mínimo de la tienda que leen mensajePedido y estadoComprador; el resto del catálogo público no aplica a la demo.
const tiendaMensaje = { nombre: TIENDA_DEMO.nombre, nombreVendedora: null, personalizacion: {}, rubro: "general" } as unknown as CatalogoPublico["tienda"];

const items = PEDIDO_DEMO.map((p) => ({ nombre: p.nombre, varianteTexto: null, cantidad: p.cantidad, precioUnitario: p.precio, porEncargo: false }));

/** El texto que arma el catálogo al tocar «Enviar por WhatsApp» (components/tienda/catalogo.tsx). */
export const MENSAJE_DEMO = mensajePedido(tiendaMensaje, items, TOTAL_DEMO, { codigo: CODIGO_DEMO, origen: ORIGEN_DEMO });
export const ENLACE_DEMO = `${ORIGEN_DEMO}/pedido/${CODIGO_DEMO}`;

/** Lo que ve Ana en el enlace: recién enviado, registrado y despachado. */
export const ESTADO_ENVIADO = estadoComprador({ estado: "enviado", items, despachadoEn: null, tienda: { nombre: TIENDA_DEMO.nombre, nombreVendedora: null, rubro: "general" } } as unknown as Parameters<typeof estadoComprador>[0]);
export const ESTADO_DESPACHADO = estadoComprador({ estado: "despachado", items, despachadoEn: null, tienda: { nombre: TIENDA_DEMO.nombre, nombreVendedora: null, rubro: "general" } } as unknown as Parameters<typeof estadoComprador>[0]);
export const ESTADO_CONFIRMADO = estadoComprador({ estado: "confirmado", items, despachadoEn: null, tienda: { nombre: TIENDA_DEMO.nombre, nombreVendedora: null, rubro: "general" } } as unknown as Parameters<typeof estadoComprador>[0]);

/** La vista previa del enlace (app/pedido/[codigo]/page.tsx y lib/tienda/render-imagen-pedido.tsx). */
export const VISTA_PREVIA_DEMO = {
  titulo: `Tu pedido con ${TIENDA_DEMO.nombre}`,
  descripcion: `${PEDIDO_DEMO.length} ${PEDIDO_DEMO.length === 1 ? "producto" : "productos"} · ${dinero(TOTAL_DEMO)}`,
  dominio: new URL(ORIGEN_DEMO).host,
};
