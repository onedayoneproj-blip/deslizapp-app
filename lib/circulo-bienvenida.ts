// La pantalla de bienvenida del Círculo Deslizapp (docs/prompts/circulo-bienvenida.md): se ve una sola vez por titular y
// dispositivo. Puro: tests/circulo-bienvenida.test.mjs.

/** Lo mínimo que se usa de `localStorage` (para probarlo sin navegador). */
export type AlmacenBienvenida = Pick<Storage, "getItem" | "setItem">;

/** La marca de «ya la vio» es de la cuenta (no de la tienda): con varias tiendas se ve una sola vez. */
export const claveBienvenidaCirculo = (usuarioId: string): string => `deslizapp:circulo-bienvenida:${usuarioId}`;

/** `localStorage` del navegador, o `null` si no se puede ni nombrar (modo privado, datos bloqueados, servidor). */
export function almacenDelNavegador(): AlmacenBienvenida | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** ¿Ya la vio? Si no se puede leer, se cuenta como vista: mejor no mostrarla que mostrarla cada vez. */
export function bienvenidaVista(almacen: AlmacenBienvenida | null, usuarioId: string): boolean {
  if (!almacen) return true;
  try {
    return almacen.getItem(claveBienvenidaCirculo(usuarioId)) !== null;
  } catch {
    return true;
  }
}

/** Guarda que ya la vio. Si no se puede guardar, no pasa nada: la próxima vez `bienvenidaVista` decide con lo que haya. */
export function marcarBienvenidaVista(almacen: AlmacenBienvenida | null, usuarioId: string): void {
  try {
    almacen?.setItem(claveBienvenidaCirculo(usuarioId), "1");
  } catch {
    /* sin almacenamiento: se queda sin guardar */
  }
}

/**
 * ¿Se muestra la bienvenida? Solo a quien es dueña de una tienda del Círculo (las colaboradoras no: el 30 % y «Habla directo con
 * Lewis» son de quien paga), nunca mirando como otra persona, y una sola vez.
 */
export function debeMostrarBienvenida({ usuarioId, soloMirar, esTitularDelCirculo, almacen }: { usuarioId: string | null; soloMirar: boolean; esTitularDelCirculo: boolean; almacen: AlmacenBienvenida | null }): boolean {
  if (!usuarioId || soloMirar || !esTitularDelCirculo) return false;
  return !bienvenidaVista(almacen, usuarioId);
}
