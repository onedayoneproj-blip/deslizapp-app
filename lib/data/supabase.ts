// Implementación REAL de la interfaz de datos (lib/data/fuente.ts) sobre Supabase.
// - El contrato es supabase/migrations/ (si el doc y el SQL difieren, manda el SQL).
// - Lo que decide la base NO se repite aquí: el número del pedido, `pedidos_count`, `likes`, el stock al
//   despachar (RPC despachar_pedido) y los créditos (RPC gastar_creditos). El RLS limita todo a tu tienda.
// - Las filas (snake_case) se convierten SOLO con lib/data/filas.ts.

import { errorDeRubros } from "../rubros";
import { equipoSupabase } from "./equipo-supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CREDITOS_POR_RETOQUE } from "../config";
import { conPago, cuentaDeCliente, cuentasPorCobrar } from "../credito";
import { comprimirParaSubir } from "../imagen";
import { validarPromo } from "../promos";
import { normalizarTelefonoDO } from "../telefono";
import type { Cliente, ClienteConResumen, EventoAaah, AjusteInventario, Medio, MotivoAjusteInventario, PedidoConItems, Promo } from "../types";
import { BUCKET, BUCKET_MARCA, FIRMA_SEGUNDOS, rutaReferencia, esBlobUrl, esDataUrl, MAX_BYTES_VIDEO, problemaDeArchivo, rutaFoto, rutaLogo, rutasParaBorrar, rutaVideo, tipoDeDataUrl, TIPOS_VIDEO } from "./almacen";
import { limpiarDatosCliente, limpiarNota } from "./clientes";
import type { MarcaRetoque } from "../marca-retoque";
import { comprobarTopeReferencias, validarMarcaRetoque } from "./marca-retoque";
import { nuevoId } from "./db";
import { validarAjusteInventario, validarReposicion } from "./inventario";
import { DIAS_ENVIOS } from "./jugadas";
import { PATRON_CODIGO } from "../jugada-codigo";
import {
  ArchivoMuyGrande,
  ClienteDuplicado,
  CreditosInsuficientes,
  DatosInvalidos,
  ErrorClaro,
  CodigoNoValido,
  ErrorDeRed,
  MENSAJE_CODIGO_FORMATO,
  FormatoNoPermitido,
  mensajeDeError,
  PedidoNoEditable,
  PedidoNoEncontrado,
  PromoInvalida,
  SoloDemo,
  TelefonoDuplicado,
  traducirErrorSupabase,
  FuncionApagada,
  CatalogoNoDisponible,
  UsarVariante,
} from "./errores";
import { FUNCIONES } from "../funciones";
import {
  aAbono,
  aAviso,
  aMedio,
  aCatalogoPublico,
  aItemSolicitud,
  aSolicitud,
  aVistaSolicitud,
  type FilaAviso,
  type FilaCatalogoPublico,
  type FilaItemSolicitud,
  type FilaSolicitud,
  type FilaVistaSolicitud,
  aCliente,
  aEventoAaah,
  aPedidoConItems as aPedidoBase,
  aProducto,
  aEnvioJugada,
  aPromo,
  aTienda,
  aUsuario,
  filaCambiosProducto,
  filaClienteNuevo,
  filaMarca,
  filaPedidoItem,
  filaPedidoNuevo,
  filaProductoNuevo,
  filaPromo,
  type FilaAbono,
  type FilaCliente,
  type FilaEventoAaah,
  type FilaPedidoConItems,
  type FilaPedidoItem,
  type FilaProducto,
  type FilaEnvioJugada,
  type FilaPromo,
  type FilaTienda,
  type FilaUsuario,
} from "./filas";
import type { FuenteDatos } from "./fuente";
import type { TrabajoRetoque } from "../admin/tipos";
import { desdeFilaAdmin } from "./admin/supabase";
import { DIAS_TALLER_VISIBLE } from "./retoques";
import { calcularLineas, descuentoDeCodigo, MENSAJE_CODIGO_MALO, pagoAlEditar, pagoDelPedido, puedeEditarCodigo, recalcularConCodigo } from "./pedidos";
import { desdeFormulario, promoTerminada } from "./promos";

/** Pedido con sus productos y su estado de pago (`pagado` y `saldo` salen de los abonos, con la misma cuenta de la demo). */
function aPedidoConItems(f: FilaPedidoConItems): PedidoConItems {
  const p = aPedidoBase(f);
  return conPago(p, p.abonos);
}

/** Lo que devuelve cualquier consulta de supabase-js. */
type Respuesta<T> = { data: T | null; error: unknown };

/** Da la fila (o null) o lanza el error ya traducido para el dueño. */
async function dato<T>(consulta: PromiseLike<Respuesta<T>>): Promise<T | null> {
  let r: Respuesta<T>;
  try {
    r = await consulta;
  } catch (e) {
    throw traducirErrorSupabase(e);
  }
  if (r.error) throw traducirErrorSupabase(r.error);
  return r.data;
}

async function requerido<T>(consulta: PromiseLike<Respuesta<T>>, siFalta: () => Error): Promise<T> {
  const d = await dato(consulta);
  if (d === null) throw siFalta();
  return d;
}

/** PostgREST devuelve como mucho 1000 filas por consulta: se piden por tramos hasta tenerlas todas. */
const TRAMO = 1000;
async function todas<T>(consulta: (desde: number, hasta: number) => PromiseLike<Respuesta<T[]>>): Promise<T[]> {
  const filas: T[] = [];
  for (let desde = 0; ; desde += TRAMO) {
    const tramo = (await dato(consulta(desde, desde + TRAMO - 1))) ?? [];
    filas.push(...tramo);
    if (tramo.length < TRAMO) return filas;
  }
}

// ---------------------------------------------------------------------------
// Fotos y logo (Supabase Storage, bucket "productos")
// ---------------------------------------------------------------------------

type Almacen = SupabaseClient["storage"];

/** Comprime en el navegador y sube UNA imagen nueva (data URL). Devuelve la URL pública. */
async function subirImagen(storage: Almacen, dataUrl: string, ruta: (tipo: string) => string, bucket: string = BUCKET): Promise<{ url: string; ruta: string }> {
  const tipoOriginal = tipoDeDataUrl(dataUrl);
  if (problemaDeArchivo(tipoOriginal, 0) === "formato") throw new FormatoNoPermitido();
  let blob: Blob;
  try {
    blob = await comprimirParaSubir(dataUrl);
  } catch {
    throw new FormatoNoPermitido();
  }
  if (problemaDeArchivo(blob.type, blob.size) === "grande") throw new ArchivoMuyGrande();
  const destino = ruta(blob.type);
  let error: unknown;
  try {
    ({ error } = await storage.from(bucket).upload(destino, blob, { contentType: blob.type, cacheControl: "31536000", upsert: false }));
  } catch (e) {
    error = e;
  }
  if (error) throw traducirErrorSupabase(error);
  return { url: storage.from(bucket).getPublicUrl(destino).data.publicUrl, ruta: destino };
}

/** Borra archivos del bucket sin bloquear a nadie: si falla, solo queda un aviso en la consola. */
async function borrarArchivos(storage: Almacen, rutas: string[], bucket: string = BUCKET) {
  if (rutas.length === 0) return;
  try {
    const { error } = await storage.from(bucket).remove(rutas);
    if (error) console.warn("No se pudieron borrar archivos viejos", error);
  } catch (e) {
    console.warn("No se pudieron borrar archivos viejos", e);
  }
}

/**
 * Sube las fotos nuevas (data URL) y deja las que ya son URL como están (no se vuelven a subir). Si alguna falla,
 * borra las que alcanzó a subir en esta llamada y lanza el error claro.
 */
async function subirFotos(storage: Almacen, tiendaId: string, fotos: string[]): Promise<string[]> {
  const subidas: string[] = [];
  try {
    return await Promise.all(
      fotos.map(async (foto) => {
        if (!esDataUrl(foto)) return foto; // ya es una URL (o una foto del seed)
        const r = await subirImagen(storage, foto, (tipo) => rutaFoto(tiendaId, nuevoId(), tipo));
        subidas.push(r.ruta);
        return r.url;
      }),
    );
  } catch (e) {
    await borrarArchivos(storage, subidas);
    throw e;
  }
}

/** Sube un video recién preparado en el navegador (URL blob:) tal cual: ya viene aligerado (lib/video.ts). */
async function subirVideo(storage: Almacen, tiendaId: string, url: string): Promise<{ url: string; ruta: string }> {
  let blob: Blob;
  try {
    blob = await fetch(url).then((r) => r.blob());
  } catch {
    throw new ErrorClaro("Ese video ya no está en el teléfono. Vuelve a elegirlo.");
  }
  const tipo = (blob.type || "video/mp4").split(";")[0]!;
  if (!TIPOS_VIDEO.includes(tipo)) throw new ErrorClaro("Ese formato de video no sirve. Prueba con un MP4.");
  if (blob.size > MAX_BYTES_VIDEO) throw new ErrorClaro("Ese video pesa más de 15 MB. Prueba con uno más corto.");
  const ruta = rutaVideo(tiendaId, nuevoId(), tipo);
  let error: unknown;
  try {
    ({ error } = await storage.from(BUCKET).upload(ruta, blob, { contentType: tipo, cacheControl: "31536000", upsert: false }));
  } catch (e) {
    error = e;
  }
  if (error) throw traducirErrorSupabase(error);
  return { url: storage.from(BUCKET).getPublicUrl(ruta).data.publicUrl, ruta };
}

/** Las URLs de unos medios (fotos, videos y sus portadas), para saber qué archivos se dejan de usar. */
const urlsDeMedios = (medios: Medio[]) => medios.flatMap((m) => (m.tipo === "video" ? [m.url, m.portada] : [m.url]));

/** Las fotos de unos medios, como las guarda `fotos` (y `foto_retocada` = la primera foto retocada). */
const fotosDeMedios = (medios: Medio[]) => {
  const fotos = medios.filter((m): m is Extract<Medio, { tipo: "foto" }> => m.tipo === "foto");
  return { fotos: fotos.map((m) => m.url), fotoRetocada: fotos[0]?.retocada ?? false };
};

