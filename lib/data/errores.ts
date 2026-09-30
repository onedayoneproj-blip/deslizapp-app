// Errores de la capa de datos, con el mensaje que ve el dueño. Los lanzan igual la demo y Supabase,
// así las pantallas no saben de dónde vienen los datos. Sin imports de valores (solo tipos): se prueba
// directo con Node (tests/datos.test.mjs).

import type { ErroresPromo } from "../promos";
import type { Cliente } from "../types";

/** Un error cuyo `message` ya está escrito para el dueño de la tienda (se puede mostrar tal cual). */
export class ErrorClaro extends Error {}

/** Un producto del pedido no tiene stock para despacharlo (nunca se deja el stock en negativo). */
export class StockInsuficiente extends ErrorClaro {
  producto: string;
  /** Lo que sabe la demo; Supabase solo dice el nombre del producto. */
  productoId: string | null;
  disponibles: number | null;
  necesarios: number | null;
  constructor(producto: string, productoId: string | null = null, disponibles: number | null = null, necesarios: number | null = null) {
    super(`No hay stock suficiente de ${producto}.`);
    this.producto = producto;
    this.productoId = productoId;
    this.disponibles = disponibles;
    this.necesarios = necesarios;
  }
}

export class PedidoNoEncontrado extends ErrorClaro {
  constructor() {
    super("Ese pedido ya no existe en tu tienda.");
  }
}

export class PedidoNoDespachable extends ErrorClaro {
  constructor() {
    super("Ese pedido ya no está por despachar. Actualiza la lista.");
  }
}

export class PedidoNoEditable extends ErrorClaro {
  constructor() {
    super("Un pedido cancelado no se edita. Reábrelo primero.");
  }
}

export class SoloCancelados extends ErrorClaro {
  constructor() {
    super("Solo se pueden eliminar pedidos cancelados.");
  }
}

export class PedidoNoDeshacible extends ErrorClaro {
  constructor() {
    super("Ese pedido ya no está despachado. Actualiza la lista.");
  }
}

export class CreditosInsuficientes extends ErrorClaro {
  /** null si no se sabe (la RPC solo dice que no alcanzan). */
  disponibles: number | null;
  necesarios: number;
  constructor(disponibles: number | null, necesarios: number) {
    super(
      disponibles === null
        ? "No te alcanzan los créditos de retoque."
        : `No te alcanzan los créditos: tienes ${disponibles} y necesitas ${necesarios}.`,
    );
    this.disponibles = disponibles;
    this.necesarios = necesarios;
  }
}

/** Ya hay un cliente con ese WhatsApp en la tienda. */
export class ClienteDuplicado extends ErrorClaro {
  existente: Cliente;
  constructor(existente: Cliente) {
    super(`${existente.nombre} ya está en tus clientes con ese WhatsApp.`);
    this.existente = existente;
  }
}

/** La base rechazó un teléfono repetido; la capa de datos busca al cliente y lanza ClienteDuplicado. */
export class TelefonoDuplicado extends ErrorClaro {
  constructor() {
    super("Ya tienes un cliente con ese WhatsApp.");
  }
}

/** El formulario de la promo tiene errores (los mismos que ve el dueño). */
export class PromoInvalida extends ErrorClaro {
  errores: ErroresPromo;
  constructor(errores: ErroresPromo) {
    super(errores.codigo ?? "Revisa los campos marcados.");
    this.errores = errores;
  }
}

export class DatosInvalidos extends ErrorClaro {}

export class SinPermiso extends ErrorClaro {
  constructor() {
    super("Tu cuenta no tiene permiso para hacer eso.");
  }
}

export class SesionVencida extends ErrorClaro {
  constructor() {
    super("Tu sesión venció. Vuelve a entrar con Google.");
  }
}

export class ErrorDeRed extends ErrorClaro {
  constructor() {
    super("No hay conexión. Revisa tu internet e inténtalo otra vez.");
  }
}

export class ArchivoMuyGrande extends ErrorClaro {
  constructor() {
    super("Esa foto pesa demasiado (máximo 5 MB). Prueba con otra o más chica.");
  }
}

export class FormatoNoPermitido extends ErrorClaro {
  constructor() {
    super("Ese formato no sirve. Usa una foto JPG, PNG o WebP.");
  }
}

/** Algo que solo existe en la demo (simular un pedido, reiniciar los datos). */
export class SoloDemo extends ErrorClaro {
  constructor() {
    super("Eso solo se puede hacer en la demo.");
  }
}

// ---------------------------------------------------------------------------
// Errores de Supabase → errores claros
// ---------------------------------------------------------------------------

/** Lo que trae un error de supabase-js (PostgrestError / AuthError / TypeError de fetch). */
type ErrorCrudo = { message?: unknown; code?: unknown; details?: unknown; hint?: unknown; status?: unknown; name?: unknown };

const RED = /failed to fetch|networkerror|network request failed|load failed|fetch failed|err_internet|timed? ?out/i;

