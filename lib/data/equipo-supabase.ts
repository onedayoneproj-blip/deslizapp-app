// El equipo en Supabase: las funciones de la base (supabase/migrations/*permisos* y *enlaces_invitacion*). La base exige todo
// (solo la dueña ve y cambia el equipo); aquí solo se llama y se traduce. El código de un enlace nuevo se devuelve UNA vez y no
// se guarda en ningún lado de la app.

import type { SupabaseClient } from "@supabase/supabase-js";
import { PERMISO_DUENO, type EquipoTienda, type MiPermiso, type Nivel, type Rol } from "../equipo";
import { DatosInvalidos, traducirErrorSupabase } from "./errores";

type FilaEquipo = {
  miembros: { usuario_id: string; rol: Rol; nivel: Nivel; desde: string; nombre: string; email: string; foto: string | null; soy_yo: boolean }[];
  solicitudes: { id: string; nivel: Nivel; nota: string | null; nombre: string; email: string; reclamado_en: string }[];
  enlaces: { id: string; nivel: Nivel; nota: string | null; creado_en: string; vence_en: string }[];
  invitaciones: { email: string; nivel: Nivel; creado_en: string }[];
};

/** Errores propios del equipo, en la voz de la app. El resto (sin_permiso, solo_mirar, red) lo traduce errores.ts. */
function traducir(e: { message?: string } | null | undefined): Error {
  const m = String(e?.message ?? "");
  if (m.includes("solicitud_no_valida")) return new DatosInvalidos("Esa solicitud ya no está: venció o ya la decidiste.");
  if (m.includes("enlace_no_valido")) return new DatosInvalidos("Ese enlace ya no está activo.");
  if (m.includes("no_se_quita_dueno")) return new DatosInvalidos("A otra dueña no se la quita: para eso está transferir la tienda.");
  if (m.includes("ultima_duena")) return new DatosInvalidos("Eres la única dueña: no puedes salir de tu propia tienda.");
  if (m.includes("no_es_colaborador")) return new DatosInvalidos("Esa persona ya no está en el equipo.");
  if (m.includes("correo_invalido")) return new DatosInvalidos("Revisa el correo.");
  if (m.includes("nota_invalida")) return new DatosInvalidos("La nota va hasta 40 letras.");
  if (m.includes("demasiados_enlaces")) return new DatosInvalidos("Ya tienes 20 enlaces activos. Cancela alguno antes de crear otro.");
  if (m.includes("limite_colaboradores")) return new DatosInvalidos("Tu plan no deja sumar más personas al equipo.");
  return traducirErrorSupabase(e);
}

async function llamar<T>(promesa: PromiseLike<{ data: T | null; error: { message?: string } | null }>): Promise<T | null> {
  let r: { data: T | null; error: { message?: string } | null };
  try {
    r = await promesa;
  } catch (e) {
    throw traducirErrorSupabase(e);
  }
  if (r.error) throw traducir(r.error);
  return r.data;
}

export function aEquipo(f: FilaEquipo): EquipoTienda {
  return {
    miembros: (f.miembros ?? []).map((m) => ({ usuarioId: m.usuario_id, rol: m.rol, nivel: m.nivel, desde: m.desde, nombre: m.nombre ?? "", email: m.email ?? "", foto: m.foto ?? null, soyYo: !!m.soy_yo })),
    solicitudes: (f.solicitudes ?? []).map((s) => ({ id: s.id, nivel: s.nivel, nota: s.nota, nombre: s.nombre ?? "", email: s.email ?? "", reclamadoEn: s.reclamado_en })),
    enlaces: (f.enlaces ?? []).map((e) => ({ id: e.id, nivel: e.nivel, nota: e.nota, creadoEn: e.creado_en, venceEn: e.vence_en })),
    invitaciones: (f.invitaciones ?? []).map((i) => ({ email: i.email, nivel: i.nivel, creadoEn: i.creado_en })),
  };
}

/** Las operaciones del equipo para la fuente de Supabase. `cambio` olvida la caché y avisa a las pantallas. */
export function equipoSupabase(supabase: SupabaseClient, cambio: <T>(v: T) => T) {
  return {
    async getMiPermiso(tiendaId: string): Promise<MiPermiso> {
      const { data: claims } = await supabase.auth.getClaims();
      const uid = claims?.claims?.sub;
      if (!uid) return PERMISO_DUENO;
      const fila = await llamar<{ rol: Rol; nivel: Nivel }>(supabase.from("miembros").select("rol, nivel").eq("tienda_id", tiendaId).eq("usuario_id", uid).maybeSingle());
      // Sin fila (un admin que no es miembro, por ejemplo): la pantalla no apaga nada y la base decide.
      return fila ? { rol: fila.rol, nivel: fila.nivel } : PERMISO_DUENO;
    },
    async getEquipo(tiendaId: string): Promise<EquipoTienda> {
      const f = await llamar<FilaEquipo>(supabase.rpc("equipo_de_tienda", { p_tienda_id: tiendaId }));
      return aEquipo(f ?? { miembros: [], solicitudes: [], enlaces: [], invitaciones: [] });
    },
    async crearEnlaceEquipo(tiendaId: string, nivel: Nivel, nota: string | null): Promise<string> {
      const codigo = await llamar<string>(supabase.rpc("crear_enlace_colaborador", { p_tienda_id: tiendaId, p_nivel: nivel, p_nota: nota?.trim() || null }));
      if (!codigo) throw new DatosInvalidos("No se pudo crear el enlace. Inténtalo otra vez.");
      return cambio(codigo);
    },
    async aprobarSolicitud(_tiendaId: string, enlaceId: string, nivel: Nivel) {
      await llamar(supabase.rpc("aprobar_miembro", { p_enlace_id: enlaceId, p_nivel: nivel }));
      cambio(null);
    },
    async rechazarSolicitud(_tiendaId: string, enlaceId: string) {
      await llamar(supabase.rpc("rechazar_miembro", { p_enlace_id: enlaceId }));
      cambio(null);
    },
    async cancelarEnlaceEquipo(_tiendaId: string, enlaceId: string) {
      await llamar(supabase.rpc("cancelar_enlace", { p_enlace_id: enlaceId }));
      cambio(null);
    },
    async cambiarNivelMiembro(tiendaId: string, usuarioId: string, nivel: Nivel) {
      await llamar(supabase.rpc("cambiar_nivel", { p_tienda_id: tiendaId, p_usuario_id: usuarioId, p_nivel: nivel }));
      cambio(null);
    },
    async quitarMiembro(tiendaId: string, usuarioId: string) {
      await llamar(supabase.rpc("quitar_de_tienda", { p_tienda_id: tiendaId, p_usuario_id: usuarioId }));
      cambio(null);
    },
    async invitarPorCorreo(tiendaId: string, email: string, nivel: Nivel) {
      await llamar(supabase.rpc("invitar_por_correo", { p_tienda_id: tiendaId, p_email: email.trim(), p_nivel: nivel }));
      cambio(null);
    },
    async salirDeTienda(tiendaId: string) {
      const { data: claims } = await supabase.auth.getClaims();
      const uid = claims?.claims?.sub;
      if (!uid) throw new DatosInvalidos("Tu sesión venció. Vuelve a entrar con Google.");
      await llamar(supabase.rpc("quitar_de_tienda", { p_tienda_id: tiendaId, p_usuario_id: uid }));
      cambio(null);
    },
  };
}
