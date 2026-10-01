"use client";

import { useState } from "react";
import { MAX_NOMBRE_CLIENTE } from "@/lib/data/clientes";
import { useTiendaActiva } from "@/lib/data/consulta";
import { ClienteDuplicado, mensajeDeError } from "@/lib/data/errores";
import { useData } from "@/lib/data/provider";
import { formatearTelefono, normalizarTelefonoDO } from "@/lib/telefono";
import type { Cliente } from "@/lib/types";
import { Hoja, useAvisarAlSalir } from "../hoja";
import { useToast } from "../toast";

const CAMPO =
  "h-[50px] w-full min-w-0 rounded-2xl border-[1.5px] border-borde bg-white px-3.5 text-base text-bosque outline-none focus:border-bosque";

export function HojaClienteEditar({ cliente, abierta, alCerrar }: { cliente: Cliente; abierta: boolean; alCerrar: () => void }) {
  return (
    <Hoja abierta={abierta} alCerrar={alCerrar} titulo="Editar cliente" altura="grande">
      <Formulario key={`${cliente.id}:${cliente.nombre}:${cliente.telefono ?? ""}`} cliente={cliente} alTerminar={alCerrar} />
    </Hoja>
  );
}

function Formulario({ cliente, alTerminar }: { cliente: Cliente; alTerminar: () => void }) {
  const { actualizarCliente } = useData();
  const { tiendaId } = useTiendaActiva();
  const toast = useToast();
  const [nombre, setNombre] = useState(cliente.nombre);
  const [telefono, setTelefono] = useState(cliente.telefono ? formatearTelefono(cliente.telefono) : "");
  const [tocado, setTocado] = useState(false);
  const [duplicado, setDuplicado] = useState<Cliente | null>(null);
  const [guardando, setGuardando] = useState(false);

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
    </div>
  );
}
