"use client";

import { useRef, useState, useSyncExternalStore, type RefObject } from "react";
import { flushSync } from "react-dom";
import { buscarClientes, recientes } from "@/lib/buscar-clientes";
import { useTiendaActiva } from "@/lib/data/consulta";
import { ClienteDuplicado, MAX_NOTA } from "@/lib/data/clientes";
import { mensajeDeError } from "@/lib/data/errores";
import { useData } from "@/lib/data/provider";
import { clienteDelTelefono } from "@/lib/pedido-catalogo";
import { formatearTelefono, normalizarTelefonoDO, resaltarTelefono } from "@/lib/telefono";
import { resaltar } from "@/lib/texto";
import type { ClienteConResumen } from "@/lib/types";
import { CampoNota } from "../clientes/campo-nota";
import { useAvisarAlSalir, useConfirmarSalida } from "../hoja";
import { IconoPersona, IconoWhatsApp } from "../iconos";
import { Aviso, Avatar, Boton, Campo, Etiqueta, GrupoOpciones } from "../ui";
import { TextoResaltado } from "../clientes/texto-resaltado";
import { BotonVolver, FilaAccion, FilaLista, ListaSeleccion, SelectorBusqueda } from "../selector-busqueda";
import { useToast } from "../toast";

/** Un cliente de la tienda (`id`), o uno nuevo todavía sin guardar (`nuevo`: se crea al registrar, en la misma operación). */
export type ClienteElegido = ClienteGuardado | ClienteProvisional;
export type ClienteGuardado = { id: string; nombre: string; telefono: string | null; nuevo?: undefined };
export type ClienteProvisional = { id?: undefined; nombre: string; telefono: string | null; nota: string | null; nuevo: true };

/**
 * Selector de cliente, DENTRO de la misma hoja (sin segunda hoja), el mismo en "+ Pedido" y en "Registrar pedido" del
 * catálogo: buscador, "Nuevo cliente" (o "Crear «…»") SIEMPRE primero (dos clientes pueden llamarse igual: no se deduce
 * quién es por el nombre), y después Recientes o las coincidencias. Única excepción: lo escrito es un WhatsApp completo y
 * válido que ya es de un cliente; entonces solo aparece ese cliente (crear sería un duplicado).
 * `modo`: "guardar" (+ Pedido: el cliente nuevo se guarda al elegirlo) o "provisional" (Registrar: se devuelve sin guardar y
 * se crea con el pedido). El buscador recibe el foco en el mismo toque que lo abre (lo hace la hoja con `entrada`).
 */
