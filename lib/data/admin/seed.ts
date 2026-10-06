import { construirDesdeSeed, type DB } from "../db";
import type { Tienda } from "../../types";
import type {
  Admin,
  MovimientoCreditos,
  PagoAdmin,
  PlanAdmin,
  PrecioExtra,
  RegistroAdmin,
  TrabajoRetoque,
} from "../../admin/tipos";
import { diaRD, sumarDiasAdmin } from "../../admin/reglas";

export type TiendaDemoAdmin = Omit<Tienda, "plan"> & {
  plan: string;
  pagadoHasta: string | null;
  pruebaHasta: string | null;
  diasGracia: number;
  catalogoPasoEn: string | null;
  ultimaActividadEn: string | null;
  activadaEn: string | null;
};
export type EstadoAdminDemo = {
  panel: Omit<DB, "tiendas"> & { tiendas: TiendaDemoAdmin[] };
  planes: PlanAdmin[];
  preciosExtra: PrecioExtra[];
  pagos: PagoAdmin[];
  movimientos: MovimientoCreditos[];
  trabajos: TrabajoRetoque[];
  registro: RegistroAdmin[];
  admins: Admin[];
  sesiones: {
    id: string;
    tiendaId: string;
    adminId: string;
    venceEn: string;
    fin: string | null;
  }[];
  pospuestos: { adminId: string; clave: string; hasta: string }[];
  funciones: {
    tiendaId: string;
    funcion: string;
    encendida: boolean;
    creadoPor: string | null;
    creadoEn: string;
  }[];
  entradas: Record<string, string>;
  uso: { almacenamientoBytes: number; baseBytes: number };
  usuarioId: string;
};
/** Seed aislado: reutiliza las tiendas/productos existentes sin alterar localStorage ni el seed del panel. */
export function crearEstadoAdminDemo(
  ahora = Date.now(),
  db: DB = construirDesdeSeed(ahora),
): EstadoAdminDemo {
  const iso = new Date(ahora).toISOString(),
    hoy = diaRD(ahora),
    hace = (dias: number) => new Date(ahora - dias * 86400000).toISOString();
  const panel = structuredClone(db) as EstadoAdminDemo["panel"];
  panel.tiendas = panel.tiendas.map((t) => ({
    ...t,
    pagadoHasta: null,
    pruebaHasta: null,
    diasGracia: 5,
    catalogoPasoEn: t.catalogoSolicitadoEn ?? t.catalogoPublicadoEn,
    ultimaActividadEn: iso,
    activadaEn: t.estado === "activa" ? t.creadoEn : null,
  }));
  const inicial = panel.tiendas[0];
  if (inicial) {
    inicial.pagadoHasta = sumarDiasAdmin(hoy, -2);
    // Variantes de las tiendas demo, con nombres derivados del seed, para cubrir cada condición de Hoy.
    const casos = [
      "prueba",
      "vence",
      "solicitudes",
      "solicitado",
      "cambios",
      "sin_productos",
      "sin_entrar",
      "sin_pedidos",
      "generando",
    ];
    casos.forEach((caso, i) => {
      const t: TiendaDemoAdmin = {
        ...structuredClone(panel.tiendas[i % panel.tiendas.length]),
        id: `ad000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
        slug: `demo-admin-${caso}`,
        nombre: `${panel.tiendas[i % panel.tiendas.length].nombre} · ${caso.replaceAll("_", " ")}`,
        estado: "activa",
        creadoEn: hace(20),
        catalogoEstado: "sin",
        catalogoPaso: null,
        catalogoPasoEn: null,
        catalogoPublicadoEn: null,
        catalogoNotasCambios: null,
        pagadoHasta: sumarDiasAdmin(hoy, 30),
        pruebaHasta: null,
        ultimaActividadEn: iso,
        activadaEn: hace(20),
      };
      if (caso === "prueba" || caso === "sin_productos") {
        t.estado = "en_prueba";
        t.pagadoHasta = null;
        t.pruebaHasta = sumarDiasAdmin(hoy, caso === "prueba" ? 2 : 20);
      }
      if (caso === "vence") t.pagadoHasta = sumarDiasAdmin(hoy, 2);
      if (caso === "sin_entrar") t.ultimaActividadEn = hace(8);
      if (caso === "sin_pedidos") {
        t.catalogoEstado = "publicado";
        t.catalogoPublicadoEn = hace(15);
      }
      if (["solicitado", "cambios", "generando"].includes(caso)) {
        t.catalogoEstado = caso as Tienda["catalogoEstado"];
        t.catalogoPasoEn = hace(3);
        if (caso === "generando") t.catalogoPaso = 1;
        if (caso === "cambios") t.catalogoNotasCambios = "Ajustar la portada";
      }
      panel.tiendas.push(t);
      if (caso === "solicitudes")
        panel.solicitudes.push({
          id: crypto.randomUUID(),
          codigo: "DEMOADMIN",
          tiendaId: t.id,
          creadaEn: hace(2),
          venceEn: new Date(ahora + 86400000).toISOString(),
          descartadaEn: null,
          pedidoId: null,
          items: [],
          descuento: 0,
          total: 0,
          codigoPromo: null,
        });
    });
  }
  const usuarioId = "ad000000-0000-4000-9000-000000000001";
  const e: EstadoAdminDemo = {
    panel,
    usuarioId,
    planes: [20, 60, 100, null].map((n, i) => ({
      id: n ? `p${n}` : "custom",
      nombre: n ? `Plan ${n}` : "Plan a medida",
      precioMensual: null,
      limiteProductos: n,
      creditosMensuales: 100,
      seOfrece: n !== null,
      orden: i + 1,
      destacado: false,
      creadoEn: iso,
    })),
    preciosExtra: [],
    pagos: [],
    movimientos: panel.tiendas
      .filter((t) => t.creditosRetoque > 0)
      .map((t) => ({
        id: crypto.randomUUID(),
        tiendaId: t.id,
        cantidad: t.creditosRetoque,
        tipo: "ajuste",
        motivo: "saldo al empezar el registro",
        pagoId: null,
        trabajoId: null,
        periodo: null,
        creadoPor: null,
        creadoEn: iso,
      })),
    trabajos: [],
    registro: [],
    admins: [
      {
        usuarioId,
        email: "admin@example.invalid",
        nombre: "Admin demo",
        creadoEn: iso,
        creadoPor: null,
        quitadoEn: null,
      },
    ],
    sesiones: [],
    pospuestos: [],
    funciones: [],
    entradas: {},
    uso: { almacenamientoBytes: 780 * 1048576, baseBytes: 360 * 1048576 },
  };
  const p = panel.productos.find((p) =>
    p.medios.some((m) => m.tipo === "foto"),
  );
  if (p) {
    const foto = p.medios.find((m) => m.tipo === "foto")!;
    if (foto.tipo === "foto") foto.retocada = false;
    e.trabajos.push({
      id: crypto.randomUUID(),
      tiendaId: p.tiendaId,
      productoId: p.id,
      medioUrlOriginal: p.medios.find((m) => m.tipo === "foto")!.url,
      medioUrlRetocado: null,
      estado: "pendiente",
      motivoDevolucion: null,
      creditos: 5,
      pedidoPor:
        panel.usuarios.find((u) => u.tiendaId === p.tiendaId)?.id ?? null,
      atendidoPor: null,
      creadoEn: hace(2),
      atendidoEn: null,
    });
  }
  return e;
}
