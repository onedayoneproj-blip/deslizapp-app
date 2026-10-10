// Onboarding de una tienda nueva (docs/17-onboarding.md): historias de bienvenida y la historia de tu tienda en 4 capítulos.
// Aquí va lo que no es pantalla: validar, el borrador local (si cierra a mitad, se recupera en ese teléfono) y los textos que
// dependen de los datos. La tienda no existe hasta cerrar el capítulo 4 (una sola llamada: crear_mi_tienda_completa).

import { iniciales } from "./formato";
import { RUBROS, type Rubro } from "./rubros";
import { normalizarTelefonoDO } from "./telefono";

/** Claves de `tiendas.onboarding` (timestamps ISO). La base solo acepta estas (marcar_onboarding). */
export const CLAVES_ONBOARDING = ["intro_vista_en", "colores_elegidos_en", "pantalla_inicio_en", "equipo_omitido_en", "checklist_cerrado_en"] as const;
export type ClaveOnboarding = (typeof CLAVES_ONBOARDING)[number];

/** Historias de bienvenida (pantallas 08-11 del lienzo). */
export const TOTAL_HISTORIAS = 4;
/** Cuánto dura cada historia si nadie toca (ms). */
export const DURACION_HISTORIA_MS = 6500;
/** Capítulos de la historia de tu tienda (12-15). */
export const TOTAL_CAPITULOS = 4;
export type Capitulo = 1 | 2 | 3 | 4;

export const NOMBRE_TIENDA_MAX = 80;
export const NOMBRE_VENDEDORA_MAX = 40;

/** Cómo se llama cada rubro en el capítulo 2 («Otra cosa» = general). */
export const NOMBRE_RUBRO_ONBOARDING: Record<Rubro, string> = {
  perfumes: "Perfumes",
  ropa: "Ropa",
  accesorios: "Accesorios",
  belleza: "Belleza",
  comida: "Comida",
  hogar: "Hogar",
  general: "Otra cosa",
};

/** El primer nombre de la cuenta de Google ("María José Peña" → "María"). Sin nombre: null. */
export function primerNombre(nombre: string | null | undefined): string | null {
  const primero = (nombre ?? "").trim().split(/\s+/)[0] ?? "";
  return primero ? primero.slice(0, NOMBRE_VENDEDORA_MAX) : null;
}

/** «Hola, {nombre}.» o «Hola.» */
export const saludoOnboarding = (nombre: string | null) => (nombre ? `Hola, ${nombre}.` : "Hola.");

/** Error del nombre de la tienda, o null si sirve. */
export function errorNombreTienda(nombre: string): string | null {
  const n = nombre.trim();
  if (!n) return "Escribe el nombre de tu tienda.";
  if (n.length > NOMBRE_TIENDA_MAX) return `Hasta ${NOMBRE_TIENDA_MAX} letras.`;
  return null;
}

/** Error del nombre de la vendedora, o null si sirve. */
export function errorVendedora(nombre: string): string | null {
  const n = nombre.trim();
  if (!n) return "Escribe cómo te llaman.";
  if (n.length > NOMBRE_VENDEDORA_MAX) return `Hasta ${NOMBRE_VENDEDORA_MAX} letras.`;
  return null;
}

/**
 * El WhatsApp de la tienda como lo guarda la base (solo dígitos, con el 1: "18496503269"), o null si no es dominicano. Se valida
 * igual que el teléfono de un cliente (809, 829 o 849 + 7 dígitos; acepta "+1", guiones y espacios).
 */
export function whatsappParaGuardar(texto: string): string | null {
  const n = normalizarTelefonoDO(texto);
  return n ? n.slice(1) : null;
}

/**
 * Lo escrito en el campo, en grupos ("8496503269" → "849 650 3269"). Sin el 1 del país: el campo ya muestra «+1» (ningún número
 * dominicano empieza con 1, así que un 1 al inicio es el del país).
 */
export function whatsappEscrito(texto: string): string {
  const d = texto.replace(/\D/g, "").replace(/^1/, "").slice(0, 10);
  return [d.slice(0, 3), d.slice(3, 6), d.slice(6)].filter(Boolean).join(" ");
}

