// La bienvenida del retoque sale la primera vez que una tienda va a mandar una foto al taller. Se recuerda por tienda y
// dispositivo en el almacenamiento local, con try/catch: sin almacenamiento (modo privado, bloqueado) sale cada vez, sin romper nada.

const CLAVE = "deslizapp-retoque-bienvenida-v1";

type Almacen = Pick<Storage, "getItem" | "setItem">;
const local = (): Almacen | null => {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
};

function leer(a: Almacen | null): string[] {
  try {
    const v = JSON.parse(a?.getItem(CLAVE) ?? "[]") as unknown;
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/** ¿Esta tienda ya vio la bienvenida en este dispositivo? */
export const bienvenidaVista = (tiendaId: string, almacen: Almacen | null = local()): boolean => leer(almacen).includes(tiendaId);

/** Se anota al confirmar «Retocar foto» (cancelar no cuenta: la verá otra vez). */
export function marcarBienvenidaVista(tiendaId: string, almacen: Almacen | null = local()) {
  try {
    if (!almacen) return;
    const vistas = leer(almacen);
    if (!vistas.includes(tiendaId)) almacen.setItem(CLAVE, JSON.stringify([...vistas, tiendaId].slice(-100)));
  } catch {
    // Sin almacenamiento: en el peor caso, se vuelve a ver.
  }
}
