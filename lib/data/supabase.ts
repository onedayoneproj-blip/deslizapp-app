// Implementación REAL de la interfaz de datos (lib/data/fuente.ts) sobre Supabase.
// - El contrato es supabase/migrations/ (si el doc y el SQL difieren, manda el SQL).
// - Lo que decide la base NO se repite aquí: el número del pedido, `pedidos_count`, `likes`, el stock al
//   despachar (RPC despachar_pedido) y los créditos (RPC gastar_creditos). El RLS limita todo a tu tienda.
// - Las filas (snake_case) se convierten SOLO con lib/data/filas.ts.

import type { SupabaseClient } from "@supabase/supabase-js";
import { CREDITOS_POR_RETOQUE } from "../config";
import { precioConPromo, validarPromo } from "../promos";
import { normalizarTelefonoDO } from "../telefono";
import type { Cliente, ClienteConResumen, EventoAaah, PedidoConItems, Promo } from "../types";
import { limpiarNota } from "./clientes";
import {
  ClienteDuplicado,
  CreditosInsuficientes,
  DatosInvalidos,
  PedidoNoEncontrado,
  PromoInvalida,
  SoloDemo,
  TelefonoDuplicado,
  traducirErrorSupabase,
} from "./errores";
import {
  aCliente,
  aEventoAaah,
  aPedidoConItems,
  aProducto,
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
  type FilaCliente,
  type FilaEventoAaah,
  type FilaPedidoConItems,
  type FilaPedidoItem,
  type FilaProducto,
  type FilaPromo,
  type FilaTienda,
  type FilaUsuario,
} from "./filas";
import type { FuenteDatos } from "./fuente";
import { buscarCodigoPromo, descuentoDeCodigo } from "./pedidos";
import { desdeFormulario, promoTerminada } from "./promos";

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
// Fotos y logo
// ---------------------------------------------------------------------------

/**
 * AQUÍ se conecta Supabase Storage: subir cada foto nueva (hoy llega como data URL ya reducida a
 * FOTO_LADO_MAXIMO) a un bucket de la tienda y devolver su URL pública. Mientras no exista el bucket
 * se guarda lo mismo que en la demo (la data URL), que funciona igual en el catálogo y en el panel.
 */
async function subirFotos(tiendaId: string, fotos: string[]): Promise<string[]> {
  void tiendaId;
  return fotos;
}

/** AQUÍ se conecta Supabase Storage para el logo (igual que las fotos). */
async function subirLogo(tiendaId: string, logo: string | null): Promise<string | null> {
  void tiendaId;
  return logo;
}

// ---------------------------------------------------------------------------
// La fuente
// ---------------------------------------------------------------------------