function texto(v: unknown): string {
  return typeof v === "string" ? v : "";
}

/** ¿Es un fallo de conexión (no de la base)? */
export function esErrorDeRed(e: unknown): boolean {
  if (e instanceof ErrorDeRed) return true;
  if (!e || typeof e !== "object") return false;
  const c = e as ErrorCrudo;
  return RED.test(`${texto(c.message)} ${texto(c.details)}`) || texto(c.name) === "AuthRetryableFetchError";
}

/**
 * Traduce un error de Supabase (RPC, tabla o auth) a un error de la app con un mensaje en español claro.
 * Los mensajes de las RPC vienen de supabase/migrations/20260929000002_reglas_de_negocio.sql.
 */
export function traducirErrorSupabase(e: unknown): Error {
  if (e instanceof ErrorClaro) return e;
  if (esErrorDeRed(e)) return new ErrorDeRed();
  if (!e || typeof e !== "object") return new Error(String(e));

  const c = e as ErrorCrudo;
  const mensaje = texto(c.message);
  const codigo = texto(c.code);
  const todo = `${mensaje} ${texto(c.details)} ${texto(c.hint)}`;

  // RPC despachar_pedido
  const stock = /stock_insuficiente:\s*([^]+)$/.exec(mensaje);
  if (stock) return new StockInsuficiente(stock[1]!.trim());
  if (mensaje.includes("pedido_no_encontrado")) return new PedidoNoEncontrado();
  // RPC registrar_venta_pasada
  if (mensaje.includes("fecha_invalida")) return new DatosInvalidos("Esa fecha no sirve: elige un día que ya pasó.");
  if (mensaje.includes("sin_productos")) return new DatosInvalidos("La venta necesita al menos un producto.");
  if (mensaje.includes("items_invalidos")) return new DatosInvalidos("Algún producto trae una cantidad o un precio que no sirve.");
  if (mensaje.includes("producto_no_encontrado")) return new DatosInvalidos("Un producto de la venta ya no existe en tu tienda.");
  if (mensaje.includes("cliente_no_encontrado")) return new DatosInvalidos("Ese cliente ya no existe en tu tienda.");
  if (mensaje.includes("tienda_no_encontrada")) return new DatosInvalidos("No encontramos tu tienda. Vuelve a entrar.");
  if (mensaje.includes("pedido_no_editable")) return new PedidoNoEditable();
  if (mensaje.includes("solo_cancelados")) return new SoloCancelados();
  if (mensaje.includes("pedido_no_deshacible")) return new PedidoNoDeshacible();
  if (mensaje.includes("pedido_no_despachable")) return new PedidoNoDespachable();
  // RPC gastar_creditos
  if (mensaje.includes("creditos_insuficientes")) return new CreditosInsuficientes(null, 0);
  if (mensaje.includes("cantidad_invalida")) return new DatosInvalidos("La cantidad de créditos no es válida.");

  // Únicos (23505)
  if (codigo === "23505") {
    if (todo.includes("promos_codigo_vigente")) return new PromoInvalida({ codigo: "Ya tienes ese código en una promo activa o programada." });
    if (todo.includes("clientes_telefono_unico")) return new TelefonoDuplicado();
    return new DatosInvalidos("Eso ya existe en tu tienda.");
  }
  // Reglas de la tabla (23514) y datos mal formados (22xxx)
  if (codigo === "23514") {
    if (todo.includes("url_catalogo")) return new DatosInvalidos("El enlace del catálogo debe empezar con https://.");
    if (todo.includes("marca_color")) return new DatosInvalidos("Ese color no es válido.");
    if (todo.includes("stock")) return new DatosInvalidos("El stock no puede quedar en negativo.");
    return new DatosInvalidos("Algún dato no es válido. Revísalo e inténtalo otra vez.");
  }
  if (codigo.startsWith("22")) return new DatosInvalidos("Algún dato no es válido. Revísalo e inténtalo otra vez.");

  // Storage (tamaño y formato del archivo)
  if (c.status === 413 || c.status === "413" || /maximum allowed size|payload too large|exceeded/i.test(mensaje)) return new ArchivoMuyGrande();
  if (c.status === 415 || c.status === "415" || /mime type|not supported|invalid.*type/i.test(mensaje)) return new FormatoNoPermitido();

  // Permisos y sesión
  if (codigo === "42501" || /permission denied|row-level security/i.test(mensaje)) return new SinPermiso();
  if (codigo === "PGRST301" || codigo === "PGRST303" || c.status === 401 || /jwt|refresh token/i.test(mensaje)) return new SesionVencida();

  const error = new Error(mensaje || "Error desconocido de Supabase");
  (error as Error & { cause?: unknown }).cause = e;
  return error;
}

/** El mensaje para el dueño: el del error si es claro; si no, `porDefecto`. */
export function mensajeDeError(e: unknown, porDefecto = "No se pudo. Inténtalo otra vez."): string {
  return e instanceof ErrorClaro ? e.message : porDefecto;
}
