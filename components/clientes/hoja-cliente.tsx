"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { cuentaDeCliente } from "@/lib/credito";
import { useConsulta, useTiendaActiva } from "@/lib/data/consulta";
import { mensajeDeError } from "@/lib/data/errores";
import { useData } from "@/lib/data/provider";
import { enlaceWhatsApp, fechaCorta, formatearPesos } from "@/lib/formato";
import { formatearTelefono } from "@/lib/telefono";
import type { CuentaCliente } from "@/lib/credito";
import type { ClienteConResumen, PedidoConItems } from "@/lib/types";
import { Hoja, useAvisarAlSalir } from "../hoja";
import { CuerpoCargando, CuerpoConError } from "../hoja-estado";
import { useToast } from "../toast";
import { CampoNota } from "./campo-nota";
import { IconoEditar, IconoWhatsApp } from "../iconos";
import { CuentaDelCliente } from "../credito/cuenta-cliente";
import { Avatar, BarraAbonado, Boton, FilaLista, ListaAgrupada, MontoDeuda } from "../ui";
import { HojaClienteEditar } from "./hoja-cliente-editar";

/** Hoja del cliente sobre Clientes. Al cerrar vuelve a /clientes sin perder la búsqueda (la guarda el layout). */
export function HojaCliente({ clienteId }: { clienteId: string }) {
  const router = useRouter();
  const { getCliente, getPedidos, getDueno } = useData();
  const { tiendaId } = useTiendaActiva();
  const cerrar = useCallback(() => router.push("/clientes", { scroll: false }), [router]);

  const c = useConsulta(`cliente:${tiendaId}:${clienteId}`, () => getCliente(tiendaId, clienteId));
  const p = useConsulta(`pedidos:${tiendaId}`, () => getPedidos(tiendaId));
  const { data: dueno } = useConsulta(`dueno:${tiendaId}`, () => getDueno(tiendaId));
  const { data: cliente } = c;
  const { data: pedidos } = p;
  // La cuenta ("Te debe") se arma aquí, con los pedidos (que ya traen sus abonos): así la hoja no depende de una lectura más.
  // "Ahora" se toma al abrir la hoja (para el atraso).
  const [ahora] = useState(Date.now);
  const cuenta = useMemo(() => (pedidos ? cuentaDeCliente(pedidos, clienteId, ahora) : null), [pedidos, clienteId, ahora]);

  // Nunca en blanco: siempre la misma hoja "Cliente" con su contenido: el esqueleto mientras carga, "Reintentar" si una lectura
  // falla, "no vive aquí" si no es de esta tienda, o el detalle. (Una sola hoja: entra una vez, sin parpadeo.)
  let cuerpo: ReactNode;
  if (c.error || p.error) {
    cuerpo = (
      <CuerpoConError
        alCerrar={cerrar}
        alReintentar={() => {
          c.reintentar();
          p.reintentar();
        }}
        textoVolver="Volver a clientes"
      />
    );
  } else if (cliente === undefined || (cliente && (!pedidos || !cuenta))) {
    cuerpo = <CuerpoCargando titulo="Cliente" />;
  } else if (!cliente) {
    cuerpo = (
      <div className="py-6 text-center">
        <p className="font-display text-titulo-seccion">Esta persona no vive aquí.</p>
        <p className="mt-1 text-texto-secundario">Quizá es cliente de otra tienda. Los clientes no se mezclan.</p>
        <Boton tamano="grande" anchoCompleto onClick={cerrar} className="mt-5">
          Volver a clientes
        </Boton>
      </div>
    );
  } else if (pedidos && cuenta) {
    cuerpo = <Detalle cliente={cliente} pedidos={pedidos.filter((x) => x.clienteId === cliente.id)} cuenta={cuenta} vendedora={dueno?.nombre ?? ""} alEliminar={cerrar} />;
  }

  // "grande": tiene un campo de texto (la nota) y la hoja no cambia de tamaño con el teclado
  return (
    <Hoja abierta alCerrar={cerrar} titulo="Cliente" altura="grande">
      {cuerpo}
    </Hoja>
  );
}

