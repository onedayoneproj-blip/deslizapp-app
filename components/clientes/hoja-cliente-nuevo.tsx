"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { useTiendaActiva } from "@/lib/data/consulta";
import { ClienteDuplicado } from "@/lib/data/clientes";
import { mensajeDeError, NotaClienteLarga } from "@/lib/data/errores";
import { useData } from "@/lib/data/provider";
import { normalizarTelefonoDO } from "@/lib/telefono";
import type { Cliente } from "@/lib/types";
import { Hoja, useAvisarAlSalir } from "../hoja";
import { CampoNota } from "./campo-nota";
import { Aviso, Boton, Campo } from "../ui";
import { useToast } from "../toast";

/** "+ Cliente": nombre y WhatsApp dominicano. No duplica un WhatsApp que ya está en la tienda. */
export function HojaClienteNuevo() {
  const router = useRouter();
  const cerrar = useCallback(() => router.push("/clientes", { scroll: false }), [router]);
  // "grande": con campos de texto la hoja no puede cambiar de tamaño al abrirse el teclado (HANDOFF.md)
  return (
    <Hoja abierta alCerrar={cerrar} titulo="Cliente nuevo" altura="grande">
      <Formulario alTerminar={cerrar} />
    </Hoja>
  );
}

function Formulario({ alTerminar }: { alTerminar: () => void }) {
  const router = useRouter();
  const { crearCliente } = useData();
  const { tiendaId } = useTiendaActiva();
  const toast = useToast();
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [nota, setNota] = useState("");
  const [errorNota, setErrorNota] = useState<string | undefined>(undefined);
  const [tocado, setTocado] = useState(false);
  const [duplicado, setDuplicado] = useState<Cliente | null>(null);
  const [guardando, setGuardando] = useState(false);

  const valido = normalizarTelefonoDO(telefono) !== null;
  const malo = tocado && telefono.trim() !== "" && !valido;
  const puedeGuardar = nombre.trim() !== "" && valido && !guardando;
  // Con algún campo lleno y sin guardar, cerrar la hoja pregunta
  useAvisarAlSalir(nombre.trim() !== "" || telefono.trim() !== "" || nota.trim() !== "");

  const guardar = async () => {
    if (!puedeGuardar) return;
    setGuardando(true);
    try {
      const cliente = await crearCliente(tiendaId, { nombre, telefono, nota });
      toast(`${cliente.nombre} guardado. Ya está en tus clientes.`);
      alTerminar();
    } catch (error) {
      if (error instanceof ClienteDuplicado) setDuplicado(error.existente);
      else if (error instanceof NotaClienteLarga) setErrorNota(error.message);
      else toast(mensajeDeError(error, "No se pudo guardar. Inténtalo otra vez."));
      setGuardando(false);
    }
  };

  return (
    <div className="flex flex-col gap-3.5">
      <p className="text-texto-secundario">Nombre y WhatsApp. Con eso basta.</p>
      <Campo etiqueta="Nombre" type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Paola Jiménez" autoComplete="off" />
      <Campo
        etiqueta="WhatsApp"
        type="tel"
        inputMode="tel"
        value={telefono}
        onChange={(e) => {
          setTelefono(e.target.value.replace(/[^\d+\-() ]/g, "").slice(0, 18));
          setDuplicado(null);
        }}
        onBlur={() => setTocado(true)}
        placeholder="809-000-0000"
        error={malo ? "Escríbelo con 809, 829 o 849 y 7 dígitos más." : undefined}
      />

      <CampoNota valor={nota} alCambiar={(v) => { setNota(v); setErrorNota(undefined); }} error={errorNota} />

      {duplicado && (
        <Aviso tono="atencion" accion={{ texto: "Usar ese cliente", alTocar: () => router.push(`/clientes/${duplicado.id}`, { scroll: false }) }}>
          <div role="alert">
            <b>Este número ya es de «{duplicado.nombre}».</b> Dos clientes pueden llamarse igual, pero no compartir número.
          </div>
        </Aviso>
      )}

      <Boton tamano="grande" anchoCompleto onClick={guardar} deshabilitado={!puedeGuardar}>
        Guardar cliente
      </Boton>
    </div>
  );
}
