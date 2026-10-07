// Errores de la capa de datos, con el mensaje que ve el dueño. Los lanzan igual la demo y Supabase,
// así las pantallas no saben de dónde vienen los datos. Sin imports de valores (solo tipos): se prueba
// directo con Node (tests/datos.test.mjs).

import type { ErroresPromo } from "../promos";
import type { Cliente } from "../types";
import { mensajeRubroEnUso } from "../rubros";

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

/** Un abono mayor que lo que se debe. `deuda` es lo que falta por pagar. */
export class MontoMayorQueDeuda extends ErrorClaro {
  deuda: number;
  constructor(deuda: number) {
    super(`Te debe RD$${deuda.toLocaleString("en-US")}; no puedes abonar más que eso.`);
    this.deuda = deuda;
  }
}

/** Un pedido con abonos no puede pasar a "Pagó todo" (primero se borran los abonos). */
export class PedidoConAbonos extends ErrorClaro {
  constructor() {
    super("Este pedido ya tiene abonos, así que no puede pasar a «Pagó todo». Borra primero sus abonos.");
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
/** La nota del cliente pasa de 60 caracteres (restricción `clientes_nota_largo`). */
export class NotaClienteLarga extends ErrorClaro {
  constructor() {
    super("La nota puede tener hasta 60 caracteres.");
  }
}

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

/** El código personal escrito a mano no sirve (formato o ya en uso): se muestra en el campo "Código". */
export class CodigoNoValido extends ErrorClaro {}

/** La función está apagada en lib/funciones.ts: no se llama a la base. */
export class FuncionApagada extends ErrorClaro {
  constructor() {
    super("Esto todavía no está disponible.");
  }
}

export const MENSAJE_CODIGO_EN_USO = "Ese código ya existe. Prueba otro.";
export const MENSAJE_CODIGO_FORMATO = "Usa de 3 a 15 letras o números, sin espacios.";

export class InventarioCambio extends ErrorClaro {
  constructor() { super("El stock cambió mientras ajustabas. Revisa la cantidad actual antes de guardar."); }
}

export const MENSAJE_SIN_PERMISO_NIVEL = "Esto lo hace quien administra la tienda.";
export const MENSAJE_SOLO_MIRAR = "Estás mirando esta tienda; aquí no se cambia nada. Sal de Ver como para editar.";

export class SinPermiso extends ErrorClaro {
  constructor(mensaje = "Tu cuenta no tiene permiso para hacer eso.") {
    super(mensaje);
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

/** Un producto con variantes se mueve por variante (talla, color…), no entero. */
export class UsarVariante extends ErrorClaro {
  constructor() {
    super("Este producto tiene variantes. Elige cuál: talla, color o la que sea.");
  }
}

/** Algo del catálogo ya no se puede pedir. `producto` = su nombre, si la base lo dijo. */
export class ProductoNoDisponible extends ErrorClaro {
  producto: string | null;
  constructor(producto: string | null = null) {
    super(producto ? `${producto} se acaba de ir. Quítalo y sigue con lo demás.` : "Eso ya no está disponible.");
    this.producto = producto;
  }
}

/** El catálogo de la tienda no está publicado (o la tienda está pausada). */
export class CatalogoNoDisponible extends ErrorClaro {
  constructor() {
    super("Este catálogo no está disponible ahora mismo.");
  }
}

/** Demasiados pedidos, aaahs o avisos seguidos desde el mismo lugar. */
export class DemasiadosIntentos extends ErrorClaro {
  constructor() {
    super("Ajá, muchos seguidos. Espera un ratito y vuelve a intentarlo.");
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
 * Los mensajes de las RPC vienen de supabase/migrations/20260929225916_reglas_de_negocio.sql.
 */
export function traducirErrorSupabase(e: unknown): Error {
  if (e instanceof ErrorClaro) return e;
  if (esErrorDeRed(e)) return new ErrorDeRed();
  if (!e || typeof e !== "object") return new Error(String(e));

  const c = e as ErrorCrudo;
  const mensaje = texto(c.message);
  const codigo = texto(c.code);
  const todo = `${mensaje} ${texto(c.details)} ${texto(c.hint)}`;

  if (mensaje.includes("stock_base_cambio")) return new InventarioCambio();
  // RPC ajustar_stock
  if (mensaje.includes("stock_negativo")) return new DatosInvalidos("El stock no puede quedar en negativo.");
  if (mensaje.includes("stock_sin_control")) return new DatosInvalidos("Este producto no lleva control de stock.");
  if (mensaje.includes("motivo_ajuste_invalido")) return new DatosInvalidos("El motivo no corresponde a este ajuste.");
  if (mensaje.includes("nota_ajuste_invalida")) return new DatosInvalidos("Escribe un motivo breve (máximo 200 caracteres).");
  if (mensaje.includes("stock_fuera_de_rango")) return new DatosInvalidos("Esa cantidad supera el límite permitido.");
  if (mensaje.includes("ajuste_producto_no_encontrado")) return new DatosInvalidos("Ese producto ya no existe en esta tienda.");
  if (mensaje.includes("ajuste_invalido")) return new DatosInvalidos("El ajuste debe cambiar al menos una unidad.");

  // «Lo que vendes» y el tipo de cada producto
  if (mensaje.includes("rubro_en_uso")) return new DatosInvalidos(mensajeRubroEnUso(texto(c.details).split(", ").filter(Boolean)));
  if (mensaje.includes("rubro_invalido") || mensaje.includes("rubros_invalidos")) return new DatosInvalidos("Ese tipo de producto no es de tu tienda.");

  // RPC crear_codigo_cliente y registrar_envio_jugada
  if (mensaje.includes("codigo_en_uso")) return new CodigoNoValido(MENSAJE_CODIGO_EN_USO);
  if (mensaje.includes("codigo_formato_invalido")) return new CodigoNoValido(MENSAJE_CODIGO_FORMATO);
  if (mensaje.includes("codigo_porcentaje_invalido")) return new DatosInvalidos("El descuento va de 1 % a 90 %.");
  if (mensaje.includes("codigo_dias_invalidos")) return new DatosInvalidos("El código puede durar de 1 a 90 días.");
  if (mensaje.includes("codigo_cliente_no_encontrado") || mensaje.includes("envio_cliente_no_encontrado")) return new DatosInvalidos("Ese cliente ya no está en tu tienda.");
  if (mensaje.includes("codigo_sin_nombre_libre")) return new CodigoNoValido("No encontramos un código libre con ese nombre. Escribe uno tú.");
  if (mensaje.includes("envio_codigo_invalido")) return new DatosInvalidos("Ese código no sirve para este cliente.");
  if (mensaje.includes("envio_productos_invalidos")) return new DatosInvalidos("Elige de 1 a 3 productos de tu tienda.");
  if (mensaje.includes("codigo_sin_sesion") || mensaje.includes("envio_sin_sesion")) return new SesionVencida();
  if (mensaje.includes("codigo_sin_permiso") || mensaje.includes("envio_sin_permiso")) return new SinPermiso();

  // RPC reponer_stock
  if (mensaje.includes("reposicion_vacia")) return new DatosInvalidos("Marca al menos un producto para sumar al stock.");
  if (mensaje.includes("reposicion_muy_grande")) return new DatosInvalidos("Son demasiados productos de una vez. Hazlo en dos tandas.");
  if (mensaje.includes("reposicion_invalida")) return new DatosInvalidos("Cada cantidad debe ser de 1 o más.");
  if (mensaje.includes("reposicion_repetida")) return new DatosInvalidos("Un producto aparece repetido en la lista.");

  // Catálogo conectado (migraciones 20261004…): variantes, catálogo público, solicitudes, aaahs y avisos
  if (mensaje.includes("disponibilidad_cambio")) return new DatosInvalidos("Cambió la disponibilidad. Revisa las existencias y decide qué quitar o pasar a encargo.");
  if (mensaje.includes("usar_variante")) return new UsarVariante();
  if (mensaje.includes("variante_invalida")) return new DatosInvalidos("Esa variante no corresponde a este producto. Revisa las opciones.");
  if (mensaje.includes("variantes_sin_permiso")) return new SinPermiso();
  if (mensaje.includes("detalles_invalidos")) return new DatosInvalidos("Algún detalle no sirve para este tipo de producto. Revísalo.");
  if (mensaje.includes("catalogo_no_disponible")) return new CatalogoNoDisponible();
  const noDisponible = /producto_no_disponible(?::\s*([^]+))?$/.exec(mensaje);
  if (noDisponible) return new ProductoNoDisponible(noDisponible[1]?.trim() || null);
  if (mensaje.includes("codigo_no_valido")) return new CodigoNoValido("Ese código no existe o ya no está activo.");
  if (mensaje.includes("demasiadas_solicitudes") || mensaje.includes("demasiados_aaah") || mensaje.includes("demasiados_avisos")) return new DemasiadosIntentos();
  if (mensaje.includes("solicitud_no_encontrada")) return new DatosInvalidos("No encontramos ese pedido. Revisa el enlace.");
  if (mensaje.includes("solicitud_no_registrable")) return new DatosInvalidos("Ese pedido ya se registró, se descartó o venció.");
  if (mensaje.includes("solicitud_sin_permiso") || mensaje.includes("aviso_sin_permiso")) return new SesionVencida();
  if (mensaje.includes("pedido_vacio")) return new DatosInvalidos("Quitaste todo. El pedido necesita al menos un producto.");
  if (mensaje.includes("aviso_no_disponible")) return new DatosInvalidos("Eso todavía está disponible: se puede pedir ya.");
  if (mensaje.includes("telefono_invalido")) return new DatosInvalidos("Escribe un WhatsApp dominicano: 809, 829 o 849 y siete números.");
  if (mensaje.includes("cliente_invalido")) return new DatosInvalidos("Revisa el nombre y el WhatsApp del cliente.");
  if (mensaje.includes("nombre_invalido")) return new DatosInvalidos("El nombre puede tener hasta 60 caracteres.");
  if (mensaje.includes("dispositivo_invalido")) return new DatosInvalidos("Algo falló de este lado. Recarga la página e inténtalo otra vez.");

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
  // RPC registrar_abono y eliminar_abono, y el pago de un pedido
  const mayor = /monto_mayor_que_deuda:\s*(\d+)/.exec(mensaje);
  if (mayor) return new MontoMayorQueDeuda(Number(mayor[1]));
  if (mensaje.includes("monto_mayor_que_deuda")) return new DatosInvalidos("Ese abono es más de lo que se debe.");
  if (mensaje.includes("monto_invalido")) return new DatosInvalidos("El monto del abono no es válido: escribe un número entero mayor que cero.");
  if (mensaje.includes("metodo_invalido")) return new DatosInvalidos("Elige cómo te pagó: efectivo, transferencia u otro.");
  if (mensaje.includes("clientes_nota_largo")) return new NotaClienteLarga();
  if (mensaje.includes("nota_invalida")) return new DatosInvalidos("La nota es muy larga (máximo 200 caracteres).");
  if (mensaje.includes("sin_deuda")) return new DatosInvalidos("No hay nada pendiente por abonar: ya está al día.");
  if (mensaje.includes("abono_no_encontrado")) return new DatosInvalidos("Ese abono ya no existe. Actualiza la pantalla.");
  if (mensaje.includes("pedido_con_abonos")) return new PedidoConAbonos();
  // RPC del catálogo en línea
  if (mensaje.includes("catalogo_estado_invalido")) return new DatosInvalidos("Tu catálogo ya cambió de estado. Actualiza la pantalla para ver dónde va.");
  if (mensaje.includes("notas_invalidas")) return new DatosInvalidos("Cuéntanos qué quieres cambiar (hasta 500 caracteres).");
  if (mensaje.includes("catalogo_sin_enlace")) return new DatosInvalidos("Todavía no tenemos el enlace de tu catálogo. Escríbenos y lo conectamos.");
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
    if (todo.includes("clientes_telefono_unico") || mensaje.includes("cliente_duplicado")) return new TelefonoDuplicado();
    if (todo.includes("productos_tienda_slug_unico")) return new DatosInvalidos("Ese enlace ya lo usa otro de tus productos. Prueba otro.");
    return new DatosInvalidos("Eso ya existe en tu tienda.");
  }
  // Reglas de la tabla (23514) y datos mal formados (22xxx)
  if (codigo === "23514") {
    if (todo.includes("url_catalogo")) return new DatosInvalidos("El enlace del catálogo debe empezar con https://.");
    if (todo.includes("marca_color")) return new DatosInvalidos("Ese color no es válido.");
    if (todo.includes("productos_slug_formato")) return new DatosInvalidos("El enlace va en minúsculas, números y guiones (hasta 40).");
    if (todo.includes("productos_medios_validos")) return new DatosInvalidos("Hasta 10 fotos y videos, y máximo 2 videos de 30 segundos.");
    if (todo.includes("productos_servicio_sin_stock")) return new DatosInvalidos("Un servicio no lleva stock.");
    if (todo.includes("stock")) return new DatosInvalidos("El stock no puede quedar en negativo.");
    return new DatosInvalidos("Algún dato no es válido. Revísalo e inténtalo otra vez.");
  }
  if (codigo.startsWith("22")) return new DatosInvalidos("Algún dato no es válido. Revísalo e inténtalo otra vez.");

  // Storage (tamaño y formato del archivo)
  if (c.status === 413 || c.status === "413" || /maximum allowed size|payload too large|exceeded/i.test(mensaje)) return new ArchivoMuyGrande();
  if (c.status === 415 || c.status === "415" || /mime type|not supported|invalid.*type/i.test(mensaje)) return new FormatoNoPermitido();

  // Permisos y sesión. `solo_mirar` lo lanza exigir_no_viendo (RPC); en las tablas la base solo dice "row-level security",
  // y con una sesión de Ver como abierta en otra pestaña es la causa más probable.
  if (mensaje.includes("solo_mirar")) return new SinPermiso(MENSAJE_SOLO_MIRAR);
  // exigir_permiso: la cuenta es de la tienda, pero su nivel no incluye eso (docs/handoffs/permisos-auditoria.md).
  if (mensaje === "sin_permiso" || mensaje === "solo_dueno") return new SinPermiso(MENSAJE_SIN_PERMISO_NIVEL);
  if (/row-level security/i.test(mensaje)) {
    return new SinPermiso("No se pudo guardar: esto lo hace quien administra la tienda. Si tienes Ver como abierto en otra pestaña, sal de ahí.");
  }
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
