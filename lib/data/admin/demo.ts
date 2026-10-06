import { ErrorAdmin, type FuenteAdmin } from "./fuente-admin";
import {
  crearEstadoAdminDemo,
  type EstadoAdminDemo,
  type TiendaDemoAdmin,
} from "./seed";
import {
  asuntosAdmin,
  diaRD,
  estadoCobro,
  REGLAS_ADMIN as R,
  saludTienda,
  sumarMeses,
  type TiendaReglas,
} from "../../admin/reglas";
import {
  mezclarJson,
  opinionesValidas,
  personalizacionValida,
} from "../../admin/personalizacion";
import type {
  FiltroRegistro,
  FiltroTiendas,
  Objeto,
  PagoAdmin,
  TiendaAdmin,
  TrabajoRetoque,
} from "../../admin/tipos";

const error = (codigo: string): never => {
  throw new ErrorAdmin(codigo);
};
const entero = (v: number, min = 0, max = 2147483647) =>
  Number.isInteger(v) && v >= min && v <= max;
const motivo = (s: string, max: number) =>
  s.trim().length >= 1 && [...s.trim()].length <= max;
const url = (s: string) => /^https:\/\/\S+$/.test(s) && s.length <= 2048;
const correo = (s: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s);
const filtros: FiltroTiendas[] = [
  "todas",
  "activas",
  "en_prueba",
  "atrasadas",
  "pausadas",
];
const grupos: Record<FiltroRegistro, string[] | null> = {
  todo: null,
  plata: [
    "registrar_pago",
    "anular_pago",
    "ajustar_creditos",
    "recarga_mensual",
  ],
  ver_como: ["ver_como_iniciar", "ver_como_terminar"],
  planes: ["guardar_plan", "cambiar_plan", "guardar_precio_extra"],
  catalogos: [
    "catalogo_avanzar",
    "guardar_personalizacion",
    "retoque_entregar",
    "retoque_devolver",
  ],
};

