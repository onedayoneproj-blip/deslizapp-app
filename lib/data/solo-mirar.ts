import type { FuenteDatos } from "./fuente";
import type { SesionVerComo } from "../admin/tipos";

export class SoloMirar extends Error {
  constructor() {
    super("Aquí solo se mira.");
    this.name = "SoloMirar";
  }
}
export class VerComoVencido extends Error {
  constructor() {
    super("La sesión de Ver como terminó.");
    this.name = "VerComoVencido";
  }
}
/** Lista explícita y tipada: todo método nuevo queda bloqueado hasta autorizarlo como lectura. */
export const LECTURAS_SOLO_MIRAR = [
  "getTienda",
  "getDueno",
  "getProductos",
  "getProducto",
  "revisarEliminacionProducto",
  "getAjustesInventario",
  "revisarGuardadoInventario",
  "getPedidos",
  "getPedido",
  "getCuentasPorCobrar",
  "getCuentaCliente",
  "getClientes",
  "getCliente",
  "getPromos",
  "enviosJugada",
  "getEventosAaah",
  "solicitudesPendientes",
  "avisosPendientes",
  "avisosDeProducto",
  "trabajosRetoque",
] as const satisfies readonly (keyof FuenteDatos)[];
/** La envoltura no modifica la fuente ni sus permisos. Cerrarla/vencerla nunca devuelve accidentalmente la fuente real. */
export function soloMirar(
  real: FuenteDatos,
  sesion: SesionVerComo,
  ahora: () => number = Date.now,
  validar?: () => Promise<boolean>,
): FuenteDatos & { cerrar(): void } {
  let cerrada = false;
  const vigente = () => {
    if (
      cerrada ||
      ahora() >= Date.parse(sesion.venceEn) ||
      !Number.isFinite(Date.parse(sesion.venceEn))
    )
      throw new VerComoVencido();
  };
  const lecturas = new Set<string>(LECTURAS_SOLO_MIRAR);
  const validarAhora = async () => {
    vigente();
    if (validar && !(await validar())) throw new VerComoVencido();
    vigente();
  };
  return new Proxy({} as FuenteDatos & { cerrar(): void }, {
    get(_target, nombre) {
      if (nombre === "cerrar")
        return () => {
          cerrada = true;
        };
      if (nombre === "marcarActividad") return async () => false;
      if (nombre === "then" || typeof nombre !== "string") return undefined;
      return async (...args: unknown[]) => {
        if (nombre === "getTiendas") {
          await validarAhora();
          const t = await real.getTienda(sesion.tiendaId);
          await validarAhora();
          return t ? [t] : [];
        }
        if (nombre === "solicitudPorCodigo") {
          await validarAhora();
          const s = await real.solicitudPorCodigo(args[0] as string);
          await validarAhora();
          return s?.tiendaId === sesion.tiendaId ? s : null;
        }
        if (nombre === "getDueno") {
          await validarAhora();
          if (args[0] !== sesion.tiendaId) throw new SoloMirar();
          const u = await real.getDueno(sesion.tiendaId);
          await validarAhora();
          return u ? { ...u, email: "" } : null;
        }
        if (!lecturas.has(nombre) || args[0] !== sesion.tiendaId)
          throw new SoloMirar();
        await validarAhora();
        const metodo = real[nombre as keyof FuenteDatos] as (
          ...params: unknown[]
        ) => Promise<unknown>;
        const resultado = await metodo.apply(real, args);
        await validarAhora();
        return resultado;
      };
    },
  });
}