export function SelectorCliente({
  activa = true,
  clientes,
  entrada,
  alElegir,
  alVolver,
  modo = "guardar",
  titulo,
}: {
  activa?: boolean;
  clientes: ClienteConResumen[];
  entrada: RefObject<HTMLInputElement | null>;
  alElegir: (cliente: ClienteElegido) => void;
  alVolver: () => void;
  modo?: "guardar" | "provisional";
  /** Encabezado opcional sobre la lista ("¿Quién te escribió?"). */
  titulo?: string;
}) {
  const [consulta, setConsulta] = useState("");
  const [creando, setCreando] = useState<{ nombre: string; telefono: string } | null>(null);
  const nombreNuevo = useRef<HTMLInputElement>(null);
  const telefonoNuevo = useRef<HTMLInputElement>(null);
  const q = consulta.trim();
  // Un prefijo escrito en el chat todavía no es un WhatsApp válido, pero se completa en ese campo.
  const esNumero = /\d/.test(q) && /^[\d\s+\-().]+$/.test(q);

  if (creando) {
    return (
      <FormularioNuevo
        inicial={creando}
        nombreRef={nombreNuevo}
        telefonoRef={telefonoNuevo}
        clientes={clientes}
        modo={modo}
        alElegir={alElegir}
        alVolver={() => setCreando(null)}
      />
    );
  }

  const exacto = q ? clienteDelTelefono(clientes, q) : null;
  const resultados = exacto
    ? [{ cliente: exacto, coincide: "telefono" as const }]
    : q
      ? buscarClientes(clientes, q)
      : recientes(clientes).map((cliente) => ({ cliente, coincide: "nombre" as const }));
  const mostrados = resultados.slice(0, q ? 20 : 8);

  // Abre el formulario con lo escrito (teléfono si parece número, nombre si no) y enfoca el campo que falta
  // en el MISMO toque, para no perder el teclado.
  const crear = () => {
    const inicial = !q ? { nombre: "", telefono: "" } : esNumero ? { nombre: "", telefono: q } : { nombre: q, telefono: "" };
    flushSync(() => setCreando(inicial));
    (inicial.nombre ? telefonoNuevo : nombreNuevo).current?.focus({ preventScroll: true });
  };
  // Siempre arriba: "+ Nuevo cliente" sin texto; "+ Crear «texto»" con texto. Solo se omite con un WhatsApp completo que ya existe.
  const accion = exacto ? undefined : (
    <FilaAccion texto={q ? `Crear «${q}»` : "Nuevo cliente"} detalle={q ? (esNumero ? "Con ese WhatsApp" : "Con ese nombre") : "Nombre, WhatsApp y nota"} onClick={crear} />
  );

  return (
    <SelectorBusqueda
      activa={activa}
      entrada={entrada}
      consulta={consulta}
      alCambiarConsulta={setConsulta}
      placeholder="Busca o crea un cliente"
      etiqueta="Buscar cliente"
      alVolver={alVolver}
      accionArriba={
        <>
          {titulo && <p className="font-display text-titulo-seccion">{titulo}</p>}
          {accion}
        </>
      }
    >
      {exacto && <p className="text-secundario font-extrabold">Ese WhatsApp ya es de un cliente</p>}
      {!exacto && !q && mostrados.length > 0 && <p className="text-secundario font-extrabold">Recientes</p>}
      {!exacto && q && mostrados.length > 0 && (
        <p className="text-secundario font-extrabold">
          {mostrados.length === 1 ? "Coincide 1" : `Coinciden ${mostrados.length}`}
        </p>
      )}
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

// ---- Contactos del teléfono (Contact Picker: Android con Chrome; en iPhone no existe) ----

type ContactoElegido = { name?: string[]; tel?: string[] };
type SelectorContactos = { select: (props: string[], opciones?: { multiple?: boolean }) => Promise<ContactoElegido[]> };
const contactosDelNavegador = () =>
  typeof window !== "undefined" && window.isSecureContext && "contacts" in navigator && "ContactsManager" in window
    ? ((navigator as Navigator & { contacts: SelectorContactos }).contacts ?? null)
    : null;
const nada = () => () => {};

/**
 * Creación rápida: nombre, WhatsApp dominicano y nota opcional. "guardar": el cliente queda guardado y elegido. "provisional":
 * se devuelve sin guardar (se crea al registrar el pedido); si el WhatsApp ya es de un cliente, se ofrece ese.
 */
function FormularioNuevo({
  inicial,
  nombreRef,
  telefonoRef,
  clientes,
  modo,
  alElegir,
  alVolver,
}: {
  inicial: { nombre: string; telefono: string };
  nombreRef: RefObject<HTMLInputElement | null>;
  telefonoRef: RefObject<HTMLInputElement | null>;
  clientes: ClienteConResumen[];
  modo: "guardar" | "provisional";
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
  // Varios teléfonos en el contacto elegido: se elige uno.
  const [telefonosContacto, setTelefonosContacto] = useState<string[] | null>(null);
  const hayContactos = useSyncExternalStore(nada, () => contactosDelNavegador() !== null, () => false);

  const cambios = nombre !== inicial.nombre || telefono !== inicial.telefono || nota.trim() !== "";
  useAvisarAlSalir(cambios);
  const confirmarSalida = useConfirmarSalida();
  const volver = () => cambios ? confirmarSalida(alVolver) : alVolver();

  const valido = normalizarTelefonoDO(telefono) !== null;
  const malo = tocado && telefono.trim() !== "" && !valido;
  const puedeGuardar = nombre.trim() !== "" && valido && !guardando;

  const ponerTelefono = (t: string) => {
    setTelefono(t.replace(/[^\d+\-() ]/g, "").slice(0, 18));
    setDuplicado(null);
  };

  // Por gesto directo: un solo contacto, solo nombre y teléfono. Cancelar no borra lo escrito.
  const elegirContacto = async () => {
    const api = contactosDelNavegador();
    if (!api) return;
    try {
      const [c] = await api.select(["name", "tel"], { multiple: false });
      if (!c) return;
      const nombreContacto = c.name?.find((n) => n.trim())?.trim();
      if (nombreContacto) setNombre(nombreContacto.slice(0, 120));
      const tels = [...new Set((c.tel ?? []).map((t) => t.trim()).filter(Boolean))];
      if (tels.length === 1) ponerTelefono(tels[0]!);
      else if (tels.length > 1) setTelefonosContacto(tels);
      setTocado(true);
    } catch {
      // Canceló o el navegador no dejó: queda lo que había.
    }
  };

  const guardar = async () => {
    if (!puedeGuardar) return;
    if (modo === "provisional") {
      const numero = normalizarTelefonoDO(telefono);
      const existente = numero ? clientes.find((c) => c.telefono !== null && normalizarTelefonoDO(c.telefono) === numero) : undefined;
      if (existente) {
        setDuplicado({ id: existente.id, nombre: existente.nombre, telefono: existente.telefono });
        return;
      }
      alElegir({ nombre: nombre.trim(), telefono: numero, nota: nota.trim() || null, nuevo: true });
      return;
    }
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
        <BotonVolver onClick={volver} />
        <p className="font-display text-titulo-seccion">Cliente nuevo</p>
      </div>
      <Campo
        etiqueta="Nombre" icono={IconoPersona}
        ref={nombreRef}
        type="text"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="Ej: Paola Jiménez"
        autoComplete="off"
        maxLength={120}
        aria-label="Nombre del cliente"
      />
      <Campo
        etiqueta="WhatsApp" icono={IconoWhatsApp}
        ref={telefonoRef}
        type="tel"
        inputMode="tel"
        value={telefono}
        onChange={(e) => ponerTelefono(e.target.value)}
        onBlur={() => setTocado(true)}
        placeholder="809-000-0000"
        aria-label="WhatsApp del cliente"
        error={malo ? "Escríbelo con 809, 829 o 849 y 7 dígitos más." : undefined}
      />
      {hayContactos && (
        <Boton jerarquia="secundario" tamano="compacto" icono={<IconoPersona tamano={18} />} onClick={() => void elegirContacto()} className="self-start">
          Elegir de mis contactos
        </Boton>
      )}
      {telefonosContacto && (
        <GrupoOpciones
          titulo="¿Cuál es su WhatsApp?"
          valor={null}
          alCambiar={(t) => {
            ponerTelefono(t);
            setTelefonosContacto(null);
          }}
          opciones={telefonosContacto.map((t) => ({ id: t, texto: formatearTelefono(t) }))}
        />
      )}
      <CampoNota valor={nota} alCambiar={(v) => setNota(v.slice(0, MAX_NOTA))} />

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
        {modo === "provisional" ? "Usar este cliente" : "Crear y elegir"}
      </Boton>
    </div>
  );
}
