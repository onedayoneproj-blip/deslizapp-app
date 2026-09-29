"use client";

import { useState, type RefObject } from "react";
import { buscarClientes, pareceTelefono, recientes, resaltar, resaltarTelefono } from "@/lib/buscar-clientes";
import { useTiendaActiva } from "@/lib/data/consulta";
import { ClienteDuplicado } from "@/lib/data/clientes";
import { useData } from "@/lib/data/provider";
import { formatearTelefono, normalizarTelefonoDO } from "@/lib/telefono";
import type { ClienteConResumen } from "@/lib/types";
import { Avatar, EtiquetaRepite } from "../clientes/comunes";
import { CampoNota } from "../clientes/campo-nota";
import { TextoResaltado } from "../clientes/texto-resaltado";
import { IconoBuscar } from "../iconos";
import { useToast } from "../toast";

export type ClienteElegido = { id: string; nombre: string; telefono: string | null };

const campo =
  "h-[50px] w-full min-w-0 rounded-2xl border-[1.5px] border-borde bg-white px-3.5 text-base text-bosque outline-none focus:border-bosque";

const Volver = ({ onClick }: { onClick: () => void }) => (
  <button type="button" onClick={onClick} aria-label="Volver" className="tocable grid h-11 w-11 shrink-0 place-items-center rounded-full bg-arena text-bosque">
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 6l-6 6 6 6" />
    </svg>
  </button>
);

/**
 * Selector de cliente para "+ Pedido", DENTRO de la misma hoja (sin segunda hoja): buscador, recientes,
 * resultados y "Crear cliente «…»". El buscador recibe el foco en el mismo toque que lo abre (lo hace
 * la hoja con `entrada`), para que el teclado del iPhone abra bien.
 */
