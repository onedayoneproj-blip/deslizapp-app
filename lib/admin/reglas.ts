import type {
  AsuntoAdmin,
  EstadoCobro,
  SaludTienda,
  TrabajoRetoque,
} from "./tipos";
import type { EstadoCatalogo, EstadoTienda } from "../types";

export const REGLAS_ADMIN = {
  vence_pronto_dias: 3,
  prueba_termina_dias: 3,
  solicitudes_sin_registrar_horas: 24,
  catalogo_solicitado_dias: 2,
  catalogo_cambios_dias: 1,
  catalogo_generando_dias: 2,
  prueba_sin_productos_dias: 3,
  sin_entrar_dias: 7,
  sin_pedidos_dias: 14,
  viva_dias: 7,
  plataforma_porcentaje: 70,
  almacenamiento_limite_mb: 1024,
  base_limite_mb: 500,
  posponer_horas: 24,
  marcar_actividad_minutos: 10,
  ver_como_minutos: 30,
  creditos_por_retoque: 5,
} as const;
const DIA = 86400000;
export function diaRD(ms: number): string {
  return new Date(ms - 4 * 3600000).toISOString().slice(0, 10);
}
export function diasEntre(a: string, b: string): number {
  return (Date.parse(a) - Date.parse(b)) / DIA;
}
export function sumarDiasAdmin(dia: string, n: number): string {
  return new Date(Date.parse(dia) + n * DIA).toISOString().slice(0, 10);
}
/** PostgreSQL interval months: recorta al último día si hace falta (31 enero → 28/29 febrero). */
export function sumarMeses(dia: string, n: number): string {
  const d = new Date(dia + "T00:00:00Z"),
    fecha = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + n);
  const ultimo = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0),
  ).getUTCDate();
  d.setUTCDate(Math.min(fecha, ultimo));
  return d.toISOString().slice(0, 10);
}
export function estadoCobro(
  estado: EstadoTienda,
  pruebaHasta: string | null,
  pagadoHasta: string | null,
  diasGracia: number,
  hoy: string,
): EstadoCobro {
  if (estado === "en_prueba" && (pruebaHasta === null || pruebaHasta >= hoy))
    return "en_prueba";
  if (!pagadoHasta) return "sin_plan";
  const dias = diasEntre(pagadoHasta, hoy);
  return dias > REGLAS_ADMIN.vence_pronto_dias
    ? "al_dia"
    : dias >= 0
      ? "vence_pronto"
      : -dias <= diasGracia
        ? "en_gracia"
        : "vencida";
}
export type TiendaReglas = {
  id: string;
  nombre: string;
  estado: EstadoTienda;
  creadoEn: string;
  pagadoHasta: string | null;
  pruebaHasta: string | null;
  diasGracia: number;
  catalogoEstado: EstadoCatalogo;
  catalogoPaso: number | null;
  catalogoPasoEn: string | null;
  catalogoNotasCambios: string | null;
  catalogoPublicadoEn: string | null;
  ultimaActividadEn: string | null;
  productos: number;
  solicitudes: {
    creadaEn: string;
    venceEn: string;
    registradaEn: string | null;
    descartadaEn: string | null;
  }[];
  pedidosEn: string[];
  aaahsEn: string[];
};
export type UsoPlataforma = { almacenamientoBytes: number; baseBytes: number };
export function asuntosAdmin(
  tiendas: TiendaReglas[],
  trabajos: TrabajoRetoque[],
  uso: UsoPlataforma,
  ahora: number,
): AsuntoAdmin[] {
  const asuntos: AsuntoAdmin[] = [],
    hoy = diaRD(ahora),
    r = REGLAS_ADMIN;
  const civil = (dia: string) => dia + "T04:00:00.000Z";
  for (const t of tiendas.filter(
    (t) => t.estado === "activa" || t.estado === "en_prueba",
  )) {
    const cobro = estadoCobro(
      t.estado,
      t.pruebaHasta,
      t.pagadoHasta,
      t.diasGracia,
      hoy,
    );
    const add = (
      regla: AsuntoAdmin["regla"],
      categoria: AsuntoAdmin["categoria"],
      prioridad: number,
      sufijo: string,
      datos: AsuntoAdmin["datos"],
      accion: string,
      desde: string,
    ) =>
      asuntos.push({
        clave: `${regla}:${t.id}${sufijo}`,
        regla,
        categoria,
        prioridad,
        tiendaId: t.id,
        tiendaNombre: t.nombre,
        datos,
        accion,
        desde,
      });
    if (t.pagadoHasta && ["en_gracia", "vencida"].includes(cobro))
      add(
        "pago_vencido",
        "plata",
        1,
        ":" + t.pagadoHasta,
        {
          pagado_hasta: t.pagadoHasta,
          dias_vencida: diasEntre(hoy, t.pagadoHasta),
          dias_gracia: t.diasGracia,
          en_gracia: cobro === "en_gracia",
        },
        "escribir",
        civil(sumarDiasAdmin(t.pagadoHasta, 1)),
      );
    if (
      t.estado === "en_prueba" &&
      !t.pagadoHasta &&
      t.pruebaHasta &&
      diasEntre(t.pruebaHasta, hoy) <= r.prueba_termina_dias
    )
      add(
        "prueba_termina",
        "plata",
        1,
        ":" + t.pruebaHasta,
        { prueba_hasta: t.pruebaHasta, dias: diasEntre(t.pruebaHasta, hoy) },
        "escribir",
        civil(sumarDiasAdmin(t.pruebaHasta, -r.prueba_termina_dias)),
      );
    if (t.pagadoHasta && cobro === "vence_pronto")
      add(
        "vence_pronto",
        "plata",
        2,
        ":" + t.pagadoHasta,
        { pagado_hasta: t.pagadoHasta, dias: diasEntre(t.pagadoHasta, hoy) },
        "recordar",
        civil(sumarDiasAdmin(t.pagadoHasta, -r.vence_pronto_dias)),
      );
    const solicitudes = t.solicitudes
      .filter(
        (s) =>
          !s.registradaEn &&
          !s.descartadaEn &&
          Date.parse(s.venceEn) > ahora &&
          Date.parse(s.creadaEn) <
            ahora - r.solicitudes_sin_registrar_horas * 3600000,
      )
      .sort((a, b) => Date.parse(a.creadaEn) - Date.parse(b.creadaEn));
    if (solicitudes.length)
      add(
        "solicitudes",
        "clientes",
        3,
        ":" + diaRD(Date.parse(solicitudes[0].creadaEn)),
        { cantidad: solicitudes.length, mas_vieja: solicitudes[0].creadaEn },
        "avisar",
        solicitudes[0].creadaEn,
      );
    for (const [estado, regla, dias, accion] of [
      [
        "solicitado",
        "catalogo_solicitado",
        r.catalogo_solicitado_dias,
        "empezar",
      ],
      ["cambios", "catalogo_cambios", r.catalogo_cambios_dias, "ver_cambios"],
      ["generando", "catalogo_generando", r.catalogo_generando_dias, "seguir"],
    ] as const) {
      if (
        t.catalogoEstado === estado &&
        t.catalogoPasoEn &&
        Date.parse(t.catalogoPasoEn) < ahora - dias * DIA
      ) {
        const datos: AsuntoAdmin["datos"] = { desde: t.catalogoPasoEn };
        if (estado === "cambios") datos.notas = t.catalogoNotasCambios;
        if (estado === "generando") datos.paso = t.catalogoPaso ?? 1;
        add(
          regla,
          estado === "generando" ? "trabajo" : "clientes",
          estado === "generando" ? 5 : 3,
          ":" +
            (estado === "generando" ? `${t.catalogoPaso ?? 1}:` : "") +
            diaRD(Date.parse(t.catalogoPasoEn)),
          datos,
          accion,
          t.catalogoPasoEn,
        );
      }
    }
    if (
      t.estado === "en_prueba" &&
      Date.parse(t.creadoEn) < ahora - r.prueba_sin_productos_dias * DIA &&
      t.productos === 0
    )
      add(
        "prueba_sin_productos",
        "se_enfria",
        4,
        "",
        { dias: diasEntre(hoy, diaRD(Date.parse(t.creadoEn))) },
        "empujon",
        t.creadoEn,
      );
    const ultima = t.ultimaActividadEn ?? t.creadoEn;
    if (
      t.estado === "activa" &&
      Date.parse(ultima) < ahora - r.sin_entrar_dias * DIA
    )
      add(
        "sin_entrar",
        "se_enfria",
        4,
        ":" + diaRD(Date.parse(ultima)),
        {
          ultima_actividad: ultima,
          dias: diasEntre(hoy, diaRD(Date.parse(ultima))),
        },
        "escribir",
        ultima,
      );
    const ultimo = new Date(
      Math.max(
        Date.parse(t.catalogoPublicadoEn ?? t.catalogoPasoEn ?? t.creadoEn),
        ...t.pedidosEn.map(Date.parse),
        ...t.solicitudes.map((s) => Date.parse(s.creadaEn)),
      ),
    ).toISOString();
    if (
      t.estado === "activa" &&
      t.catalogoEstado === "publicado" &&
      Date.parse(ultimo) < ahora - r.sin_pedidos_dias * DIA
    )
      add(
        "sin_pedidos",
        "se_enfria",
        4,
        ":" + diaRD(Date.parse(ultimo)),
        { ultimo, dias: diasEntre(hoy, diaRD(Date.parse(ultimo))) },
        "escribir",
        ultimo,
      );
  }
  const pendientes = trabajos
    .filter((t) => t.estado === "pendiente")
    .sort(
      (a, b) =>
        Date.parse(a.creadoEn) - Date.parse(b.creadoEn) ||
        a.id.localeCompare(b.id),
    );
  if (pendientes.length)
    asuntos.push({
      clave: "fotos:" + diaRD(Date.parse(pendientes[0].creadoEn)),
      regla: "fotos",
      categoria: "trabajo",
      prioridad: 5,
      tiendaId: null,
      datos: {
        total: pendientes.length,
        tiendas: new Set(pendientes.map((p) => p.tiendaId)).size,
        mas_vieja: pendientes[0].creadoEn,
        tienda_mas_vieja: pendientes[0].tiendaId,
      },
      accion: "retocar",
      desde: pendientes[0].creadoEn,
    });
  for (const [metrica, bytes, mb] of [
    ["almacenamiento", uso.almacenamientoBytes, r.almacenamiento_limite_mb],
    ["base", uso.baseBytes, r.base_limite_mb],
  ] as const) {
    const pct = (bytes / (mb * 1048576)) * 100;
    if (pct > r.plataforma_porcentaje)
      asuntos.push({
        clave: `plataforma:${metrica}:${Math.floor(pct / 10) * 10}`,
        regla: "plataforma",
        categoria: "plataforma",
        prioridad: 6,
        tiendaId: null,
        datos: { metrica, porcentaje: Math.round(pct) },
        accion: "ver_salud",
        desde: new Date(ahora).toISOString(),
      });
  }
  return asuntos.sort(
    (a, b) =>
      a.prioridad - b.prioridad ||
      Date.parse(a.desde) - Date.parse(b.desde) ||
      a.clave.localeCompare(b.clave),
  );
}
export function saludTienda(
  t: TiendaReglas,
  asuntos: AsuntoAdmin[],
  trabajos: TrabajoRetoque[],
  ahora: number,
): SaludTienda {
  const propios = asuntos.filter((a) => a.tiendaId === t.id);
  if (propios.some((a) => a.prioridad <= 3)) return "te_necesita";
  if (
    ["solicitado", "generando", "cambios"].includes(t.catalogoEstado) ||
    trabajos.some((tr) => tr.tiendaId === t.id && tr.estado === "pendiente")
  )
    return "esperando_equipo";
  if (propios.some((a) => a.categoria === "se_enfria")) return "se_enfria";
  const corte = ahora - REGLAS_ADMIN.viva_dias * DIA;
  return t.ultimaActividadEn &&
    Date.parse(t.ultimaActividadEn) >= corte &&
    [...t.pedidosEn, ...t.aaahsEn].some((f) => Date.parse(f) >= corte)
    ? "viva"
    : "quieta";
}