/** "18496503269" → "+1 849 650 3269" (la cabecera del capítulo 4). */
export const whatsappVisible = (digitos: string) => `+1 ${whatsappEscrito(digitos)}`;

/** Marca o desmarca un rubro: se agrega al final (el primero sigue siendo el principal) o se quita. */
export function alternarRubro(lista: readonly Rubro[], r: Rubro): Rubro[] {
  return lista.includes(r) ? lista.filter((x) => x !== r) : [...lista, r];
}

/** "perfumes y ropa", "perfumes, ropa y hogar" (la cabecera del capítulo 3). */
export function rubrosEnTexto(rubros: readonly Rubro[]): string {
  const nombres = rubros.map((r) => (r === "general" ? "otras cosas" : NOMBRE_RUBRO_ONBOARDING[r].toLowerCase()));
  if (nombres.length <= 1) return nombres[0] ?? "";
  return `${nombres.slice(0, -1).join(", ")} y ${nombres.at(-1)}`;
}

/** Iniciales de la tienda para el avatar ("Esencias Michel" → "EM"); vacío → "?". */
export const inicialesTienda = (nombre: string) => iniciales(nombre.replace(/[^\p{L}\p{N}\s]/gu, " ")) || "?";

// ─── Borrador ──────────────────────────────────────────────────────────────────────────────────────────────────────────────

export const CLAVE_BORRADOR = "deslizapp-onboarding-v1";
export const CLAVE_BORRADOR_DEMO = "deslizapp-onboarding-demo-v1";

export type Borrador = {
  /** De qué enlace es: un borrador de otro enlace no se usa. */
  enlaceId: string;
  capitulo: Capitulo;
  nombre: string;
  rubros: Rubro[];
  /** Lo escrito, tal cual (se normaliza al guardar la tienda). */
  whatsapp: string;
  /** null = no lo ha tocado: se usa el primer nombre de Google. */
  vendedora: string | null;
  /**
   * La foto o el logo que eligió en el capítulo 1, ya recortado (JPEG cuadrado, data URL). Vive aquí porque la tienda todavía no
   * existe (el storage pide su carpeta); se sube al cerrar el capítulo 4. null = sin foto (iniciales).
   */
  logo: string | null;
};

export const borradorNuevo = (enlaceId: string): Borrador => ({ enlaceId, capitulo: 1, nombre: "", rubros: [], whatsapp: "", vendedora: null, logo: null });

/** Lee el borrador guardado (texto JSON). Lo que no encaja se descarta campo por campo; de otro enlace, null. */
export function leerBorrador(texto: string | null, enlaceId: string): Borrador | null {
  if (!texto) return null;
  let d: unknown;
  try {
    d = JSON.parse(texto);
  } catch {
    return null;
  }
  if (!d || typeof d !== "object") return null;
  const o = d as Record<string, unknown>;
  if (o.enlaceId !== enlaceId) return null;
  const texto_ = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");
  const rubros = Array.isArray(o.rubros) ? o.rubros.filter((r): r is Rubro => (RUBROS as readonly unknown[]).includes(r)) : [];
  const capitulo = [1, 2, 3, 4].includes(o.capitulo as number) ? (o.capitulo as Capitulo) : 1;
  return {
    enlaceId,
    capitulo,
    nombre: texto_(o.nombre, NOMBRE_TIENDA_MAX + 20),
    rubros: [...new Set(rubros)].slice(0, RUBROS.length),
    whatsapp: texto_(o.whatsapp, 30),
    vendedora: typeof o.vendedora === "string" ? o.vendedora.slice(0, NOMBRE_VENDEDORA_MAX + 20) : null,
    logo: esLogoGuardable(o.logo) ? o.logo : null,
  };
}

/** El nombre de la vendedora que se muestra: lo que escribió o, si no lo ha tocado, el de Google. */
export const vendedoraDe = (b: Borrador, deGoogle: string | null) => b.vendedora ?? deGoogle ?? "";

/** ¿Puede pasar del capítulo? (el botón «Seguir» / «Cerrar el capítulo»). */
export function capituloListo(b: Borrador, deGoogle: string | null): boolean {
  if (b.capitulo === 1) return errorNombreTienda(b.nombre) === null;
  if (b.capitulo === 2) return b.rubros.length > 0;
  if (b.capitulo === 3) return whatsappParaGuardar(b.whatsapp) !== null;
  return errorVendedora(vendedoraDe(b, deGoogle)) === null;
}

