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
