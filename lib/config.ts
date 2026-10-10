import type { Plan } from "./types";

// Constantes de negocio. Si cambia una regla, cambia aquí y en ningún otro lado.

/** Créditos que cuesta retocar una foto. */
export const CREDITOS_POR_RETOQUE = 5;

/** Saldo mensual de créditos de retoque (20 fotos × 5 créditos), igual en todos los planes. */
export const CREDITOS_RETOQUE_MENSUALES = 100;

/** Límite de productos por plan. `custom` usa el número pactado en `tiendas.limite_productos`. */
export const LIMITE_PRODUCTOS_POR_PLAN: Record<Exclude<Plan, "custom">, number> = {
  p20: 20,
  p60: 60,
  p100: 100,
};

/** Nombre visible del plan. */
export const NOMBRE_PLAN: Record<Plan, string> = {
  p20: "Plan 20",
  p60: "Plan 60",
  p100: "Plan 100",
  custom: "Plan a medida",
};

/** "Ojo con el stock" del Resumen: productos con stock contado menor o igual a esto (0 = agotado). */
export const STOCK_BAJO = 2;

/** Zona horaria en la que se muestran las fechas (UTC-4). */
export const ZONA_HORARIA = "America/Santo_Domingo";

/** Lado máximo (px) de las fotos subidas en la demo, para no reventar localStorage. */
export const FOTO_LADO_MAXIMO = 800;

/**
 * WhatsApp de Deslizapp para cambiar de plan o pedir más créditos, en formato internacional sin "+"
 * (ej. "18095550000"). Vacío = WhatsApp abre con el mensaje listo y la persona elige el contacto.
 */
export const WHATSAPP_DESLIZAPP = "";
/** Cuenta de Instagram de Deslizapp (sin @): a donde lleva «Hablemos» en Mi marca mientras no haya WhatsApp. */
export const INSTAGRAM_DESLIZAPP = "deslizapp";

/**
 * "Hecho con Deslizapp" al pie de la imagen del cupón que se comparte (lib/imagen-promo.ts). Se deja discreto;
 * la constante permite quitarlo más adelante por plan.
 */
export const MOSTRAR_MARCA_DESLIZAPP_EN_CUPON = true;

/**
 * El retoque de fotos es real: la tienda manda la foto al taller (RPC `pedir_retoque`, reserva créditos), el equipo la entrega
 * desde el admin (se cobra al entregar) o la devuelve con un motivo (no se cobra). Ya no hay retoque de demostración ni etiqueta
 * "Demo" en la ficha.
 */
export const RETOQUE_REAL = true;

/**
 * El retoque es una función Beta: no es automático. Un modelo de inteligencia de imagen procesa la foto, asistido por expertos
 * en branding de Deslizapp que parten de la marca de la tienda; por eso tarda. Esta es la etiqueta que lo dice, en un solo sitio.
 */
export const ETIQUETA_RETOQUE_BETA = "Beta";

/**
 * Cuánto tarda, dicho como texto corto ("hasta 48 horas"). Vacío = no se muestra nada: todavía no se mide y no se inventa
 * (lo fija Lewis).
 */
export const TIEMPO_RETOQUE_TEXTO = "";

/**
 * ¿La app deja AGREGAR videos a un producto? Decisión de negocio temporal (7 oct 2026, Lewis): por ahora no, para cuidar el
 * almacenamiento y la salida de datos del plan gratis de Supabase y el peso del catálogo. Los videos que ya existen se siguen
 * viendo, reproduciendo, moviendo y quitando; solo se apaga el agregar.
 *
 * Para volver a abrirlo (probablemente solo desde cierto plan): poner esto en `true` y aplicar la migración inversa que
 * devuelve `video/mp4`, `video/webm` y `video/quicktime` a `allowed_mime_types` del bucket `productos` (ver HANDOFF.md).
 */
export const VIDEO_PERMITIDO = false;

/** Lo que acepta el selector de archivos de la ficha: con el video apagado, solo imágenes. */
export const tiposDeMedioElegibles = (videoPermitido: boolean = VIDEO_PERMITIDO) => (videoPermitido ? "image/*,video/*" : "image/*");

/** ¿Este archivo elegido es un video que la ficha debe preparar? Con el video apagado, ninguno (se ignora, no se sube). */
export const esVideoAgregable = (tipo: string, videoPermitido: boolean = VIDEO_PERMITIDO) => videoPermitido && tipo.startsWith("video/");

/**
 * Publicar el catálogo NO tiene mínimo (decisión de Lewis, 9 oct 2026; migración 20261009232947): se puede publicar vacío para ver
 * desde el día uno cómo se ve. Esto es solo una GUÍA: con menos productos visibles con foto, «Publicar» pide una confirmación suave
 * («Publicar igual» siempre funciona), y el paso «Agrega 5 productos» del checklist del onboarding se marca hecho con esta cantidad.
 */
export const PRODUCTOS_SUGERIDOS_PARA_PUBLICAR = 5;

/**
 * Base de la dirección del catálogo de cada tienda: `${URL_BASE_CATALOGO}/tienda/{slug}`. La pone la base al publicar
 * (`publicar_mi_catalogo`, constante `v_base`); la app solo la usa para MOSTRAR el enlace antes de publicar. tests/publicar-catalogo.test.mjs
 * comprueba que las dos coinciden.
 */
export const URL_BASE_CATALOGO = "https://deslizapp-app.vercel.app";
