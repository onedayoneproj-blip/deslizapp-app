import { analizarClientes, type ClienteAnalizado } from "./clientes-resumen.ts";
import { enlaceCatalogo } from "./enlace-catalogo.ts";
import type { ClienteConResumen, Pedido } from "./types";

export type IdJugada = "volver" | "segundo" | "gracias" | "primer";
export type Jugada = { id: IdJugada; nombre: string; descripcion: string; consejo: string; explicacion: string; imagen: string; color: string; clientes: ClienteAnalizado[]; cantidad: number; porcentaje: number };

const DEFINICIONES: Omit<Jugada, "clientes" | "cantidad" | "porcentaje">[] = [
  { id: "volver", nombre: "Volver a saludar", descripcion: "Retoma la conversación con quienes llevan tiempo sin comprar.", consejo: "Un hola a tiempo. Si tienes algo nuevo en tu catálogo, puedes mostrárselo.", explicacion: "lleva 60 días o más sin comprar.", imagen: "/ilustraciones/proxima-jugada/volver-a-saludar.webp", color: "#e3eee6" },
  { id: "segundo", nombre: "Segundo aaah", descripcion: "Invita a descubrir su próxima compra.", consejo: "Un saludo cercano puede abrir la puerta a su segunda compra.", explicacion: "hizo una sola compra.", imagen: "/ilustraciones/proxima-jugada/segundo-aaah.webp", color: "#f9e1e9" },
  { id: "gracias", nombre: "Gracias por volver", descripcion: "Reconoce a quienes vuelven por más.", consejo: "Agradece su preferencia. A veces eso basta para seguir conversando.", explicacion: "ha comprado dos veces o más.", imagen: "/ilustraciones/proxima-jugada/gracias-por-volver.webp", color: "#f2e5d3" },
  { id: "primer", nombre: "El primer hola", descripcion: "Acércate a quienes aún no compran.", consejo: "Preséntate sin presión y deja que conozcan tu tienda.", explicacion: "todavía no ha comprado.", imagen: "/ilustraciones/proxima-jugada/primer-hola.webp", color: "#f8ded0" },
];
/** Las cuatro cartas del mazo, siempre en el mismo orden (aunque una jugada no tenga clientes). */
export const CARTAS_JUGADAS = DEFINICIONES.map((d) => ({ id: d.id, imagen: d.imagen, color: d.color }));
const PRIORIDAD: IdJugada[] = ["volver", "primer", "segundo", "gracias"];
const DIA = 86400000;
export const diasDesde = (fecha: number | null, ahora: number) => fecha === null ? null :
  Math.max(0, Math.floor((ahora - 4 * 3600000) / DIA) - Math.floor((fecha - 4 * 3600000) / DIA));

/** Solo datos de la tienda activa. Una persona puede pertenecer a varios grupos. */
export function calcularJugadas(clientes: ClienteConResumen[], pedidos: Pedido[], tiendaId: string, ahora: number) {
  const resumen = analizarClientes(clientes, pedidos, tiendaId, ahora);
  const ocupados = new Set(pedidos.filter((p) => p.tiendaId === tiendaId &&
    (p.estado === "nuevo" || p.estado === "por_despachar") && p.clienteId).map((p) => p.clienteId));
  const disponibles = resumen.lista.filter((c) => !ocupados.has(c.id));
  const nombre = (a: ClienteAnalizado, b: ClienteAnalizado) => a.nombre.localeCompare(b.nombre, "es");
  const jugadas: Jugada[] = DEFINICIONES.map((d) => {
    const lista = disponibles.filter((c) => d.id === "volver" ? c.dormido : d.id === "segundo" ? c.compras === 1 : d.id === "gracias" ? c.compras >= 2 : c.compras === 0);
    lista.sort((a, b) => (d.id === "volver" ? (a.ultimaVenta ?? 0) - (b.ultimaVenta ?? 0) :
      d.id === "segundo" ? (b.ultimaVenta ?? 0) - (a.ultimaVenta ?? 0) :
      d.id === "gracias" ? b.compras - a.compras : 0) || nombre(a, b));
    return { ...d, clientes: lista, cantidad: lista.length, porcentaje: resumen.cuentas.todos ? Math.round(lista.length * 100 / resumen.cuentas.todos) : 0 };
  }).filter((j) => j.cantidad > 0);
  const destacada = [...jugadas].sort((a, b) => b.cantidad - a.cantidad || PRIORIDAD.indexOf(a.id) - PRIORIDAD.indexOf(b.id))[0] ?? null;
  return { jugadas, destacada, total: resumen.cuentas.todos };
}

