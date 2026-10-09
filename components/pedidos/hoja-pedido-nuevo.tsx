"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { useCallback, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useConsulta, useTiendaActiva } from "@/lib/data/consulta";
import { descuentoDeCodigo } from "@/lib/data/pedidos";
import { mensajeDeError } from "@/lib/data/errores";
import { useData } from "@/lib/data/provider";
import { textoVariante } from "@/lib/data/productos";
import { formatearPesos } from "@/lib/formato";
import { pedirDestelloDePasos } from "@/lib/destello";
import { diaEnPalabras, diaLocal, fechaDeVenta } from "@/lib/venta-pasada";
import { cantidadMaxima, claveLinea, deClaveLinea, esEncargo, precioDeLinea, unidadesVendidas, variantesActivas } from "@/lib/buscar-productos";
import { formatearTelefono } from "@/lib/telefono";
import { buscarCodigoPromo } from "@/lib/promos";
import type { ClienteConResumen, PedidoConItems, Producto, Promo, Variante } from "@/lib/types";
import { montoDeTexto } from "@/lib/credito";
import { CamposPago, datosDePago, diaDeOpcion, fechaDeDia, PAGO_INICIAL, type EstadoPago } from "../credito/campos-pago";
import { Foto } from "../foto";
import { Hoja, useAvisarAlSalir } from "../hoja";
import { Interruptor } from "../controles";
import { IconoCalendario, IconoChevronDerecha, IconoMas } from "../iconos";
import { Alerta, Aviso, Avatar, Boton, Campo, Cantidad, Etiqueta, ListaAgrupada } from "../ui";
import { useToast } from "../toast";
import { FilaDescuento, SelectorDescuento } from "./selector-descuento";
import { SelectorCliente, type ClienteElegido, type ClienteGuardado } from "./selector-cliente";
import { SelectorProducto } from "./selector-producto";
import { useElegirPestanaPedidos } from "./vista-pedidos";
import { AvatarCliente } from "../clientes/avatar-cliente";

/**
 * Pedido manual ("+ Pedido"): una venta que no llegó por el catálogo. Entra directo en Por despachar.
 * Con `pedidoId` es el MISMO formulario en modo edición ("Editar pedido #N"): ya lleno y guarda sobre el mismo pedido.
 */
export function HojaPedidoNuevo({ pedidoId, productoInicialId }: { pedidoId?: string; productoInicialId?: string }) {
  const router = useRouter();
  const { getProductos, getClientes, getPromos, getPedidos } = useData();
  const { tiendaId } = useTiendaActiva();
  // Al cerrar una edición se vuelve al detalle de ese pedido.
  const cerrar = useCallback(() => router.push(pedidoId ? `/pedidos/${pedidoId}` : "/pedidos", { scroll: false }), [router, pedidoId]);

  const { data: productos } = useConsulta(`productos:${tiendaId}`, () => getProductos(tiendaId));
  const { data: clientes } = useConsulta(`clientes:${tiendaId}`, () => getClientes(tiendaId));
  const { data: promos } = useConsulta(`promos:${tiendaId}`, () => getPromos(tiendaId));
  const { data: pedidos } = useConsulta(`pedidos:${tiendaId}`, () => getPedidos(tiendaId));
  if (!productos || !clientes || !promos || !pedidos) return null;

  const pedido = pedidoId ? pedidos.find((p) => p.id === pedidoId) : undefined;
  if (pedidoId && (!pedido || pedido.estado === "cancelado")) {
    return (
      <Hoja abierta alCerrar={cerrar} titulo="Editar pedido">
        <div className="py-6 text-center">
          <p className="font-display text-titulo-seccion">{pedido ? "Este pedido está cancelado." : "Este pedido no vive aquí."}</p>
          <p className="mt-1 text-texto-secundario">
            {pedido ? "Reábrelo primero para poder editarlo." : "Quizá es de otra tienda. Los pedidos no se mezclan."}
          </p>
          <Boton anchoCompleto className="mt-5" onClick={() => router.push("/pedidos", { scroll: false })}>
            Volver a pedidos
          </Boton>
        </div>
      </Hoja>
    );
  }

  return (
    <Hoja abierta alCerrar={cerrar} titulo={pedido ? `Editar pedido #${pedido.numero}` : "Nuevo pedido"} altura="grande">
      <Formulario
        key={pedido?.id ?? "nuevo"}
        productos={productos}
        clientes={clientes}
        promos={promos}
        pedidos={pedidos}
        pedido={pedido}
        productoInicialId={!pedidoId ? productoInicialId : undefined}
        alTerminar={cerrar}
      />
    </Hoja>
  );
}

