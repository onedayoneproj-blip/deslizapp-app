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
import { CampoNota } from "../clientes/campo-nota";
import { Aviso, Avatar, Boton, Campo, Etiqueta } from "../ui";
import { TextoResaltado } from "../clientes/texto-resaltado";
import { BotonVolver, FilaAccion, FilaLista, ListaSeleccion, SelectorBusqueda } from "../selector-busqueda";
import { useToast } from "../toast";

export type ClienteElegido = { id: string; nombre: string; telefono: string | null };

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
      {!q && mostrados.length > 0 && <p className="text-secundario font-extrabold">Recientes</p>}
      {mostrados.length > 0 && (
        <ListaSeleccion>
          {mostrados.map(({ cliente: c, coincide }) => (
            <FilaLista key={c.id}>
              <button
                type="button"
                onClick={() => alElegir({ id: c.id, nombre: c.nombre, telefono: c.telefono })}
                className="tocable flex w-full items-center gap-3 py-2.5 text-left text-texto outline-none focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-foco"
              >
                <Avatar nombre={c.nombre} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-cuerpo font-extrabold">
                    <span className="truncate">
                      <TextoResaltado trozos={resaltar(c.nombre, coincide === "nombre" ? q : "")} />
                    </span>
                    {c.repite && <Etiqueta tono="exito">Repite</Etiqueta>}
                  </span>
                  {c.telefono && (
                    <span className="block truncate text-secundario text-texto-secundario">
                      <TextoResaltado trozos={resaltarTelefono(formatearTelefono(c.telefono), coincide === "telefono" ? q : "")} />
                    </span>
                  )}
                  {coincide === "nota" && c.nota && (
                    <span className="block truncate text-etiqueta text-texto-secundario">
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
        <p className="font-display text-titulo-seccion">Cliente nuevo</p>
      </div>
      <Campo
        etiqueta="Nombre"
        ref={nombreRef}
        type="text"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="Ej: Paola Jiménez"
        autoComplete="off"
        aria-label="Nombre del cliente"
      />
      <Campo
        etiqueta="WhatsApp"
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
        error={malo ? "Escríbelo con 809, 829 o 849 y 7 dígitos más." : undefined}
      />
      <CampoNota valor={nota} alCambiar={setNota} />

      {duplicado && (
        <div role="alert">
          <Aviso tono="atencion">
            <b>Este número ya es de «{duplicado.nombre}».</b> Dos clientes pueden llamarse igual, pero no compartir número.
            <Boton anchoCompleto className="mt-2" onClick={() => alElegir(duplicado)}>
              Usar ese cliente
            </Boton>
          </Aviso>
        </div>
      )}

      <Boton tamano="grande" anchoCompleto onClick={guardar} deshabilitado={!puedeGuardar}>
        Crear y elegir
      </Boton>
    </div>
  );
}