export function mensajeJugada(id: IdJugada, cliente: string, vendedora: string, tienda: string, urlCatalogo?: string | null) {
  const saludo = `¡Hola, ${cliente}! Soy ${vendedora.trim() || "del equipo"} de ${tienda.trim() || "la tienda"}.`;
  const textos: Record<IdJugada, string> = {
    volver: "Hace tiempo que no conversamos y quise saludarte. Si quieres ver qué hay de nuevo, aquí estoy.",
    segundo: "Gracias por tu primera compra. Si te apetece volver a mirar, aquí estoy para ayudarte.",
    gracias: "Gracias por volver a elegirnos. Me alegra contar contigo y quería decírtelo.",
    primer: "Quería saludarte y presentarte nuestra tienda. Si quieres conocer lo que tenemos, aquí estoy.",
  };
  const enlace = enlaceCatalogo(urlCatalogo)?.href;
  return `${saludo} ${textos[id]}${enlace ? ` Puedes ver el catálogo aquí: ${enlace}` : ""}`;
}

/** Tres textos locales para revisar antes de abrir WhatsApp; ningún envío ocurre aquí. */
export function borradoresJugada(id: IdJugada, cliente: string, vendedora: string, tienda: string, urlCatalogo?: string | null) {
  const nombre = cliente.trim() || "¡Hola!";
  const firma = vendedora.trim() ? `Soy ${vendedora.trim()} de ${tienda.trim() || "la tienda"}.` : `Te escribo de ${tienda.trim() || "la tienda"}.`;
  const inicio = `¡Hola, ${nombre}! ${firma}`;
  const frases: Record<IdJugada, [string, string, string]> = {
    volver: ["Hace tiempo que no conversamos y me dieron ganas de saludarte. ¿Cómo estás?", "Quería saber si puedo ayudarte con algo de la tienda.", "Si quieres echar un vistazo a nuestro catálogo, te lo dejo por aquí."],
    segundo: ["Gracias por tu primera compra. Quería saludarte y saber cómo estás.", "Gracias por comprar en nuestra tienda. Si necesitas algo más, puedes escribirme.", "Si te apetece mirar el catálogo otra vez, aquí lo tienes."],
    gracias: ["Gracias por volver a elegirnos. Quería saludarte y agradecerte la confianza.", "Gracias por comprar de nuevo en nuestra tienda. Aquí estoy si necesitas algo.", "Agradezco que vuelvas. Si quieres mirar nuestro catálogo, te lo comparto."],
    primer: ["Quería saludarte y presentarte nuestra tienda. ¿Cómo estás?", "Te escribo para presentarme. Si necesitas ayuda con la tienda, aquí estoy.", "Si quieres conocer lo que tenemos, te comparto el catálogo."],
  };
  const enlace = enlaceCatalogo(urlCatalogo)?.href;
  const sinEnlace: Record<IdJugada, string> = {
    volver: "Si quieres ver lo que tenemos en la tienda, dime y te ayudo.",
    segundo: "Si quieres conocer más de la tienda, escríbeme y te ayudo.",
    gracias: "Si algún día quieres mirar lo que tenemos, estaré aquí para ayudarte.",
    primer: "Si quieres conocer nuestra tienda, dime y te cuento más.",
  };
  return (["Cercano", "Directo", enlace ? "Mirar el catálogo" : "Conocer la tienda"] as const).map((tono, i) => ({
    tono, texto: `${inicio} ${i === 2 && !enlace ? sinEnlace[id] : frases[id][i]}${i === 2 && enlace ? ` ${enlace}` : ""}`,
  }));
}

/** La línea de la Tarjeta de jugada: quiénes y qué hacer, sin porcentajes ("4 clientes compraron una vez. Invítalos a volver."). */
export function lineaJugada(id: IdJugada, cantidad: number): string {
  const uno = cantidad === 1;
  const n = `${cantidad} ${uno ? "cliente" : "clientes"}`;
  switch (id) {
    case "volver":
      return `${n} ${uno ? "lleva" : "llevan"} tiempo sin comprar. ${uno ? "Salúdalo" : "Salúdalos"} de nuevo.`;
    case "segundo":
      return `${n} ${uno ? "compró" : "compraron"} una vez. ${uno ? "Invítalo" : "Invítalos"} a volver.`;
    case "gracias":
      return `${n} ${uno ? "volvió" : "volvieron"} por más. Dales las gracias.`;
    case "primer":
      return `${n} ${uno ? "espera" : "esperan"} su primer hola. ${uno ? "Escríbele" : "Escríbeles"} sin presión.`;
  }
}