const PEDIDO_CON_ITEMS = "*, pedido_items(*)";

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

  // ---- lecturas crudas (sin caché), para usarlas dentro de las escrituras ----

  const productosCrudos = (tiendaId: string) =>
    todas<FilaProducto>((d, h) =>
      supabase.from("productos").select("*").eq("tienda_id", tiendaId).order("creado_en", { ascending: false }).order("id").range(d, h),
    ).then((filas) => filas.map((f) => aProducto(f)));

  const promosCrudas = (tiendaId: string) =>
    todas<FilaPromo>((d, h) =>
      supabase.from("promos").select("*").eq("tienda_id", tiendaId).order("fecha_inicio", { ascending: false }).order("id").range(d, h),
    ).then((filas) => filas.map((f) => aPromo(f)));

  const pedidosCrudos = (tiendaId: string) =>
    todas<FilaPedidoConItems>((d, h) =>
      supabase
        .from("pedidos")
        .select(PEDIDO_CON_ITEMS)
        .eq("tienda_id", tiendaId)
        .order("creado_en", { ascending: false })
        .order("id")
        .range(d, h),
    ).then((filas) => filas.map(aPedidoConItems));

  const tiendaCruda = async (tiendaId: string) => {
    const f = await dato<FilaTienda>(supabase.from("tiendas").select("*").eq("id", tiendaId).maybeSingle());
    return f ? aTienda(f) : null;
  };

  const pedidoCrudo = async (tiendaId: string, id: string) => {
    const f = await dato<FilaPedidoConItems>(supabase.from("pedidos").select(PEDIDO_CON_ITEMS).eq("tienda_id", tiendaId).eq("id", id).maybeSingle());
    return f ? aPedidoConItems(f) : null;
  };

  /** Resumen de cada cliente desde sus pedidos no cancelados (`pedidos_count` lo mantiene la base). */
  async function conResumen(tiendaId: string, filas: FilaCliente[], soloCliente?: string): Promise<ClienteConResumen[]> {
    type FilaResumen = { cliente_id: string | null; total: number; creado_en: string };
    const pedidos = await todas<FilaResumen>((d, h) => {
      let q = supabase.from("pedidos").select("cliente_id, total, creado_en").eq("tienda_id", tiendaId).neq("estado", "cancelado");
      if (soloCliente) q = q.eq("cliente_id", soloCliente);
      return q.order("creado_en", { ascending: false }).order("id").range(d, h);
    });
    const porCliente = new Map<string, { total: number; ultima: string | null }>();
    for (const p of pedidos) {
      if (!p.cliente_id) continue;
      const r = porCliente.get(p.cliente_id) ?? { total: 0, ultima: null };
      r.total += p.total;
      if (r.ultima === null || p.creado_en > r.ultima) r.ultima = p.creado_en;
      porCliente.set(p.cliente_id, r);
    }
    return filas.map((f) => {
      const r = porCliente.get(f.id);
      return {
        ...aCliente(f),
        pedidos: f.pedidos_count,
        totalGastado: r?.total ?? 0,
        ultimaCompra: r?.ultima ?? null,
        repite: f.pedidos_count >= 2,
      };
    });
  }

  /** Cambia el estado solo si el pedido sigue en uno de los estados `desde` (dos teléfonos a la vez no se pisan). */
  async function moverPedido(tiendaId: string, id: string, desde: string[], estado: "por_despachar" | "cancelado") {
    const f = await dato<FilaPedidoConItems>(
      supabase.from("pedidos").update({ estado }).eq("tienda_id", tiendaId).eq("id", id).in("estado", desde).select(PEDIDO_CON_ITEMS).maybeSingle(),
    );
    if (!f) {
      if (!(await pedidoCrudo(tiendaId, id))) throw new PedidoNoEncontrado();
      throw new DatosInvalidos("Ese pedido ya cambió de estado. Actualiza la lista.");
    }
    return cambio(aPedidoConItems(f));
  }

  /**
   * Las promos que ya vencieron por fecha quedan guardadas como `terminada`. Así el índice único de códigos
   * de la base (solo entre promos no terminadas) coincide con lo que ve el dueño: un código de una promo
   * vencida se puede volver a usar.
   */
  async function guardarVencidas(tiendaId: string) {
    await dato(
      supabase.from("promos").update({ estado: "terminada" }).eq("tienda_id", tiendaId).neq("estado", "terminada").lt("fecha_fin", new Date().toISOString()),
    );
  }

  return {
    olvidar,

    // ---- Tiendas ----
    getTiendas: () =>
      leer("tiendas", async () => {
        const filas = (await dato<FilaTienda[]>(supabase.from("tiendas").select("*").order("nombre"))) ?? [];
        return filas.map((f) => aTienda(f));
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
    async actualizarMarca(tiendaId, datos) {
      const logoUrl = await subirLogo(tiendaId, datos.logoUrl);
      const f = await requerido<FilaTienda>(
        supabase.from("tiendas").update(filaMarca({ ...datos, logoUrl })).eq("id", tiendaId).select("*").maybeSingle(),
        () => new DatosInvalidos("No encontramos tu tienda."),
      );
      return cambio(aTienda(f));
    },

    // ---- Productos ----
    getProductos: (tiendaId) => leer(`productos:${tiendaId}`, () => productosCrudos(tiendaId)),
    getProducto: (tiendaId, id) =>
      leer(`producto:${tiendaId}:${id}`, async () => {
        const f = await dato<FilaProducto>(supabase.from("productos").select("*").eq("tienda_id", tiendaId).eq("id", id).maybeSingle());
        return f ? aProducto(f) : null;
      }),
    async crearProducto(tiendaId, datos) {
      const fotos = await subirFotos(tiendaId, datos.fotos);
      const f = await requerido<FilaProducto>(
        supabase.from("productos").insert(filaProductoNuevo(tiendaId, { ...datos, fotos })).select("*").single(),
        () => new Error("La base no devolvió el producto."),
      );
      return cambio(aProducto(f));
    },
    async actualizarProducto(tiendaId, id, cambios) {
      const fotos = cambios.fotos ? await subirFotos(tiendaId, cambios.fotos) : undefined;
      const f = await requerido<FilaProducto>(
        supabase
          .from("productos")
          .update(filaCambiosProducto(fotos ? { ...cambios, fotos } : cambios))
          .eq("tienda_id", tiendaId)
          .eq("id", id)
          .select("*")
          .maybeSingle(),
        () => new DatosInvalidos("Ese producto ya no existe en tu tienda."),
      );
      return cambio(aProducto(f));
    },

    // ---- Pedidos ----
    getPedidos: (tiendaId) => leer(`pedidos:${tiendaId}`, () => pedidosCrudos(tiendaId)),
    getPedido: (tiendaId, id) => leer(`pedido:${tiendaId}:${id}`, () => pedidoCrudo(tiendaId, id)),
    confirmarPedido: (tiendaId, id) => moverPedido(tiendaId, id, ["nuevo"], "por_despachar"),
    cancelarPedido: (tiendaId, id) => moverPedido(tiendaId, id, ["nuevo", "por_despachar"], "cancelado"),
    async despacharPedido(tiendaId, id) {
      // Todo o nada en la base: revisa y descuenta el stock y marca el pedido.
      await dato(supabase.rpc("despachar_pedido", { p_pedido_id: id }));
      const pedido = await pedidoCrudo(tiendaId, id);
      if (!pedido) throw new PedidoNoEncontrado();
      const ids = [...new Set(pedido.items.map((i) => i.productoId))];
      const agotados =
        ids.length === 0
          ? []
          : ((await dato<{ nombre: string }[]>(supabase.from("productos").select("nombre").eq("tienda_id", tiendaId).in("id", ids).eq("stock", 0))) ?? []).map(
              (p) => p.nombre,
            );
      return cambio({ pedido, agotados });
    },
    async crearPedidoManual(tiendaId, datos) {
      const lineas = datos.items.filter((i) => i.cantidad > 0);
      if (lineas.length === 0) throw new DatosInvalidos("El pedido necesita al menos un producto.");
      const [productos, promos, filaCliente] = await Promise.all([
        productosCrudos(tiendaId),
        promosCrudas(tiendaId),
        dato<FilaCliente>(supabase.from("clientes").select("*").eq("tienda_id", tiendaId).eq("id", datos.clienteId).maybeSingle()),
      ]);
      if (!filaCliente) throw new DatosInvalidos("Ese cliente ya no existe en tu tienda.");

      // Precios de hoy (con la promo de colección o de producto vigente) y el código, si es válido.
      const ahora = new Date();
      const items = lineas.map((l) => {
        const producto = productos.find((p) => p.id === l.productoId);
        if (!producto) throw new DatosInvalidos("Un producto del pedido ya no existe en tu tienda.");
        return { productoId: producto.id, nombreProducto: producto.nombre, cantidad: l.cantidad, precioUnitario: precioConPromo(producto, promos, ahora).precio };
      });
      const subtotal = items.reduce((suma, i) => suma + i.precioUnitario * i.cantidad, 0);
      const promo = datos.codigo ? buscarCodigoPromo(promos, tiendaId, datos.codigo, ahora) : null;

      // Sin `numero`: lo asigna la base.
      const filaPedido = await requerido<FilaPedidoConItems>(
        supabase
          .from("pedidos")
          .insert(
            filaPedidoNuevo(tiendaId, {
              clienteId: filaCliente.id,
              origen: "manual",
              estado: "por_despachar",
              total: subtotal - descuentoDeCodigo(promo, subtotal),
              codigoPromo: promo?.codigo ?? null,
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
      const pedido: PedidoConItems = aPedidoConItems({ ...filaPedido, pedido_items: filasItems });
      return cambio({ pedido, cliente: aCliente(filaCliente) });
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
          supabase.from("clientes").insert(filaClienteNuevo(tiendaId, { nombre, telefono, nota: limpiarNota(datos.nota), origen: "manual" })).select("*").single(),
          () => new Error("La base no devolvió el cliente."),
        );
        return cambio(aCliente(f));
      } catch (e) {
        if (!(e instanceof TelefonoDuplicado)) throw e;
        // El teléfono es único por tienda: se muestra quién lo tiene.
        const existente = await dato<FilaCliente>(supabase.from("clientes").select("*").eq("tienda_id", tiendaId).eq("telefono", telefono).maybeSingle());
        throw existente ? new ClienteDuplicado(aCliente(existente)) : e;
      }
    },
    async actualizarNotaCliente(tiendaId, id, nota) {
      const f = await requerido<FilaCliente>(
        supabase.from("clientes").update({ nota: limpiarNota(nota) }).eq("tienda_id", tiendaId).eq("id", id).select("*").maybeSingle(),
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
      const f = await requerido<FilaPromo>(supabase.from("promos").insert(filaPromo(tiendaId, promo)).select("*").single(), () => new Error("La base no devolvió la promo."));
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
        supabase.from("promos").update({ estado: promo.estado, fecha_fin: promo.fechaFin }).eq("tienda_id", tiendaId).eq("id", id).select("*").maybeSingle(),
        () => new DatosInvalidos("Esa promo ya no existe en tu tienda."),
      );
      return cambio(aPromo(f));
    },

    // ---- Aaahs (solo lectura) ----
    getEventosAaah: (tiendaId) =>
      leer(`aaah:${tiendaId}`, async (): Promise<EventoAaah[]> => {
        const filas = await todas<FilaEventoAaah>((d, h) =>
          supabase.from("eventos_aaah").select("id, tienda_id, producto_id, creado_en").eq("tienda_id", tiendaId).order("creado_en", { ascending: false }).order("id").range(d, h),
        );
        return filas.map((f) => aEventoAaah(f));
      }),

    // ---- Solo demo ----
    async simularPedidoCatalogo() {
      throw new SoloDemo();
    },
    async reiniciarDemo() {
      throw new SoloDemo();
    },
  };
}

export type FuenteSupabase = ReturnType<typeof crearFuenteSupabase>;
