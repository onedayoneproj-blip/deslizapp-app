"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { useConsulta, useTiendaActiva } from "@/lib/data/consulta";
import { ClienteDuplicado } from "@/lib/data/clientes";
import { esErrorDeRed, mensajeDeError } from "@/lib/data/errores";
import { useData } from "@/lib/data/provider";
import { formatearPesos, haceCuanto } from "@/lib/formato";
import {
  disponibilidadDeLinea,
  llaveDeLinea,
  textoEncargoDe,
  totalDelBorrador,
  type Borrador,
  type Disponibilidad,
} from "@/lib/pedido-catalogo";
import { formatearTelefono } from "@/lib/telefono";
import type { ClienteConResumen, ItemSolicitud, Producto, SolicitudPedido } from "@/lib/types";
import { Esqueleto } from "../esqueleto";
import { Foto } from "../foto";
import { Hoja } from "../hoja";
import { IconoChevronDerecha } from "../iconos";
import { SelectorCliente, type ClienteElegido } from "../pedidos/selector-cliente";
import { Alerta, Aviso, Avatar, Boton, Etiqueta } from "../ui";
import { AvatarCliente } from "../clientes/avatar-cliente";

/**
 * «Pedido del catálogo» (tablero Registrar, docs/12 §6): la tienda convierte la solicitud que le llegó por WhatsApp en un pedido.
 * La MISMA hoja en el link `/pedido/CODIGO` (con la sesión de la tienda) y en Pedidos › Por registrar. Nada se guarda hasta
 * «Registrar pedido», que llama a `registrar_solicitud` (una sola operación: el cliente nuevo, el pedido y el vínculo).
 * Precios y descuento: los de la solicitud. Disponibilidad: la de hoy, por variante.
 */
export function HojaRegistrarSolicitud({
  codigo,
  abierta,
  alCerrar,
  alSalir,
  alVerPedido,
  alCambio,
}: {
  codigo: string;
  abierta: boolean;
  alCerrar: () => void;
  alSalir?: () => void;
  /** Abre el detalle existente del pedido. */
  alVerPedido: (pedidoId: string) => void;
  /** Se registró o se descartó (para releer el estado público o la lista). */
  alCambio?: () => void;
}) {
  const [hayCambios, setHayCambios] = useState(false);
  const [cerrando, setCerrando] = useState(false);
  const destino = useRef<string | null>(null);
  const verPedido = (id: string) => { destino.current = id; setCerrando(true); };
  const salir = () => {
    if (destino.current) alVerPedido(destino.current);
    else (alSalir ?? alCerrar)();
  };
  // El selector de cliente es otra vista DENTRO de la hoja: Atrás vuelve al pedido sin cerrar ni perder el borrador.
  const [vista, setVista] = useState<Vista>("pedido");
  return (
    <Hoja
      abierta={abierta && !cerrando}
      alCerrar={() => setCerrando(true)}
      alSalir={salir}
      protegerAtras
      titulo="Pedido del catálogo"
      altura="grande"
      avisarAlSalir={hayCambios}
      avisoTitulo="¿Salir sin registrar?"
      avisoTexto="Lo que cambiaste aquí no se guarda. El pedido sigue esperando en Por registrar."
      alVolverInterno={() => {
        if (vista !== "cliente") return false;
        setVista("pedido");
        return true;
      }}
    >
      <ContenidoRegistrar
        codigo={codigo}
        alVerPedido={verPedido}
        alCambio={alCambio}
        alCerrar={() => setCerrando(true)}
        setHayCambios={setHayCambios}
        vista={vista}
        setVista={setVista}
      />
    </Hoja>
  );
}

type Vista = "pedido" | "cliente";
type Final = { tipo: "registrado"; pedidoId: string; yaEstaba: boolean } | { tipo: "descartado" };

