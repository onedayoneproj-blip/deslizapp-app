// El pedido ficticio de la landing (deslizapp.com): una sola fuente para precios, cantidades, fotos, mensajes y vistas.
// Tienda, compradora, productos y precios son inventados (referencias/landing/HANDOFF_DESLIZAPP.md §4). El mensaje de WhatsApp
// y el estado que ve la compradora salen de las mismas funciones que usa el catálogo real.

import { estadoComprador } from "../pedido-catalogo";
import { dinero, mensajePedido } from "../tienda/carrito";
import type { CatalogoPublico } from "../types";

export type ProductoDemo = {
  id: string;
  nombre: string;
  precio: number;
  cantidad: number;
  /** Foto grande (WebP con transparencia, 720 px) y miniatura (160 px), en public/landing. */
  foto: string;
  mini: string;
  /** Fondo de la tarjeta del feed (tokens de marca). */
  fondo: string;
  likes: number;
};

export const TIENDA_DEMO = { nombre: "La Vuelta", inicial: "V" };
export const COMPRADORA_DEMO = { nombre: "Ana", inicial: "A" };

/** Mismo formato que los códigos reales (lib/tienda/imagen-pedido.ts `codigoPedidoValido`): 10 caracteres sin 0, 1, I ni O. */
export const CODIGO_DEMO = "LV4K7Q2MZA";
/** Número del pedido en el panel de la tienda (los pedidos se numeran por tienda). */
export const NUMERO_PEDIDO_DEMO = 27;
/** Dominio que se ve en el mensaje. Es ilustrativo: en la landing no es un enlace. */
export const ORIGEN_DEMO = "https://deslizapp.com";
export const HORA_DEMO = "3:42 p. m.";

export const PRODUCTOS_DEMO: ProductoDemo[] = [
  { id: "gorra", nombre: "Gorra verde", precio: 650, cantidad: 1, foto: "/landing/gorra-verde.webp", mini: "/landing/gorra-verde-mini.webp", fondo: "var(--marca-rosa-fija)", likes: 38 },
  { id: "termo", nombre: "Termo rosado", precio: 950, cantidad: 1, foto: "/landing/termo-rosado.webp", mini: "/landing/termo-rosado-mini.webp", fondo: "var(--accion-suave)", likes: 52 },
  { id: "tote", nombre: "Tote bag crema y verde", precio: 550, cantidad: 1, foto: "/landing/tote-crema-verde.webp", mini: "/landing/tote-crema-verde-mini.webp", fondo: "var(--superficie-hundida)", likes: 41 },
];

export const TOTAL_DEMO = PRODUCTOS_DEMO.reduce((t, p) => t + p.precio * p.cantidad, 0);
export const UNIDADES_DEMO = PRODUCTOS_DEMO.reduce((t, p) => t + p.cantidad, 0);

/** Total acumulado después de agregar los primeros `n` productos a la bolsa. */
export const totalHasta = (n: number) => PRODUCTOS_DEMO.slice(0, n).reduce((t, p) => t + p.precio * p.cantidad, 0);

export const pesos = dinero;

// Lo mínimo de la tienda que leen mensajePedido y estadoComprador; el resto del catálogo público no aplica a la demo.
const tiendaMensaje = { nombre: TIENDA_DEMO.nombre, nombreVendedora: null, personalizacion: {}, rubro: "general" } as unknown as CatalogoPublico["tienda"];

const items = PRODUCTOS_DEMO.map((p) => ({ nombre: p.nombre, varianteTexto: null, cantidad: p.cantidad, precioUnitario: p.precio, porEncargo: false }));

/** El texto que arma el catálogo al tocar «Enviar por WhatsApp» (components/tienda/catalogo.tsx). */
export const MENSAJE_DEMO = mensajePedido(tiendaMensaje, items, TOTAL_DEMO, { codigo: CODIGO_DEMO, origen: ORIGEN_DEMO });
export const ENLACE_DEMO = `${ORIGEN_DEMO}/pedido/${CODIGO_DEMO}`;

/** Lo que ve Ana en el enlace: recién enviado y después de que la tienda lo registra. */
export const ESTADO_ENVIADO = estadoComprador({ estado: "enviado", items, despachadoEn: null, tienda: { nombre: TIENDA_DEMO.nombre, nombreVendedora: null, rubro: "general" } } as unknown as Parameters<typeof estadoComprador>[0]);
export const ESTADO_CONFIRMADO = estadoComprador({ estado: "confirmado", items, despachadoEn: null, tienda: { nombre: TIENDA_DEMO.nombre, nombreVendedora: null, rubro: "general" } } as unknown as Parameters<typeof estadoComprador>[0]);

/** La vista previa del enlace (app/pedido/[codigo]/page.tsx y lib/tienda/render-imagen-pedido.tsx). */
export const VISTA_PREVIA_DEMO = {
  titulo: `Tu pedido con ${TIENDA_DEMO.nombre}`,
  descripcion: `${PRODUCTOS_DEMO.length} ${PRODUCTOS_DEMO.length === 1 ? "producto" : "productos"} · ${dinero(TOTAL_DEMO)}`,
  dominio: new URL(ORIGEN_DEMO).host,
};
