"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { useTiendaActiva } from "@/lib/data/consulta";
import { ClienteDuplicado } from "@/lib/data/clientes";
import { useData } from "@/lib/data/provider";
import { normalizarTelefonoDO } from "@/lib/telefono";
import type { Cliente } from "@/lib/types";
import { Hoja } from "../hoja";
import { CampoNota } from "./campo-nota";
import { useToast } from "../toast";

const campo =
  "h-[50px] w-full min-w-0 rounded-2xl border-[1.5px] border-borde bg-white px-3.5 text-base text-bosque outline-none focus:border-bosque";

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
  const { crearCliente } = useData();
  const { tiendaId } = useTiendaActiva();
  const toast = useToast();
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [nota, setNota] = useState("");
  const [tocado, setTocado] = useState(false);
  const [duplicado, setDuplicado] = useState<Cliente | null>(null);
  const [guardando, setGuardando] = useState(false);

  const valido = normalizarTelefonoDO(telefono) !== null;
  const malo = tocado && telefono.trim() !== "" && !valido;
  const puedeGuardar = nombre.trim() !== "" && valido && !guardando;

  const guardar = async () => {
    if (!puedeGuardar) return;
    setGuardando(true);
    try {
      const cliente = await crearCliente(tiendaId, { nombre, telefono, nota });
      toast(`${cliente.nombre} guardado. Ya está en tus clientes.`);
      alTerminar();
    } catch (error) {
      if (error instanceof ClienteDuplicado) setDuplicado(error.existente);
      else toast("No se pudo guardar. Inténtalo otra vez.");
      setGuardando(false);
    }
  };

  return (
    <div className="flex flex-col gap-3.5">
      <p className="text-suave">Nombre y WhatsApp. Con eso basta.</p>
      <label className="flex flex-col gap-1.5 text-[13.5px] font-bold">
        Nombre
        <input
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej: Paola Jiménez"
          autoComplete="off"
          className={campo}
        />
      </label>
      <label className="flex flex-col gap-1.5 text-[13.5px] font-bold">
        WhatsApp
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
          aria-invalid={malo || undefined}
          className={`${campo} ${malo ? "border-[#b4432a]" : ""}`}
        />
        {malo && <span className="text-[12.5px] font-semibold text-[#b4432a]">Escríbelo con 809, 829 o 849 y 7 dígitos más.</span>}
      </label>

      <CampoNota valor={nota} alCambiar={setNota} />

      {duplicado && (
        <div role="alert" className="rounded-[18px] bg-mandarina/20 px-4 py-3 text-sm">
          <b>{duplicado.nombre} ya está en tus clientes con ese WhatsApp.</b> No la duplicamos.{" "}
          <Link href={`/clientes/${duplicado.id}`} scroll={false} className="font-extrabold underline">
            Ver cliente
          </Link>
        </div>
      )}

      <button
        type="button"
        onClick={guardar}
        disabled={!puedeGuardar}
        className="tocable h-14 rounded-full bg-bosque text-[16.5px] font-extrabold text-papel disabled:opacity-50"
      >
        Guardar cliente
      </button>
    </div>
  );
}
