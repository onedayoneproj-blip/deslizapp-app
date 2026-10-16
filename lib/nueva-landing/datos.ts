// Datos de la página de revisión /nueva-landing. No sustituye a / ni a /conoce.
// Precios de este mockup (el encargo): no son los de docs/14 ni los de la base.

import { enlaceWhatsApp, formatearPesos } from "../formato";
import { RUTA_CONOCE } from "../landing/enlaces";
import { mensajePedido } from "../tienda/carrito";
import type { CatalogoPublico } from "../types";

/** Titular pedido para el hero, tal cual. */
export const TITULAR = "Tus clientes ya te escriben por WhatsApp. DeslizApp convierte esas conversaciones en pedidos.";

/** Bajada del hero, tal cual. */
export const SUBTITULAR = "Sigue vendiendo por WhatsApp. Lleva tus pedidos, clientes, inventario y cobros con más orden.";

export const CIERRE_TITULAR = "¿Listo para vender con más orden?";
export const CIERRE_TEXTO = "Escríbenos por WhatsApp y te contamos cómo entrar.";
export const CIERRE_INVITACION = "Las tiendas entran por invitación. Si hay lugar, te lo decimos por aquí.";

export const PISTA_DESLIZA = "Desliza";
export const PISTA_AAAH = "Toca dos veces para dar aaah";

/** La demo pública que ya existe (un pedido de punta a punta). */
export const RUTA_DEMO = RUTA_CONOCE;

/** «Iniciar sesión» vuelve a la página principal, que ya tiene la entrada con Google. */
export const RUTA_ENTRAR_LANDING = "/";

/**
 * PLACEHOLDER — Lewis: reemplaza este valor por tu WhatsApp antes de publicar.
 * Solo dígitos, formato internacional, sin «+» ni espacios. Ejemplo: "18095551234".
 * 18090000000 no es un número de Lewis. Mientras siga así, los botones lo marcan en el DOM
 * con data-whatsapp-lewis="placeholder".
 */
export const WHATSAPP_LEWIS = "18090000000";

export const WHATSAPP_LEWIS_ES_PLACEHOLDER = WHATSAPP_LEWIS === "18090000000";

export const MENSAJE_QUIERO_VENDER = "Hola, quiero vender con deslizapp. ¿Me cuentas cómo entro?";

export function enlaceQuieroVender(): string {
  return enlaceWhatsApp(WHATSAPP_LEWIS, MENSAJE_QUIERO_VENDER);
}

export type ProductoLanding = {
  id: string;
  nombre: string;
  precio: number;
  /** Foto ya publicada del feed de la landing (public/landing). */
  foto: string;
  alt: string;
};

/** Los tres productos inventados de la landing. No son de una tienda real. */
export const PRODUCTOS_LANDING: ProductoLanding[] = [
  { id: "termo", nombre: "Termo rosado", precio: 950, foto: "/landing/feed-termo.webp", alt: "Termo rosado sobre fondo rosa" },
  { id: "tote", nombre: "Tote bag crema y verde", precio: 550, foto: "/landing/feed-tote.webp", alt: "Tote bag crema y verde sobre fondo arena" },
  { id: "gorra", nombre: "Gorra verde", precio: 650, foto: "/landing/feed-gorra.webp", alt: "Gorra verde sobre fondo rosa" },
];

/** Mismo formato que un código real, pero es de muestra: el mensaje no se envía y el enlace no abre un pedido. */
export const CODIGO_MUESTRA = "MUESTRA4K7";
export const ORIGEN_MUESTRA = "https://deslizapp.com";
export const ENLACE_MUESTRA = `${ORIGEN_MUESTRA}/pedido/${CODIGO_MUESTRA}`;

const tiendaMuestra = {
  nombre: "Tu Tienda",
  nombreVendedora: null,
  personalizacion: {},
  rubro: "general",
} as unknown as CatalogoPublico["tienda"];

/** El texto que armaría el catálogo real, con los productos a los que se les dio aaah, en ese orden. */
export function mensajeMuestra(elegidos: ProductoLanding[]): string {
  const items = elegidos.map((p) => ({
    nombre: p.nombre,
    varianteTexto: null,
    cantidad: 1,
    precioUnitario: p.precio,
    porEncargo: false,
  }));
  const total = elegidos.reduce((suma, p) => suma + p.precio, 0);
  return mensajePedido(tiendaMuestra, items, total, { codigo: CODIGO_MUESTRA, origen: ORIGEN_MUESTRA });
}

export type PlanLanding = {
  id: "inicial" | "negocio" | "pro";
  nombre: string;
  mensual: number;
  /** 10 meses por 12. */
  anual: number;
  limites: string[];
  destacado?: string;
};

export const PLANES_LANDING: PlanLanding[] = [
  {
    id: "inicial",
    nombre: "Inicial",
    mensual: 499,
    anual: 4_990,
    limites: ["30 publicaciones activas", "1 tienda", "1 usuario"],
  },
  {
    id: "negocio",
    nombre: "Negocio",
    mensual: 999,
    anual: 9_990,
    limites: ["150 publicaciones activas compartidas", "Hasta 3 tiendas", "5 usuarios"],
    destacado: "Para cuando ya camina",
  },
  {
    id: "pro",
    nombre: "Pro",
    mensual: 1_499,
    anual: 14_990,
    limites: ["Límites altos, sujetos a uso razonable", "Varias tiendas"],
  },
];

/** Lo que traen los tres, dicho una sola vez debajo de las tarjetas. */
export const INCLUYE_TODOS = "En los tres: catálogo, pedido por WhatsApp, panel de pedidos y gestión esencial de clientes.";

export const NOTA_ACTIVAS = "Solo cuentan las publicaciones activas. Lo que guardas sin publicar no suma.";

export const NOTA_FUNDADORAS = "Las tiendas fundadoras prueban 30 días.";

export const NOTA_ANUAL = "Al año pagas 10 meses y usas 12.";

export type PeriodoPlan = "mes" | "ano";

export function montoPlan(plan: PlanLanding, periodo: PeriodoPlan): number {
  return periodo === "ano" ? plan.anual : plan.mensual;
}

export function textoPrecio(plan: PlanLanding, periodo: PeriodoPlan): string {
  const monto = formatearPesos(montoPlan(plan, periodo));
  return periodo === "ano" ? `${monto}/año` : `${monto}/mes`;
}