function Detalle({ cliente, pedidos, cuenta, vendedora, alEliminar }: { cliente: ClienteConResumen; pedidos: PedidoConItems[]; cuenta: CuentaCliente; vendedora: string; alEliminar: () => void }) {
  const { actualizarNotaCliente } = useData();
  const { tienda, tiendaId } = useTiendaActiva();
  const toast = useToast();
  const [nota, setNota] = useState(cliente.nota ?? "");
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const cambiada = nota.trim() !== (cliente.nota ?? "");
  // Con la nota cambiada y sin guardar, cerrar la hoja pregunta
  useAvisarAlSalir(cambiada);
  const guardarNota = async () => {
    setGuardando(true);
    try {
      await actualizarNotaCliente(tiendaId, cliente.id, nota);
      toast(nota.trim() ? "Nota guardada." : "Nota borrada.");
    } catch (e) {
      toast(mensajeDeError(e, "No se pudo guardar. Inténtalo otra vez."));
    } finally {
      setGuardando(false);
    }
  };
  const [ahora] = useState(Date.now);
  const historial = useMemo(() => [...pedidos].sort((a, b) => b.creadoEn.localeCompare(a.creadoEn)), [pedidos]);
  const primerNombre = cliente.nombre.split(" ")[0];
  const mensaje = `Hola ${primerNombre}, te escribo de ${tienda?.nombre ?? "la tienda"}.`;

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-col items-center gap-1 text-center">
        <Avatar nombre={cliente.nombre} tamano="grande" repite={cliente.repite} />
        <h2 className="mt-1.5 flex items-center gap-2 font-display text-titulo-hoja">
          {cliente.nombre}
          {cliente.repite && <span className="sr-only">, repite</span>}
        </h2>
        <p className="text-secundario font-bold text-texto-secundario">
          {cliente.telefono ? formatearTelefono(cliente.telefono) : "Sin WhatsApp"} · {cliente.origen === "catalogo" ? "Del catálogo" : "Manual"}
        </p>
      </div>

      {cliente.telefono && (
        <Boton
          tamano="grande"
          anchoCompleto
          icono={<IconoWhatsApp tamano={20} />}
          href={enlaceWhatsApp(cliente.telefono, mensaje)}
          target="_blank"
          rel="noreferrer"
          aria-label={`Escribir a ${cliente.nombre} por WhatsApp`}
        >
          Escribir
        </Boton>
      )}

      <Boton jerarquia="secundario" tamano="grande" anchoCompleto icono={<IconoEditar tamano={20} />} onClick={() => setEditando(true)}>
        Editar datos
      </Boton>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-radio-m border border-linea bg-superficie px-3 py-2.5">
          <div className="font-display text-titulo-seccion">{cliente.pedidos}</div>
          <div className="text-etiqueta font-bold text-texto-secundario">{cliente.pedidos === 1 ? "pedido" : "pedidos"}</div>
        </div>
        <div className="col-span-2 rounded-radio-m bg-marca-rosa px-3 py-2.5 text-texto">
          <div className="font-display text-titulo-seccion">{formatearPesos(cliente.totalGastado)}</div>
          <div className="text-etiqueta font-bold">en total{cliente.ultimaCompra ? ` · última compra ${fechaCorta(cliente.ultimaCompra).toLowerCase()}` : ""}</div>
        </div>
      </div>

      <CuentaDelCliente cliente={cliente} cuenta={cuenta} vendedora={vendedora} tienda={tienda?.nombre ?? "la tienda"} />

      <div className="flex flex-col gap-2">
        <CampoNota valor={nota} alCambiar={setNota} />
        {cambiada && (
          <Boton tamano="compacto" className="self-start" onClick={guardarNota} cargando={guardando}>
            Guardar nota
          </Boton>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-secundario font-extrabold">Historial</p>
        {historial.length === 0 ? (
          <p className="rounded-radio-m bg-superficie-hundida p-3.5 text-center font-bold text-texto-secundario">Todavía no pide. Todavía.</p>
        ) : (
          <ListaAgrupada etiqueta="Historial de pedidos">
            {historial.map((p) => (
              <FilaLista
                key={p.id}
                href={`/pedidos/${p.id}`}
                titulo={`#${p.numero}`}
                detalle={fechaCorta(p.creadoEn)}
                // Sin etiquetas: el total, o lo que debe en naranja (con reloj si está atrasado) y su barra mini
                fin={p.saldo > 0 ? <MontoDeuda saldo={p.saldo} fecha={p.pagoFechaAcordada} ahora={ahora} /> : formatearPesos(p.total)}
                pie={p.saldo > 0 ? <BarraAbonado mini abonado={p.total - p.saldo} total={p.total} /> : undefined}
              />
            ))}
          </ListaAgrupada>
        )}
      </div>

      <HojaClienteEditar cliente={cliente} pedidos={pedidos} abierta={editando} alCerrar={() => setEditando(false)} alEliminar={alEliminar} />
    </div>
  );
}