function ContenidoRegistrar({
  codigo,
  alVerPedido,
  alCambio,
  alCerrar,
  setHayCambios,
  vista,
  setVista,
}: {
  codigo: string;
  alVerPedido: (pedidoId: string) => void;
  alCambio?: () => void;
  alCerrar: () => void;
  setHayCambios: (v: boolean) => void;
  vista: Vista;
  setVista: (v: Vista) => void;
}) {
  const { solicitudPorCodigo, getProductos, getClientes } = useData();
  const { tiendaId } = useTiendaActiva();
  const sol = useConsulta(`solicitud:${codigo}`, () => solicitudPorCodigo(codigo));
  const prod = useConsulta(`productos:${tiendaId}`, () => getProductos(tiendaId));
  const cli = useConsulta(`clientes:${tiendaId}`, () => getClientes(tiendaId));
  const [final, setFinal] = useState<Final | null>(null);
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    if (!sol.data || sol.data.pedidoId || sol.data.descartadaEn) return;
    const espera = Math.max(0, Date.parse(sol.data.venceEn) - Date.now());
    if (!Number.isFinite(espera)) return;
    const reloj = window.setTimeout(() => setAhora(Date.now()), Math.min(espera, 2_147_483_647));
    return () => window.clearTimeout(reloj);
  }, [sol.data]);

  const terminar = (f: Final) => {
    setHayCambios(false);
    setVista("pedido");
    setFinal(f);
    alCambio?.();
  };

  if (final?.tipo === "registrado") {
    return (
      <Cierre
        titulo={final.yaEstaba ? "Este pedido ya está registrado." : "Registrado."}
        texto={final.yaEstaba ? "No se creó otro: ya está en tus pedidos." : "Ya está en Pedidos › Nuevos. Confírmalo cuando lo tengas listo."}
      >
        <Boton anchoCompleto onClick={() => alVerPedido(final.pedidoId)}>
          {final.yaEstaba ? "Ver pedido existente" : "Ver pedido"}
        </Boton>
      </Cierre>
    );
  }
  if (final?.tipo === "descartado") {
    return (
      <Cierre titulo="Listo, no era un pedido." texto="Salió de Por registrar. Quien lo pidió verá que venció.">
        <Boton jerarquia="secundario" anchoCompleto onClick={alCerrar}>
          Cerrar
        </Boton>
      </Cierre>
    );
  }

  const error = (sol.error && sol.data === undefined) || (prod.error && !prod.data) || (cli.error && !cli.data);
  if (error) {
    return (
      <div className="py-4">
        <Aviso
          tono="peligro"
          accion={{
            texto: "Reintentar",
            alTocar: () => {
              sol.reintentar();
              prod.reintentar();
              cli.reintentar();
            },
          }}
        >
          No pudimos abrir este pedido. Revisa tu conexión.
        </Aviso>
      </div>
    );
  }
  if (sol.data === undefined || !prod.data || !cli.data) return <Cargando />;

  const s = sol.data;
  if (!s || s.tiendaId !== tiendaId) {
    return (
      <Cierre titulo="Este pedido no es de tu tienda." texto="Solo la tienda que lo recibió puede registrarlo. Revisa con qué cuenta entraste.">
        <Boton jerarquia="secundario" anchoCompleto onClick={alCerrar}>
          Cerrar
        </Boton>
      </Cierre>
    );
  }
  if (s.pedidoId) {
    const pedidoId = s.pedidoId;
    return (
      <Cierre titulo="Este pedido ya está registrado." texto="No hace falta registrarlo otra vez: ábrelo para seguirlo.">
        <Boton anchoCompleto onClick={() => alVerPedido(pedidoId)}>
          Ver pedido existente
        </Boton>
      </Cierre>
    );
  }
  if (s.descartadaEn) {
    return (
      <Cierre titulo="Lo marcaste como «No es un pedido»." texto="Ya no está en Por registrar. Si fue un error, pídele que lo vuelva a armar en tu catálogo.">
        <Boton jerarquia="secundario" anchoCompleto onClick={alCerrar}>
          Cerrar
        </Boton>
      </Cierre>
    );
  }
  if (Date.parse(s.venceEn) <= ahora) {
    return (
      <Cierre titulo="Este pedido venció." texto="Nadie lo registró en 7 días. Si todavía lo quiere, que lo vuelva a armar en tu catálogo.">
        <Boton jerarquia="secundario" anchoCompleto onClick={alCerrar}>
          Cerrar
        </Boton>
      </Cierre>
    );
  }

  return (
    <Formulario
      key={s.id}
      solicitud={s}
      productos={prod.data}
      clientes={cli.data}
      tiendaId={tiendaId}
      setHayCambios={setHayCambios}
      vista={vista}
      setVista={setVista}
      alTerminar={terminar}
      alReleer={sol.reintentar}
    />
  );
}

