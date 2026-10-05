// Las mismas cinco operaciones de FuenteDatos, compartidas con el adaptador del panel.
// La entrada pública no importa fotos, inventario, pedidos ni seed de la administración.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { FuentePublica } from "./publica";
import { dato, requerido } from "./supabase-resultado";
import { CatalogoNoDisponible, DatosInvalidos } from "./errores";
import { aCatalogoPublico, aItemSolicitud, aVistaSolicitud, type FilaCatalogoPublico, type FilaItemSolicitud, type FilaVistaSolicitud } from "./filas";
export function crearOperacionesPublicas(supabase: SupabaseClient): FuentePublica {
 return {
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

 };
}
