// El equipo en la demo: los mismos pasos que en la base (lib/equipo.ts, supabase/migrations/*enlaces_invitacion*), sin enlaces
// reales ni Supabase. Cada tienda trae su dueña y un par de colaboradores de ejemplo con distinto nivel.
// `nivelDemo` deja mirar la app como Ayudante, Editor o Administrador (solo en este navegador).

import { NOTA_MAX, TEXTO_SIN_PERMISO, correoValido, puede, type EquipoTienda, type Grupo, type MiPermiso, type Nivel } from "../equipo";
import { DatosInvalidos, SinPermiso } from "./errores";
import type { DB } from "./db";

export type NivelDemo = "dueno" | Nivel;

const DIA = 86_400_000;

/** El equipo de ejemplo de una tienda (la dueña de la demo y dos colaboradores; en la primera, una solicitud esperando). */
export function equipoDeEjemplo(db: Pick<DB, "usuarios">, tiendaId: string, conSolicitud: boolean, ahora: number = Date.now()): EquipoTienda {
  const duena = db.usuarios.find((u) => u.tiendaId === tiendaId && u.rol === "dueno");
  const hace = (dias: number) => new Date(ahora - dias * DIA).toISOString();
  return {
    miembros: [
      { usuarioId: duena?.id ?? `duena-${tiendaId}`, nombre: duena?.nombre || "Tú", email: duena?.email ?? "", foto: null, rol: "dueno", nivel: "administrador", soyYo: true, desde: hace(60) },
      { usuarioId: `carla-${tiendaId}`, nombre: "Carla Méndez", email: "carla@ejemplo.com", foto: null, rol: "staff", nivel: "editor", soyYo: false, desde: hace(20) },
      { usuarioId: `pedro-${tiendaId}`, nombre: "Pedro Núñez", email: "pedro@ejemplo.com", foto: null, rol: "staff", nivel: "ayudante", soyYo: false, desde: hace(6) },
    ],
    solicitudes: conSolicitud
      ? [{ id: `solicitud-ana-${tiendaId}`, nivel: "ayudante", nota: "Para Ana", nombre: "Ana Rosario", email: "ana@ejemplo.com", reclamadoEn: hace(0.1) }]
      : [],
    enlaces: [],
    invitaciones: [],
  };
}

/** El equipo guardado de la tienda o, si todavía no se tocó, el de ejemplo (la primera tienda trae una solicitud esperando). */
export function equipoEnDB(db: DB, tiendaId: string): EquipoTienda {
  return structuredClone(db.equipos?.[tiendaId] ?? equipoDeEjemplo(db, tiendaId, db.tiendas[0]?.id === tiendaId));
}

export function permisoDemo(db: DB): MiPermiso {
  const n = db.nivelDemo ?? "dueno";
  return n === "dueno" ? { rol: "dueno", nivel: "administrador" } : { rol: "staff", nivel: n };
}

/** Lo que hace solo la dueña: en la demo, si se está mirando como colaborador, falla igual que en la base. */
function exigirDuena(db: DB) {
  if (permisoDemo(db).rol !== "dueno") throw new SinPermiso("Esto lo hace quien administra la tienda.");
}

function conEquipo(db: DB, tiendaId: string, cambio: (e: EquipoTienda) => EquipoTienda): DB {
  exigirDuena(db);
  return { ...db, equipos: { ...(db.equipos ?? {}), [tiendaId]: cambio(equipoEnDB(db, tiendaId)) } };
}

const nivelValido = (n: string): n is Nivel => n === "ayudante" || n === "editor" || n === "administrador";

export function crearEnlaceEnDB(db: DB, tiendaId: string, nivel: Nivel, nota: string | null, id: string, ahora: number): { db: DB; codigo: string } {
  const limpia = nota?.trim() || null;
  if (!nivelValido(nivel)) throw new DatosInvalidos("Elige un nivel.");
  if (limpia && limpia.length > NOTA_MAX) throw new DatosInvalidos(`La nota va hasta ${NOTA_MAX} letras.`);
  const codigo = `demo-${id.replace(/[^a-z0-9]/gi, "").slice(0, 36)}`;
  return {
    codigo,
    db: conEquipo(db, tiendaId, (e) => ({
      ...e,
      enlaces: [{ id, nivel, nota: limpia, creadoEn: new Date(ahora).toISOString(), venceEn: new Date(ahora + 7 * DIA).toISOString() }, ...e.enlaces],
    })),
  };
}