function Cargando() {
  return (
    <div role="status" aria-label="Abriendo el pedido" className="flex flex-col gap-3 py-2">
      <Esqueleto className="h-4 w-40 rounded-radio-s" />
      {[0, 1].map((n) => (
        <div key={n} className="flex items-center gap-3">
          <Esqueleto className="size-12 rounded-radio-m" />
          <div className="flex flex-1 flex-col gap-2">
            <Esqueleto className="h-4 w-2/3 rounded-radio-s" />
            <Esqueleto className="h-3 w-1/3 rounded-radio-s" />
          </div>
        </div>
      ))}
      <Esqueleto className="mt-2 h-(--alto-campo) w-full rounded-radio-m" />
    </div>
  );
}

function Cierre({ titulo, texto, children }: { titulo: string; texto: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1 py-6 text-center">
      <p role="status" className="font-display text-titulo-seccion">
        {titulo}
      </p>
      <p className="max-w-[300px] text-texto-secundario">{texto}</p>
      <div className="mt-4 w-full">{children}</div>
    </div>
  );
}

function textoDisponibilidad(d: Disponibilidad, item: ItemSolicitud): string | null {
  switch (d.tipo) {
    case "ok":
      return null;
    case "agotado":
      return "Se agotó después de que lo pidió.";
    case "menos":
      return `Solo quedan ${d.quedan} de ${item.cantidad === 1 ? "la que" : `las ${item.cantidad} que`} pidió.`;
    case "no_esta":
      return d.motivo === "borrado" ? "Ya no está en tu catálogo: quítalo para registrar." : "Está oculto en tu catálogo: quítalo para registrar.";
  }
}

