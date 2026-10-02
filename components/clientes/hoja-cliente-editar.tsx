"use client";

import { useState } from "react";
import { MAX_NOMBRE_CLIENTE } from "@/lib/data/clientes";
import { useTiendaActiva } from "@/lib/data/consulta";
import { ClienteDuplicado, mensajeDeError } from "@/lib/data/errores";
import { useData } from "@/lib/data/provider";
import { formatearTelefono, normalizarTelefonoDO } from "@/lib/telefono";
import type { Cliente, PedidoConItems } from "@/lib/types";
import { Hoja, useAvisarAlSalir } from "../hoja";
import { useToast } from "../toast";

const CAMPO =
  "h-[50px] w-full min-w-0 rounded-2xl border-[1.5px] border-borde bg-white px-3.5 text-base text-bosque outline-none focus:border-bosque";

export function HojaClienteEditar({ cliente, pedidos, abierta, alCerrar, alEliminar }: { cliente: Cliente; pedidos: PedidoConItems[]; abierta: boolean; alCerrar: () => void; alEliminar: () => void }) {
  return (
    <Hoja abierta={abierta} alCerrar={alCerrar} titulo="Editar cliente" altura="grande">
      <Formulario key={`${cliente.id}:${cliente.nombre}:${cliente.telefono ?? ""}`} cliente={cliente} pedidos={pedidos} alTerminar={alCerrar} alEliminar={alEliminar} />
    </Hoja>
  );
}