/** Lo que se manda a crear_mi_tienda_completa, ya validado. null si falta algo. */
export function datosParaCrear(b: Borrador, deGoogle: string | null) {
  const whatsapp = whatsappParaGuardar(b.whatsapp);
  const vendedora = vendedoraDe(b, deGoogle).trim();
  if (errorNombreTienda(b.nombre) || b.rubros.length === 0 || !whatsapp || errorVendedora(vendedora)) return null;
  return { nombre: b.nombre.trim(), rubros: [...b.rubros], whatsapp, vendedora };
}

/**
 * Solo para la DEMO: el slug que pondría la base, calculado aquí con la lista de slugs de la demo. En el modo real la vista previa
 * sale SIEMPRE de la base (`vista_slug`), nunca de esta copia.
 */
export function slugDemo(nombre: string, ocupados: readonly string[]): string | null {
  const n = nombre.trim();
  if (!n || n.length > NOMBRE_TIENDA_MAX) return null;
  let base = n
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!base) base = "tienda";
  base = base.slice(0, 50).replace(/-+$/, "");
  let slug = base;
  for (let i = 2; ocupados.includes(slug); i++) slug = `${base}-${i}`;
  return slug;
}

// ─── El logo en «ya existe» (opcional) ───────────────────────────────────────────────────────────────────────────────────

/** Lado del logo ya recortado (px): cuadrado, en JPEG, unos 40-60 KB. */
export const LOGO_LADO = 512;
export const LOGO_CALIDAD = 0.82;
/** Lo más largo que se guarda en el borrador (un JPEG de 512 px cabe de sobra). */
export const LOGO_BORRADOR_MAX = 400_000;

/** ¿Es un logo recortado que se puede guardar en el borrador? (data URL de imagen, no demasiado largo). */
export function esLogoGuardable(v: unknown): v is string {
  return typeof v === "string" && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(v) && v.length <= LOGO_BORRADOR_MAX;
}

/** El recorte cuadrado centrado de una imagen de ancho × alto: de dónde se toma (sx, sy) y de qué lado. */
export function recorteCuadrado(ancho: number, alto: number): { sx: number; sy: number; lado: number } {
  const lado = Math.max(1, Math.min(ancho, alto));
  return { sx: Math.round((ancho - lado) / 2), sy: Math.round((alto - lado) / 2), lado };
}

/**
 * La foto elegida, recortada en cuadrado al centro y reducida a 512 px en JPEG (en el teléfono, antes de subir nada). Se ve en
 * círculo con CSS. Lanza si el navegador no la puede leer.
 */
export async function prepararLogo(archivo: Blob): Promise<string> {
  const url = URL.createObjectURL(archivo);
  try {
    const img = await new Promise<HTMLImageElement>((ok, mal) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => mal(new Error("imagen_ilegible"));
      i.src = url;
    });
    const { sx, sy, lado } = recorteCuadrado(img.naturalWidth, img.naturalHeight);
    const salida = Math.min(LOGO_LADO, lado);
    const lienzo = document.createElement("canvas");
    lienzo.width = salida;
    lienzo.height = salida;
    const ctx = lienzo.getContext("2d");
    if (!ctx) throw new Error("imagen_ilegible");
    // JPEG no tiene transparencia: un logo PNG con fondo transparente queda sobre blanco.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, salida, salida);
    ctx.drawImage(img, sx, sy, lado, lado, 0, 0, salida, salida);
    return lienzo.toDataURL("image/jpeg", LOGO_CALIDAD);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Lo más pesado que se acepta para el logo (fotos del teléfono incluidas; después se reduce a 512 px). */
export const LOGO_MAX_BYTES = 20 * 1024 * 1024;

/** Por qué no sirve el archivo elegido para el logo, en la voz de la marca; null si sirve. */
export function errorArchivoLogo(archivo: { type: string; size: number }): string | null {
  if (!archivo.type.startsWith("image/")) return "Eso no es una imagen. Elige una foto o tu logo.";
  if (archivo.size > LOGO_MAX_BYTES) return "Esa imagen pesa mucho. Prueba con una más liviana (hasta 20 MB).";
  return null;
}
