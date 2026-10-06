// Textos claros para los códigos que devuelven las RPC del admin (y la demo, que usa los mismos).

const TEXTOS: Record<string, string> = {
  no_admin: "Tu sesión de admin terminó. Vuelve a entrar.",
  tienda_no_encontrada: "Esa tienda ya no está disponible.",
  producto_no_encontrado: "La tienda retiró ese producto. Devuélvela con ese motivo.",
  foto_no_encontrada: "La tienda cambió esa foto mientras esperaba. No se reemplazó nada ni se cobró: devuélvela.",
  trabajo_no_encontrado: "Ese trabajo ya no está.",
  trabajo_no_pendiente: "Esa foto ya se atendió (quizá desde otra pestaña).",
  enlace_invalido: "El enlace tiene que empezar con https://.",
  catalogo_sin_enlace: "Falta el enlace del catálogo.",
  catalogo_estado_invalido: "Ese catálogo cambió de etapa. Vuelve a cargar.",
  motivo_invalido: "Escribe un motivo corto (hasta 200 letras).",
  personalizacion_invalida: "Hay algo que no se puede guardar. Revisa lo que cambiaste.",
  creditos_insuficientes: "A la tienda no le alcanzan los créditos.",
  formato_no_permitido: "Usa una foto JPG, PNG o WebP.",
  archivo_muy_grande: "Esa foto pesa demasiado. Prueba con una más liviana.",
  subida_fallida: "No se pudo subir la foto. Revisa la conexión e inténtalo otra vez.",
};

export function codigoError(e: unknown): string | null {
  if (e && typeof e === "object" && "codigo" in e && typeof e.codigo === "string") return e.codigo;
  return null;
}

/** ¿Un código que conocemos? Si no, la respuesta pudo perderse en la red y hay que volver a leer antes de decir nada. */
export function errorConocido(e: unknown): boolean {
  const c = codigoError(e);
  return !!c && c in TEXTOS;
}

export function textoErrorAdmin(e: unknown, porDefecto = "No se pudo guardar. Inténtalo otra vez."): string {
  const c = codigoError(e);
  return (c && TEXTOS[c]) || porDefecto;
}
