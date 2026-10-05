// Entrada pública a la misma capa de datos. Sin sesión, cookies ni DataProvider del panel.
import type { FuenteDatos } from "./fuente";
export type FuentePublica = Pick<
  FuenteDatos,
  | "catalogoPublico"
  | "crearSolicitudPedido"
  | "verSolicitud"
  | "registrarAaah"
  | "pedirAviso"
>;
export async function fuentePublica(demo: boolean): Promise<FuentePublica> {
  if (demo) return (await import("./demo")).fuenteDemo;
  let pendiente: Promise<FuentePublica> | undefined;
  const real = () => pendiente ??= import("./publica-real").then(m => m.fuentePublicaReal());
  // Solo delega: no duplica consultas ni cambia el contrato o los errores.
  return {
    catalogoPublico: async (...args) => (await real()).catalogoPublico(...args),
    crearSolicitudPedido: async (...args) => (await real()).crearSolicitudPedido(...args),
    verSolicitud: async (...args) => (await real()).verSolicitud(...args),
    registrarAaah: async (...args) => (await real()).registrarAaah(...args),
    pedirAviso: async (...args) => (await real()).pedirAviso(...args),
  };
}

export async function observarFuentePublicaDemo(): Promise<() => void> {
  const { suscribirDemo } = await import("./demo");
  return suscribirDemo(() => {});
}