/** Almacén aislado e inyectable. Cada escritura copia/valida y se confirma entera, como la transacción de la RPC. */
export function crearFuenteAdminDemo(
  estado = crearEstadoAdminDemo(),
  reloj: () => number = Date.now,
  cambiado: () => void = () => {},
): FuenteAdmin {
  let e: EstadoAdminDemo = estado;
  const iso = () => new Date(reloj()).toISOString(),
    hoy = () => diaRD(reloj());
  const activo = () =>
    e.admins.some((a) => a.usuarioId === e.usuarioId && !a.quitadoEn);
  const exigir = () => {
    if (!activo()) error("no_admin");
  };
  const tienda = (id: string, eliminadas = false): TiendaDemoAdmin =>
    e.panel.tiendas.find(
      (t) => t.id === id && (eliminadas || t.estado !== "eliminada"),
    ) ?? error("tienda_no_encontrada");
  const reservado = (id: string) =>
    e.trabajos
      .filter((t) => t.tiendaId === id && t.estado === "pendiente")
      .reduce((n, t) => n + t.creditos, 0);
  const anotar = (
    tiendaId: string | null,
    accion: string,
    detalle: Objeto = {},
  ) =>
    e.registro.push({
      id: crypto.randomUUID(),
      creadoEn: iso(),
      adminId: e.usuarioId,
      tiendaId,
      accion,
      detalle,
    });
  const mover = (
    id: string,
    cantidad: number,
    tipo: EstadoAdminDemo["movimientos"][number]["tipo"],
    texto: string,
    pagoId: string | null = null,
    trabajoId: string | null = null,
    periodo: string | null = null,
  ) => {
    const t = tienda(id, true);
    if (t.creditosRetoque + cantidad < 0) error("creditos_insuficientes");
    e.movimientos.push({
      id: crypto.randomUUID(),
      tiendaId: id,
      cantidad,
      tipo,
      motivo: texto,
      pagoId,
      trabajoId,
      periodo,
      creadoPor: e.usuarioId,
      creadoEn: iso(),
    });
    t.creditosRetoque = e.movimientos
      .filter((m) => m.tiendaId === id)
      .reduce((n, m) => n + m.cantidad, 0);
  };
  async function leer<T>(fn: () => T): Promise<T> {
    exigir();
    return structuredClone(fn());
  }
  async function escribir<T>(fn: () => T, admin = true): Promise<T> {
    if (admin) exigir();
    const destino = e;
    e = structuredClone(destino);
    try {
      const r = fn();
      Object.assign(destino, e);
      return structuredClone(r);
    } finally {
      e = destino;
    }
  }
  // El callback se ejecuta después de una confirmación exitosa, nunca si la validación falla.
  const mutar = async <T>(fn: () => T, admin = true) => {
    const r = await escribir(fn, admin);
    cambiado();
    return r;
  };
  const reglas = (): TiendaReglas[] =>
    e.panel.tiendas.map((t) => ({
      ...t,
      productos: e.panel.productos.filter(
        (p) => p.tiendaId === t.id && !p.eliminadoEn,
      ).length,
      solicitudes: e.panel.solicitudes
        .filter((s) => s.tiendaId === t.id)
        .map((s) => ({
          creadaEn: s.creadaEn,
          venceEn: s.venceEn,
          registradaEn: s.pedidoId ? s.creadaEn : null,
          descartadaEn: s.descartadaEn,
        })),
      pedidosEn: e.panel.pedidos
        .filter((p) => p.tiendaId === t.id)
        .map((p) => p.creadoEn),
      aaahsEn: e.panel.eventosAaah
        .filter((a) => a.tiendaId === t.id)
        .map((a) => a.creadoEn),
    }));
  const asuntos = () => asuntosAdmin(reglas(), e.trabajos, e.uso, reloj());
  const visiblesHoy = () =>
    asuntos().filter(
      (a) =>
        !e.pospuestos.some(
          (p) =>
            p.adminId === e.usuarioId &&
            p.clave === a.clave &&
            Date.parse(p.hasta) > reloj(),
        ),
    );
  const cobro = (t: TiendaDemoAdmin) =>
    estadoCobro(t.estado, t.pruebaHasta, t.pagadoHasta, t.diasGracia, hoy());
  const motivoPrincipal = (id: string) => {
    const a = asuntos().find((a) => a.tiendaId === id);
    return a ? { regla: a.regla, clave: a.clave, datos: a.datos } : null;
  };
  const salud = (id: string) =>
    saludTienda(
      reglas().find((t) => t.id === id)!,
      asuntos(),
      e.trabajos,
      reloj(),
    );
  const fila = (t: TiendaDemoAdmin): TiendaAdmin => ({
    id: t.id,
    slug: t.slug,
    nombre: t.nombre,
    logoUrl: t.logoUrl,
    fotoPerfilUrl: t.fotoPerfilUrl ?? null,
    rubro: t.rubro,
    estado: t.estado,
    plan: t.plan,
    planNombre: e.planes.find((p) => p.id === t.plan)!.nombre,
    precioMensual: e.planes.find((p) => p.id === t.plan)!.precioMensual,
    estadoCobro: cobro(t),
    pagadoHasta: t.pagadoHasta,
    pruebaHasta: t.pruebaHasta,
    diasGracia: t.diasGracia,
    whatsapp: t.whatsapp ?? null,
    vendedora: t.nombreVendedora ?? null,
    creditos: t.creditosRetoque,
    catalogoEstado: t.catalogoEstado,
    catalogoPaso: t.catalogoPaso,
    catalogoPasoEn: t.catalogoPasoEn,
    catalogoNotasCambios: t.catalogoNotasCambios,
    urlCatalogo: t.urlCatalogo,
    salud: salud(t.id),
    motivo: motivoPrincipal(t.id),
    enHoy: visiblesHoy().some((a) => a.tiendaId === t.id),
  });
  const filtro = (t: TiendaDemoAdmin, f: FiltroTiendas) =>
    f === "todas" ||
    (f === "activas" && t.estado === "activa") ||
    (f === "en_prueba" && t.estado === "en_prueba") ||
    (f === "pausadas" && t.estado === "pausada") ||
    (f === "atrasadas" && ["en_gracia", "vencida"].includes(cobro(t)));
  const pagoVigente = (p: PagoAdmin) =>
    !p.anulaA && !e.pagos.some((a) => a.anulaA === p.id);
  const miembro = (id: string) => {
    if (
      !e.panel.usuarios.some(
        (u) => u.id === e.usuarioId && u.tiendaId === id,
      ) ||
      tienda(id).estado === "eliminada"
    )
      error("tienda_no_encontrada");
  };
  const trabajo = (id: string) => {
    const t =
      e.trabajos.find((t) => t.id === id) ?? error("trabajo_no_encontrado");
    if (t.estado !== "pendiente") error("trabajo_no_pendiente");
    return t;
  };
  const fuente: FuenteAdmin = {
    async soyAdmin() {
      return activo();
    },
    resumenMes: () =>
      leer(() => {
        const inicio = hoy().slice(0, 7) + "-01",
          ts = e.panel.tiendas.filter((t) => t.estado !== "eliminada"),
          mes = e.pagos.filter((p) => diaRD(Date.parse(p.creadoEn)) >= inicio),
          atrasadas = ts.filter(
            (t) =>
              t.estado === "activa" &&
              ["en_gracia", "vencida"].includes(cobro(t)),
          ),
          precio = (t: TiendaDemoAdmin) =>
            e.planes.find((p) => p.id === t.plan)?.precioMensual ?? 0;
        return {
          mes: inicio,
          tiendasActivas: ts.filter((t) => t.estado === "activa").length,
          enPrueba: ts.filter((t) => t.estado === "en_prueba").length,
          cobradoMes: mes.reduce((n, p) => n + p.monto, 0),
          esperadoMes: ts
            .filter((t) => t.estado === "activa")
            .reduce((n, t) => n + precio(t), 0),
          porCobrar: atrasadas.reduce((n, t) => n + precio(t), 0),
          porCobrarTiendas: atrasadas.length,
          creditosVendidosMonto: mes
            .filter((p) => p.concepto === "creditos")
            .reduce((n, p) => n + p.monto, 0),
          creditosVendidos: mes
            .filter((p) => p.concepto === "creditos" && pagoVigente(p))
            .reduce((n, p) => n + (p.creditos ?? 0), 0),
        };
      }),
    hoy: () =>
      leer(() =>
        visiblesHoy().map((a) => {
          const t = e.panel.tiendas.find((t) => t.id === a.tiendaId);
          return {
            ...a,
            tiendaNombre: t?.nombre ?? null,
            tiendaWhatsapp: t?.whatsapp ?? null,
            vendedora: t?.nombreVendedora ?? null,
          };
        }),
      ),
    posponer: (clave, horas = R.posponer_horas) =>
      mutar(() => {
        if (!motivo(clave, 200)) error("clave_invalida");
        if (!entero(horas, 1, 168)) error("horas_invalidas");
        const hasta = new Date(reloj() + horas * 3600000).toISOString();
        e.pospuestos = e.pospuestos.filter(
          (p) => !(p.adminId === e.usuarioId && p.clave === clave),
        );
        e.pospuestos.push({ adminId: e.usuarioId, clave, hasta });
        anotar(null, "posponer", { clave, hasta });
        return hasta;
      }),
    tiendas: (f = "todas", busqueda = "") =>
      leer(() => {
        if (!filtros.includes(f)) error("filtro_invalido");
        const q = busqueda.trim().toLowerCase(),
          dig = busqueda.replace(/\D/g, "");
        const base = e.panel.tiendas.filter(
          (t) =>
            t.estado !== "eliminada" &&
            (!q ||
              t.nombre.toLowerCase().includes(q) ||
              (dig.length >= 3 && t.whatsapp?.includes(dig)) ||
              e.panel.usuarios.some(
                (u) => u.tiendaId === t.id && u.email.toLowerCase().includes(q),
              )),
        );
        const orden = [
          "te_necesita",
          "esperando_equipo",
          "se_enfria",
          "viva",
          "quieta",
        ];
        return {
          tiendas: base
            .filter((t) => filtro(t, f))
            .map(fila)
            .sort(
              (a, b) =>
                Number(b.enHoy) - Number(a.enHoy) ||
                orden.indexOf(a.salud) - orden.indexOf(b.salud) ||
                a.nombre.toLowerCase().localeCompare(b.nombre.toLowerCase()) ||
                a.id.localeCompare(b.id),
            ),
          conteos: Object.fromEntries(
            filtros.map((f) => [f, base.filter((t) => filtro(t, f)).length]),
          ) as Record<FiltroTiendas, number>,
        };
      }),
    tienda: (id) =>
      leer(() => {
        const t = tienda(id, true),
          p = e.planes.find((p) => p.id === t.plan)!,
          pagos = e.pagos
            .filter((p) => p.tiendaId === id)
            .sort((a, b) => b.numero - a.numero)
            .slice(0, 50),
          corte = reloj() - 30 * 86400000,
          productos = e.panel.productos.filter(
            (p) => p.tiendaId === id && !p.eliminadoEn,
          );
        return {
          tienda: {
            id,
            slug: t.slug,
            nombre: t.nombre,
            rubro: t.rubro,
            vendedora: t.nombreVendedora ?? null,
            whatsapp: t.whatsapp ?? null,
            instagram: t.instagram ?? null,
            logoUrl: t.logoUrl,
            fotoPerfilUrl: t.fotoPerfilUrl ?? null,
            creadoEn: t.creadoEn,
            activadaEn: t.activadaEn,
            estado: t.estado,
            urlCatalogo: t.urlCatalogo,
            ultimaActividadEn: t.ultimaActividadEn,
          },
          cuenta: {
            plan: t.plan,
            planNombre: p.nombre,
            precioMensual: p.precioMensual,
            limiteProductos: t.limiteProductos,
            pagadoHasta: t.pagadoHasta,
            pruebaHasta: t.pruebaHasta,
            diasGracia: t.diasGracia,
            estadoCobro: cobro(t),
            ultimoPago:
              e.pagos
                .filter((p) => p.tiendaId === id && pagoVigente(p))
                .sort((a, b) => b.numero - a.numero)[0] ?? null,
            pagos,
          },
          treintaDias: {
            productos: productos.length,
            productosVisibles: productos.filter((p) => p.activo).length,
            limiteProductos: t.limiteProductos,
            aaahs: e.panel.eventosAaah.filter(
              (a) => a.tiendaId === id && Date.parse(a.creadoEn) >= corte,
            ).length,
            pedidos: e.panel.pedidos.filter(
              (p) =>
                p.tiendaId === id &&
                p.estado !== "cancelado" &&
                Date.parse(p.creadoEn) >= corte,
            ).length,
            solicitudesSinRegistrar: e.panel.solicitudes.filter(
              (s) =>
                s.tiendaId === id &&
                !s.pedidoId &&
                !s.descartadaEn &&
                Date.parse(s.venceEn) > reloj(),
            ).length,
            creditos: t.creditosRetoque,
            creditosReservados: reservado(id),
            creditosUsados: -e.movimientos
              .filter(
                (m) =>
                  m.tiendaId === id &&
                  m.tipo === "retoque" &&
                  Date.parse(m.creadoEn) >= corte,
              )
              .reduce((n, m) => n + m.cantidad, 0),
            almacenamientoBytes: 0,
          },
          catalogo: {
            estado: t.catalogoEstado,
            paso: t.catalogoPaso,
            pasoEn: t.catalogoPasoEn,
            notasCambios: t.catalogoNotasCambios,
            solicitadoEn: t.catalogoSolicitadoEn,
            publicadoEn: t.catalogoPublicadoEn,
            url: t.urlCatalogo,
          },
          equipo: e.panel.usuarios
            .filter((u) => u.tiendaId === id)
            .map((u) => ({
              usuarioId: u.id,
              email: u.email,
              nombre: u.nombre,
              rol: u.rol,
              ultimaEntradaEn: e.entradas[`${u.id}:${id}`] ?? null,
              creadoEn: t.creadoEn,
            })),
          eventos: e.registro
            .filter((r) => r.tiendaId === id)
            .slice(-15)
            .reverse()
            .map((r) => ({
              tipo: "admin",
              en: r.creadoEn,
              datos: { accion: r.accion, detalle: r.detalle },
            })),
          asuntos: asuntos().filter((a) => a.tiendaId === id),
          salud: { salud: salud(id), motivo: motivoPrincipal(id) },
          funciones: Object.fromEntries(
            e.funciones
              .filter((f) => f.tiendaId === id)
              .map((f) => [f.funcion, f.encendida]),
          ),
        };
      }),
    iniciarVerComo: (id) =>
      mutar(() => {
        tienda(id);
        e.sesiones
          .filter((s) => s.adminId === e.usuarioId && !s.fin)
          .forEach((s) => (s.fin = iso()));
        const s = {
          id: crypto.randomUUID(),
          tiendaId: id,
          adminId: e.usuarioId,
          venceEn: new Date(reloj() + R.ver_como_minutos * 60000).toISOString(),
          fin: null,
        };
        e.sesiones.push(s);
        anotar(id, "ver_como_iniciar", {
          sesion_id: s.id,
          vence_en: s.venceEn,
        });
        return { id: s.id, tiendaId: id, venceEn: s.venceEn };
      }),
    terminarVerComo: (id) =>
      mutar(() => {
        const s = e.sesiones.find(
          (s) => s.id === id && s.adminId === e.usuarioId && !s.fin,
        );
        if (!s) return false;
        s.fin = iso();
        anotar(s.tiendaId, "ver_como_terminar", { sesion_id: id });
        return true;
      }),
    avanzarCatalogo: (id, accion, enlace) =>
      mutar(() => {
        const t = tienda(id),
          antes = t.catalogoEstado,
          paso = t.catalogoPaso;
        if (accion === "empezar" && antes === "solicitado") {
          t.catalogoEstado = "generando";
          t.catalogoPaso = 1;
        } else if (
          accion === "siguiente" &&
          antes === "generando" &&
          (paso ?? 1) < 3
        )
          t.catalogoPaso = (paso ?? 1) + 1;
        else if (
          accion === "a_revisar" &&
          ((antes === "generando" && paso === 3) || antes === "cambios")
        ) {
          if (enlace !== undefined && !url(enlace)) error("enlace_invalido");
          if (!enlace && !t.urlCatalogo) error("catalogo_sin_enlace");
          t.catalogoEstado = "revisar";
          t.catalogoPaso = null;
          t.urlCatalogo = enlace ?? t.urlCatalogo;
        } else error("catalogo_estado_invalido");
        t.catalogoPasoEn = iso();
        anotar(id, "catalogo_avanzar", {
          accion,
          de: { estado: antes, paso },
          a: { estado: t.catalogoEstado, paso: t.catalogoPaso },
        });
        return {
          catalogoEstado: t.catalogoEstado,
          catalogoPaso: t.catalogoPaso,
          catalogoPasoEn: t.catalogoPasoEn,
          urlCatalogo: t.urlCatalogo,
        };
      }),
    guardarPersonalizacion: (id, c) =>
      mutar(() => {
        const t = tienda(id);
        if (
          Object.keys(c).some(
            (k) => !["tema", "mensajes", "secciones", "productos"].includes(k),
          )
        )
          error("personalizacion_invalida");
        const { productos, ...cambios } = c,
          nueva = mezclarJson(
            (t.personalizacion ?? {}) as Objeto,
            cambios as Objeto,
          );
        if (!personalizacionValida(nueva)) error("personalizacion_invalida");
        if (productos && (!Array.isArray(productos) || productos.length > 500))
          error("personalizacion_invalida");
        for (const d of productos ?? []) {
          if (
            Object.keys(d).some(
              (k) => !["id", "orden", "opiniones"].includes(k),
            ) ||
            !/^[0-9a-f-]{36}$/.test(d.id) ||
            (d.orden !== undefined &&
              d.orden !== null &&
              !entero(d.orden, 0, 9999)) ||
            (d.opiniones !== undefined && !opinionesValidas(d.opiniones))
          )
            error("personalizacion_invalida");
          const p =
            e.panel.productos.find(
              (p) => p.id === d.id && p.tiendaId === id && !p.eliminadoEn,
            ) ?? error("producto_no_encontrado");
          if ("orden" in d) p.orden = d.orden ?? null;
          if (d.opiniones) p.opiniones = d.opiniones;
        }
        t.personalizacion = nueva;
        anotar(id, "guardar_personalizacion", {
          claves: Object.keys(cambios),
          productos: productos?.length ?? 0,
        });
        return nueva;
      }),
    trabajosRetoque: (estado = "pendiente") =>
      leer(() => {
        if (!["pendiente", "entregado", "devuelto"].includes(estado))
          error("estado_invalido");
        return e.trabajos
          .filter((t) => t.estado === estado)
          .sort((a, b) =>
            estado === "pendiente"
              ? Date.parse(a.creadoEn) - Date.parse(b.creadoEn)
              : Date.parse(b.atendidoEn!) - Date.parse(a.atendidoEn!),
          )
          .slice(0, 200)
          .sort(
            (a, b) =>
              Date.parse(a.creadoEn) - Date.parse(b.creadoEn) ||
              a.id.localeCompare(b.id),
          )
          .map((t) => ({
            ...t,
            tiendaNombre: tienda(t.tiendaId, true).nombre,
            tiendaWhatsapp: tienda(t.tiendaId, true).whatsapp ?? null,
            vendedora: tienda(t.tiendaId, true).nombreVendedora ?? null,
            productoNombre: e.panel.productos.find(
              (p) => p.id === t.productoId,
            )!.nombre,
          }));
      }),
    entregarRetoque: (id, enlace) =>
      mutar(() => {
        if (!url(enlace)) error("enlace_invalido");
        const tr = trabajo(id),
          p =
            e.panel.productos.find(
              (p) => p.id === tr.productoId && !p.eliminadoEn,
            ) ?? error("producto_no_encontrado");
        if (
          !p.medios.some(
            (m) => m.tipo === "foto" && m.url === tr.medioUrlOriginal,
          )
        )
          error("foto_no_encontrada");
        p.medios = p.medios.map((m) =>
          m.tipo === "foto" && m.url === tr.medioUrlOriginal
            ? { tipo: "foto", url: enlace, retocada: true }
            : m,
        );
        p.fotos = p.medios.filter((m) => m.tipo === "foto").map((m) => m.url);
        tr.estado = "entregado";
        tr.medioUrlRetocado = enlace;
        tr.atendidoEn = iso();
        tr.atendidoPor = e.usuarioId;
        mover(
          tr.tiendaId,
          -tr.creditos,
          "retoque",
          "foto retocada por el equipo",
          null,
          id,
        );
        anotar(tr.tiendaId, "retoque_entregar", {
          trabajo_id: id,
          producto_id: tr.productoId,
          creditos: tr.creditos,
        });
        return tr;
      }),
    devolverRetoque: (id, razon) =>
      mutar(() => {
        if (!motivo(razon, 200)) error("motivo_invalido");
        const tr = trabajo(id);
        tr.estado = "devuelto";
        tr.motivoDevolucion = razon.trim();
        tr.atendidoEn = iso();
        tr.atendidoPor = e.usuarioId;
        anotar(tr.tiendaId, "retoque_devolver", {
          trabajo_id: id,
          motivo: razon.trim(),
        });
        return tr;
      }),
    registrarPago: (d) =>
      mutar(() => {
        if (
          !["mensualidad", "creditos", "instalacion", "otro"].includes(
            d.concepto,
          )
        )
          error("concepto_invalido");
        if (!["transferencia", "deposito", "efectivo"].includes(d.metodo))
          error("metodo_invalido");
        if (!entero(d.monto)) error("monto_invalido");
        const meses = d.concepto === "mensualidad" ? (d.meses ?? 1) : null;
        if (
          (meses !== null && !entero(meses, 1, 12)) ||
          (d.concepto !== "mensualidad" && d.meses != null)
        )
          error("meses_invalidos");
        if (
          d.concepto === "creditos"
            ? !entero(d.creditos ?? 0, 1)
            : d.creditos != null
        )
          error("creditos_invalidos");
        if (
          d.comprobanteUrl &&
          (!d.comprobanteUrl.startsWith(d.tiendaId + "/") ||
            !/^[0-9a-f-]{36}\/[A-Za-z0-9._-]{1,120}$/.test(d.comprobanteUrl))
        )
          error("comprobante_invalido");
        if (
          (d.referencia?.trim() && !motivo(d.referencia, 80)) ||
          (d.nota?.trim() && !motivo(d.nota, 300))
        )
          error("datos_invalidos");
        const t = tienda(d.tiendaId),
          hasta = meses
            ? sumarMeses(
                t.pagadoHasta && t.pagadoHasta > hoy() ? t.pagadoHasta : hoy(),
                meses,
              )
            : null;
        const p: PagoAdmin = {
          id: crypto.randomUUID(),
          numero: Math.max(0, ...e.pagos.map((p) => p.numero)) + 1,
          tiendaId: t.id,
          concepto: d.concepto,
          monto: d.monto,
          metodo: d.metodo,
          referencia: d.referencia?.trim() || null,
          comprobanteUrl: d.comprobanteUrl ?? null,
          meses,
          creditos: d.creditos ?? null,
          cubreHasta: hasta,
          pagadoHastaAnterior: t.pagadoHasta,
          anulaA: null,
          nota: d.nota?.trim() || null,
          registradoPor: e.usuarioId,
          creadoEn: iso(),
        };
        e.pagos.push(p);
        if (hasta) {
          t.pagadoHasta = hasta;
          if (t.estado === "en_prueba") {
            t.estado = "activa";
            t.activadaEn ??= iso();
          }
        }
        if (d.concepto === "creditos")
          mover(t.id, d.creditos!, "compra", "créditos comprados", p.id);
        anotar(t.id, "registrar_pago", {
          pago_id: p.id,
          concepto: p.concepto,
          monto: p.monto,
          pagado_hasta: t.pagadoHasta,
        });
        return {
          pago: p,
          pagadoHasta: t.pagadoHasta,
          creditos: t.creditosRetoque,
          estado: t.estado,
        };
      }),
    anularPago: (id, razon) =>
      mutar(() => {
        if (!motivo(razon, 300)) error("motivo_invalido");
        const p =
          e.pagos.find((p) => p.id === id) ?? error("pago_no_encontrado");
        if (!pagoVigente(p)) error("pago_ya_anulado");
        const t = tienda(p.tiendaId, true),
          a: PagoAdmin = {
            ...p,
            id: crypto.randomUUID(),
            numero: Math.max(...e.pagos.map((p) => p.numero)) + 1,
            monto: -p.monto,
            referencia: null,
            comprobanteUrl: null,
            meses: null,
            creditos: null,
            cubreHasta: null,
            pagadoHastaAnterior: null,
            anulaA: id,
            nota: razon.trim(),
            registradoPor: e.usuarioId,
            creadoEn: iso(),
          };
        e.pagos.push(a);
        if (p.concepto === "mensualidad") {
          let hasta = p.pagadoHastaAnterior;
          for (const q of e.pagos
            .filter(
              (q) =>
                q.tiendaId === t.id &&
                q.concepto === "mensualidad" &&
                q.numero > p.numero &&
                pagoVigente(q),
            )
            .sort((a, b) => a.numero - b.numero)) {
            const dia = diaRD(Date.parse(q.creadoEn));
            hasta = sumarMeses(hasta && hasta > dia ? hasta : dia, q.meses!);
          }
          t.pagadoHasta = hasta;
        }
        if (p.concepto === "creditos") {
          if (t.creditosRetoque - reservado(t.id) < p.creditos!)
            error("creditos_ya_usados");
          mover(t.id, -p.creditos!, "ajuste", "anulación de pago", a.id);
        }
        anotar(t.id, "anular_pago", {
          pago_id: id,
          anulacion_id: a.id,
          motivo: razon.trim(),
          pagado_hasta: t.pagadoHasta,
        });
        return {
          anulacion: a,
          pagadoHasta: t.pagadoHasta,
          creditos: t.creditosRetoque,
        };
      }),
    ajustarCreditos: (id, n, razon) =>
      mutar(() => {
        if (!entero(Math.abs(n), 1, 100000)) error("cantidad_invalida");
        if (!motivo(razon, 200)) error("motivo_invalido");
        const t = tienda(id, true);
        if (t.creditosRetoque - reservado(id) + n < 0)
          error("creditos_insuficientes");
        mover(id, n, "ajuste", razon.trim());
        anotar(id, "ajustar_creditos", {
          cantidad: n,
          motivo: razon.trim(),
          saldo: t.creditosRetoque,
        });
        return t.creditosRetoque;
      }),
    recargaMensual: (id) =>
      mutar(() => {
        if (id && !["activa", "en_prueba"].includes(tienda(id).estado))
          error("tienda_no_encontrada");
        const periodo = hoy().slice(0, 7) + "-01";
        let n = 0;
        for (const t of e.panel.tiendas.filter(
          (t) =>
            (!id || t.id === id) && ["activa", "en_prueba"].includes(t.estado),
        )) {
          const c =
            t.plan === "custom"
              ? t.creditosRetoqueMensuales
              : e.planes.find((p) => p.id === t.plan)!.creditosMensuales;
          if (
            c > 0 &&
            !e.movimientos.some(
              (m) =>
                m.tiendaId === t.id &&
                m.tipo === "recarga_mensual" &&
                m.periodo === periodo,
            )
          ) {
            mover(
              t.id,
              c,
              "recarga_mensual",
              "recarga del mes",
              null,
              null,
              periodo,
            );
            n++;
          }
        }
        anotar(id ?? null, "recarga_mensual", { periodo, recargadas: n });
        return n;
      }),
    planes: () =>
      leer(() => ({
        planes: e.planes
          .map((p) => ({
            ...p,
            tiendas: e.panel.tiendas.filter(
              (t) => t.plan === p.id && t.estado !== "eliminada",
            ).length,
          }))
          .sort((a, b) => a.orden - b.orden || a.id.localeCompare(b.id)),
        preciosExtra: e.preciosExtra
          .slice()
          .sort((a, b) => a.orden - b.orden || a.clave.localeCompare(b.clave)),
      })),
    guardarPlan: (d) =>
      mutar(() => {
        if (!/^[a-z0-9_]{1,30}$/.test(d.id)) error("plan_invalido");
        if (!motivo(d.nombre, 40)) error("nombre_invalido");
        if (d.precioMensual !== null && !entero(d.precioMensual))
          error("precio_invalido");
        if (!entero(d.creditosMensuales)) error("creditos_invalidos");
        if (
          d.id === "custom"
            ? d.limiteProductos !== null
            : !entero(d.limiteProductos ?? 0, 1)
        )
          error("limite_invalido");
        const anterior = e.planes.find((p) => p.id === d.id),
          p = {
            ...d,
            nombre: d.nombre.trim(),
            creadoEn: anterior?.creadoEn ?? iso(),
          };
        e.planes = e.planes.filter((p) => p.id !== d.id);
        e.planes.push(p);
        if (anterior && d.id !== "custom")
          e.panel.tiendas
            .filter((t) => t.plan === d.id)
            .forEach((t) => {
              t.limiteProductos = d.limiteProductos!;
              t.creditosRetoqueMensuales = d.creditosMensuales;
            });
        anotar(null, "guardar_plan", { plan: d.id });
        return p;
      }),
    cambiarPlan: (id, planId, limite) =>
      mutar(() => {
        const p =
          e.planes.find((p) => p.id === planId) ?? error("plan_no_encontrado");
        if (
          p.limiteProductos === null
            ? !entero(limite ?? 0, 1)
            : limite !== undefined
        )
          error("limite_invalido");
        const t = tienda(id);
        t.plan = planId;
        t.limiteProductos = p.limiteProductos ?? limite!;
        if (planId !== "custom")
          t.creditosRetoqueMensuales = p.creditosMensuales;
        const visibles = e.panel.productos.filter(
          (p) => p.tiendaId === id && p.activo && !p.eliminadoEn,
        ).length;
        anotar(id, "cambiar_plan", { a: planId, limite: t.limiteProductos });
        return {
          plan: planId,
          limiteProductos: t.limiteProductos,
          visibles,
          sobran: Math.max(0, visibles - t.limiteProductos),
        };
      }),
    guardarPrecioExtra: (d) =>
      mutar(() => {
        if (!/^[a-z0-9_]{1,40}$/.test(d.clave)) error("clave_invalida");
        if (!motivo(d.nombre, 60)) error("nombre_invalido");
        if (!entero(d.precio)) error("precio_invalido");
        if (d.creditos !== null && !entero(d.creditos, 1))
          error("creditos_invalidos");
        const p = {
          ...d,
          nombre: d.nombre.trim(),
          creadoEn:
            e.preciosExtra.find((p) => p.clave === d.clave)?.creadoEn ?? iso(),
        };
        e.preciosExtra = e.preciosExtra.filter((p) => p.clave !== d.clave);
        e.preciosExtra.push(p);
        anotar(null, "guardar_precio_extra", { clave: d.clave });
        return p;
      }),
    cambiarEstadoTienda: (id, accion, fecha) =>
      mutar(() => {
        const t = tienda(id);
        if (accion === "pausar" && ["activa", "en_prueba"].includes(t.estado))
          t.estado = "pausada";
        else if (accion === "reactivar" && t.estado === "pausada")
          t.estado = t.activadaEn ? "activa" : "en_prueba";
        else if (accion === "prueba" && t.estado === "en_prueba") {
          if (!fecha || fecha < hoy() || !/^\d{4}-\d{2}-\d{2}$/.test(fecha))
            error("fecha_invalida");
          t.pruebaHasta = fecha!;
        } else error("cambio_no_permitido");
        anotar(id, "cambiar_estado_tienda", {
          accion,
          a: t.estado,
          prueba_hasta: t.pruebaHasta,
        });
        return {
          estado: t.estado,
          pruebaHasta: t.pruebaHasta,
          activadaEn: t.activadaEn,
        };
      }),
    transferirTienda: (id, email) =>
      mutar(() => {
        const q = email.trim().toLowerCase();
        if (!correo(q)) error("correo_invalido");
        tienda(id);
        const u =
          e.panel.usuarios.find((u) => u.email.toLowerCase() === q) ??
          error("usuario_no_encontrado");
        const antes = e.panel.usuarios
          .filter(
            (x) => x.tiendaId === id && x.rol === "dueno" && x.id !== u.id,
          )
          .map((x) => x.id);
        for (const x of e.panel.usuarios.filter(
          (x) => x.tiendaId === id && x.rol === "dueno" && x.id !== u.id,
        ))
          x.rol = "staff";
        if (!e.panel.usuarios.some((x) => x.id === u.id && x.tiendaId === id))
          e.panel.usuarios.push({ ...u, tiendaId: id, rol: "dueno" });
        else
          e.panel.usuarios.find(
            (x) => x.id === u.id && x.tiendaId === id,
          )!.rol = "dueno";
        anotar(id, "transferir_tienda", {
          nuevo_dueno: u.id,
          duenos_antes: antes,
        });
        return { nuevoDueno: u.id, duenosAntes: antes };
      }),
    funcionTienda: (id, funcion, encendida) =>
      mutar(() => {
        tienda(id);
        if (
          !/^[A-Za-z][A-Za-z0-9_]{0,39}$/.test(funcion) ||
          typeof encendida !== "boolean"
        )
          error("funcion_invalida");
        const f = {
          tiendaId: id,
          funcion,
          encendida,
          creadoPor: e.usuarioId,
          creadoEn: iso(),
        };
        e.funciones = e.funciones.filter(
          (f) => !(f.tiendaId === id && f.funcion === funcion),
        );
        e.funciones.push(f);
        anotar(id, "funcion_tienda", { funcion, encendida });
        return f;
      }),
    salud: () =>
      leer(() => ({
        almacenamiento: {
          bytes: e.uso.almacenamientoBytes,
          limiteBytes: R.almacenamiento_limite_mb * 1048576,
          porBucket: {},
        },
        base: {
          bytes: e.uso.baseBytes,
          limiteBytes: R.base_limite_mb * 1048576,
        },
        porTienda: [],
        archivoMasGrande: null,
        hoy: {
          aaahs: e.panel.eventosAaah.filter(
            (a) => diaRD(Date.parse(a.creadoEn)) >= hoy(),
          ).length,
          solicitudes: e.panel.solicitudes.filter(
            (s) => diaRD(Date.parse(s.creadaEn)) >= hoy(),
          ).length,
          pedidos: e.panel.pedidos.filter(
            (p) => diaRD(Date.parse(p.creadoEn)) >= hoy(),
          ).length,
        },
      })),
    registro: (f = "todo", antesDe) =>
      leer(() => {
        if (!(f in grupos)) error("filtro_invalido");
        const filas = e.registro
          .filter(
            (r) =>
              (!grupos[f] || grupos[f]!.includes(r.accion)) &&
              (!antesDe || Date.parse(r.creadoEn) < Date.parse(antesDe)),
          )
          .sort(
            (a, b) =>
              Date.parse(b.creadoEn) - Date.parse(a.creadoEn) ||
              a.id.localeCompare(b.id),
          )
          .slice(0, 50)
          .map((r) => ({
            ...r,
            tiendaNombre:
              e.panel.tiendas.find((t) => t.id === r.tiendaId)?.nombre ?? null,
            adminEmail:
              e.admins.find((a) => a.usuarioId === r.adminId)?.email ?? null,
          }));
        return {
          filas,
          siguiente: filas.length === 50 ? filas[49].creadoEn : null,
        };
      }),
    admins: () =>
      leer(() =>
        e.admins
          .filter((a) => !a.quitadoEn)
          .map((a) => ({
            ...a,
            soyYo: a.usuarioId === e.usuarioId,
            creadoPorEmail:
              e.admins.find((c) => c.usuarioId === a.creadoPor)?.email ?? null,
          })),
      ),
    agregarAdmin: (email) =>
      mutar(() => {
        const q = email.trim().toLowerCase();
        if (!correo(q)) error("correo_invalido");
        const u =
          e.panel.usuarios.find((u) => u.email.toLowerCase() === q) ??
          error("usuario_no_encontrado");
        if (e.admins.some((a) => a.usuarioId === u.id && !a.quitadoEn))
          error("ya_es_admin");
        const a = {
          usuarioId: u.id,
          email: q,
          nombre: u.nombre,
          creadoEn: iso(),
          creadoPor: e.usuarioId,
          quitadoEn: null,
          quitadoPor: null,
        };
        e.admins = e.admins.filter((a) => a.usuarioId !== u.id);
        e.admins.push(a);
        anotar(null, "agregar_admin", { usuario_id: u.id, email: q });
        return a;
      }),
    quitarAdmin: (id) =>
      mutar(() => {
        const a =
          e.admins.find((a) => a.usuarioId === id && !a.quitadoEn) ??
          error("admin_no_encontrado");
        if (e.admins.filter((a) => !a.quitadoEn).length <= 1)
          error("ultimo_admin");
        a.quitadoEn = iso();
        a.quitadoPor = e.usuarioId;
        anotar(null, "quitar_admin", { usuario_id: id, email: a.email });
      }),
    marcarActividad: (id) =>
      mutar(() => {
        miembro(id);
        const t = tienda(id),
          clave = `${e.usuarioId}:${id}`,
          corte = reloj() - R.marcar_actividad_minutos * 60000;
        const cambio =
          !e.entradas[clave] || Date.parse(e.entradas[clave]) < corte;
        if (cambio) e.entradas[clave] = iso();
        if (!t.ultimaActividadEn || Date.parse(t.ultimaActividadEn) < corte)
          t.ultimaActividadEn = iso();
        return cambio;
      }, false),
    pedirRetoque: (id, medio) =>
      mutar(() => {
        const p =
          e.panel.productos.find((p) => p.id === id && !p.eliminadoEn) ??
          error("producto_no_encontrado");
        miembro(p.tiendaId);
        const foto =
          p.medios.find((m) => m.tipo === "foto" && m.url === medio) ??
          error("foto_no_encontrada");
        if (foto.tipo === "foto" && foto.retocada) error("foto_ya_retocada");
        if (
          e.trabajos.some(
            (t) =>
              t.productoId === id &&
              t.medioUrlOriginal === medio &&
              t.estado === "pendiente",
          )
        )
          error("retoque_pendiente");
        if (
          tienda(p.tiendaId).creditosRetoque - reservado(p.tiendaId) <
          R.creditos_por_retoque
        )
          error("creditos_insuficientes");
        const tr: TrabajoRetoque = {
          id: crypto.randomUUID(),
          tiendaId: p.tiendaId,
          productoId: id,
          medioUrlOriginal: medio,
          medioUrlRetocado: null,
          estado: "pendiente",
          motivoDevolucion: null,
          creditos: R.creditos_por_retoque,
          pedidoPor: e.usuarioId,
          atendidoPor: null,
          creadoEn: iso(),
          atendidoEn: null,
        };
        e.trabajos.push(tr);
        return tr;
      }, false),
  };
  return fuente;
}