export function SelectorCliente({
  clientes,
  entrada,
  alElegir,
  alVolver,
}: {
  clientes: ClienteConResumen[];
  entrada: RefObject<HTMLInputElement | null>;
  alElegir: (cliente: ClienteElegido) => void;
  alVolver: () => void;
}) {
  const [consulta, setConsulta] = useState("");
  const [creando, setCreando] = useState<{ nombre: string; telefono: string } | null>(null);
  const q = consulta.trim();

  if (creando) {
    return <FormularioNuevo inicial={creando} alElegir={alElegir} alVolver={() => setCreando(null)} />;
  }

  const resultados = q ? buscarClientes(clientes, q) : recientes(clientes).map((cliente) => ({ cliente, coincide: "nombre" as const }));
  const mostrados = resultados.slice(0, q ? 20 : 8);
  const crear = () => setCreando(pareceTelefono(q) ? { nombre: "", telefono: q } : { nombre: q, telefono: "" });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Volver onClick={alVolver} />
        <label className="flex h-12 min-w-0 flex-1 items-center gap-2.5 rounded-full border-[1.5px] border-borde bg-white px-4 focus-within:border-bosque">
          <IconoBuscar tamano={20} className="shrink-0 text-suave" />
          <span className="sr-only">Buscar cliente</span>
          <input
            ref={entrada}
            type="search"
            value={consulta}
            onChange={(e) => setConsulta(e.target.value)}
            placeholder="Nombre, teléfono o nota"
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent text-base text-bosque outline-none placeholder:text-suave/80"
          />
        </label>
      </div>

      {!q && mostrados.length > 0 && <p className="text-[13.5px] font-bold">Recientes</p>}

      {mostrados.length > 0 && (
        <ul className="rounded-[20px] border border-linea bg-white px-3">
          {mostrados.map(({ cliente: c, coincide }) => (
            <li key={c.id} className="border-b border-arena last:border-b-0">
              <button
                type="button"
                onClick={() => alElegir({ id: c.id, nombre: c.nombre, telefono: c.telefono })}
                className="tocable flex w-full items-center gap-3 py-2.5 text-left text-bosque"
              >
                <Avatar nombre={c.nombre} tamano={40} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-[15px] font-extrabold">
                    <span className="truncate">
                      <TextoResaltado trozos={resaltar(c.nombre, coincide === "nombre" ? q : "")} />
                    </span>
                    {c.repite && <EtiquetaRepite />}
                  </span>
                  {c.telefono && (
                    <span className="block truncate text-[13px] text-suave">
                      <TextoResaltado trozos={resaltarTelefono(formatearTelefono(c.telefono), coincide === "telefono" ? q : "")} />
                    </span>
                  )}
                  {coincide === "nota" && c.nota && (
                    <span className="block truncate text-[12.5px] text-suave">
                      <TextoResaltado trozos={resaltar(c.nota, q)} />
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {q && mostrados.length === 0 && (
        <button
          type="button"
          onClick={crear}
          className="tocable flex items-center gap-3 rounded-[20px] border-[1.5px] border-dashed border-bosque bg-white px-4 py-3.5 text-left text-bosque"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-mandarina text-xl font-extrabold text-bosque-oscuro">+</span>
          <span className="min-w-0">
            <span className="block truncate font-extrabold">Crear cliente «{q}»</span>
            <span className="block text-[12.5px] text-suave">{pareceTelefono(q) ? "Se guarda con ese WhatsApp." : "Se guarda con ese nombre."}</span>
          </span>
        </button>
      )}
      {q && mostrados.length > 0 && (
        <button type="button" onClick={crear} className="self-start px-1 py-1 text-[13.5px] font-extrabold text-suave underline">
          ¿No es ninguno? Crear cliente «{q}»
        </button>
      )}
      {!q && clientes.length === 0 && <p className="rounded-[18px] bg-arena p-4 text-center text-suave">Aún no tienes clientes. Escribe un nombre o un WhatsApp para crear el primero.</p>}
    </div>
  );
}

/** Creación rápida: nombre, WhatsApp dominicano y nota opcional. El cliente queda guardado y elegido. */
function FormularioNuevo({
  inicial,
  alElegir,
  alVolver,
}: {
  inicial: { nombre: string; telefono: string };
  alElegir: (cliente: ClienteElegido) => void;
  alVolver: () => void;
}) {
  const { crearCliente } = useData();
  const { tiendaId } = useTiendaActiva();
  const toast = useToast();
  const [nombre, setNombre] = useState(inicial.nombre);
  const [telefono, setTelefono] = useState(inicial.telefono);
  const [nota, setNota] = useState("");
  const [tocado, setTocado] = useState(false);
  const [duplicado, setDuplicado] = useState<ClienteElegido | null>(null);
  const [guardando, setGuardando] = useState(false);

  const valido = normalizarTelefonoDO(telefono) !== null;
  const malo = tocado && telefono.trim() !== "" && !valido;
  const puedeGuardar = nombre.trim() !== "" && valido && !guardando;

  const guardar = async () => {
    if (!puedeGuardar) return;
    setGuardando(true);
    try {
      const c = await crearCliente(tiendaId, { nombre, telefono, nota });
      toast(`${c.nombre} guardado. Ya está en tus clientes.`);
      alElegir({ id: c.id, nombre: c.nombre, telefono: c.telefono });
    } catch (error) {
      if (error instanceof ClienteDuplicado) setDuplicado({ id: error.existente.id, nombre: error.existente.nombre, telefono: error.existente.telefono });
      else toast("No se pudo guardar. Inténtalo otra vez.");
      setGuardando(false);
    }
  };

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex items-center gap-2">
        <Volver onClick={alVolver} />
        <p className="font-display text-xl">Cliente nuevo</p>
      </div>
      <label className="flex flex-col gap-1.5 text-[13.5px] font-bold">
        Nombre
        <input
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej: Paola Jiménez"
          autoComplete="off"
          aria-label="Nombre del cliente"
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
          aria-label="WhatsApp del cliente"
          aria-invalid={malo || undefined}
          className={`${campo} ${malo ? "border-[#b4432a]" : ""}`}
        />
        {malo && <span className="text-[12.5px] font-semibold text-[#b4432a]">Escríbelo con 809, 829 o 849 y 7 dígitos más.</span>}
      </label>
      <CampoNota valor={nota} alCambiar={setNota} />

      {duplicado && (
        <div role="alert" className="rounded-[18px] bg-mandarina/20 px-4 py-3 text-sm">
          <b>{duplicado.nombre} ya está en tus clientes con ese WhatsApp.</b> No la duplicamos.
          <button type="button" onClick={() => alElegir(duplicado)} className="mt-2 block h-11 w-full rounded-full bg-bosque font-extrabold text-papel">
            Usar a {duplicado.nombre.split(" ")[0]}
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={guardar}
        disabled={!puedeGuardar}
        className="tocable h-14 rounded-full bg-bosque text-[16.5px] font-extrabold text-papel disabled:opacity-50"
      >
        Crear y elegir
      </button>
    </div>
  );
}