function Formulario({
  solicitud: s,
  productos,
  clientes,
  tiendaId,
  setHayCambios,
  vista,
  setVista,
  alTerminar,
  alReleer,
}: {
  solicitud: SolicitudPedido;
  productos: Producto[];
  clientes: ClienteConResumen[];
  tiendaId: string;
  setHayCambios: (v: boolean) => void;
  vista: Vista;
  setVista: (v: Vista) => void;
  alTerminar: (f: Final) => void;
  alReleer: () => void;
}) {
  const { registrarSolicitud, descartarSolicitud, solicitudPorCodigo, refrescar } = useData();
  const [borrador, setBorrador] = useState<Borrador>({ quitar: [], encargo: [] });
  const [cliente, setCliente] = useState<ClienteElegido | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultadoIncierto, setResultadoIncierto] = useState(false);
  const [duplicado, setDuplicado] = useState<ClienteDuplicado["existente"] | null>(null);
  const [descartar, setDescartar] = useState(false);
  const buscador = useRef<HTMLInputElement>(null);
  const botonCliente = useRef<HTMLButtonElement>(null);
  const scrollPedido = useRef(0);
  const enCurso = useRef(false);

  const cambiar = (b: Borrador | null, c: ClienteElegido | null | undefined) => {
    if (b) setBorrador(b);
    if (c !== undefined) setCliente(c);
    const bb = b ?? borrador;
    const cc = c === undefined ? cliente : c;
    setHayCambios(bb.quitar.length > 0 || bb.encargo.length > 0 || cc !== null);
  };

  // Al volver del selector (Volver, Atrás o al elegir), el foco regresa a «¿Quién te escribió?».
  const estuvoEnSelector = useRef(false);
  useEffect(() => {
    if (vista === "cliente") estuvoEnSelector.current = true;
    else if (estuvoEnSelector.current) {
      estuvoEnSelector.current = false;
      botonCliente.current?.focus({ preventScroll: true });
      const contenido = botonCliente.current?.closest<HTMLElement>("[data-hoja-contenido]");
      if (contenido) contenido.scrollTop = scrollPedido.current;
    }
  }, [vista]);
  const cerrarSelector = () => setVista("pedido");
  // El foco va al buscador en el MISMO toque que abre el selector (regla del teclado, HANDOFF.md).
  const abrirSelector = () => {
    scrollPedido.current = botonCliente.current?.closest<HTMLElement>("[data-hoja-contenido]")?.scrollTop ?? 0;
    flushSync(() => setVista("cliente"));
    buscador.current?.focus({ preventScroll: true });
  };

  const { quedan, subtotal, descuento, total } = totalDelBorrador(s, borrador);
  const quitados = new Set(borrador.quitar);
  const encargos = new Set(borrador.encargo);
  const lineas = s.items.map((item) => {
    const llave = llaveDeLinea(item);
    const enEncargo = item.porEncargo || encargos.has(llave);
    const d = disponibilidadDeLinea({ ...item, porEncargo: enEncargo }, productos);
    return { item, llave, quitada: quitados.has(llave), enEncargo, d };
  });
  const vivas = lineas.filter((l) => !l.quitada);
  const motivo =
    vivas.length === 0
      ? "Quitaste todo: no queda nada que registrar."
      : vivas.some((l) => l.d.tipo === "no_esta")
        ? "Quita lo que ya no está en tu catálogo."
        : vivas.some((l) => l.d.tipo !== "ok")
          ? "Decide qué hacer con lo agotado: quítalo o pásalo a encargo."
          : !cliente
            ? "Elige quién te escribió."
            : null;

  const quitar = (llave: string, si: boolean) =>
    cambiar({ quitar: si ? [...borrador.quitar, llave] : borrador.quitar.filter((k) => k !== llave), encargo: borrador.encargo.filter((k) => k !== llave) }, undefined);
  const encargar = (llave: string, si: boolean) =>
    cambiar({ ...borrador, encargo: si ? [...borrador.encargo, llave] : borrador.encargo.filter((k) => k !== llave) }, undefined);

  /** ¿Quedó registrada o cerrada (otra sesión, una respuesta perdida)? Se mira el vínculo antes de reintentar. */
  const revisarVinculo = async (): Promise<boolean> => {
    const ahora = await solicitudPorCodigo(s.codigo);
    if (ahora?.pedidoId) {
      alTerminar({ tipo: "registrado", pedidoId: ahora.pedidoId, yaEstaba: true });
      return true;
    }
    if (ahora === null || ahora?.descartadaEn || (ahora && Date.parse(ahora.venceEn) <= Date.now())) {
      setHayCambios(false);
      alReleer();
      return true;
    }
    return false;
  };

  const registrar = async () => {
    if ((!resultadoIncierto && motivo) || !cliente || enCurso.current) return;
    enCurso.current = true;
    setEnviando(true);
    setError(null);
    setDuplicado(null);
    const cambios = { quitar: borrador.quitar, encargo: borrador.encargo };
    try {
      if (resultadoIncierto) {
        // Primero una lectura confirmada: este toque nunca vuelve a escribir.
        if (!(await revisarVinculo())) {
          setResultadoIncierto(false);
          setError("Sigue sin registrar. Revisa el borrador antes de registrarlo.");
        }
        return;
      }
      const r = await registrarSolicitud(
        tiendaId,
        s.id,
        cliente.nuevo ? { clienteNuevo: { nombre: cliente.nombre, telefono: cliente.telefono, nota: cliente.nota }, ...cambios } : { clienteId: cliente.id, ...cambios },
      );
      alTerminar({ tipo: "registrado", pedidoId: r.pedido.id, yaEstaba: false });
    } catch (e) {
      if (e instanceof ClienteDuplicado) {
        setDuplicado(e.existente);
      } else {
        try {
          if (!(await revisarVinculo())) {
            setResultadoIncierto(false);
            refrescar();
            setError(esErrorDeRed(e) ? "No se registró. Conservamos tu borrador: revisa la conexión antes de intentarlo otra vez." : mensajeDeError(e, "No se pudo registrar. Revisa el borrador."));
          }
        } catch {
          setResultadoIncierto(true);
          setError("No pudimos comprobar si se registró. Conservamos tu borrador; comprueba el resultado antes de repetir.");
        }
      }
    } finally {
      enCurso.current = false;
      setEnviando(false);
    }
  };

  const confirmarDescarte = async () => {
    try {
      await descartarSolicitud(tiendaId, s.id);
      setDescartar(false);
      alTerminar({ tipo: "descartado" });
    } catch (e) {
      setDescartar(false);
      try {
        if (!(await revisarVinculo())) setError(mensajeDeError(e, "No se pudo descartar. Inténtalo otra vez."));
      } catch {
        setResultadoIncierto(true);
        setError("No pudimos comprobar el resultado. Revisa la conexión y comprueba el registro.");
      }
    }
  };

  const unidades = s.items.reduce((t, i) => t + i.cantidad, 0);
  return (
    <>
      {/* Las vistas internas permanecen montadas: Atrás conserva la búsqueda y el cliente provisional. */}
      <div hidden={vista !== "cliente"}>
        <SelectorCliente activa={vista === "cliente"} clientes={clientes} entrada={buscador} modo="provisional" titulo="¿Quién te escribió?"
          alElegir={(c) => { cambiar(null, c); setDuplicado(null); setError(null); cerrarSelector(); }}
          alVolver={cerrarSelector} />
      </div>
      <div hidden={vista !== "pedido"}>
    <div className="flex flex-col gap-4">
      <p className="text-secundario text-texto-secundario">
        #{s.codigo} · {haceCuanto(s.creadaEn).replace(/^H/, "h")} · {unidades} {unidades === 1 ? "producto" : "productos"}
      </p>

      <ul aria-label="Lo que pidió" className="flex flex-col divide-y divide-linea rounded-radio-l border border-linea bg-superficie">
        {lineas.map(({ item, llave, quitada, enEncargo, d }) =>
          quitada ? (
            <li key={llave} className="flex min-h-14 items-center gap-3 px-3.5 py-2">
              <p className="min-w-0 flex-1 truncate text-texto-secundario">
                <span className="line-through">{item.nombre}</span> · quitado
              </p>
              <Boton jerarquia="terciario" tamano="compacto" onClick={() => quitar(llave, false)}>
                Deshacer
              </Boton>
            </li>
          ) : (
            <Linea
              key={llave}
              item={item}
              enEncargo={enEncargo}
              encargoTexto={textoEncargoDe(item, productos)}
              d={d}
              alQuitar={() => quitar(llave, true)}
              alEncargar={item.porEncargo ? null : (si) => encargar(llave, si)}
            />
          ),
        )}
      </ul>

      <dl className="flex flex-col gap-1 px-1">
        {descuento > 0 && (
          <>
            <div className="flex justify-between text-texto-secundario">
              <dt>Subtotal</dt>
              <dd>{formatearPesos(subtotal)}</dd>
            </div>
            <div className="flex justify-between text-texto-secundario">
              <dt>Descuento{s.codigoPromo ? ` · ${s.codigoPromo}` : ""}</dt>
              <dd>−{formatearPesos(descuento)}</dd>
            </div>
          </>
        )}
        <div className="flex justify-between text-destacado">
          <dt>Total</dt>
          <dd>{formatearPesos(total)}</dd>
        </div>
        {quedan.length !== s.items.length && quedan.length > 0 && <p className="text-secundario text-texto-secundario">Con lo que quitaste.</p>}
      </dl>

      <div className="flex flex-col gap-2">
        <p className="text-secundario font-extrabold">¿Quién te escribió?</p>
        {cliente ? (
          <div className="flex items-center gap-3 rounded-radio-l border border-linea bg-superficie p-3">
            <AvatarCliente cliente={cliente} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-destacado">{cliente.nombre}</p>
              <p className="truncate text-secundario text-texto-secundario">
                {[cliente.telefono ? formatearTelefono(cliente.telefono) : null, cliente.nuevo ? "Cliente nuevo: se guarda al registrar" : null].filter(Boolean).join(" · ") || "Sin WhatsApp"}
              </p>
            </div>
            <Boton ref={botonCliente} jerarquia="secundario" tamano="compacto" onClick={abrirSelector}>
              Cambiar
            </Boton>
          </div>
        ) : (
          <button
            ref={botonCliente}
            type="button"
            onClick={abrirSelector}
            aria-label="Elegir quién te escribió"
            className="tocable flex h-(--alto-campo) w-full min-w-0 items-center justify-between rounded-radio-m border-[1.5px] border-borde-campo bg-superficie px-3.5 text-left text-cuerpo text-texto-secundario outline-none focus-visible:outline-3 focus-visible:outline-offset-1 focus-visible:outline-foco"
          >
            Busca o crea un cliente
            <IconoChevronDerecha tamano={20} />
          </button>
        )}
      </div>

      {duplicado && (
        <Aviso
          tono="atencion"
          accion={{
            texto: `Usar a ${duplicado.nombre.split(" ")[0]}`,
            alTocar: () => {
              cambiar(null, { id: duplicado.id, nombre: duplicado.nombre, telefono: duplicado.telefono });
              setDuplicado(null);
            },
          }}
        >
          {duplicado.nombre} ya está en tus clientes con ese WhatsApp.
        </Aviso>
      )}
      {error && <Aviso tono="peligro">{error}</Aviso>}

      <div className="flex flex-col gap-1.5">
        <Boton anchoCompleto deshabilitado={!resultadoIncierto && Boolean(motivo)} cargando={enviando} onClick={() => void registrar()} aria-describedby={motivo ? "registrar-motivo" : undefined}>
          {resultadoIncierto ? "Comprobar registro" : "Registrar pedido"}
        </Boton>
        {motivo && (
          <p id="registrar-motivo" className="text-center text-secundario text-texto-secundario">
            {motivo}
          </p>
        )}
        <Boton jerarquia="terciario" tono="peligro" anchoCompleto deshabilitado={enviando || resultadoIncierto} onClick={() => setDescartar(true)}>
          No es un pedido
        </Boton>
      </div>

      <Alerta
        abierta={descartar}
        titulo="¿No es un pedido?"
        descripcion="Sale de Por registrar y quien lo pidió verá que venció. No se puede deshacer."
        accion={{ texto: "No es un pedido", tono: "peligro", alConfirmar: confirmarDescarte }}
        alCancelar={() => setDescartar(false)}
        textoCancelar="Seguir aquí"
      />
    </div>
      </div>
    </>
  );
}

