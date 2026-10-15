// El enlace del catálogo en línea de la tienda (tiendas.url_catalogo). Sin dependencias: se prueba en tests/enlace-catalogo.test.mjs.

export type EnlaceCatalogo = {
  /** La dirección completa y normalizada (siempre https). */
  href: string;
  /** El dominio, para destacarlo ("esenciasmichel.com"). */
  dominio: string;
  /** Lo que sigue al dominio ("/catalogo"), para mostrarlo más suave. */
  resto: string;
};

/** Un enlace https válido, o null (se trata como "sin enlace"). Nunca se usa como HTML: solo como href o texto. */
export function enlaceCatalogo(url: string | null | undefined): EnlaceCatalogo | null {
  if (!url) return null;
  try {
    const u = new URL(url.trim());
    if (u.protocol !== "https:" || !u.hostname.includes(".") || u.username || u.password) return null;
    if (u.pathname === "/tienda/deslizapp-ejemplo" || (u.pathname.startsWith("/tienda/") && u.searchParams.get("demo") === "interna")) {
      if (u.pathname === "/tienda/deslizapp-ejemplo") u.searchParams.set("demo", "");
      const local = new URL(u.pathname + u.search + u.hash, typeof window === "undefined" ? "https://deslizapp.com" : window.location.origin);
      return { href: local.href, dominio: "Demo de Deslizapp", resto: u.pathname + u.search };
    }
    const resto = `${u.pathname === "/" ? "" : u.pathname}${u.search}${u.hash}`;
    return { href: u.href, dominio: u.hostname.replace(/^www\./, ""), resto };
  } catch {
    return null;
  }
}

/** "Mira el catálogo de {tienda}: {enlace}" */
export function mensajeCatalogo(nombreTienda: string, enlace: string): string {
  return `Mira el catálogo de ${nombreTienda}: ${enlace}`;
}

/** Abre WhatsApp para compartir el mensaje (sin destinatario: la persona elige a quién). */
export function urlWhatsAppCatalogo(nombreTienda: string, enlace: string): string {
  return `https://wa.me/?text=${encodeURIComponent(mensajeCatalogo(nombreTienda, enlace))}`;
}