/** Sube lo nuevo de unos medios (fotos en data URL, videos en blob: y sus portadas). Si algo falla, borra lo que alcanzó a subir. */
async function subirMedios(storage: Almacen, tiendaId: string, medios: Medio[]): Promise<Medio[]> {
  const subidas: string[] = [];
  const foto = async (src: string | null) => {
    if (!src || !esDataUrl(src)) return src;
    const r = await subirImagen(storage, src, (tipo) => rutaFoto(tiendaId, nuevoId(), tipo));
    subidas.push(r.ruta);
    return r.url;
  };
  try {
    return await Promise.all(
      medios.map(async (m): Promise<Medio> => {
        if (m.tipo === "foto") return { ...m, url: (await foto(m.url))! };
        let url = m.url;
        if (esBlobUrl(url)) {
          const r = await subirVideo(storage, tiendaId, url);
          subidas.push(r.ruta);
          url = r.url;
        }
        return { ...m, url, portada: await foto(m.portada) };
      }),
    );
  } catch (e) {
    await borrarArchivos(storage, subidas);
    throw e;
  }
}

/** Igual para el logo, en "<tienda_id>/logo/". */
async function subirLogo(storage: Almacen, tiendaId: string, logo: string | null): Promise<string | null> {
  if (!logo || !esDataUrl(logo)) return logo;
  return (await subirImagen(storage, logo, (tipo) => rutaLogo(tiendaId, nuevoId(), tipo))).url;
}

type FilaAjusteInventario = {
  id: string; tienda_id: string; producto_id: string; variacion: number; stock_anterior: number; stock_nuevo: number;
  motivo: MotivoAjusteInventario; nota: string | null; creado_por: string; creado_en: string;
};
const aAjusteInventario = (f: FilaAjusteInventario): AjusteInventario => ({
  id: f.id, tiendaId: f.tienda_id, productoId: f.producto_id, variacion: f.variacion, stockAnterior: f.stock_anterior,
  stockNuevo: f.stock_nuevo, motivo: f.motivo, nota: f.nota, actorId: f.creado_por, creadoEn: f.creado_en,
});

// ---------------------------------------------------------------------------
// La fuente
// ---------------------------------------------------------------------------

const PEDIDO_CON_ITEMS = "*, pedido_items(*), abonos(*)";
/** El producto con sus variantes (todas: activas e inactivas). */
const PRODUCTO_CON_VARIANTES = "*, producto_variantes(*)";

/**
 * `alCambiar` se llama después de cada escritura que salió bien: el provider sube la versión y las
 * pantallas vuelven a leer. Las lecturas iguales que llegan a la vez comparten la misma petición.
 */
