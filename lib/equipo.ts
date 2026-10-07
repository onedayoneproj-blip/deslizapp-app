// Equipo de una tienda: niveles de colaborador, grupos de permiso y textos (docs/prompts/colaboradores-e-invitaciones.md).
// Lo exige la BASE (`public.nivel_tiene_grupo`, `exigir_permiso` y las políticas restrictivas); aquí solo se refleja para que la
// pantalla explique de antemano qué no se puede. Si los dos mapas no coinciden, manda la base. Sin dependencias (tests).

export type Nivel = "ayudante" | "editor" | "administrador";
export type Grupo = "ventas" | "catalogo" | "creditos" | "marca" | "compras" | "equipo";
export type Rol = "dueno" | "staff";

/** Lo que la cuenta es en la tienda activa. */
export type MiPermiso = { rol: Rol; nivel: Nivel };

export const PERMISO_DUENO: MiPermiso = { rol: "dueno", nivel: "administrador" };

export const NIVELES: { id: Nivel; nombre: string; detalle: string }[] = [
  { id: "ayudante", nombre: "Ayudante", detalle: "Pedidos, clientes, abonos, solicitudes del catálogo y promos." },
  { id: "editor", nombre: "Editor", detalle: "Lo del Ayudante, más productos, inventario y catálogo." },
  { id: "administrador", nombre: "Administrador", detalle: "Lo del Editor, más créditos, retoque y Mi marca." },
];

export const NOMBRE_NIVEL: Record<Nivel, string> = { ayudante: "Ayudante", editor: "Editor", administrador: "Administrador" };

/** El mismo mapa que `public.nivel_tiene_grupo` en la base. `equipo` nunca es de un colaborador. */
export function nivelTieneGrupo(nivel: Nivel, grupo: Grupo): boolean {
  switch (grupo) {
    case "ventas":
      return true;
    case "catalogo":
      return nivel === "editor" || nivel === "administrador";
    case "creditos":
    case "marca":
    case "compras":
      return nivel === "administrador";
    default:
      return false;
  }
}

/** ¿Puede? El dueño todo. Sin saber todavía (null), se deja: la base decide igual. */
export function puede(permiso: MiPermiso | null | undefined, grupo: Grupo): boolean {
  if (!permiso) return true;
  return permiso.rol === "dueno" || nivelTieneGrupo(permiso.nivel, grupo);
}

/** El porqué corto de lo que se ve apagado (y el mensaje cuando la base dice `sin_permiso`). */
export const TEXTO_SIN_PERMISO = "Esto lo hace quien administra la tienda.";

export type MiembroEquipo = { usuarioId: string; nombre: string; email: string; foto: string | null; rol: Rol; nivel: Nivel; soyYo: boolean; desde: string };
export type SolicitudEquipo = { id: string; nivel: Nivel; nota: string | null; nombre: string; email: string; reclamadoEn: string };
export type EnlaceEquipo = { id: string; nivel: Nivel; nota: string | null; creadoEn: string; venceEn: string };
export type InvitacionCorreo = { email: string; nivel: Nivel; creadoEn: string };
export type EquipoTienda = { miembros: MiembroEquipo[]; solicitudes: SolicitudEquipo[]; enlaces: EnlaceEquipo[]; invitaciones: InvitacionCorreo[] };

export const NOTA_MAX = 40;

/** El enlace que se comparte. Solo la ruta `/unirse/…` lleva el código. */
export function urlUnirse(origen: string, codigo: string): string {
  return `${origen.replace(/\/$/, "")}/unirse/${encodeURIComponent(codigo)}`;
}

/** El mensaje para mandar por WhatsApp (voz de docs/11: corto, cálido, sin signos de exclamación). */
export function mensajeInvitacion(tienda: string, url: string): string {
  return `Te invito al equipo de ${tienda} en Deslizapp. Ábrelo con tu cuenta de Google y yo te apruebo: ${url}`;
}

/** «Vence en 3 días», «vence hoy». */
export function textoVence(venceEn: string, ahora: number = Date.now()): string {
  const dias = Math.ceil((Date.parse(venceEn) - ahora) / 86_400_000);
  if (dias <= 0) return "vence hoy";
  return dias === 1 ? "vence mañana" : `vence en ${dias} días`;
}

/** Correo válido (la misma regla que la base). */
export function correoValido(correo: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo.trim());
}

/** Iniciales para el círculo de una persona sin foto. */
export function inicialesPersona(nombre: string, email: string): string {
  const base = nombre.trim() || email.split("@")[0] || "?";
  const partes = base.split(/\s+/).filter(Boolean);
  return ((partes[0]?.[0] ?? "") + (partes.length > 1 ? (partes[partes.length - 1]?.[0] ?? "") : "")).toUpperCase() || "?";
}
