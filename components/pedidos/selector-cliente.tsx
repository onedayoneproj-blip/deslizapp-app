"use client";

import { useRef, useState, type RefObject } from "react";
import { flushSync } from "react-dom";
import { buscarClientes, recientes } from "@/lib/buscar-clientes";
import { useTiendaActiva } from "@/lib/data/consulta";
import { ClienteDuplicado } from "@/lib/data/clientes";
import { mensajeDeError } from "@/lib/data/errores";
import { useData } from "@/lib/data/provider";
import { formatearTelefono, normalizarTelefonoDO, pareceTelefono, resaltarTelefono } from "@/lib/telefono";
import { resaltar } from "@/lib/texto";
import type { ClienteConResumen } from "@/lib/types";
import { Avatar, EtiquetaRepite } from "../clientes/comunes";
import { CampoNota } from "../clientes/campo-nota";
import { TextoResaltado } from "../clientes/texto-resaltado";
import { BotonVolver, FilaAccion, FilaLista, ListaSeleccion, SelectorBusqueda } from "../selector-busqueda";
import { useToast } from "../toast";

export type ClienteElegido = { id: string; nombre: string; telefono: string | null };

const campo =
  "h-[50px] w-full min-w-0 rounded-2xl border-[1.5px] border-borde bg-white px-3.5 text-base text-bosque outline-none focus:border-bosque";

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
  const nombreNuevo = useRef<HTMLInputElement>(null);
  const telefonoNuevo = useRef<HTMLInputElement>(null);
  const q = consulta.trim();

  if (creando) {
    return (
      <FormularioNuevo inicial={creando} nombreRef={nombreNuevo} telefonoRef={telefonoNuevo} alElegir={alElegir} alVolver={() => setCreando(null)} />
    );
  }

  const resultados = q ? buscarClientes(clientes, q) : recientes(clientes).map((cliente) => ({ cliente, coincide: "nombre" as const }));
  const mostrados = resultados.slice(0, q ? 20 : 8);

  // Abre el formulario con lo escrito (teléfono si parece número, nombre si no) y enfoca el campo que falta
  // en el MISMO toque, para no perder el teclado.
  const crear = () => {
    const inicial = !q ? { nombre: "", telefono: "" } : pareceTelefono(q) ? { nombre: "", telefono: q } : { nombre: q, telefono: "" };
    flushSync(() => setCreando(inicial));
    (inicial.nombre ? telefonoNuevo : nombreNuevo).current?.focus({ preventScroll: true });
  };
  // Siempre disponible: "+ Nuevo cliente" sin texto; "+ Crear «texto»" con texto (arriba si no hay coincidencias, al final si las hay)
  const accion = <FilaAccion texto={q ? `Crear «${q}»` : "Nuevo cliente"} detalle={q ? (pareceTelefono(q) ? "Con ese WhatsApp" : "Con ese nombre") : "Nombre, WhatsApp y nota"} onClick={crear} />;

  return (
    <SelectorBusqueda
      entrada={entrada}
      consulta={consulta}
      alCambiarConsulta={setConsulta}
      placeholder="Busca o crea un cliente"
      etiqueta="Buscar cliente"
      alVolver={alVolver}
      accionArriba={!q || mostrados.length === 0 ? accion : undefined}
      accionAbajo={q && mostrados.length > 0 ? accion : undefined}
    >
      {!q && mostrados.length > 0 && <p className="text-[13.5px] font-bold">Recientes</p>}
      {mostrados.length > 0 && (
        <ListaSeleccion>
          {mostrados.map(({ cliente: c, coincide }) => (
            <FilaLista key={c.id}>
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
            </FilaLista>
          ))}
        </ListaSeleccion>
      )}
    </SelectorBusqueda>
  );
}

/** Creación rápida: nombre, WhatsApp dominicano y nota opcional. El cliente queda guardado y elegido. */
function FormularioNuevo({
  inicial,
  nombreRef,
  telefonoRef,
  alElegir,
  alVolver,
}: {
  inicial: { nombre: string; telefono: string };
  nombreRef: RefObject<HTMLInputElement | null>;
  telefonoRef: RefObject<HTMLInputElement | null>;
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
      else toast(mensajeDeError(error, "No se pudo guardar. Inténtalo otra vez."));
      setGuardando(false);
    }
  };

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex items-center gap-2">
        <BotonVolver onClick={alVolver} />
        <p className="font-display text-xl">Cliente nuevo</p>
      </div>
      <label className="flex flex-col gap-1.5 text-[13.5px] font-bold">
        Nombre
        <input
          ref={nombreRef}
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
          ref={telefonoRef}
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
          <b>Este número ya es de «{duplicado.nombre}».</b> Dos clientes pueden llamarse igual, pero no compartir número.
          <button type="button" onClick={() => alElegir(duplicado)} className="mt-2 block h-11 w-full rounded-full bg-bosque font-extrabold text-papel">
            Usar ese cliente
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
