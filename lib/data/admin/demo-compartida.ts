import type { DB } from "../db";
import type { Tienda } from "../../types";
import { crearFuenteAdminDemo } from "./demo";
import type { FuenteAdmin } from "./fuente-admin";
import { crearEstadoAdminDemo, type TiendaDemoAdmin } from "./seed";

/** Lo que el admin puede cambiar de una tienda del panel y vuelve a ella (el resto lo decide la tienda). */
const CAMPOS_TIENDA = [
  "creditosRetoque",
  "personalizacion",
  "catalogoEstado",
  "catalogoPaso",
  "catalogoNotasCambios",
  "urlCatalogo",
  "estado",
] as const;
/** Lo que Fotos y Personalizar cambian de un producto. */
const CAMPOS_PRODUCTO = ["medios", "fotos", "fotoRetocada", "orden", "opiniones"] as const;
/** Solo del admin (el panel no lo tiene): se conserva al volver a leer la tienda. */
const SOLO_ADMIN = ["plan", "pagadoHasta", "pruebaHasta", "diasGracia", "catalogoPasoEn", "ultimaActividadEn", "activadaEn"] as const;
/** Listas del panel que dependen de la tienda: para sus propias tiendas manda el panel. */
const LISTAS = ["usuarios", "productos", "pedidos", "solicitudes", "eventosAaah"] as const;
/** Lo que el admin agrega al leer un trabajo y no se guarda. */
const SOLO_LECTURA_TRABAJO = ["tiendaNombre", "tiendaWhatsapp", "vendedora", "productoNombre"] as const;

type Copia = Record<string, string>;
const copia = (o: object, campos: readonly string[]): Copia =>
  Object.fromEntries(campos.map((k) => [k, JSON.stringify((o as Record<string, unknown>)[k] ?? null)]));

/**
 * El admin demo (/admin-demo) y la demo del panel, en el mismo navegador, comparten tiendas, productos, fotos del taller,
 * créditos y personalización: la tienda manda una foto al taller desde su panel, el admin la entrega o la devuelve aquí,
 * y la tienda lo ve al volver. Nunca toca Supabase: `leer` y `guardar` son los de la demo del panel (lib/data/demo.ts).
 *
 * - Antes de cada operación se vuelve a leer la demo del panel: para sus tiendas, lo de la tienda manda.
 * - Después de una escritura confirmada se devuelve al panel SOLO lo que el admin cambió (comparado campo a campo con lo
 *   leído), así un cambio de la tienda que llegó entre medias no se pisa.
 * - Las operaciones van en fila: una lectura del panel nunca cae en medio de otra operación.
 * - Lo que es solo del admin (pagos, registro, planes, tiendas de ejemplo de Hoy) sigue en memoria, como antes.
 */
