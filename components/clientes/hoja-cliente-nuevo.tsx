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
import { AvatarYNota, HojaAvatar } from "./avatar-y-nota";
import type { ColorAvatar } from "@/lib/avatar-cliente";
import { Aviso, Boton, Campo } from "../ui";
import { useToast } from "../toast";
import { IconoPersona, IconoWhatsApp } from "../iconos";

/** "+ Cliente": nombre y WhatsApp dominicano. No duplica un WhatsApp que ya está en la tienda. */
export function HojaClienteNuevo() {
  const router = useRouter();
  const cerrar = useCallback(() => router.push("/clientes", { scroll: false }), [router]);
  // Mide lo que mide su contenido (sin la mitad vacía); el teclado no cambia su tamaño (HANDOFF.md)
  return (
    <Hoja abierta alCerrar={cerrar} titulo="Cliente nuevo" altura="auto">
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
  const [emoji, setEmoji] = useState<string | null>(null);
  const [color, setColor] = useState<ColorAvatar | null>(null);
  const [eligiendoAvatar, setEligiendoAvatar] = useState(false);
  const [errorNota, setErrorNota] = useState<string | undefined>(undefined);
  const [tocado, setTocado] = useState(false);
  const [duplicado, setDuplicado] = useState<Cliente | null>(null);
  const [guardando, setGuardando] = useState(false);

  const valido = normalizarTelefonoDO(telefono) !== null;
  const malo = tocado && telefono.trim() !== "" && !valido;
  const puedeGuardar = nombre.trim() !== "" && valido && !guardando;
  // Con algún campo lleno y sin guardar, cerrar la hoja pregunta
  useAvisarAlSalir(nombre.trim() !== "" || telefono.trim() !== "" || nota.trim() !== "" || emoji !== null || color !== null);

  const guardar = async () => {
    if (!puedeGuardar) return;
    setGuardando(true);
    try {
      const cliente = await crearCliente(tiendaId, { nombre, telefono, nota, avatarEmoji: emoji, avatarColor: color });
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
      <AvatarYNota nombre={nombre} nota={nota} emoji={emoji} color={color} alCambiarNota={(v) => { setNota(v); setErrorNota(undefined); }} alAbrirAvatar={() => setEligiendoAvatar(true)} />
      <Campo etiqueta="Nombre" icono={IconoPersona} type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Paola Jiménez" autoComplete="off" />
      <Campo
        etiqueta="WhatsApp" icono={IconoWhatsApp}
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

      {errorNota && <p role="alert" className="text-secundario font-bold text-peligro">{errorNota}</p>}

      {duplicado && (
        <Aviso tono="atencion" accion={{ texto: "Usar ese cliente", alTocar: () => router.push(`/clientes/${duplicado.id}`, { scroll: false }) }}>
          <div role="alert">
            <b>Este número ya es de «{duplicado.nombre}».</b> Dos clientes pueden llamarse igual, pero no compartir número.
          </div>
        </Aviso>
      )}

      <Boton data-guardar tamano="grande" anchoCompleto onClick={guardar} deshabilitado={!puedeGuardar}>
        Guardar cliente
      </Boton>

      <HojaAvatar abierta={eligiendoAvatar} alCerrar={() => setEligiendoAvatar(false)} nombre={nombre} emoji={emoji} color={color} alElegir={(e, c) => { setEmoji(e); setColor(c); setEligiendoAvatar(false); }} />
    </div>
  );
}
