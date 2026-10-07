"use client";

import { PERMISO_DUENO, puede, TEXTO_SIN_PERMISO, type Grupo, type MiPermiso } from "../equipo";
import { useConsulta } from "./consulta";
import { useData } from "./provider";

/**
 * El ÚNICO lugar que lee qué puede hacer esta cuenta en la tienda activa (dueña, o colaboradora de un nivel). La pantalla solo
 * lo usa para apagar y explicar; la base es la que manda (`exigir_permiso` y las políticas restrictivas). En Ver como todo es
 * solo mirar de otra forma, así que aquí no se apaga nada más.
 */
export function usePermisos(): { permiso: MiPermiso | null; esDuena: boolean; puede: (grupo: Grupo) => boolean; porque: string } {
  const { tiendaActivaId, getMiPermiso, soloMirar } = useData();
  const { data } = useConsulta(`permiso:${tiendaActivaId}`, () => (soloMirar ? Promise.resolve(PERMISO_DUENO) : getMiPermiso(tiendaActivaId)));
  const permiso = data ?? null;
  return {
    permiso,
    // Mientras se lee, no se ofrece lo de la dueña (equipo) pero tampoco se apaga lo demás: la base decide igual.
    esDuena: permiso?.rol === "dueno",
    puede: (grupo) => (grupo === "equipo" ? permiso?.rol === "dueno" : puede(permiso, grupo)),
    porque: TEXTO_SIN_PERMISO,
  };
}
