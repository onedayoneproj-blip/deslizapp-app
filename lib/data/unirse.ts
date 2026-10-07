// Abrir un enlace de invitación (`/unirse/<código>`): reclamarlo, esperar la aprobación y, si es de tienda nueva, crearla.
// El código es un secreto de un solo uso. Se guarda solo en ESTE navegador mientras se entra con Google (sessionStorage y una
// cookie corta limitada a /unirse); el retorno de Google vuelve a `/unirse` sin el código. Se borra apenas se reclama.

import { createClient } from "../supabase/client";
import { esErrorDeRed, traducirErrorSupabase } from "./errores";

const KEY = "deslizapp-unirse";
const COOKIE = "dz_unirse";

export const CODIGO_VALIDO = /^[A-Za-z0-9_-]{30,60}$/;

export class EnlaceNoValido extends Error {
  constructor() {
    super("Este enlace ya no sirve. Pídele uno nuevo a quien te invitó.");
    this.name = "EnlaceNoValido";
  }
}

export type TipoEnlace = "colaborador" | "tienda_nueva";
export type EstadoSolicitud = "esperando" | "aprobado" | "rechazado" | "vencido" | "usado";
export type Reclamo = { id: string; tipo: TipoEnlace; estado: EstadoSolicitud; tiendaNombre: string | null };
export type MiSolicitud = Reclamo & { reclamadoEn: string; tiendaCreada: boolean };

export function guardarCodigo(codigo: string) {
  if (!CODIGO_VALIDO.test(codigo)) return;
  try {
    sessionStorage.setItem(KEY, codigo);
  } catch {
    // Sin sessionStorage queda la cookie.
  }
  try {
    const seguro = window.location.protocol === "https:" ? "; secure" : "";
    document.cookie = `${COOKIE}=${encodeURIComponent(codigo)}; path=/unirse; max-age=1800; samesite=lax${seguro}`;
  } catch {
    // Sin cookies queda sessionStorage.
  }
}

export function leerCodigo(): string | null {
  let c: string | null = null;
  try {
    c = sessionStorage.getItem(KEY);
  } catch {
    c = null;
  }
  if (!c) {
    try {
      const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
      c = m ? decodeURIComponent(m[1]!) : null;
    } catch {
      c = null;
    }
  }
  return c && CODIGO_VALIDO.test(c) ? c : null;
}

export function olvidarCodigo() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Nada que borrar.
  }
  try {
    document.cookie = `${COOKIE}=; path=/unirse; max-age=0; samesite=lax`;
  } catch {
    // Nada que borrar.
  }
}

export async function haySesion(): Promise<boolean> {
  const { data, error } = await createClient().auth.getClaims();
  if (error && esErrorDeRed(error)) throw error;
  return !!data?.claims?.sub;
}

type FilaReclamo = { id: string; tipo: TipoEnlace; estado: EstadoSolicitud; tienda_nombre: string | null };

/** Reclama el enlace (se consume). Cualquier problema del enlace es el mismo EnlaceNoValido: no se dice si venció o se usó. */
export async function reclamarEnlace(codigo: string): Promise<Reclamo> {
  if (!CODIGO_VALIDO.test(codigo)) throw new EnlaceNoValido();
  const { data, error } = await createClient().rpc("reclamar_enlace", { p_codigo: codigo });
  if (error) {
    if (String(error.message ?? "").includes("enlace_no_valido")) throw new EnlaceNoValido();
    throw traducirErrorSupabase(error);
  }
  const f = data as FilaReclamo;
  return { id: f.id, tipo: f.tipo, estado: f.estado, tiendaNombre: f.tienda_nombre };
}

type FilaSolicitud = FilaReclamo & { reclamado_en: string; tienda_creada: boolean };

/** Lo que esta cuenta abrió (esperando, aprobado o rechazado), de lo más nuevo a lo más viejo. */
export async function misSolicitudes(): Promise<MiSolicitud[]> {
  const { data, error } = await createClient().rpc("mis_solicitudes");
  if (error) throw traducirErrorSupabase(error);
  return ((data as FilaSolicitud[] | null) ?? []).map((f) => ({
    id: f.id,
    tipo: f.tipo,
    estado: f.estado,
    tiendaNombre: f.tienda_nombre,
    reclamadoEn: f.reclamado_en,
    tiendaCreada: f.tienda_creada,
  }));
}

/** La solicitud que manda en la pantalla: la tienda nueva por crear, o la última de colaborador. */
export function solicitudPrincipal(lista: MiSolicitud[]): MiSolicitud | null {
  return lista.find((s) => s.tipo === "tienda_nueva" && s.estado === "aprobado" && !s.tiendaCreada) ?? lista.find((s) => s.tipo === "colaborador") ?? null;
}

/** Crea la tienda de un enlace de tienda nueva ya reclamado por esta cuenta. */
export async function crearMiTienda(enlaceId: string, nombre: string, rubro: string): Promise<void> {
  const { error } = await createClient().rpc("crear_mi_tienda", { p_enlace_id: enlaceId, p_nombre: nombre.trim(), p_rubro: rubro });
  if (error) {
    const m = String(error.message ?? "");
    if (m.includes("enlace_no_valido")) throw new EnlaceNoValido();
    if (m.includes("demasiadas_tiendas_en_prueba")) throw new Error("Ya tienes 3 tiendas en prueba. Escríbenos para abrir otra.");
    if (m.includes("nombre_invalido")) throw new Error("Escribe el nombre de tu tienda (hasta 80 letras).");
    throw traducirErrorSupabase(error);
  }
}