export function aprobarEnDB(db: DB, tiendaId: string, enlaceId: string, nivel: Nivel, ahora: number): DB {
  return conEquipo(db, tiendaId, (e) => {
    const s = e.solicitudes.find((x) => x.id === enlaceId);
    if (!s) throw new DatosInvalidos("Esa solicitud ya no está.");
    return {
      ...e,
      solicitudes: e.solicitudes.filter((x) => x.id !== enlaceId),
      miembros: [...e.miembros, { usuarioId: `aprobada-${enlaceId}`, nombre: s.nombre, email: s.email, foto: null, rol: "staff", nivel, soyYo: false, desde: new Date(ahora).toISOString() }],
    };
  });
}

export function rechazarEnDB(db: DB, tiendaId: string, enlaceId: string): DB {
  return conEquipo(db, tiendaId, (e) => ({ ...e, solicitudes: e.solicitudes.filter((x) => x.id !== enlaceId) }));
}

export function cancelarEnlaceEnDB(db: DB, tiendaId: string, enlaceId: string): DB {
  return conEquipo(db, tiendaId, (e) => ({ ...e, enlaces: e.enlaces.filter((x) => x.id !== enlaceId) }));
}

export function cambiarNivelEnDB(db: DB, tiendaId: string, usuarioId: string, nivel: Nivel): DB {
  return conEquipo(db, tiendaId, (e) => {
    if (!e.miembros.some((m) => m.usuarioId === usuarioId && m.rol === "staff")) throw new DatosInvalidos("Esa persona ya no está en el equipo.");
    return { ...e, miembros: e.miembros.map((m) => (m.usuarioId === usuarioId ? { ...m, nivel } : m)) };
  });
}

export function quitarEnDB(db: DB, tiendaId: string, usuarioId: string): DB {
  return conEquipo(db, tiendaId, (e) => {
    if (e.miembros.find((m) => m.usuarioId === usuarioId)?.rol === "dueno") throw new DatosInvalidos("A la dueña no se la quita.");
    return { ...e, miembros: e.miembros.filter((m) => m.usuarioId !== usuarioId) };
  });
}

export function invitarCorreoEnDB(db: DB, tiendaId: string, email: string, nivel: Nivel, ahora: number): DB {
  const correo = email.trim().toLowerCase();
  if (!correoValido(correo)) throw new DatosInvalidos("Revisa el correo.");
  return conEquipo(db, tiendaId, (e) => ({
    ...e,
    invitaciones: [...e.invitaciones.filter((i) => i.email !== correo), { email: correo, nivel, creadoEn: new Date(ahora).toISOString() }],
  }));
}

/**
 * Lo que la base exige (`exigir_permiso`), también en la demo: cada operación de datos y el grupo que necesita. Mirando la demo como
 * un colaborador sin ese grupo, la operación lanza SinPermiso y NO cambia nada, aunque algún control se haya quedado encendido.
 * Lo que no está aquí (lecturas, pedidos, clientes, promos y avisos: «ventas», que todos tienen) pasa igual.
 */
export const GRUPO_DE_OPERACION: Record<string, Grupo> = {
  crearProducto: "catalogo", actualizarProducto: "catalogo", eliminarProducto: "catalogo", ajustarStock: "catalogo", reponerStock: "catalogo",
  cambiarVisibilidad: "catalogo", guardarProductoConInventario: "catalogo", guardarVariantes: "catalogo", guardarFotoValor: "catalogo", guardarFicha: "catalogo", actualizarMarca: "catalogo", guardarRubros: "catalogo",
  solicitarCatalogo: "catalogo", pedirCambiosCatalogo: "catalogo", publicarCatalogo: "catalogo",
  // Publicarse al público es decisión de la dueña (la base exige el grupo «equipo», que es solo suyo).
  publicarMiCatalogo: "equipo", despublicarMiCatalogo: "equipo",
  usarCreditosRetoque: "creditos", pedirRetoque: "creditos",
  guardarMarcaRetoque: "marca",
};

/** Envuelve la fuente de la demo: antes de cada operación con grupo, comprueba el nivel con el que se mira la demo. */
export function conPermisosDeLaDemo<T extends object>(fuente: T, leerDb: () => DB): T {
  const envuelta = { ...fuente } as Record<string, unknown>;
  for (const [nombre, grupo] of Object.entries(GRUPO_DE_OPERACION)) {
    const original = (fuente as Record<string, unknown>)[nombre];
    if (typeof original !== "function") continue;
    envuelta[nombre] = async (...args: unknown[]) => {
      if (!puede(permisoDemo(leerDb()), grupo)) throw new SinPermiso(TEXTO_SIN_PERMISO);
      return (original as (...a: unknown[]) => unknown).apply(fuente, args);
    };
  }
  return envuelta as T;
}
