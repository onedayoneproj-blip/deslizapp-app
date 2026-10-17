// Las preguntas frecuentes de /planes (docs/prompts/planes-incluye-y-preguntas.md §2, opción E2 del tablero «Preguntas frecuentes
// con respuestas rápidas»). Una sola lista: el chat, el HTML legible por lectores de pantalla y el FAQPage de los buscadores salen
// de aquí. Puro: tests/planes.test.mjs.
//
// Los textos que dependen de reglas del producto dicen solo lo que cuenta hoy el código:
// - «¿Qué cuenta como producto publicado?»: lo mismo que el texto de /planes. El cupo todavía cuenta los agotados visibles
//   (docs/14); cuando llegue la regla nueva de suscripciones, se cambia aquí.
// - «¿Cobran comisión por cada venta?»: «hoy», porque si algún día hay pasarela de pagos podría haber comisión. No se promete «nunca».

export type PreguntaPlanes = { id: string; pregunta: string; respuesta: string };

export const PREGUNTAS_PLANES: PreguntaPlanes[] = [
  {
    id: "tarjeta",
    pregunta: "¿Necesito tarjeta para probar?",
    respuesta: "No 🙌 Los 30 días de prueba son gratis y no te pedimos tarjeta. Si te quedas, pagas por transferencia.",
  },
  {
    id: "treinta-dias",
    pregunta: "¿Qué pasa cuando terminan los 30 días?",
    respuesta:
      "Te avisamos 3 días antes. Eliges tu plan, transfieres y nos mandas la captura, y tu tienda sigue igual. Si no pagas, tienes unos días de margen antes de que el catálogo se pause. No se borra nada.",
  },
  {
    id: "publicado",
    pregunta: "¿Qué cuenta como producto publicado?",
    respuesta: "Los productos que tienes visibles en tu catálogo. Los que ocultas no ocupan cupo.",
  },
  {
    id: "descargar",
    pregunta: "¿Mis clientes tienen que descargar algo?",
    respuesta: "Nada. Tocan el link de tu bio o de tus estados y el catálogo se abre ahí mismo, también dentro de Instagram.",
  },
  {
    id: "comision",
    pregunta: "¿Cobran comisión por cada venta?",
    respuesta: "No. Hoy el pedido te llega por WhatsApp y el pago lo arreglas tú con tu cliente, así que no cobramos nada por venta.",
  },
  {
    id: "cambiar",
    pregunta: "¿Puedo cambiar de plan?",
    respuesta: "Claro. Si subes, pagas solo la diferencia por los días que quedan. Si bajas, el cambio se aplica cuando renuevas.",
  },
  {
    id: "anual",
    pregunta: "¿Cómo funciona el pago anual?",
    respuesta: "Pagas 10 meses y te llevas 12. El precio queda fijo todo el año y te avisamos 30 días antes de renovar.",
  },
  {
    id: "circulo",
    pregunta: "¿Qué es el Círculo Deslizapp?",
    respuesta:
      "El grupo de las primeras tiendas 💚 Entran por invitación y, pagando el año, tienen 30 % menos el primer año, funciones antes que nadie, regalos y el aro en su tienda para siempre.",
  },
  {
    id: "productos",
    pregunta: "¿Quién sube los productos?",
    respuesta: "Tú, desde el teléfono: foto, precio y listo. Nosotros te ayudamos a dejar lista tu marca: colores, frases y portada.",
  },
];

/** Los datos estructurados `FAQPage` (schema.org) con las mismas preguntas y respuestas que el chat. */
export function faqPageJsonLd(preguntas: PreguntaPlanes[] = PREGUNTAS_PLANES) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: preguntas.map((p) => ({
      "@type": "Question",
      name: p.pregunta,
      acceptedAnswer: { "@type": "Answer", text: p.respuesta },
    })),
  };
}