type Linea = { clave: string; producto: Producto; variante: Variante | null; texto: string | null; porEncargo: boolean; cantidad: number; precio: number };

function Formulario({
  productos,
  clientes,
  promos,
  pedidos,
  pedido,
  productoInicialId,
  alTerminar,
}: {
  productos: Producto[];
  clientes: ClienteConResumen[];
  promos: Promo[];
  pedidos: PedidoConItems[];
  /** Si viene, es una edición de ese pedido (nunca cancelado). */
  pedido?: PedidoConItems;
  /** Producto elegido desde su vista previa; solo se acepta si pertenece a la tienda activa. */
  productoInicialId?: string;
  alTerminar: () => void;
}) {
  const { crearPedidoManual, editarPedido } = useData();
  const { tiendaId } = useTiendaActiva();
  const elegirPestana = useElegirPestanaPedidos();
  const toast = useToast();

  // Los selectores (cliente, productos) son otra vista DENTRO de esta misma hoja (no una segunda hoja).
  const [vista, setVista] = useState<"pedido" | "cliente" | "productos" | "descuento">("pedido");
  const [cliente, setCliente] = useState<ClienteGuardado | null>(() => {
    const c = pedido?.clienteId ? clientes.find((x) => x.id === pedido.clienteId) : undefined;
    return c ? { id: c.id, nombre: c.nombre, telefono: c.telefono } : null;
  });
  // Despachado: solo cliente y fecha. Los productos y el código se ven atenuados y no se tocan.
  const bloqueado = pedido?.estado === "despachado";
  const buscador = useRef<HTMLInputElement>(null);
  // Por llave de línea: el producto, o "producto:variante" (claveLinea).
  const [cantidades, setCantidades] = useState<Record<string, number>>(() => {
    const c: Record<string, number> = {};
    for (const i of pedido?.items ?? []) {
      const k = claveLinea(i.productoId, i.varianteId);
      c[k] = (c[k] ?? 0) + i.cantidad;
    }
    // Uno con opciones no se agrega solo: falta elegir cuál.
    const productoInicial = productos.find((p) => p.id === productoInicialId);
    if (!pedido && productoInicial && variantesActivas(productoInicial).length === 0) c[productoInicial.id] = Math.min(1, cantidadMaxima(productoInicial));
    return c;
  });
  // Lo que llegó por encargo desde el catálogo sigue por encargo al editar (no descuenta stock). Desde aquí, lo agotado de un
  // producto con "Por encargo" encendido también entra así (esEncargo); si está apagado, lo agotado no se agrega.
  const [encargos] = useState(() => new Set((pedido?.items ?? []).filter((i) => i.porEncargo).map((i) => claveLinea(i.productoId, i.varianteId))));
  const [codigo, setCodigo] = useState(pedido?.codigoPromo ?? "");
  const [guardando, setGuardando] = useState(false);
  // Despachado: salir hacia los pasos del pedido, con confirmación si hay cambios sin guardar.
  const [confirmandoSalir, setConfirmandoSalir] = useState(false);
  // El cupón que había al abrir el selector: la fila lo usa para animar el cambio al volver.
  // "Es una venta que ya hice": entra despachada con la fecha elegida.
  const [ventaPasada, setVentaPasada] = useState(false);
  const diaOriginal = pedido ? diaLocal(new Date(pedido.creadoEn)) : null;
  const [dia, setDia] = useState(() => diaOriginal ?? diaLocal());
  const [descontarStock, setDescontarStock] = useState(false);
  // ¿Cómo te paga?: de contado o a crédito (con lo que dio ahora, cuándo quedó en pagar). Al editar, lo que ya tiene el pedido.
  const [pago, setPago] = useState<EstadoPago>(() => (pedido ? { ...PAGO_INICIAL, modo: pedido.pagoModo, fecha: fechaDeDia(pedido.pagoFechaAcordada) } : PAGO_INICIAL));
  const conAbonos = (pedido?.abonos.length ?? 0) > 0;
  // Lo que ya pagó (solo cuenta si el pedido es a crédito: uno de contado pasa a crédito sin abonos)
  const yaPagado = pedido?.pagoModo === "credito" ? pedido.pagado : 0;

  const vendidas = useMemo(() => unidadesVendidas(pedidos), [pedidos]);
  // Despachado: se muestra lo que se vendió (precios de ese momento). Si no, la cuenta de hoy, igual que al crear.
  const lineas: Linea[] = bloqueado
    ? (pedido?.items ?? []).flatMap((i) => {
        const p = productos.find((x) => x.id === i.productoId);
        const v = i.varianteId ? (p?.variantes?.find((x) => x.id === i.varianteId) ?? null) : null;
        return p ? [{ clave: i.id, producto: p, variante: v, texto: i.varianteTexto, porEncargo: i.porEncargo, cantidad: i.cantidad, precio: i.precioUnitario }] : [];
      })
    : Object.entries(cantidades).flatMap(([clave, cantidad]) => {
        const l = cantidad > 0 ? deClaveLinea(productos, clave) : null;
        if (!l) return [];
        const { producto, variante } = l;
        const texto = variante ? textoVariante(producto.opciones, variante.valores) : null;
        return [{ clave, producto, variante, texto, porEncargo: encargos.has(clave) || esEncargo(producto, variante), cantidad, precio: precioDeLinea(producto, variante, promos).precio }];
      });
  const subtotal = lineas.reduce((suma, l) => suma + l.precio * l.cantidad, 0);
  const clienteId = cliente?.id ?? null;
  const contexto = useMemo(() => ({ pedidos, pedido, clienteId }), [pedidos, pedido, clienteId]);
  const promo = buscarCodigoPromo(promos, tiendaId, codigo, contexto);
  const descuento = bloqueado ? Math.max(0, subtotal - (pedido?.total ?? 0)) : descuentoDeCodigo(promo, subtotal);
  const totalFinal = bloqueado ? (pedido?.total ?? 0) : subtotal - descuento;
  const codigoMalo = !bloqueado && codigo.trim() !== "" && !promo;

  // Con cualquier cambio respecto a como se abrió (cliente, productos, código, venta pasada, fecha, pago) y sin guardar, cerrar
  // la hoja pregunta. La "firma" es el estado que se guarda; la inicial se toma al abrir.
  const firma = JSON.stringify({
    cliente: cliente?.id ?? null,
    lineas: Object.entries(cantidades).filter(([, n]) => n > 0).sort(([a], [b]) => a.localeCompare(b)),
    codigo: codigo.trim(),
    ventaPasada,
    dia: ventaPasada || bloqueado ? dia : null,
    descontarStock: ventaPasada ? descontarStock : false,
    pago: pago.modo === "credito" ? pago : { modo: "contado" },
  });
  const [firmaInicial] = useState(firma);
  useAvisarAlSalir(firma !== firmaInicial);

  const pideFecha = bloqueado || ventaPasada;
  const fechaVenta = pideFecha ? fechaDeVenta(dia) : null;
  const pagoMalo =
    pago.modo === "credito" && ((!conAbonos && montoDeTexto(pago.dio) > totalFinal) || (pago.fecha.opcion === "otra" && diaDeOpcion("otra", pago.fecha.dia) === null));
  const puedeGuardar = cliente !== null && lineas.length > 0 && !codigoMalo && !pagoMalo && !guardando && (!pideFecha || fechaVenta !== null);

  // El foco va al buscador en el MISMO toque que abre el selector (flushSync pinta la vista ya):
  // así el teclado del iPhone abre bien. Regla del teclado en HANDOFF.md.
  const abrir = (destino: "cliente" | "productos") => {
    flushSync(() => setVista(destino));
    buscador.current?.focus({ preventScroll: true });
  };
  const abrirSelector = () => abrir("cliente");
  const elegir = (c: ClienteElegido) => {
    // En "+ Pedido" el selector guarda al cliente nuevo antes de devolverlo (modo "guardar"): siempre trae id.
    if (c.nuevo) return;
    setCliente(c);
    setVista("pedido");
  };

  // La cantidad nunca supera el stock (99 si no se lleva la cuenta o llegó por encargo).
  const cambiar = (p: Producto, v: Variante | null, delta: number) => {
    const k = claveLinea(p.id, v?.id);
    setCantidades((c) => ({ ...c, [k]: Math.min(cantidadMaxima(p, v, encargos.has(k) || esEncargo(p, v)), Math.max(0, (c[k] ?? 0) + delta)) }));
  };
  const aItems = () => lineas.map((l) => ({ productoId: l.producto.id, varianteId: l.variante?.id ?? null, cantidad: l.cantidad, porEncargo: l.porEncargo }));

  // Sin guardar: el cliente o la fecha ya no son los del pedido.
  const hayCambios = Boolean(pedido) && (cliente?.id !== (pedido?.clienteId ?? undefined) || dia !== diaOriginal);
  /** Sale del editor SIN guardar y vuelve al detalle, que señala los pasos con un destello. */
  const irALosPasos = () => {
    if (!pedido) return;
    pedirDestelloDePasos(pedido.id);
    alTerminar();
  };

  const guardar = async () => {
    if (!puedeGuardar || !cliente) return;
    setGuardando(true);
    try {
      const conVenta = ventaPasada && fechaVenta ? { fecha: fechaVenta, descontarStock } : undefined;
      if (pedido) {
        // Despachado: solo se manda la fecha si el día cambió (así no se pierde la hora original).
        const r = await editarPedido(
          tiendaId,
          pedido.id,
          bloqueado
            ? { clienteId: cliente.id, fecha: dia !== diaOriginal && fechaVenta ? fechaVenta : undefined, ...datosDePago(pago, !conAbonos) }
            : {
                clienteId: cliente.id,
                items: aItems(),
                codigo: promo ? codigo : undefined,
                ventaPasada: conVenta,
                ...datosDePago(pago, !conAbonos),
              },
        );
        elegirPestana(r.pedido.estado);
        toast(conVenta ? `Venta #${r.pedido.numero} guardada con fecha ${diaEnPalabras(dia)}.` : `Pedido #${r.pedido.numero} actualizado.`);
        alTerminar();
        return;
      }
      const { pedido: creado } = await crearPedidoManual(tiendaId, {
        clienteId: cliente.id,
        items: aItems(),
        codigo: promo ? codigo : undefined,
        ventaPasada: conVenta,
        ...datosDePago(pago),
      });
      const debe = creado.saldo > 0 ? ` Queda debiendo ${formatearPesos(creado.saldo)}.` : "";
      if (conVenta) {
        elegirPestana("despachado");
        toast(`Venta #${creado.numero} guardada con fecha ${diaEnPalabras(dia)}.${debe}`);
      } else {
        elegirPestana("por_despachar");
        toast(`Pedido #${creado.numero} guardado. Está en Por despachar.${debe}`);
      }
      alTerminar();
    } catch (e) {
      toast(mensajeDeError(e, "No se pudo guardar. Inténtalo otra vez."));
      setGuardando(false);
    }
  };

  if (vista === "productos") {
    return (
      <SelectorProducto
        productos={productos}
        promos={promos}
        vendidas={vendidas}
        cantidades={cantidades}
        encargos={encargos}
        alCambiar={cambiar}
        entrada={buscador}
        alTerminar={() => setVista("pedido")}
      />
    );
  }

  if (vista === "descuento") {
    return (
      <SelectorDescuento
        promos={promos}
        tiendaId={tiendaId}
        contexto={contexto}
        nombreCliente={cliente?.nombre}
        elegido={codigo}
        alElegir={(c) => {
          if (c === null && codigo) toast("Cupón quitado");
          else if (c !== null && codigo) toast("Cupón cambiado");
          setCodigo(c ?? "");
          setVista("pedido");
        }}
        alVolver={() => setVista("pedido")}
      />
    );
  }

  if (vista === "cliente") {
    return <SelectorCliente clientes={clientes} entrada={buscador} alElegir={elegir} alVolver={() => setVista("pedido")} />;
  }

  return (
    <div className="flex flex-col gap-3.5">
      <p className="text-secundario font-extrabold">Cliente</p>
      {cliente ? (
        <div className="flex items-center gap-3 rounded-radio-l border border-linea bg-superficie p-3">
          <AvatarCliente cliente={cliente} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-destacado">{cliente.nombre}</p>
            {cliente.telefono && <p className="truncate text-secundario text-texto-secundario">{formatearTelefono(cliente.telefono)}</p>}
          </div>
          <Boton jerarquia="secundario" tamano="compacto" onClick={abrirSelector}>
            Cambiar
          </Boton>
        </div>
      ) : (
        <button
          type="button"
          onClick={abrirSelector}
          aria-label="Elegir cliente"
          className="tocable flex h-(--alto-campo) w-full min-w-0 items-center justify-between rounded-radio-m border-[1.5px] border-borde-campo bg-superficie px-3.5 text-left text-cuerpo text-texto-secundario outline-none focus-visible:outline-3 focus-visible:outline-offset-1 focus-visible:outline-foco"
        >
          Busca o crea un cliente
          <IconoChevronDerecha tamano={20} />
        </button>
      )}

      <p className="mt-1 text-secundario font-extrabold">Productos</p>
      {bloqueado && (
        <Aviso tono="atencion">
          <p className="text-secundario font-bold">¿Quieres cambiar los productos o las cantidades? Eso se hace desde los pasos del pedido.</p>
          <Boton
            jerarquia="secundario"
            tamano="compacto"
            anchoCompleto
            className="mt-2.5"
            onClick={() => (hayCambios ? setConfirmandoSalir(true) : irALosPasos())}
          >
            Ir a los pasos del pedido
          </Boton>
        </Aviso>
      )}
      <Alerta
        abierta={confirmandoSalir}
        titulo="¿Salir sin guardar?"
        descripcion="Tienes cambios sin guardar."
        accion={{ texto: "Salir", tono: "peligro", alConfirmar: irALosPasos }}
        alCancelar={() => setConfirmandoSalir(false)}
      />
      {lineas.length === 0 ? (
        // Sin productos: toda el área invita a agregar (un solo botón, para que sea tocable completa)
        <button
          type="button"
          onClick={() => abrir("productos")}
          className="tocable flex flex-col items-center rounded-radio-l border border-linea bg-superficie px-5 pt-4 pb-5 text-center text-texto outline-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco"
        >
          <Image src="/ilustraciones/pedidos.webp" alt="" width={110} height={97} unoptimized draggable={false} className="select-none" />
          <span className="mt-2 block font-display text-titulo-seccion">Tu pedido está vacío</span>
          <span className="mt-1 block max-w-[240px] text-secundario text-texto-secundario">Agrega los productos que va a llevar tu cliente.</span>
          <span className="mt-3.5 flex h-(--alto-control) items-center gap-1.5 rounded-full bg-accion pr-5 pl-4 text-cuerpo font-extrabold text-sobre-accion">
            <IconoMas tamano={20} />
            Agregar productos
          </span>
        </button>
      ) : (
        <>
          <ul inert={bloqueado} className={`overflow-hidden rounded-radio-l border border-linea bg-superficie ${bloqueado ? "opacity-55" : ""}`}>
            {lineas.map(({ clave, producto: p, variante, texto, porEncargo, cantidad, precio }) => (
              <li key={clave} className="flex items-center gap-3 border-t border-linea px-4 py-2.5 first:border-t-0">
                <span className="size-11 shrink-0 overflow-hidden rounded-radio-s bg-superficie-hundida">
                  {p.fotos[0] ? <Foto src={p.fotos[0]} alt="" className="h-full w-full" sizes="44px" /> : null}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-destacado">{p.nombre}</p>
                  {texto && <p className="truncate text-secundario text-texto">{texto}</p>}
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-secundario text-texto-secundario">
                    {cantidad} × {formatearPesos(precio)}
                    {porEncargo && <Etiqueta tono="atencion">Por encargo</Etiqueta>}
                  </p>
                </div>
                {bloqueado ? (
                  <span className="shrink-0 font-display text-titulo-seccion tabular-nums">{cantidad}</span>
                ) : (
                  <Cantidad
                    valor={cantidad}
                    max={cantidadMaxima(p, variante, porEncargo)}
                    alCambiar={(v) => cambiar(p, variante, v - cantidad)}
                    etiquetaQuitar={`Quitar uno de ${p.nombre}${texto ? ` ${texto}` : ""}`}
                    etiquetaAgregar={`Agregar otro ${p.nombre}${texto ? ` ${texto}` : ""}`}
                  />
                )}
              </li>
            ))}
          </ul>
          {!bloqueado && (
            <Boton jerarquia="secundario" tamano="grande" anchoCompleto icono={<IconoMas tamano={20} />} onClick={() => abrir("productos")}>
              Agregar más productos
            </Boton>
          )}
        </>
      )}

      <div inert={bloqueado} className={bloqueado ? "opacity-55" : undefined}>
        <ListaAgrupada etiqueta="Descuento">
          <FilaDescuento
            codigo={codigo}
            promo={promo ?? (bloqueado ? (promos.find((p) => p.tipo === "codigo" && p.codigo?.toUpperCase() === codigo.toUpperCase()) ?? null) : null)}
            alAbrir={() => setVista("descuento")}
            deshabilitado={bloqueado}
          />
        </ListaAgrupada>
      </div>

      <div className="rounded-radio-l border border-linea bg-superficie px-4 py-2.5">
        <div className="flex justify-between py-0.5 text-secundario font-bold text-texto-secundario">
          <span>Subtotal</span>
          <span>{formatearPesos(subtotal)}</span>
        </div>
        {descuento > 0 && (
          <div className="flex justify-between py-0.5 text-secundario font-bold">
            <span>Descuento{(bloqueado ? pedido?.codigoPromo : promo?.codigo) ? ` · ${bloqueado ? pedido?.codigoPromo : promo?.codigo}` : ""}</span>
            <span>−{formatearPesos(descuento)}</span>
          </div>
        )}
        <div className="flex justify-between pt-1 font-display text-titulo-seccion">
          <span>Total</span>
          <span>{formatearPesos(totalFinal)}</span>
        </div>
      </div>

      <CamposPago valor={pago} alCambiar={setPago} total={totalFinal} pagado={yaPagado} conAbonos={conAbonos} />

      {bloqueado ? (
        <div className="rounded-radio-l border border-linea bg-superficie px-4 py-3">
          <Campo
            etiqueta="Fecha de la venta" icono={IconoCalendario}
            type="date"
            value={dia}
            max={diaLocal()}
            onChange={(e) => setDia(e.target.value)}
            className="[&_input]:max-w-full [&_input]:appearance-none"
            error={fechaVenta === null ? "Elige un día que ya pasó (hoy también vale)." : undefined}
          />
        </div>
      ) : (
        <div className="rounded-radio-l border border-linea bg-superficie px-4 py-2.5">
          <div className="flex min-h-11 items-center justify-between gap-3">
            <span className="text-cuerpo font-extrabold">Es una venta que ya hice</span>
            <Interruptor encendido={ventaPasada} alCambiar={setVentaPasada} etiqueta="Es una venta que ya hice" />
          </div>
          {ventaPasada && (
            <div className="mt-2 flex flex-col gap-3 border-t border-linea pt-3 pb-1">
              <Campo
                etiqueta="Fecha de la venta" icono={IconoCalendario}
                type="date"
                value={dia}
                max={diaLocal()}
                onChange={(e) => setDia(e.target.value)}
                className="[&_input]:max-w-full [&_input]:appearance-none"
                error={fechaVenta === null ? "Elige un día que ya pasó (hoy también vale)." : undefined}
              />
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={descontarStock}
                  onChange={(e) => setDescontarStock(e.target.checked)}
                  className="mt-0.5 size-6 shrink-0 accent-accion"
                />
                <span className="min-w-0 text-cuerpo">
                  <span className="block font-extrabold">Descontar del stock</span>
                  <span className="block text-secundario text-texto-secundario">Déjala apagada si vendiste esto antes de cargar tu inventario.</span>
                </span>
              </label>
            </div>
          )}
        </div>
      )}

      <Boton tamano="grande" anchoCompleto onClick={guardar} deshabilitado={!puedeGuardar}>
        {ventaPasada ? "Guardar venta" : pedido ? "Guardar cambios" : "Guardar pedido"}
      </Boton>
      {!puedeGuardar && !guardando && !codigoMalo && (
        <p className="-mt-1.5 text-center text-secundario text-texto-secundario">
          {lineas.length === 0 ? "Agrega al menos un producto" : "Elige un cliente"}
        </p>
      )}
    </div>
  );
}