export function crearFuenteAdminDemoCompartida(
  leer: () => DB,
  guardar: (cambio: (db: DB) => DB) => void,
  reloj: () => number = Date.now,
): FuenteAdmin {
  const estado = crearEstadoAdminDemo(reloj(), leer());
  let ids = new Set<string>();
  let base = { tiendas: new Map<string, Copia>(), productos: new Map<string, Copia>(), trabajos: new Map<string, string>() };

  function tomarBase() {
    base = {
      tiendas: new Map(estado.panel.tiendas.filter((t) => ids.has(t.id)).map((t) => [t.id, copia(t, CAMPOS_TIENDA)])),
      productos: new Map(estado.panel.productos.filter((p) => ids.has(p.tiendaId)).map((p) => [p.id, copia(p, CAMPOS_PRODUCTO)])),
      trabajos: new Map(estado.trabajos.filter((t) => ids.has(t.tiendaId)).map((t) => [t.id, JSON.stringify(t)])),
    };
  }

  /** Trae la demo del panel al estado del admin. */
  function refrescar() {
    const db = leer();
    ids = new Set(db.tiendas.map((t) => t.id));
    const tiendas = db.tiendas.map((t) => {
      const antes = estado.panel.tiendas.find((x) => x.id === t.id);
      const extras = antes
        ? Object.fromEntries(SOLO_ADMIN.map((k) => [k, antes[k]]))
        : {
            pagadoHasta: null,
            pruebaHasta: null,
            diasGracia: 5,
            catalogoPasoEn: t.catalogoSolicitadoEn ?? t.catalogoPublicadoEn,
            ultimaActividadEn: null,
            activadaEn: t.estado === "activa" ? t.creadoEn : null,
          };
      return { ...structuredClone(t), ...extras } as TiendaDemoAdmin;
    });
    estado.panel.tiendas = [...tiendas, ...estado.panel.tiendas.filter((t) => !ids.has(t.id))];
    for (const lista of LISTAS) {
      const deEjemplo = (estado.panel[lista] as { tiendaId: string }[]).filter((x) => !ids.has(x.tiendaId));
      (estado.panel as Record<string, unknown>)[lista] = [...structuredClone(db[lista]), ...deEjemplo];
    }
    estado.trabajos = [...estado.trabajos.filter((t) => !ids.has(t.tiendaId)), ...structuredClone(db.trabajosRetoque ?? [])];
    // La marca para el retoque es de la tienda: el admin la lee tal cual está en su panel (no la escribe).
    estado.panel.marcasRetoque = structuredClone(db.marcasRetoque ?? {});
    // Si el saldo de la tienda cambió en su panel, el registro del admin lo anota como ajuste para que cuadre.
    for (const t of tiendas) {
      const suma = estado.movimientos.filter((m) => m.tiendaId === t.id).reduce((n, m) => n + m.cantidad, 0);
      if (suma !== t.creditosRetoque)
        estado.movimientos.push({
          id: crypto.randomUUID(),
          tiendaId: t.id,
          cantidad: t.creditosRetoque - suma,
          tipo: "ajuste",
          motivo: "saldo de la tienda demo",
          pagoId: null,
          trabajoId: null,
          periodo: null,
          creadoPor: null,
          creadoEn: new Date(reloj()).toISOString(),
        });
    }
    tomarBase();
  }

  /** Después de una escritura del admin: devuelve al panel solo lo que cambió desde la última lectura. */
  function devolver() {
    const cambios = <T extends { id: string }>(lista: T[], copias: Map<string, Copia>, campos: readonly string[]) => {
      const r = new Map<string, Partial<T>>();
      for (const x of lista) {
        const b = copias.get(x.id);
        if (!b) continue;
        const ahora = copia(x, campos);
        const c = Object.fromEntries(
          campos.filter((k) => ahora[k] !== b[k]).map((k) => [k, structuredClone((x as Record<string, unknown>)[k])]),
        ) as Partial<T>;
        if (Object.keys(c).length) r.set(x.id, c);
      }
      return r;
    };
    const tiendas = cambios<Tienda>(estado.panel.tiendas as unknown as Tienda[], base.tiendas, CAMPOS_TIENDA);
    const productos = cambios(estado.panel.productos, base.productos, CAMPOS_PRODUCTO);
    const trabajos = estado.trabajos.filter((t) => ids.has(t.tiendaId) && base.trabajos.get(t.id) !== JSON.stringify(t));
    if (!tiendas.size && !productos.size && !trabajos.length) return;
    const en = new Date(reloj()).toISOString();
    guardar((db) => {
      const lista = [...(db.trabajosRetoque ?? [])];
      for (const t of trabajos) {
        const limpio = structuredClone(t);
        for (const k of SOLO_LECTURA_TRABAJO) delete limpio[k];
        const i = lista.findIndex((x) => x.id === t.id);
        if (i >= 0) lista[i] = limpio;
        else lista.push(limpio);
      }
      return {
        ...db,
        tiendas: db.tiendas.map((t) => (tiendas.has(t.id) ? { ...t, ...tiendas.get(t.id) } : t)),
        productos: db.productos.map((p) => (productos.has(p.id) ? { ...p, ...productos.get(p.id), actualizadoEn: en } : p)),
        trabajosRetoque: lista,
      };
    });
    tomarBase();
  }

  const fuente = crearFuenteAdminDemo(estado, reloj, devolver);
  let fila: Promise<unknown> = Promise.resolve();
  return new Proxy(fuente, {
    get(objetivo, clave, receptor) {
      const v = Reflect.get(objetivo, clave, receptor);
      if (typeof v !== "function") return v;
      return (...args: unknown[]) => {
        const r = fila.then(() => {
          refrescar();
          return (v as (...a: unknown[]) => Promise<unknown>).apply(objetivo, args);
        });
        fila = r.catch(() => {});
        return r;
      };
    },
  });
}