function Linea({
  item,
  enEncargo,
  encargoTexto,
  d,
  alQuitar,
  alEncargar,
}: {
  item: ItemSolicitud;
  enEncargo: boolean;
  encargoTexto: string | null;
  d: Disponibilidad;
  alQuitar: () => void;
  /** null: ya venía por encargo desde el catálogo. */
  alEncargar: ((si: boolean) => void) | null;
}) {
  const aviso = textoDisponibilidad(d, item);
  const pideAtencion = d.tipo !== "ok";
  const puedeEncargo = alEncargar && d.tipo !== "no_esta" && (pideAtencion || enEncargo);
  return (
    <li className="flex gap-3 px-3.5 py-3">
      {item.foto ? (
        <Foto src={item.foto} alt="" sizes="48px" className="size-12 shrink-0 rounded-radio-m bg-fondo" />
      ) : (
        <span aria-hidden="true" className="size-12 shrink-0 rounded-radio-m bg-fondo" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 text-destacado">{item.nombre}</p>
          <p className="shrink-0 text-destacado">{formatearPesos(item.precioUnitario * item.cantidad)}</p>
        </div>
        <p className="text-secundario text-texto-secundario">
          {[item.varianteTexto, `×${item.cantidad}`, item.cantidad > 1 ? `${formatearPesos(item.precioUnitario)} c/u` : null].filter(Boolean).join(" · ")}
        </p>
        {enEncargo && (
          <Etiqueta tono="marca" className="mt-1.5">
            {encargoTexto ? `Por encargo · ${encargoTexto}` : "Por encargo"}
          </Etiqueta>
        )}
        {aviso && <p className="mt-1.5 text-secundario font-bold text-atencion-texto">{aviso}</p>}
        <div className="mt-1 -ml-2 flex flex-wrap gap-1">
          <Boton jerarquia="terciario" tamano="compacto" onClick={alQuitar} aria-label={`Quitar ${item.nombre}`}>
            Quitar
          </Boton>
          {puedeEncargo && (
            <Boton jerarquia="terciario" tamano="compacto" aria-pressed={enEncargo} onClick={() => alEncargar(!enEncargo)}>
              {enEncargo ? "Ya no por encargo" : "Por encargo"}
            </Boton>
          )}
        </div>
      </div>
    </li>
  );
}
