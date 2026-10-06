import type { AsuntoAdmin } from "./tipos";

const cantidad = (asunto: AsuntoAdmin) => Number(asunto.datos.cantidad ?? 0);

export function textoAsunto(asunto: AsuntoAdmin) {
  const nombre = asunto.tiendaNombre ?? "La tienda";
  const d = asunto.datos;
  switch (asunto.regla) {
    case "pago_vencido": return { titulo: `${nombre} no ha pagado`, motivo: `Venció hace ${d.dias_vencida ?? 0} días.`, accion: "Escribirle" };
    case "prueba_termina": return { titulo: `La prueba de ${nombre} termina pronto`, motivo: `Termina en ${d.dias ?? 0} días.`, accion: "Escribirle" };
    case "vence_pronto": return { titulo: `${nombre} vence pronto`, motivo: `Su plan vence en ${d.dias ?? 0} días.`, accion: "Recordarle" };
    case "solicitudes": return { titulo: `${nombre} tiene solicitudes sin registrar`, motivo: `${cantidad(asunto)} pedidos del catálogo esperan revisión.`, accion: "Avisarle" };
    case "catalogo_solicitado": return { titulo: `${nombre} pidió su catálogo`, motivo: "Lleva varios días esperando que lo empecemos.", accion: "Empezar" };
    case "catalogo_cambios": return { titulo: `${nombre} pidió cambios`, motivo: String(d.notas ?? "Revisa lo que necesita ajustar."), accion: "Ver cambios" };
    case "catalogo_generando": return { titulo: `El catálogo de ${nombre} está en proceso`, motivo: `Paso ${d.paso ?? 1} sin avanzar.`, accion: "Seguir" };
    case "fotos": return { titulo: `${nombre} tiene fotos para retocar`, motivo: "Una foto espera al equipo.", accion: "Retocar" };
    case "sin_pedidos": return { titulo: `El catálogo de ${nombre} está tranquilo`, motivo: "No registra pedidos recientes.", accion: "Escribirle" };
    case "sin_entrar": return { titulo: `${nombre} no ha entrado últimamente`, motivo: "Quizá necesita un empujón.", accion: "Escribirle" };
    case "prueba_sin_productos": return { titulo: `${nombre} todavía no tiene productos`, motivo: "Está en prueba y puede necesitar ayuda.", accion: "Escribirle" };
    case "plataforma": return { titulo: "El almacenamiento pide atención", motivo: "Revisa el uso del proyecto.", accion: "Ver salud" };
    default: return { titulo: nombre, motivo: "Revisa esta tienda.", accion: "Ver tienda" };
  }
}

export function mensajeWhatsApp(asunto: AsuntoAdmin) {
  const vendedora = asunto.vendedora?.trim();
  const nombre = asunto.tiendaNombre ?? "";
  switch (asunto.regla) {
    case "pago_vencido": return `¡Hola${vendedora ? `, ${vendedora}` : ""}! Quería revisar contigo el pago de ${nombre}. Si ya lo hiciste, mándame el comprobante y lo actualizo.`;
    case "prueba_termina": return `¡Hola${vendedora ? `, ${vendedora}` : ""}! Tu prueba de Deslizapp está por terminar. ¿Quieres que revisemos juntas el siguiente paso?`;
    case "vence_pronto": return `¡Hola${vendedora ? `, ${vendedora}` : ""}! Tu plan de Deslizapp vence pronto. Si ya pagaste, mándame el comprobante y te ayudo.`;
    case "solicitudes": return `¡Hola${vendedora ? `, ${vendedora}` : ""}! Vi que tienes pedidos del catálogo esperando por registrar. ¿Te ayudo con alguno?`;
    case "sin_pedidos": return `¡Hola${vendedora ? `, ${vendedora}` : ""}! ¿Cómo te ha ido con el catálogo de ${nombre}? Si necesitas una mano, aquí estoy.`;
    default: return mensajeGeneralTienda(nombre, vendedora);
  }
}

export function mensajeGeneralTienda(tienda: string, vendedora?: string | null) {
  const saludo = vendedora?.trim();
  return `¡Hola${saludo ? `, ${saludo}` : ""}! ¿Cómo va todo con ${tienda}? Si necesitas una mano con Deslizapp, aquí estoy.`;
}

/** Abre la conversación con texto editable; WhatsApp no envía el mensaje por sí solo. */
export function enlaceWhatsAppAdmin(numero: string | null | undefined, texto: string) {
  const digitos = numero?.replace(/\D/g, "") ?? "";
  return digitos ? `https://wa.me/${digitos}?text=${encodeURIComponent(texto)}` : null;
}

/** «Recordarle»: el catálogo está listo para que ella lo revise y lo publique (publicar lo toca ella). */
export function mensajeRevisarCatalogo(tienda: string, vendedora?: string | null) {
  const saludo = vendedora?.trim();
  return `¡Hola${saludo ? `, ${saludo}` : ""}! Tu catálogo de ${tienda} está listo para que lo mires. Ábrelo en Deslizapp, pestaña Catálogo: si te gusta, lo publicas tú; si quieres cambiar algo, me lo dices ahí mismo.`;
}