function Formulario({ cliente, pedidos, alTerminar, alEliminar }: { cliente: Cliente; pedidos: PedidoConItems[]; alTerminar: () => void; alEliminar: () => void }) {
  const { actualizarCliente, eliminarCliente } = useData();
  const { tiendaId } = useTiendaActiva();
  const toast = useToast();
  const [nombre, setNombre] = useState(cliente.nombre);
  const [telefono, setTelefono] = useState(cliente.telefono ? formatearTelefono(cliente.telefono) : "");
  const [tocado, setTocado] = useState(false);
  const [duplicado, setDuplicado] = useState<Cliente | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [hojaBorradoAbierta, setHojaBorradoAbierta] = useState(false);
  const [conservarPedidos, setConservarPedidos] = useState(true);
  const [confirmandoHistorial, setConfirmandoHistorial] = useState(false);

  const escrito = telefono.trim();
  const telefonoNormalizado = escrito === "" ? null : normalizarTelefonoDO(escrito);
  const telefonoValido = escrito === "" || telefonoNormalizado !== null;
  const nombreLimpio = nombre.trim();
  const cambiado = nombreLimpio !== cliente.nombre || (telefonoValido ? telefonoNormalizado !== cliente.telefono : true);
  const puedeGuardar = nombreLimpio !== "" && nombreLimpio.length <= MAX_NOMBRE_CLIENTE && telefonoValido && cambiado && !guardando;
  const telefonoMalo = tocado && !telefonoValido;
  useAvisarAlSalir(cambiado);

  const guardar = async () => {
    if (!puedeGuardar) return;
    setGuardando(true);
    setDuplicado(null);
    try {
      await actualizarCliente(tiendaId, cliente.id, { nombre, telefono });
      toast("Datos actualizados.");
      alTerminar();
    } catch (error) {
      if (error instanceof ClienteDuplicado) setDuplicado(error.existente);
      else toast(mensajeDeError(error, "No se pudieron guardar los cambios. Inténtalo otra vez."));
      setGuardando(false);
    }
  };

  const borrar = async (borrarPedidos: boolean) => {
    setGuardando(true);
    try {
      await eliminarCliente(tiendaId, cliente.id, borrarPedidos);
      toast(borrarPedidos ? "Contacto e historial borrados." : "Contacto borrado. Sus pedidos siguen en el historial.");
      alEliminar();
    } catch (error) {
      toast(error instanceof Error && error.message === "contacto_no_encontrado" ? "Ese contacto ya no existe en tu tienda." : mensajeDeError(error, "No se pudo borrar el contacto. Inténtalo otra vez."));
      setGuardando(false);
    }
  };

  return (
    <div className="flex flex-col gap-3.5">
      <p className="text-suave">Cambia solo lo que necesites.</p>

      <label className="flex flex-col gap-1.5 text-[13.5px] font-bold">
        Nombre
        <input
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value.slice(0, MAX_NOMBRE_CLIENTE))}
          maxLength={MAX_NOMBRE_CLIENTE}
          autoComplete="off"
          className={CAMPO}
        />
      </label>

      <label className="flex flex-col gap-1.5 text-[13.5px] font-bold">
        WhatsApp <span className="font-semibold text-suave">(opcional)</span>
        <input
          type="tel"
          inputMode="tel"
          value={telefono}
          onChange={(e) => {
            setTelefono(e.target.value.replace(/[^\d+\-() ]/g, "").slice(0, 18));
            setDuplicado(null);
          }}
          onBlur={() => setTocado(true)}
          placeholder="809-000-0000"
          aria-invalid={telefonoMalo || undefined}
          className={`${CAMPO} ${telefonoMalo ? "border-peligro" : ""}`}
        />
        {telefonoMalo ? (
          <span className="text-[12.5px] font-semibold text-peligro">Escríbelo con 809, 829 o 849 y 7 dígitos más.</span>
        ) : (
          <span className="text-[12.5px] font-semibold text-suave">Usa 809, 829 o 849 y 7 dígitos más. Déjalo vacío si no usa WhatsApp.</span>
        )}
      </label>

      {duplicado && (
        <div role="alert" className="rounded-[18px] bg-mandarina/20 px-4 py-3 text-sm">
          <b>Este número ya es de «{duplicado.nombre}».</b> Usa otro número o déjalo vacío.
        </div>
      )}

      <button
        type="button"
        onClick={guardar}
        disabled={!puedeGuardar}
        className="tocable mt-1 h-14 rounded-full bg-bosque text-[16.5px] font-extrabold text-papel disabled:opacity-50"
      >
        {guardando ? "Guardando…" : "Guardar cambios"}
      </button>

      <div className="mt-1 border-t border-linea pt-3">
        <button type="button" onClick={() => setHojaBorradoAbierta(true)} disabled={guardando} className="tocable h-11 w-full rounded-full text-[14.5px] font-extrabold text-[#b4432a] disabled:opacity-60">
          Borrar contacto
        </button>
      </div>

      <Hoja abierta={hojaBorradoAbierta} alCerrar={() => { setHojaBorradoAbierta(false); setConfirmandoHistorial(false); }} titulo="Borrar contacto" altura="auto">
        <div className="flex flex-col gap-3.5">
          {pedidos.length > 0 ? (
            <>
              <p className="text-suave">{cliente.nombre} tiene {pedidos.length} {pedidos.length === 1 ? "pedido" : "pedidos"} en el historial. ¿Qué hacemos con ellos?</p>
              <button type="button" aria-pressed={conservarPedidos} onClick={() => { setConservarPedidos(true); setConfirmandoHistorial(false); }} className={`tocable rounded-[18px] border-[1.5px] px-4 py-3 text-left ${conservarPedidos ? "border-bosque bg-menta/50" : "border-linea bg-white"}`}>
                <span className="block font-extrabold">Conservar el historial</span>
                <span className="mt-0.5 block text-[13px] text-suave">Los pedidos y sus abonos se quedan, sin estar asociados a este contacto.</span>
              </button>
              <button type="button" aria-pressed={!conservarPedidos} onClick={() => { setConservarPedidos(false); setConfirmandoHistorial(false); }} className={`tocable rounded-[18px] border-[1.5px] px-4 py-3 text-left ${!conservarPedidos ? "border-peligro bg-[#b4432a]/10" : "border-linea bg-white"}`}>
                <span className="block font-extrabold">Borrar el historial también</span>
                <span className="mt-0.5 block text-[13px] text-suave">Se borran esos pedidos, el detalle de sus productos y sus abonos. No se puede deshacer.</span>
              </button>
              {cambiado && <p className="text-xs font-semibold text-suave">También se perderán los cambios que aún no guardaste.</p>}
              {confirmandoHistorial ? (
                <div role="alertdialog" aria-label="Confirmar borrado del historial" className="rounded-[18px] bg-arena px-4 py-3">
                  <p className="text-sm font-bold">Vas a borrar {pedidos.length} {pedidos.length === 1 ? "pedido" : "pedidos"} y sus abonos. Esta acción no se puede deshacer.</p>
                  <div className="mt-3 flex gap-2">
                    <button type="button" onClick={() => borrar(true)} disabled={guardando} className="tocable h-11 flex-1 rounded-full bg-[#b4432a] text-sm font-extrabold text-white disabled:opacity-60">{guardando ? "Borrando…" : "Sí, borrar todo"}</button>
                    <button type="button" onClick={() => setConfirmandoHistorial(false)} disabled={guardando} className="tocable h-11 flex-1 rounded-full border-[1.5px] border-bosque text-sm font-extrabold text-bosque disabled:opacity-60">Mejor no</button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => conservarPedidos ? borrar(false) : setConfirmandoHistorial(true)} disabled={guardando} className={`tocable h-12 rounded-full font-extrabold disabled:opacity-60 ${conservarPedidos ? "bg-bosque text-papel" : "bg-[#b4432a] text-white"}`}>
                  {guardando ? "Borrando…" : conservarPedidos ? "Borrar contacto y conservar historial" : "Continuar"}
                </button>
              )}
            </>
          ) : (
            <>
              <p className="text-suave">¿Borramos a {cliente.nombre}? No tiene pedidos asociados y no se puede recuperar este contacto.</p>
              {cambiado && <p className="text-xs font-semibold text-suave">También se perderán los cambios que aún no guardaste.</p>}
              <button type="button" onClick={() => borrar(false)} disabled={guardando} className="tocable h-12 rounded-full bg-[#b4432a] font-extrabold text-white disabled:opacity-60">{guardando ? "Borrando…" : "Sí, borrar contacto"}</button>
            </>
          )}
          <button type="button" onClick={() => { setHojaBorradoAbierta(false); setConfirmandoHistorial(false); }} disabled={guardando} className="tocable h-11 rounded-full border-[1.5px] border-bosque font-extrabold text-bosque disabled:opacity-60">Cancelar</button>
        </div>
      </Hoja>
    </div>
  );
}
