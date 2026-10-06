import type { SupabaseClient } from "@supabase/supabase-js";
import { ErrorAdmin, type FuenteAdmin } from "./fuente-admin";
import { problemaDeArchivo, tipoDeDataUrl } from "../almacen";
import { nuevoId } from "../db";
import { comprimirParaSubir } from "../../imagen";

/** Bucket público de las fotos que entrega el equipo (sube solo un admin; la tienda solo las ve). */
export const BUCKET_RETOQUES = "retoques";
const EXTENSION_RETOQUE: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

const opacos = new Set([
  "datos",
  "detalle",
  "personalizacion",
  "funciones",
  "por_bucket",
  "conteos",
]);
/** Solo convierte estructura del contrato; jamás claves JSON del catálogo, motivos ni mapas dinámicos. */
export function desdeFilaAdmin(valor: unknown, clave = ""): unknown {
  if (opacos.has(clave)) return valor;
  if (Array.isArray(valor)) return valor.map((v) => desdeFilaAdmin(v));
  if (valor && typeof valor === "object")
    return Object.fromEntries(
      Object.entries(valor).map(([k, v]) => [
        k.replace(/_([a-z])/g, (_, l: string) => l.toUpperCase()),
        desdeFilaAdmin(v, k),
      ]),
    );
  return valor;
}
/** Recibe el cliente de la sesión actual: nunca service_role para una fuente del navegador. */
export function crearFuenteAdminSupabase(cliente: SupabaseClient): FuenteAdmin {
  async function rpc<T>(
    nombre: string,
    args: Record<string, unknown> = {},
    convertir = true,
  ): Promise<T> {
    const { data, error } = await cliente.rpc(nombre, args);
    if (error) throw new ErrorAdmin(error.message, error.message);
    return (convertir ? desdeFilaAdmin(data) : data) as T;
  }
  return {
    soyAdmin: () => rpc("soy_admin"),
    resumenMes: () => rpc("admin_resumen_mes"),
    hoy: () => rpc("admin_hoy"),
    posponer: (clave, horas = 24) =>
      rpc("admin_posponer", { p_clave: clave, p_horas: horas }),
    tiendas: (filtro = "todas", busqueda = "") =>
      rpc("admin_tiendas", { p_filtro: filtro, p_busqueda: busqueda }),
    tienda: (tiendaId) => rpc("admin_tienda", { p_tienda_id: tiendaId }),
    iniciarVerComo: (tiendaId) =>
      rpc("admin_ver_como_iniciar", { p_tienda_id: tiendaId }),
    terminarVerComo: (sesionId) =>
      rpc("admin_ver_como_terminar", { p_sesion_id: sesionId }),
    avanzarCatalogo: (tiendaId, accion, urlCatalogo) =>
      rpc("admin_catalogo_avanzar", {
        p_tienda_id: tiendaId,
        p_accion: accion,
        p_url_catalogo: urlCatalogo ?? null,
      }),
    guardarPersonalizacion: (tiendaId, cambios) =>
      rpc(
        "admin_guardar_personalizacion",
        { p_tienda_id: tiendaId, p_cambios: cambios },
        false,
      ),
    productosTienda: (tiendaId) =>
      rpc("admin_productos_tienda", { p_tienda_id: tiendaId }),
    personalizacionTienda: (tiendaId) =>
      rpc("admin_personalizacion_tienda", { p_tienda_id: tiendaId }),
    async subirRetocada(trabajo, dataUrl) {
      if (problemaDeArchivo(tipoDeDataUrl(dataUrl), 0) === "formato")
        throw new ErrorAdmin("formato_no_permitido");
      let blob: Blob;
      try {
        blob = await comprimirParaSubir(dataUrl);
      } catch {
        throw new ErrorAdmin("formato_no_permitido");
      }
      if (problemaDeArchivo(blob.type, blob.size) === "grande")
        throw new ErrorAdmin("archivo_muy_grande");
      // Nombre nuevo en cada intento (upsert false): un reintento nunca pisa la foto de otro intento ni de otro trabajo.
      const ruta = `${trabajo.tiendaId}/${trabajo.id}-${nuevoId()}.${EXTENSION_RETOQUE[blob.type] ?? "jpg"}`;
      let error: unknown;
      try {
        ({ error } = await cliente.storage
          .from(BUCKET_RETOQUES)
          .upload(ruta, blob, { contentType: blob.type, cacheControl: "31536000", upsert: false }));
      } catch (e) {
        error = e;
      }
      if (error) throw new ErrorAdmin("subida_fallida", error instanceof Error ? error.message : "subida_fallida");
      return cliente.storage.from(BUCKET_RETOQUES).getPublicUrl(ruta).data.publicUrl;
    },
    trabajosRetoque: (estado = "pendiente") =>
      rpc("admin_trabajos_retoque", { p_estado: estado }),
    entregarRetoque: (trabajoId, urlRetocada) =>
      rpc("admin_retoque_entregar", {
        p_trabajo_id: trabajoId,
        p_url_retocada: urlRetocada,
      }),
    devolverRetoque: (trabajoId, motivo) =>
      rpc("admin_retoque_devolver", {
        p_trabajo_id: trabajoId,
        p_motivo: motivo,
      }),
    registrarPago: (d) =>
      rpc("admin_registrar_pago", {
        p_tienda_id: d.tiendaId,
        p_concepto: d.concepto,
        p_monto: d.monto,
        p_metodo: d.metodo,
        p_referencia: d.referencia ?? null,
        p_comprobante_url: d.comprobanteUrl ?? null,
        p_nota: d.nota ?? null,
        p_meses: d.meses ?? null,
        p_creditos: d.creditos ?? null,
      }),
    anularPago: (pagoId, motivo) =>
      rpc("admin_anular_pago", { p_pago_id: pagoId, p_motivo: motivo }),
    ajustarCreditos: (tiendaId, cantidad, motivo) =>
      rpc("admin_ajustar_creditos", {
        p_tienda_id: tiendaId,
        p_cantidad: cantidad,
        p_motivo: motivo,
      }),
    recargaMensual: (tiendaId) =>
      rpc("admin_recarga_mensual", { p_tienda_id: tiendaId ?? null }),
    planes: () => rpc("admin_planes"),
    guardarPlan: (d) =>
      rpc("admin_guardar_plan", {
        p_id: d.id,
        p_nombre: d.nombre,
        p_precio_mensual: d.precioMensual,
        p_limite_productos: d.limiteProductos,
        p_creditos_mensuales: d.creditosMensuales,
        p_se_ofrece: d.seOfrece,
        p_orden: d.orden,
        p_destacado: d.destacado,
      }),
    cambiarPlan: (tiendaId, planId, limite) =>
      rpc("admin_cambiar_plan", {
        p_tienda_id: tiendaId,
        p_plan_id: planId,
        p_limite: limite ?? null,
      }),
    guardarPrecioExtra: (d) =>
      rpc("admin_guardar_precio_extra", {
        p_clave: d.clave,
        p_nombre: d.nombre,
        p_precio: d.precio,
        p_creditos: d.creditos,
        p_orden: d.orden,
      }),
    cambiarEstadoTienda: (tiendaId, accion, fecha) =>
      rpc("admin_cambiar_estado_tienda", {
        p_tienda_id: tiendaId,
        p_accion: accion,
        p_fecha: fecha ?? null,
      }),
    transferirTienda: (tiendaId, email) =>
      rpc("admin_transferir_tienda", {
        p_tienda_id: tiendaId,
        p_email_nuevo_dueno: email,
      }),
    funcionTienda: (tiendaId, funcion, encendida) =>
      rpc("admin_funcion_tienda", {
        p_tienda_id: tiendaId,
        p_funcion: funcion,
        p_encendida: encendida,
      }),
    salud: () => rpc("admin_salud"),
    registro: (filtro = "todo", antesDe) =>
      rpc("admin_registro", { p_filtro: filtro, p_antes_de: antesDe ?? null }),
    admins: () => rpc("admin_admins"),
    agregarAdmin: (email) => rpc("admin_agregar_admin", { p_email: email }),
    quitarAdmin: (usuarioId) =>
      rpc("admin_quitar_admin", { p_usuario_id: usuarioId }),
    marcarActividad: (tiendaId) =>
      rpc("marcar_actividad", { p_tienda_id: tiendaId }),
    pedirRetoque: (productoId, medioUrl) =>
      rpc("pedir_retoque", {
        p_producto_id: productoId,
        p_medio_url: medioUrl,
      }),
  };
}