export function crearFuenteSupabase(supabase: SupabaseClient, alCambiar: () => void): FuenteDatos & { olvidar(): void } {
  const enVuelo = new Map<string, Promise<unknown>>();

  /** Una lectura: si ya hay una igual en camino (o ya resuelta desde el último cambio), se reutiliza. */
  function leer<T>(clave: string, consulta: () => Promise<T>): Promise<T> {
    const previa = enVuelo.get(clave) as Promise<T> | undefined;
    if (previa) return previa;
    const nueva = consulta();
    enVuelo.set(clave, nueva);
    nueva.catch(() => {
      if (enVuelo.get(clave) === nueva) enVuelo.delete(clave);
    });
    return nueva;
  }

  function olvidar() {
    enVuelo.clear();
  }

  /** Después de escribir: se olvida lo leído y se avisa. */
  function cambio<T>(valor: T): T {
    olvidar();
    alCambiar();
    return valor;
  }

  const equipo = equipoSupabase(supabase, cambio);

  /** La marca para el retoque, sin caché. Las fotos de referencia viven en un bucket privado: se ven con URLs firmadas. */
  async function leerMarcaRetoque(tiendaId: string): Promise<MarcaRetoque> {
    const [t, m, filas] = await Promise.all([
      dato<{ instagram: string | null }>(supabase.from("tiendas").select("instagram").eq("id", tiendaId).maybeSingle()),
      dato<{ palabras: string[]; evita: string | null }>(supabase.from("marca_tienda").select("palabras, evita").eq("tienda_id", tiendaId).maybeSingle()),
      dato<{ id: string; ruta: string; orden: number }[]>(
        supabase.from("marca_referencias").select("id, ruta, orden").eq("tienda_id", tiendaId).order("orden", { ascending: true }).order("creado_en", { ascending: true }),
      ),
    ]);
    const referencias = filas ?? [];
    const firmadas = new Map<string, string>();
    if (referencias.length) {
      const { data } = await supabase.storage.from(BUCKET_MARCA).createSignedUrls(referencias.map((r) => r.ruta), FIRMA_SEGUNDOS);
      for (const f of data ?? []) if (f.path && f.signedUrl) firmadas.set(f.path, f.signedUrl);
    }
    return {
      instagram: t?.instagram ?? null,
      palabras: m?.palabras ?? [],
      evita: m?.evita ?? null,
      referencias: referencias.map((r) => ({ id: r.id, url: firmadas.get(r.ruta) ?? "", orden: r.orden })),
    };
  }

  // ---- lecturas crudas (sin caché), para usarlas dentro de las escrituras ----

  const productosCrudos = (tiendaId: string, incluirEliminados = false) =>
    todas<FilaProducto>((d, h) =>
      supabase.from("productos").select(PRODUCTO_CON_VARIANTES).eq("tienda_id", tiendaId).order("creado_en", { ascending: false }).order("id").range(d, h),
    ).then((filas) => filas.map((f) => aProducto(f)).filter(p => incluirEliminados || !p.eliminadoEn));

  const promosCrudas = (tiendaId: string) =>
    todas<FilaPromo>((d, h) =>
      supabase.from("promos").select("*").eq("tienda_id", tiendaId).order("fecha_inicio", { ascending: false }).order("id").range(d, h),
    ).then((filas) => filas.map((f) => aPromo(f)));

  const pedidosCrudos = (tiendaId: string) =>
    todas<FilaPedidoConItems>((d, h) =>
      supabase.from("pedidos").select(PEDIDO_CON_ITEMS).eq("tienda_id", tiendaId).order("creado_en", { ascending: false }).order("id").range(d, h),
    ).then((filas) => filas.map(aPedidoConItems));

  const pedidosEnCache = (tiendaId: string) => leer(`pedidos:${tiendaId}`, () => pedidosCrudos(tiendaId));
  const clientesBasicos = (tiendaId: string) =>
    leer(`clientes-basicos:${tiendaId}`, async () => {
      const filas = await todas<FilaCliente>((d, h) => supabase.from("clientes").select("*").eq("tienda_id", tiendaId).order("id").range(d, h));
      return filas.map((f) => aCliente(f));
    });

  const tiendaCruda = async (tiendaId: string) => {
    const f = await dato<FilaTienda>(supabase.from("tiendas").select("*").eq("id", tiendaId).maybeSingle());
    return f ? aTienda(f) : null;
  };

  const pedidoCrudo = async (tiendaId: string, id: string) => {
    const f = await dato<FilaPedidoConItems>(supabase.from("pedidos").select(PEDIDO_CON_ITEMS).eq("tienda_id", tiendaId).eq("id", id).maybeSingle());
    return f ? aPedidoConItems(f) : null;
  };

  /** Resumen de cada cliente: `pedidos_count` (recibidos) lo mantiene la base; lo gastado y la última compra cuentan solo despachados. */
  async function conResumen(tiendaId: string, filas: FilaCliente[], soloCliente?: string): Promise<ClienteConResumen[]> {
    type FilaResumen = { cliente_id: string | null; total: number; creado_en: string; estado: string; despachado_en: string | null };
    const pedidos = await todas<FilaResumen>((d, h) => {
      let q = supabase.from("pedidos").select("cliente_id, total, creado_en, estado, despachado_en").eq("tienda_id", tiendaId).eq("estado", "despachado");
      if (soloCliente) q = q.eq("cliente_id", soloCliente);
      return q.order("creado_en", { ascending: false }).order("id").range(d, h);
    });
    const porCliente = new Map<string, { total: number; ultima: string | null; cantidad: number }>();
    for (const p of pedidos) {
      if (!p.cliente_id) continue;
      const r = porCliente.get(p.cliente_id) ?? { total: 0, ultima: null, cantidad: 0 };
      const fecha = p.despachado_en ?? p.creado_en;
      r.total += p.total;
      r.cantidad += 1;
      if (r.ultima === null || fecha > r.ultima) r.ultima = fecha;
      porCliente.set(p.cliente_id, r);
    }
    return filas.map((f) => {
      const r = porCliente.get(f.id);
      return {
        ...aCliente(f),
        pedidos: f.pedidos_count,
        totalGastado: r?.total ?? 0,
        ultimaCompra: r?.ultima ?? null,
        repite: (r?.cantidad ?? 0) >= 2,
      };
    });
  }

  /** Cambia el estado solo si el pedido sigue en uno de los estados `desde` (dos teléfonos a la vez no se pisan). */
  async function moverPedido(tiendaId: string, id: string, desde: string[], estado: "nuevo" | "por_despachar" | "cancelado") {
    const f = await dato<FilaPedidoConItems>(
      supabase.from("pedidos").update({ estado }).eq("tienda_id", tiendaId).eq("id", id).in("estado", desde).select(PEDIDO_CON_ITEMS).maybeSingle(),
    );
    if (!f) {
      if (!(await pedidoCrudo(tiendaId, id))) throw new PedidoNoEncontrado();
      throw new DatosInvalidos("Ese pedido ya cambió de estado. Actualiza la lista.");
    }
    return cambio(aPedidoConItems(f));
  }

  /** Abono inicial de un pedido a crédito (RPC registrar_abono con el pedido fijo). Si falla, el pedido ya existe: se avisa claro. */
  async function abonoInicialDe(tiendaId: string, clienteId: string, pedidoId: string, abono: { monto: number; metodo: string }, fecha: string | null) {
    try {
      await dato(
        supabase.rpc("registrar_abono", {
          p_tienda_id: tiendaId,
          p_cliente_id: clienteId,
          p_monto: abono.monto,
          p_metodo: abono.metodo,
          p_fecha: fecha ?? new Date().toISOString(),
          p_nota: null,
          p_pedido_id: pedidoId,
        }),
      );
    } catch (e) {
      throw new DatosInvalidos(`El pedido se guardó, pero no se pudo registrar lo que te dio ahora (${mensajeDeError(e, "error desconocido")}). Regístralo como abono desde el pedido.`);
    }
  }

  /**
   * Las promos que ya vencieron por fecha quedan guardadas como `terminada`. Así el índice único de códigos
   * de la base (solo entre promos no terminadas) coincide con lo que ve el dueño: un código de una promo
   * vencida se puede volver a usar.
   */
  async function guardarVencidas(tiendaId: string) {
    await dato(
      supabase
        .from("promos")
        .update({ estado: "terminada" })
        .eq("tienda_id", tiendaId)
        .neq("estado", "terminada")
        .lt("fecha_fin", new Date().toISOString()),
    );
  }

  return {
    olvidar,

    // ---- Tiendas ----
    // Solo las tiendas de las que esta cuenta es miembro (mis_tiendas() las da sin las eliminadas): ni un admin fuera de
    // Ver como recibe las de otros, aunque alguna política se ampliara.
    getTiendas: () =>
      leer("tiendas", async () => {
        const ids = ((await dato<string[]>(supabase.rpc("mis_tiendas"))) ?? []).filter((x) => typeof x === "string");
        if (ids.length === 0) return [];
        const filas = (await dato<FilaTienda[]>(supabase.from("tiendas").select("*").in("id", ids).order("nombre"))) ?? [];
        return filas.filter((f) => f.estado !== "eliminada").map((f) => aTienda(f));
      }),
    getTienda: (tiendaId) => leer(`tienda:${tiendaId}`, () => tiendaCruda(tiendaId)),
    getDueno: (tiendaId) =>
      leer(`dueno:${tiendaId}`, async () => {
        const f = await dato<FilaUsuario>(supabase.from("usuarios").select("*").eq("tienda_id", tiendaId).eq("rol", "dueno").limit(1).maybeSingle());
        return f ? aUsuario(f) : null;
      }),
    async usarCreditosRetoque(tiendaId, fotos = 1) {
      const necesarios = fotos * CREDITOS_POR_RETOQUE;
      try {
        await dato(supabase.rpc("gastar_creditos", { p_cantidad: necesarios }));
      } catch (e) {
        if (e instanceof CreditosInsuficientes) {
          const t = await tiendaCruda(tiendaId).catch(() => null);
          throw new CreditosInsuficientes(t?.creditosRetoque ?? null, necesarios);
        }
        throw e;
      }
      const tienda = await tiendaCruda(tiendaId);
      if (!tienda) throw new DatosInvalidos("No encontramos tu tienda.");
      return cambio(tienda);
    },
    async pedirRetoque(tiendaId, productoId, medioUrl) {
      const { data, error } = await supabase.rpc("pedir_retoque", { p_producto_id: productoId, p_medio_url: medioUrl });
      if (error) {
        const m = String(error.message ?? "");
        if (m.includes("retoque_pendiente")) throw new DatosInvalidos("Esa foto ya está en el taller.");
        if (m.includes("foto_ya_retocada")) throw new DatosInvalidos("Esa foto ya salió del taller.");
        if (m.includes("foto_no_encontrada")) throw new DatosInvalidos("Esa foto ya no está en el producto. Guarda y vuelve a intentarlo.");
        if (m.includes("producto_no_encontrado")) throw new DatosInvalidos("Ese producto ya no está en tu tienda.");
        if (m.includes("creditos_insuficientes")) throw new CreditosInsuficientes(null, CREDITOS_POR_RETOQUE);
        throw traducirErrorSupabase(error);
      }
      return cambio(desdeFilaAdmin(data) as TrabajoRetoque);
    },
    trabajosRetoque: (tiendaId) =>
      leer(`trabajos:${tiendaId}`, async () => {
        const desde = new Date(Date.now() - DIAS_TALLER_VISIBLE * 86_400_000).toISOString();
        const filas =
          (await dato<Record<string, unknown>[]>(
            supabase
              .from("trabajos_retoque")
              .select("*")
              .eq("tienda_id", tiendaId)
              .or(`estado.eq.pendiente,atendido_en.gte.${desde}`)
              .order("creado_en", { ascending: false })
              .limit(200),
          )) ?? [];
        return filas.map((f) => desdeFilaAdmin(f) as TrabajoRetoque);
      }),
    async actualizarMarca(tiendaId, datos) {
      const antes = await tiendaCruda(tiendaId);
      const logoUrl = await subirLogo(supabase.storage, tiendaId, datos.logoUrl);
      let f: FilaTienda;
      try {
        f = await requerido<FilaTienda>(
          supabase
            .from("tiendas")
            .update(filaMarca({ ...datos, logoUrl }))
            .eq("id", tiendaId)
            .select("*")
            .maybeSingle(),
          () => new DatosInvalidos("No encontramos tu tienda."),
        );
      } catch (e) {
        // No se guardó: el logo recién subido queda huérfano.
        await borrarArchivos(supabase.storage, rutasParaBorrar(tiendaId, [logoUrl], [antes?.logoUrl]));
        throw e;
      }
      // El logo anterior ya no se usa.
      await borrarArchivos(supabase.storage, rutasParaBorrar(tiendaId, [antes?.logoUrl], [logoUrl]));
      return cambio(aTienda(f));
    },

    async guardarRubros(tiendaId, rubros) {
      const malo = errorDeRubros(rubros);
      if (malo) throw new DatosInvalidos(malo);
      const f = await requerido<FilaTienda>(supabase.rpc("guardar_rubros_tienda", { p_tienda_id: tiendaId, p_rubros: rubros }), () => new DatosInvalidos("No encontramos tu tienda."));
      return cambio(aTienda(f));
    },

    // ---- Mi marca para el retoque (tablas marca_tienda / marca_referencias y bucket privado marca-referencias) ----
    getMarcaRetoque: (tiendaId) => leer(`marca:${tiendaId}`, () => leerMarcaRetoque(tiendaId)),
    async guardarMarcaRetoque(tiendaId, datos) {
      const { palabras, evita, instagram } = validarMarcaRetoque(datos);
      const filas =
        (await dato<{ id: string; ruta: string; orden: number }[]>(
          supabase.from("marca_referencias").select("id, ruta, orden").eq("tienda_id", tiendaId),
        )) ?? [];
      const quitando = filas.filter((f) => datos.quitar.includes(f.id));
      comprobarTopeReferencias(filas.length - quitando.length, datos.nuevas.length);
      // 1. Las fotos nuevas suben primero: si una falla, no se toca nada más.
      const subidas: string[] = [];
      try {
        for (const dataUrl of datos.nuevas)
          subidas.push((await subirImagen(supabase.storage, dataUrl, (tipo) => rutaReferencia(tiendaId, nuevoId(), tipo), BUCKET_MARCA)).ruta);
      } catch (e) {
        await borrarArchivos(supabase.storage, subidas, BUCKET_MARCA);
        throw e;
      }
      try {
        // Sin upsert: su ON CONFLICT toca tienda_id y la tienda de una fila no se muda (solo palabras y evita se pueden cambiar).
        const existe = await dato<{ tienda_id: string }>(supabase.from("marca_tienda").select("tienda_id").eq("tienda_id", tiendaId).maybeSingle());
        if (existe) await dato(supabase.from("marca_tienda").update({ palabras, evita }).eq("tienda_id", tiendaId));
        else await dato(supabase.from("marca_tienda").insert({ tienda_id: tiendaId, palabras, evita }));
        await dato(supabase.from("tiendas").update({ instagram }).eq("id", tiendaId));
        // 2. Primero se quitan las filas (así un cambio de 6 a 6 cabe en el tope de la base) y luego se agregan las nuevas.
        if (quitando.length) await dato(supabase.from("marca_referencias").delete().eq("tienda_id", tiendaId).in("id", quitando.map((f) => f.id)));
        const base = filas.filter((f) => !datos.quitar.includes(f.id)).reduce((n, f) => Math.max(n, f.orden + 1), 0);
        if (subidas.length) await dato(supabase.from("marca_referencias").insert(subidas.map((ruta, i) => ({ tienda_id: tiendaId, ruta, orden: base + i }))));
      } catch (e) {
        // Lo que se subió y no quedó anotado se borra; lo quitado ya no está en la lista, así que su archivo también sobra.
        await borrarArchivos(supabase.storage, [...subidas, ...quitando.map((f) => f.ruta)], BUCKET_MARCA);
        if (String((e as { message?: unknown })?.message ?? "").includes("marca_referencias_limite")) throw new DatosInvalidos("Hasta 6 fotos de referencia.");
        throw e;
      }
      // 3. Quitar una referencia borra también su archivo.
      await borrarArchivos(supabase.storage, quitando.map((f) => f.ruta), BUCKET_MARCA);
      olvidar();
      const marca = await leerMarcaRetoque(tiendaId);
      return cambio(marca);
    },

    // ---- Catálogo en línea (RPC: los campos catalogo_* nunca se escriben por UPDATE) ----
    async solicitarCatalogo(tiendaId) {
      const f = await requerido<FilaTienda>(supabase.rpc("solicitar_catalogo", { p_tienda_id: tiendaId }), () => new DatosInvalidos("No encontramos tu tienda."));
      return cambio(aTienda(f));
    },
    async pedirCambiosCatalogo(tiendaId, notas) {
      const f = await requerido<FilaTienda>(
        supabase.rpc("pedir_cambios_catalogo", { p_tienda_id: tiendaId, p_notas: notas }),
        () => new DatosInvalidos("No encontramos tu tienda."),
      );
      return cambio(aTienda(f));
    },
    async publicarCatalogo(tiendaId) {
      const f = await requerido<FilaTienda>(supabase.rpc("publicar_catalogo", { p_tienda_id: tiendaId }), () => new DatosInvalidos("No encontramos tu tienda."));
      return cambio(aTienda(f));
    },
    async publicarMiCatalogo(tiendaId) {
      const f = await requerido<FilaTienda>(supabase.rpc("publicar_mi_catalogo", { p_tienda_id: tiendaId }), () => new DatosInvalidos("No encontramos tu tienda."));
      return cambio(aTienda(f));
    },
    async despublicarMiCatalogo(tiendaId) {
      const f = await requerido<FilaTienda>(supabase.rpc("despublicar_mi_catalogo", { p_tienda_id: tiendaId }), () => new DatosInvalidos("No encontramos tu tienda."));
      return cambio(aTienda(f));
    },
    async releerTienda(tiendaId) {
      // Solo se olvida lo de la tienda (el resto sigue en caché) y las pantallas vuelven a leer.
      enVuelo.delete(`tienda:${tiendaId}`);
      enVuelo.delete("tiendas");
      alCambiar();
    },

    // ---- Productos ----
    getProductos: (tiendaId, incluirEliminados = false) => leer(`productos:${tiendaId}:${incluirEliminados}`, () => productosCrudos(tiendaId, incluirEliminados)),
    async revisarEliminacionProducto(tiendaId, id) {
      const { data, error } = await supabase.rpc("revisar_eliminacion_producto", { p_tienda_id: tiendaId, p_producto_id: id });
      if (error) throw new Error(error.code === "PGRST202" ? "La eliminación todavía no está disponible en esta tienda. Puedes ocultar el producto." : "No pudimos revisar los pendientes. Inténtalo otra vez.");
      return data;
    },
    async eliminarProducto(tiendaId, id) {
      await dato(supabase.rpc("eliminar_producto", { p_tienda_id: tiendaId, p_producto_id: id }));
      cambio(undefined);
    },
    getProducto: (tiendaId, id) =>
      leer(`producto:${tiendaId}:${id}`, async () => {
        const f = await dato<FilaProducto>(supabase.from("productos").select(PRODUCTO_CON_VARIANTES).eq("tienda_id", tiendaId).eq("id", id).maybeSingle());
        return f ? aProducto(f) : null;
      }),
    async crearProducto(tiendaId, datos, extra) {
      // Con `medios` (fotos y video), `fotos` sale de ellos; sin `medios`, como siempre.
      const medios = datos.medios ? await subirMedios(supabase.storage, tiendaId, datos.medios) : undefined;
      const fotos = medios ? fotosDeMedios(medios).fotos : await subirFotos(supabase.storage, tiendaId, datos.fotos);
      const nuevo = medios ? { ...datos, ...fotosDeMedios(medios), medios } : { ...datos, fotos };
      const { tienda_id: _t, ...fila } = filaProductoNuevo(tiendaId, { ...nuevo, opciones: undefined });
      void _t;
      let f: FilaProducto;
      try {
        // Una sola llamada (atómica): la ficha con lo del catálogo, el cobro del retoque y las variantes.
        f = await requerido<FilaProducto>(
          supabase.rpc("crear_producto", {
            p_tienda_id: tiendaId,
            p_producto: fila,
            p_creditos: (extra?.retoques ?? 0) * CREDITOS_POR_RETOQUE,
            p_opciones: extra?.opciones ?? [],
            p_variantes: (extra?.variantes ?? []).map((v, orden) => ({ valores: v.valores, stock: v.stock, precio: v.precio ?? null, activa: v.activa ?? true, orden })),
          }),
          () => new Error("La base no devolvió el producto."),
        );
      } catch (e) {
        await borrarArchivos(
          supabase.storage,
          rutasParaBorrar(tiendaId, medios ? urlsDeMedios(medios) : fotos, datos.medios ? urlsDeMedios(datos.medios) : datos.fotos),
        );
        if (e instanceof CreditosInsuficientes) {
          const t = await tiendaCruda(tiendaId).catch(() => null);
          throw new CreditosInsuficientes(t?.creditosRetoque ?? null, (extra?.retoques ?? 0) * CREDITOS_POR_RETOQUE);
        }
        throw e;
      }
      const conVariantes = extra?.opciones?.length
        ? ((await dato<FilaProducto>(supabase.from("productos").select(PRODUCTO_CON_VARIANTES).eq("tienda_id", tiendaId).eq("id", f.id).maybeSingle()).catch(() => null)) ?? f)
        : f;
      return cambio(aProducto(conVariantes));
    },
    async actualizarProducto(tiendaId, id, cambios) {
      const { stock, ...cambiosFicha } = cambios;
      if (stock !== undefined) {
        const actual = await dato<{ stock: number | null }>(
          supabase.from("productos").select("stock").eq("tienda_id", tiendaId).eq("id", id).maybeSingle(),
        );
        if (!actual) throw new DatosInvalidos("Ese producto ya no existe en esta tienda.");
        if (actual.stock !== stock) throw new DatosInvalidos("Para ajustar el inventario, vuelve a la vista previa del producto.");
      }
      const antes = cambios.fotos
        ? ((await dato<{ fotos: string[] }>(supabase.from("productos").select("fotos").eq("tienda_id", tiendaId).eq("id", id).maybeSingle()))
            ?.fotos ?? [])
        : [];
      const fotos = cambios.fotos ? await subirFotos(supabase.storage, tiendaId, cambios.fotos) : undefined;
      let f: FilaProducto;
      try {
        f = await requerido<FilaProducto>(
          supabase
            .from("productos")
            .update(filaCambiosProducto(fotos ? { ...cambiosFicha, fotos } : cambiosFicha))
            .eq("tienda_id", tiendaId)
            .eq("id", id)
            .select("*")
            .maybeSingle(),
          () => new DatosInvalidos("Ese producto ya no existe en tu tienda."),
        );
      } catch (e) {
        // No se guardó: lo recién subido queda huérfano.
        if (fotos) await borrarArchivos(supabase.storage, rutasParaBorrar(tiendaId, fotos, antes));
        throw e;
      }
      // Las fotos que se quitaron ya no se usan.
      if (fotos) await borrarArchivos(supabase.storage, rutasParaBorrar(tiendaId, antes, fotos));
      return cambio(aProducto(f));
    },
    async ajustarStock(tiendaId, productoId, variacion, motivo: MotivoAjusteInventario, nota = null, varianteId = null) {
      // Validación rápida para dar un mensaje claro; la RPC repite las reglas bajo bloqueo de fila.
      const actual = await dato<FilaProducto>(
        supabase.from("productos").select(PRODUCTO_CON_VARIANTES).eq("tienda_id", tiendaId).eq("id", productoId).maybeSingle(),
      );
      if (!actual) throw new DatosInvalidos("Ese producto no existe en esta tienda.");
      const variante = varianteId ? actual.producto_variantes?.find((v) => v.id === varianteId && v.activa) : undefined;
      if (varianteId && !variante) throw new DatosInvalidos("Esa variante ya no existe. Actualiza la pantalla.");
      if (!varianteId && actual.producto_variantes?.some((v) => v.activa)) throw new UsarVariante();
      validarAjusteInventario(variante ? variante.stock : actual.stock, variacion, motivo, nota);
      const f = await requerido<FilaProducto>(
        supabase.rpc("ajustar_stock", {
          p_tienda_id: tiendaId,
          p_producto_id: productoId,
          p_variacion: variacion,
          p_motivo: motivo,
          p_nota: nota?.trim() || null,
          ...(varianteId ? { p_variante_id: varianteId } : {}),
        }),
        () => new Error("La base no devolvió el producto actualizado."),
      );
      return cambio(aProducto(f));
    },
    async reponerStock(tiendaId, items, nota = null) {
      validarReposicion(items);
      const filas = await dato<FilaProducto[]>(
        supabase.rpc("reponer_stock", {
          p_tienda_id: tiendaId,
          p_items: items.map((i) => ({ producto_id: i.productoId, cantidad: i.cantidad, ...(i.varianteId ? { variante_id: i.varianteId } : {}) })),
          p_nota: nota?.trim() || null,
        }),
      );
      return cambio((filas ?? []).map((f) => aProducto(f)));
    },
    async cambiarVisibilidad(tiendaId, ids, activo) {
      if (ids.length === 0) return [];
      // Una sola sentencia: se cambian todos o ninguno.
      const filas = await dato<FilaProducto[]>(
        supabase.from("productos").update(filaCambiosProducto({ activo })).eq("tienda_id", tiendaId).in("id", ids).select("*"),
      );
      return cambio((filas ?? []).map((f) => aProducto(f)));
    },

    async guardarProductoConInventario(tiendaId, productoId, cambiosTodos, propuesta, retocar = false) {
      if ("stock" in cambiosTodos) throw new DatosInvalidos("El stock necesita un ajuste registrado.");
      if (propuesta) validarAjusteInventario(propuesta.stockBase, propuesta.stockPropuesto - propuesta.stockBase, propuesta.motivo, propuesta.nota);
      // Una sola llamada (atómica): ficha, lo del catálogo conectado (medios, detalles, encargo), stock y retoque. Las opciones
      // solo cambian con guardarVariantes.
      const { medios: mediosNuevos, opciones: _opciones, ...cambios } = cambiosTodos;
      void _opciones;
      const conMedios = mediosNuevos !== undefined;
      const anterior = cambios.fotos || conMedios
        ? await dato<{ fotos: string[]; medios: FilaProducto["medios"] }>(supabase.from("productos").select("fotos, medios").eq("tienda_id", tiendaId).eq("id", productoId).maybeSingle())
        : null;
      const antes = anterior ? [...(anterior.fotos ?? []), ...urlsDeMedios((anterior.medios ?? []).map(aMedio))] : [];
      const medios = conMedios ? await subirMedios(supabase.storage, tiendaId, mediosNuevos) : undefined;
      const fotos = medios ? fotosDeMedios(medios).fotos : cambios.fotos ? await subirFotos(supabase.storage, tiendaId, cambios.fotos) : undefined;
      const ficha = medios ? { ...cambios, ...fotosDeMedios(medios), medios } : fotos ? { ...cambios, fotos } : cambios;
      const nuevas = [...(fotos ?? []), ...(medios ? urlsDeMedios(medios) : [])];
      let f: FilaProducto;
      try {
        f = await requerido<FilaProducto>(supabase.rpc("guardar_producto_inventario", {
          p_tienda_id: tiendaId, p_producto_id: productoId,
          p_cambios: filaCambiosProducto(ficha),
          p_stock_base: propuesta?.stockBase ?? null, p_stock_nuevo: propuesta?.stockPropuesto ?? null,
          p_motivo: propuesta?.motivo ?? null, p_nota: propuesta?.nota ?? null,
          p_ajuste_id: propuesta?.id ?? null, p_retocar: retocar,
        }), () => new Error("No pudimos confirmar el producto guardado."));
      } catch (e) {
        // Un resultado de red incierto podría haber guardado esas URLs: no borrar sus archivos.
        if (nuevas.length && e instanceof ErrorClaro && !(e instanceof ErrorDeRed)) await borrarArchivos(supabase.storage, rutasParaBorrar(tiendaId, nuevas, antes));
        throw e;
      }
      // La RPC devuelve la fila sin variantes: se lee con ellas (solo lectura; si falla, vale la fila de la RPC).
      f = (await dato<FilaProducto>(supabase.from("productos").select(PRODUCTO_CON_VARIANTES).eq("tienda_id", tiendaId).eq("id", productoId).maybeSingle()).catch(() => null)) ?? f;
      if (nuevas.length || antes.length) {
        const quedan = [...(f.fotos ?? []), ...urlsDeMedios((f.medios ?? []).map(aMedio))];
        await borrarArchivos(supabase.storage, rutasParaBorrar(tiendaId, [...antes, ...nuevas], quedan));
      }
      return cambio(aProducto(f));
    },
    async getAjustesInventario(tiendaId, productoId, desde = 0, limite = 10) {
      const filas: FilaAjusteInventario[] = [];
      // PostgREST limita cada respuesta: Ver más no debe cortar el historial al llegar a 1000.
      for (let i = 0; i <= limite; i += TRAMO) {
        const cantidad = Math.min(TRAMO, limite + 1 - i);
        const pagina = await dato<FilaAjusteInventario[]>(supabase.from("ajustes_inventario").select("*").eq("tienda_id", tiendaId).eq("producto_id", productoId)
          .order("creado_en", { ascending: false }).order("id", { ascending: false }).range(desde + i, desde + i + cantidad - 1));
        filas.push(...pagina ?? []);
        if ((pagina?.length ?? 0) < cantidad) break;
      }
      const ids = [...new Set((filas ?? []).slice(0, limite).map(a => a.creado_por))];
      const actores = ids.length ? await dato<{id: string; nombre: string}[]>(supabase.from("usuarios").select("id,nombre").in("id", ids)) : [];
      return { ajustes: (filas ?? []).slice(0, limite).map(a => ({ ...aAjusteInventario(a), actorNombre: actores?.find(u => u.id === a.creado_por)?.nombre || "Cuenta de la tienda" })), hayMas: (filas?.length ?? 0) > limite };
    },
    async revisarGuardadoInventario(tiendaId, productoId, ajusteId) {
      // Primero el registro: si confirma la operación, el producto se lee después de ese commit.
      const a = ajusteId ? await dato<FilaAjusteInventario>(supabase.from("ajustes_inventario").select("*").eq("tienda_id", tiendaId).eq("producto_id", productoId).eq("id", ajusteId).maybeSingle()) : null;
      if (!ajusteId) await dato(supabase.from("ajustes_inventario").select("id").eq("tienda_id", tiendaId).eq("producto_id", productoId).limit(1));
      const f = await dato<FilaProducto>(supabase.from("productos").select("*").eq("tienda_id", tiendaId).eq("id", productoId).maybeSingle());
      return cambio({ producto: f ? aProducto(f) : null, ajuste: a ? aAjusteInventario(a) : null });
    },

    // ---- Pedidos ----
    getPedidos: (tiendaId) => pedidosEnCache(tiendaId),
    getPedido: (tiendaId, id) => leer(`pedido:${tiendaId}:${id}`, () => pedidoCrudo(tiendaId, id)),
    confirmarPedido: (tiendaId, id) => moverPedido(tiendaId, id, ["nuevo"], "por_despachar"),
    cancelarPedido: (tiendaId, id) => moverPedido(tiendaId, id, ["nuevo", "por_despachar"], "cancelado"),
    async editarPedido(tiendaId, id, datos) {
      const [actual, filaCliente] = await Promise.all([
        pedidoCrudo(tiendaId, id),
        dato<FilaCliente>(supabase.from("clientes").select("*").eq("tienda_id", tiendaId).eq("id", datos.clienteId).maybeSingle()),
      ]);
      if (!actual) throw new PedidoNoEncontrado();
      if (!filaCliente) throw new DatosInvalidos("Ese cliente ya no existe en tu tienda.");
      const despachado = actual.estado === "despachado";
      let items: { productoId: string; cantidad: number; precioUnitario: number; varianteId: string | null; porEncargo: boolean }[] | null = null;
      let total = actual.total;
      let codigo: string | null = actual.codigoPromo;
      if (!despachado && actual.estado !== "cancelado") {
        const [productos, promos, pedidos] = await Promise.all([productosCrudos(tiendaId), promosCrudas(tiendaId), pedidosCrudos(tiendaId)]);
        const c = calcularLineas(productos, promos, tiendaId, datos.items ?? [], datos.codigo, new Date(), { pedidos, pedido: actual, clienteId: datos.clienteId ?? actual.clienteId });
        if (datos.codigo?.trim() && !c.promo) throw new DatosInvalidos(MENSAJE_CODIGO_MALO);
        items = c.items;
        total = c.total;
        codigo = c.promo?.codigo ?? null;
      }
      const venta = datos.ventaPasada;
      // Cómo queda el pago (crédito, fecha acordada y, si hay, lo que dio ahora): se decide antes de tocar nada.
      const pago = pagoAlEditar(actual, total, actual.abonos.length > 0, datos);
      // La base valida estado, fecha, cliente, productos y stock (RPC editar_pedido).
      const editado = await requerido<FilaPedidoConItems>(
        supabase.rpc("editar_pedido", {
          p_pedido_id: id,
          p_cliente_id: filaCliente.id,
          p_items: items?.map((i) => ({ producto_id: i.productoId, variante_id: i.varianteId ?? null, cantidad: i.cantidad, precio_unitario: i.precioUnitario, por_encargo: Boolean(i.porEncargo) })) ?? null,
          p_codigo_promo: codigo,
          p_fecha: (despachado ? datos.fecha : venta?.fecha) ?? null,
          p_ya_hecho: !despachado && !!venta,
          p_descontar_stock: !despachado && !!venta?.descontarStock,
        }),
        () => new PedidoNoEncontrado(),
      );
      // La RPC suma cantidad × precio y no conoce el descuento del código: se deja el total que vio el dueño.
      if (!despachado && editado.total !== total) {
        const { error } = await supabase.from("pedidos").update({ total }).eq("id", id).eq("tienda_id", tiendaId);
        if (error) console.warn("No se pudo ajustar el total del pedido con el código", error);
      }
      // Modo de pago y fecha acordada (la base no deja pasar a "contado" un pedido con abonos: pedido_con_abonos).
      if (pago.pagoModo !== actual.pagoModo || pago.pagoFechaAcordada !== actual.pagoFechaAcordada) {
        await dato(supabase.from("pedidos").update({ pago_modo: pago.pagoModo, pago_fecha_acordada: pago.pagoFechaAcordada }).eq("id", id).eq("tienda_id", tiendaId).select("id").maybeSingle());
      }
      const fecha = despachado ? datos.fecha : venta?.fecha;
      if (pago.abono) await abonoInicialDe(tiendaId, filaCliente.id, id, pago.abono, fecha ?? null);
      const pedido = await pedidoCrudo(tiendaId, id);
      if (!pedido) throw new PedidoNoEncontrado();
      const cliente = aCliente(filaCliente);
      return cambio({ pedido, cliente: fecha && fecha < cliente.primerPedidoEn ? { ...cliente, primerPedidoEn: fecha } : cliente });
    },
    async cambiarPagoPedido(tiendaId, id, datos) {
      const actual = await pedidoCrudo(tiendaId, id);
      if (!actual) throw new PedidoNoEncontrado();
      if (actual.estado === "cancelado") throw new PedidoNoEditable();
      const pago = pagoAlEditar(actual, actual.total, actual.abonos.length > 0, datos);
      // La base no deja pasar a "contado" un pedido con abonos (pedido_con_abonos).
      await dato(
        supabase.from("pedidos").update({ pago_modo: pago.pagoModo, pago_fecha_acordada: pago.pagoFechaAcordada }).eq("id", id).eq("tienda_id", tiendaId).select("id").maybeSingle(),
      );
      if (pago.abono && actual.clienteId) await abonoInicialDe(tiendaId, actual.clienteId, id, pago.abono, null);
      const pedido = await pedidoCrudo(tiendaId, id);
      if (!pedido) throw new PedidoNoEncontrado();
      return cambio(pedido);
    },
    async eliminarPedido(_tiendaId, id) {
      await dato(supabase.rpc("eliminar_pedido", { p_pedido_id: id }));
      cambio(undefined);
    },
    async aplicarCodigoPedido(tiendaId, id, codigo) {
      const [actual, productos, promos, pedidos] = await Promise.all([
        pedidoCrudo(tiendaId, id),
        productosCrudos(tiendaId),
        promosCrudas(tiendaId),
        pedidosCrudos(tiendaId),
      ]);
      if (!actual) throw new PedidoNoEncontrado();
      if (!puedeEditarCodigo(actual.estado)) throw new DatosInvalidos("El código solo se cambia antes de despachar. Usa «Volver al paso anterior» y luego edítalo.");
      const r = recalcularConCodigo(actual.items, productos, promos, tiendaId, codigo, new Date(), { pedidos, pedido: actual, clienteId: actual.clienteId });
      // Primero los precios de los productos que cambiaron, luego el pedido (con el estado como guarda).
      const cambiados = r.items.filter((n) => n.precioUnitario !== actual.items.find((i) => i.id === n.id)?.precioUnitario);
      const ponerPrecios = (lista: { id: string; precioUnitario: number }[]) =>
        Promise.all(lista.map((i) => dato(supabase.from("pedido_items").update({ precio_unitario: i.precioUnitario }).eq("id", i.id).eq("pedido_id", id))));
      await ponerPrecios(cambiados);
      try {
        const f = await dato<{ id: string }>(
          supabase
            .from("pedidos")
            .update({ total: r.total, codigo_promo: r.codigoPromo })
            .eq("tienda_id", tiendaId)
            .eq("id", id)
            .in("estado", ["nuevo", "por_despachar"])
            .select("id")
            .maybeSingle(),
        );
        if (!f) throw new DatosInvalidos("Ese pedido ya cambió de estado. Actualiza la lista.");
      } catch (e) {
        // No se guardó el pedido: se devuelven los precios de antes.
        await ponerPrecios(cambiados.map((n) => ({ id: n.id, precioUnitario: actual.items.find((i) => i.id === n.id)!.precioUnitario }))).catch(() => undefined);
        throw e;
      }
      const pedido = await pedidoCrudo(tiendaId, id);
      if (!pedido) throw new PedidoNoEncontrado();
      return cambio(pedido);
    },
    volverPedidoARecibido: (tiendaId, id) => moverPedido(tiendaId, id, ["por_despachar"], "nuevo"),
    reabrirPedido: (tiendaId, id) => moverPedido(tiendaId, id, ["cancelado"], "nuevo"),
    async deshacerDespacho(tiendaId, id) {
      // Todo o nada en la base: devuelve el stock y regresa el pedido a por_despachar (sin despachado_en).
      await dato(supabase.rpc("deshacer_despacho", { p_pedido_id: id }));
      const pedido = await pedidoCrudo(tiendaId, id);
      if (!pedido) throw new PedidoNoEncontrado();
      return cambio(pedido);
    },
    async despacharPedido(tiendaId, id) {
      // Todo o nada en la base: revisa y descuenta el stock y marca el pedido.
      await dato(supabase.rpc("despachar_pedido", { p_pedido_id: id }));
      const pedido = await pedidoCrudo(tiendaId, id);
      if (!pedido) throw new PedidoNoEncontrado();
      // Lo que quedó en 0: los productos sin opciones y, de los que tienen, la variante ("Camisa · M · Arena").
      const conVariante = pedido.items.filter((i) => i.varianteId && !i.porEncargo);
      const ids = [...new Set(pedido.items.filter((i) => !i.varianteId && !i.porEncargo).map((i) => i.productoId))];
      const vids = [...new Set(conVariante.map((i) => i.varianteId!))];
      const [productosEnCero, variantesEnCero] = await Promise.all([
        ids.length === 0 ? [] : dato<{ nombre: string }[]>(supabase.from("productos").select("nombre").eq("tienda_id", tiendaId).in("id", ids).eq("stock", 0)),
        vids.length === 0 ? [] : dato<{ id: string }[]>(supabase.from("producto_variantes").select("id").eq("tienda_id", tiendaId).in("id", vids).eq("stock", 0)),
      ]);
      const enCero = new Set((variantesEnCero ?? []).map((v) => v.id));
      const agotados = [
        ...(productosEnCero ?? []).map((p) => p.nombre),
        ...new Set(conVariante.filter((i) => enCero.has(i.varianteId!)).map((i) => `${i.nombreProducto} · ${i.varianteTexto ?? ""}`)),
      ];
      return cambio({ pedido, agotados });
    },
    async crearPedidoManual(tiendaId, datos) {
      const [productos, promos, pedidos, filaCliente] = await Promise.all([
        productosCrudos(tiendaId),
        promosCrudas(tiendaId),
        pedidosCrudos(tiendaId),
        dato<FilaCliente>(supabase.from("clientes").select("*").eq("tienda_id", tiendaId).eq("id", datos.clienteId).maybeSingle()),
      ]);
      if (!filaCliente) throw new DatosInvalidos("Ese cliente ya no existe en tu tienda.");

      // Precios de hoy (con la promo de colección o de producto vigente) y el código, si es válido: la misma cuenta de la demo.
      const { items, subtotal, promo } = calcularLineas(productos, promos, tiendaId, datos.items, datos.codigo, new Date(), { pedidos, clienteId: datos.clienteId });

      const venta = datos.ventaPasada;
      const total = subtotal - descuentoDeCodigo(promo, subtotal);
      // Cómo paga (contado o crédito con su fecha y lo que dio ahora); un abono inicial igual al total deja el pedido de contado.
      const pago = pagoDelPedido(total, datos);
      if (venta) {
        // La base valida fecha, stock y pertenencia; entra despachado con esa fecha (RPC registrar_venta_pasada).
        const creado = await requerido<FilaPedidoConItems>(
          supabase.rpc("registrar_venta_pasada", {
            p_tienda_id: tiendaId,
            p_cliente_id: filaCliente.id,
            p_fecha: venta.fecha,
            p_items: items.map((i) => ({ producto_id: i.productoId, variante_id: i.varianteId ?? null, cantidad: i.cantidad, precio_unitario: i.precioUnitario, por_encargo: Boolean(i.porEncargo) })),
            p_codigo_promo: promo?.codigo ?? null,
            p_descontar_stock: venta.descontarStock,
          }),
          () => new Error("La base no devolvió la venta."),
        );
        // La RPC suma cantidad × precio y no conoce el descuento del código: se deja el total que vio el dueño.
        if (creado.total !== total) {
          const { error } = await supabase.from("pedidos").update({ total }).eq("id", creado.id).eq("tienda_id", tiendaId);
          if (error) console.warn("No se pudo ajustar el total de la venta con el código", error);
        }
        // La RPC crea la venta de contado: si fue a crédito, se marca y se registra lo que dio ahora (con la fecha de la venta).
        if (pago.pagoModo === "credito") {
          try {
            await dato(
              supabase.from("pedidos").update({ pago_modo: "credito", pago_fecha_acordada: pago.pagoFechaAcordada }).eq("id", creado.id).eq("tienda_id", tiendaId).select("id").maybeSingle(),
            );
          } catch (e) {
            throw new DatosInvalidos(`La venta se guardó, pero no se pudo dejar a crédito (${mensajeDeError(e, "error desconocido")}). Ábrela y cámbiala a crédito.`);
          }
          if (pago.abono) await abonoInicialDe(tiendaId, filaCliente.id, creado.id, pago.abono, venta.fecha);
        }
        const pedido = await pedidoCrudo(tiendaId, creado.id);
        if (!pedido) throw new PedidoNoEncontrado();
        const cliente = aCliente(filaCliente);
        return cambio({ pedido, cliente: venta.fecha < cliente.primerPedidoEn ? { ...cliente, primerPedidoEn: venta.fecha } : cliente });
      }

      // Sin `numero`: lo asigna la base.
      const filaPedido = await requerido<FilaPedidoConItems>(
        supabase
          .from("pedidos")
          .insert(
            filaPedidoNuevo(tiendaId, {
              clienteId: filaCliente.id,
              origen: "manual",
              estado: "por_despachar",
              total,
              codigoPromo: promo?.codigo ?? null,
              pagoModo: pago.pagoModo,
              pagoFechaAcordada: pago.pagoFechaAcordada,
            }),
          )
          .select("*")
          .single(),
        () => new Error("La base no devolvió el pedido."),
      );
      let filasItems: FilaPedidoItem[];
      try {
        filasItems = await requerido<FilaPedidoItem[]>(
          supabase
            .from("pedido_items")
            .insert(items.map((i) => filaPedidoItem(filaPedido.id, i)))
            .select("*"),
          () => new Error("La base no devolvió los productos del pedido."),
        );
      } catch (e) {
        // Sin productos el pedido no sirve: se borra para no dejarlo a medias.
        await supabase.from("pedidos").delete().eq("id", filaPedido.id);
        throw e;
      }
      // Primero se creó el pedido a crédito; ahora, si hay, lo que dio ahora.
      if (pago.abono) await abonoInicialDe(tiendaId, filaCliente.id, filaPedido.id, pago.abono, null);
      const pedido: PedidoConItems = pago.abono
        ? ((await pedidoCrudo(tiendaId, filaPedido.id)) ?? aPedidoConItems({ ...filaPedido, pedido_items: filasItems }))
        : aPedidoConItems({ ...filaPedido, pedido_items: filasItems });
      return cambio({ pedido, cliente: aCliente(filaCliente) });
    },

    // ---- Ventas a crédito y abonos (RPC: la tabla abonos es solo lectura para la app) ----
    async registrarAbono(d) {
      const filas =
        (await dato<FilaAbono[]>(
          supabase.rpc("registrar_abono", {
            p_tienda_id: d.tiendaId,
            p_cliente_id: d.clienteId,
            p_monto: d.monto,
            p_metodo: d.metodo,
            p_fecha: d.fecha ?? new Date().toISOString(),
            p_nota: d.nota?.trim() ? d.nota.trim() : null,
            p_pedido_id: d.pedidoId ?? null,
          }),
        )) ?? [];
      return cambio(filas.map((f) => aAbono(f)));
    },
    async editarAbono(_tiendaId, abonoId, c) {
      const fila = await dato<FilaAbono>(
        supabase.rpc("editar_abono", {
          p_abono_id: abonoId,
          p_monto: c.monto,
          p_metodo: c.metodo,
          p_fecha: c.fecha,
          p_nota: c.nota?.trim() ? c.nota.trim() : null,
        }),
      );
      return cambio(aAbono(fila as FilaAbono));
    },
    async eliminarAbono(_tiendaId, abonoId) {
      await dato(supabase.rpc("eliminar_abono", { p_abono_id: abonoId }));
      cambio(undefined);
    },
    async getCuentasPorCobrar(tiendaId) {
      const [pedidos, clientes] = await Promise.all([pedidosEnCache(tiendaId), clientesBasicos(tiendaId)]);
      return cuentasPorCobrar(pedidos, clientes, Date.now());
    },
    async getCuentaCliente(tiendaId, clienteId) {
      return cuentaDeCliente(await pedidosEnCache(tiendaId), clienteId, Date.now());
    },

    // ---- Clientes ----
    getClientes: (tiendaId) =>
      leer(`clientes:${tiendaId}`, async () => {
        const filas = await todas<FilaCliente>((d, h) => supabase.from("clientes").select("*").eq("tienda_id", tiendaId).order("id").range(d, h));
        return (await conResumen(tiendaId, filas)).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
      }),
    getCliente: (tiendaId, id) =>
      leer(`cliente:${tiendaId}:${id}`, async () => {
        const f = await dato<FilaCliente>(supabase.from("clientes").select("*").eq("tienda_id", tiendaId).eq("id", id).maybeSingle());
        return f ? ((await conResumen(tiendaId, [f], f.id))[0] ?? null) : null;
      }),
    async crearCliente(tiendaId, datos) {
      const nombre = datos.nombre.trim();
      const telefono = normalizarTelefonoDO(datos.telefono);
      if (!nombre) throw new DatosInvalidos("El cliente necesita un nombre.");
      if (!telefono) throw new DatosInvalidos("Ese WhatsApp no es un número dominicano válido.");
      try {
        const f = await requerido<FilaCliente>(
          supabase
            .from("clientes")
            .insert(filaClienteNuevo(tiendaId, { nombre, telefono, nota: limpiarNota(datos.nota), origen: "manual" }))
            .select("*")
            .single(),
          () => new Error("La base no devolvió el cliente."),
        );
        return cambio(aCliente(f));
      } catch (e) {
        if (!(e instanceof TelefonoDuplicado)) throw e;
        // El teléfono es único por tienda: se muestra quién lo tiene.
        const existente = await dato<FilaCliente>(
          supabase.from("clientes").select("*").eq("tienda_id", tiendaId).eq("telefono", telefono).maybeSingle(),
        );
        throw existente ? new ClienteDuplicado(aCliente(existente)) : e;
      }
    },
    async actualizarCliente(tiendaId, id, datos) {
      const limpios = limpiarDatosCliente(datos);
      try {
        const f = await requerido<FilaCliente>(
          supabase
            .from("clientes")
            .update({ nombre: limpios.nombre, telefono: limpios.telefono })
            .eq("tienda_id", tiendaId)
            .eq("id", id)
            .select("*")
            .maybeSingle(),
          () => new DatosInvalidos("Ese cliente ya no existe en tu tienda."),
        );
        return cambio(aCliente(f) satisfies Cliente);
      } catch (e) {
        if (!(e instanceof TelefonoDuplicado) || !limpios.telefono) throw e;
        const existente = await dato<FilaCliente>(
          supabase.from("clientes").select("*").eq("tienda_id", tiendaId).eq("telefono", limpios.telefono).maybeSingle(),
        );
        throw existente ? new ClienteDuplicado(aCliente(existente)) : e;
      }
    },
    async eliminarCliente(_tiendaId, id, borrarPedidos = false) {
      await dato(supabase.rpc("borrar_cliente", { p_cliente_id: id, p_borrar_pedidos: borrarPedidos }));
      cambio(undefined);
    },
    async actualizarNotaCliente(tiendaId, id, nota) {
      const f = await requerido<FilaCliente>(
        supabase
          .from("clientes")
          .update({ nota: limpiarNota(nota) })
          .eq("tienda_id", tiendaId)
          .eq("id", id)
          .select("*")
          .maybeSingle(),
        () => new DatosInvalidos("Ese cliente ya no existe en tu tienda."),
      );
      return cambio(aCliente(f) satisfies Cliente);
    },

    // ---- Promos ----
    getPromos: (tiendaId) => leer(`promos:${tiendaId}`, () => promosCrudas(tiendaId)),
    async crearPromo(tiendaId, datos) {
      const promos = await promosCrudas(tiendaId);
      const errores = validarPromo(datos, promos, tiendaId);
      if (Object.keys(errores).length) throw new PromoInvalida(errores);
      if (datos.tipo === "codigo") await guardarVencidas(tiendaId);
      const promo = desdeFormulario(tiendaId, datos, "", new Date());
      const f = await requerido<FilaPromo>(
        supabase.from("promos").insert(filaPromo(tiendaId, promo)).select("*").single(),
        () => new Error("La base no devolvió la promo."),
      );
      return cambio(aPromo(f));
    },
    async actualizarPromo(tiendaId, id, datos) {
      const promos = await promosCrudas(tiendaId);
      const actual = promos.find((p) => p.id === id);
      if (!actual) throw new DatosInvalidos("Esa promo ya no existe en tu tienda.");
      if (actual.estado === "terminada") throw new DatosInvalidos("Una promo terminada no se puede editar: duplícala como nueva.");
      const conTipo = { ...datos, tipo: actual.tipo };
      const errores = validarPromo(conTipo, promos, tiendaId, id);
      if (Object.keys(errores).length) throw new PromoInvalida(errores);
      if (actual.tipo === "codigo") await guardarVencidas(tiendaId);
      const promo = desdeFormulario(tiendaId, conTipo, id, new Date());
      const f = await requerido<FilaPromo>(
        supabase.from("promos").update(filaPromo(tiendaId, promo)).eq("tienda_id", tiendaId).eq("id", id).select("*").maybeSingle(),
        () => new DatosInvalidos("Esa promo ya no existe en tu tienda."),
      );
      return cambio(aPromo(f));
    },
    async terminarPromo(tiendaId, id) {
      const f0 = await dato<FilaPromo>(supabase.from("promos").select("*").eq("tienda_id", tiendaId).eq("id", id).maybeSingle());
      if (!f0) throw new DatosInvalidos("Esa promo ya no existe en tu tienda.");
      const promo: Promo = promoTerminada(aPromo(f0), new Date());
      const f = await requerido<FilaPromo>(
        supabase
          .from("promos")
          .update({ estado: promo.estado, fecha_fin: promo.fechaFin })
          .eq("tienda_id", tiendaId)
          .eq("id", id)
          .select("*")
          .maybeSingle(),
        () => new DatosInvalidos("Esa promo ya no existe en tu tienda."),
      );
      return cambio(aPromo(f));
    },

    // ---- Tu próxima jugada ----
    async crearCodigoCliente(tiendaId, clienteId, porcentaje, dias, codigo = null) {
      if (!FUNCIONES.proximaJugada) throw new FuncionApagada();
      const escrito = codigo?.trim() ? codigo.trim().toUpperCase() : null;
      // Validación rápida para dar el mensaje en el campo; la RPC repite las reglas.
      if (escrito && !PATRON_CODIGO.test(escrito)) throw new CodigoNoValido(MENSAJE_CODIGO_FORMATO);
      // Que un código vencido sin marcar no bloquee el nombre (el índice único es solo entre no terminadas)
      await guardarVencidas(tiendaId);
      const f = await requerido<FilaPromo>(
        supabase.rpc("crear_codigo_cliente", { p_tienda_id: tiendaId, p_cliente_id: clienteId, p_porcentaje: porcentaje, p_dias: dias, p_codigo: escrito }),
        () => new Error("La base no devolvió el código."),
      );
      return cambio(aPromo(f));
    },
    async registrarEnvioJugada(tiendaId, datos) {
      if (!FUNCIONES.proximaJugada) throw new FuncionApagada();
      const f = await requerido<FilaEnvioJugada>(
        supabase.rpc("registrar_envio_jugada", {
          p_tienda_id: tiendaId,
          p_cliente_id: datos.clienteId,
          p_jugada: datos.jugada,
          p_tipo: datos.tipo,
          p_promo_id: datos.promoId ?? null,
          p_producto_ids: datos.productoIds ?? [],
        }),
        () => new Error("La base no devolvió el envío."),
      );
      return cambio(aEnvioJugada(f));
    },
    enviosJugada: (tiendaId) =>
      !FUNCIONES.proximaJugada ? Promise.resolve([]) : leer(`envios:${tiendaId}`, async () => {
        const desde = new Date(Date.now() - DIAS_ENVIOS * 86_400_000).toISOString();
        const filas = await dato<FilaEnvioJugada[]>(
          supabase.from("jugada_envios").select("*").eq("tienda_id", tiendaId).gte("enviado_en", desde).order("enviado_en", { ascending: false }),
        );
        return (filas ?? []).map(aEnvioJugada);
      }),

    // ---- Aaahs (solo lectura) ----
    getEventosAaah: (tiendaId) =>
      leer(`aaah:${tiendaId}`, async (): Promise<EventoAaah[]> => {
        const filas = await todas<FilaEventoAaah>((d, h) =>
          supabase
            .from("eventos_aaah")
            .select("id, tienda_id, producto_id, creado_en")
            .eq("tienda_id", tiendaId)
            .order("creado_en", { ascending: false })
            .order("id")
            .range(d, h),
        );
        return filas.map((f) => aEventoAaah(f));
      }),

    // ---- Variantes ----
    async guardarVariantes(tiendaId, productoId, opciones, variantes) {
      await dato(
        supabase.rpc("guardar_variantes", {
          p_tienda_id: tiendaId,
          p_producto_id: productoId,
          p_opciones: opciones,
          p_variantes: variantes.map((v, orden) => ({ valores: v.valores, stock: v.stock, precio: v.precio ?? null, activa: v.activa ?? true, orden })),
        }),
      );
      const f = await requerido<FilaProducto>(
        supabase.from("productos").select(PRODUCTO_CON_VARIANTES).eq("tienda_id", tiendaId).eq("id", productoId).maybeSingle(),
        () => new DatosInvalidos("Ese producto ya no existe en esta tienda."),
      );
      return cambio(aProducto(f));
    },

    async guardarFicha(tiendaId, productoId, foto) {
      const antes = (await dato<{ ficha_url: string | null }>(supabase.from("productos").select("ficha_url").eq("tienda_id", tiendaId).eq("id", productoId).maybeSingle()))?.ficha_url ?? null;
      const nueva = foto && esDataUrl(foto) ? await subirImagen(supabase.storage, foto, (tipo) => rutaFoto(tiendaId, nuevoId(), tipo)) : null;
      try {
        await dato(supabase.rpc("guardar_ficha_producto", { p_tienda_id: tiendaId, p_producto_id: productoId, p_url: nueva?.url ?? null }));
      } catch (e) {
        // Solo un rechazo claro del servidor deja el archivo nuevo huérfano seguro. Con un error de red el guardado pudo
        // llegar: se relee la fila y, si ya tiene la ficha nueva, se sigue como si hubiera salido bien; si no, el archivo
        // se conserva (como en guardarProductoConInventario) para no dejar la ficha apuntando a nada.
        if (!(e instanceof ErrorClaro) || e instanceof ErrorDeRed) {
          const guardada = await dato<{ ficha_url: string | null }>(supabase.from("productos").select("ficha_url").eq("tienda_id", tiendaId).eq("id", productoId).maybeSingle()).catch(() => undefined);
          if (guardada === undefined || (guardada?.ficha_url ?? null) !== (nueva?.url ?? null)) throw e;
        } else {
          if (nueva) await borrarArchivos(supabase.storage, [nueva.ruta]);
          throw e;
        }
      }
      await borrarArchivos(supabase.storage, rutasParaBorrar(tiendaId, [antes], [nueva?.url]));
      cambio(undefined);
      const f = await dato<FilaProducto>(supabase.from("productos").select(PRODUCTO_CON_VARIANTES).eq("tienda_id", tiendaId).eq("id", productoId).maybeSingle());
      if (!f) throw new DatosInvalidos("Ese producto ya no existe en tu tienda.");
      return aProducto(f);
    },
    async guardarFotoValor(tiendaId, productoId, eje, valor, url) {
      await dato(supabase.rpc("guardar_foto_valor", { p_tienda_id: tiendaId, p_producto_id: productoId, p_eje: eje, p_valor: valor, p_url: url }));
      const f = await requerido<FilaProducto>(
        supabase.from("productos").select(PRODUCTO_CON_VARIANTES).eq("tienda_id", tiendaId).eq("id", productoId).maybeSingle(),
        () => new DatosInvalidos("Ese producto ya no existe en esta tienda."),
      );
      return cambio(aProducto(f));
    },

    // ---- Solicitudes del catálogo ----
    solicitudesPendientes: (tiendaId) =>
      leer(`solicitudes:${tiendaId}`, async () => {
        const filas = await dato<FilaSolicitud[]>(
          supabase
            .from("solicitudes_pedido")
            .select("*")
            .eq("tienda_id", tiendaId)
            .is("pedido_id", null)
            .is("registrada_en", null)
            .is("descartada_en", null)
            .gt("vence_en", new Date().toISOString())
            .order("creada_en", { ascending: false }),
        );
        return (filas ?? []).map(aSolicitud);
      }),
    async registrarSolicitud(tiendaId, solicitudId, d) {
      const nuevo = d.clienteNuevo
        ? {
            nombre: d.clienteNuevo.nombre.trim(),
            telefono: d.clienteNuevo.telefono?.trim() ? d.clienteNuevo.telefono.trim() : null,
            nota: d.clienteNuevo.nota?.trim() ? d.clienteNuevo.nota.trim() : null,
          }
        : null;
      let creado: { id: string; cliente_id: string | null };
      try {
        creado = await requerido<{ id: string; cliente_id: string | null }>(
          supabase.rpc("registrar_solicitud", {
            p_solicitud_id: solicitudId,
            p_cliente_id: d.clienteId ?? null,
            p_cliente_nuevo: nuevo,
            p_quitar: d.quitar ?? [],
            p_encargo: d.encargo ?? [],
          }),
          () => new Error("La base no devolvió el pedido."),
        );
      } catch (e) {
        // El WhatsApp nuevo ya es de un cliente de la tienda: se le muestra quién es
        const telefono = nuevo?.telefono ? normalizarTelefonoDO(nuevo.telefono) : null;
        if (e instanceof TelefonoDuplicado && telefono) {
          const f = await dato<FilaCliente>(supabase.from("clientes").select("*").eq("tienda_id", tiendaId).eq("telefono", telefono).maybeSingle());
          if (f) throw new ClienteDuplicado(aCliente(f));
        }
        throw e;
      }
      const [pedido, filaCliente] = await Promise.all([
        pedidoCrudo(tiendaId, creado.id),
        creado.cliente_id ? dato<FilaCliente>(supabase.from("clientes").select("*").eq("tienda_id", tiendaId).eq("id", creado.cliente_id).maybeSingle()) : null,
      ]);
      if (!pedido || !filaCliente) throw new PedidoNoEncontrado();
      return cambio({ pedido, cliente: aCliente(filaCliente) });
    },
    async descartarSolicitud(_tiendaId, solicitudId) {
      await dato(supabase.rpc("descartar_solicitud", { p_solicitud_id: solicitudId }));
      cambio(undefined);
    },
    async solicitudPorCodigo(codigo) {
      // RLS: solo las de mis tiendas. Sin caché: el estado cambia (otra sesión pudo registrarla).
      const f = await dato<FilaSolicitud>(
        supabase.from("solicitudes_pedido").select("*").eq("codigo", codigo.trim().toUpperCase()).maybeSingle(),
      );
      return f ? aSolicitud(f) : null;
    },

    // ---- Avísame cuando llegue ----
    avisosPendientes: (tiendaId) =>
      leer(`avisos:${tiendaId}`, async () => {
        const filas = await dato<FilaAviso[]>(
          supabase
            .from("avisos_llegada")
            .select("id, tienda_id, producto_id, variante_id, telefono, nombre, creado_en, avisado_en")
            .eq("tienda_id", tiendaId)
            .is("avisado_en", null)
            .order("creado_en"),
        );
        return (filas ?? []).map(aAviso);
      }),
    avisosDeProducto: (tiendaId, productoId) =>
      leer(`avisos:${tiendaId}:${productoId}`, async () => {
        const filas = await dato<FilaAviso[]>(
          supabase
            .from("avisos_llegada")
            .select("id, tienda_id, producto_id, variante_id, telefono, nombre, creado_en, avisado_en")
            .eq("tienda_id", tiendaId)
            .eq("producto_id", productoId)
            .is("avisado_en", null)
            .order("creado_en"),
        );
        return (filas ?? []).map(aAviso);
      }),
    async marcarAvisado(_tiendaId, avisoIds) {
      if (avisoIds.length === 0) return 0;
      const n = await dato<number>(supabase.rpc("marcar_avisado", { p_aviso_ids: avisoIds }));
      return cambio(n ?? 0);
    },

    // ---- Catálogo público (anon) ----
    async catalogoPublico(slug) {
      const f = await requerido<FilaCatalogoPublico>(supabase.rpc("catalogo_publico", { p_slug: slug }), () => new CatalogoNoDisponible());
      return aCatalogoPublico(f);
    },
    async crearSolicitudPedido(slug, items, codigoPromo, dispositivo) {
      type FilaCreada = { codigo: string; subtotal: number; descuento: number; total: number; codigo_promo: string | null; items: FilaItemSolicitud[]; vence_en: string };
      const f = await requerido<FilaCreada>(
        supabase.rpc("crear_solicitud_pedido", {
          p_slug: slug,
          p_items: items.map((i) => ({ producto_id: i.productoId, variante_id: i.varianteId ?? null, cantidad: i.cantidad })),
          p_codigo_promo: codigoPromo?.trim() ? codigoPromo.trim() : null,
          p_dispositivo: dispositivo,
        }),
        () => new Error("La base no devolvió el pedido."),
      );
      return {
        codigo: f.codigo,
        subtotal: f.subtotal,
        descuento: f.descuento,
        total: f.total,
        codigoPromo: f.codigo_promo,
        items: f.items.map(aItemSolicitud),
        venceEn: f.vence_en,
      };
    },
    async verSolicitud(codigo) {
      try {
        const f = await dato<FilaVistaSolicitud>(supabase.rpc("ver_solicitud", { p_codigo: codigo }));
        return f ? aVistaSolicitud(f) : null;
      } catch (e) {
        if (e instanceof DatosInvalidos && /no encontramos ese pedido/i.test(e.message)) return null;
        throw e;
      }
    },
    async registrarAaah(slug, productoSlug, dispositivo, on) {
      const n = await dato<number>(supabase.rpc("registrar_aaah", { p_slug: slug, p_producto_slug: productoSlug, p_dispositivo: dispositivo, p_on: on }));
      return n ?? 0;
    },
    async pedirAviso(slug, productoSlug, varianteId, telefono, nombre, dispositivo) {
      await dato(
        supabase.rpc("pedir_aviso", {
          p_slug: slug,
          p_producto_slug: productoSlug,
          p_variante_id: varianteId,
          p_telefono: telefono,
          p_nombre: nombre?.trim() || null,
          p_dispositivo: dispositivo,
        }),
      );
    },

    // ---- Equipo (lib/data/equipo-supabase.ts) ----
    ...equipo,
    getMiPermiso: (tiendaId) => leer(`permiso:${tiendaId}`, () => equipo.getMiPermiso(tiendaId)),

    // ---- Solo demo ----
    async mirarDemoComo() {
      throw new SoloDemo();
    },
    async simularAvanceCatalogo() {
      throw new SoloDemo();
    },
    async simularPedidoCatalogo() {
      throw new SoloDemo();
    },
    async reiniciarDemo() {
      throw new SoloDemo();
    },
  };
}

export type FuenteSupabase = ReturnType<typeof crearFuenteSupabase>;
