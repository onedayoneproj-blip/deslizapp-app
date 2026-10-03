"use client";

import { useState } from "react";
import { MAX_NOMBRE_CLIENTE } from "@/lib/data/clientes";
import { useTiendaActiva } from "@/lib/data/consulta";
import { ClienteDuplicado, mensajeDeError, NotaClienteLarga } from "@/lib/data/errores";
import { useData } from "@/lib/data/provider";
import { formatearTelefono, normalizarTelefonoDO } from "@/lib/telefono";
import type { Cliente, PedidoConItems } from "@/lib/types";
import { Hoja, useAvisarAlSalir } from "../hoja";
import { useToast } from "../toast";
import { CampoNota } from "./campo-nota";
import { Alerta, Aviso, Boton, Campo, GrupoOpciones } from "../ui";

export function HojaClienteEditar({ cliente, pedidos, abierta, alCerrar, alEliminar, idNota }: { cliente: Cliente; pedidos: PedidoConItems[]; abierta: boolean; alCerrar: () => void; alEliminar: () => void; /** id del campo de la nota (para enfocarlo al tocar la burbuja). */ idNota?: string }) {
  return (
    <Hoja abierta={abierta} alCerrar={alCerrar} titulo="Editar cliente" altura="grande">
      <Formulario key={`${cliente.id}:${cliente.nombre}:${cliente.telefono ?? ""}:${cliente.nota ?? ""}`} cliente={cliente} pedidos={pedidos} alTerminar={alCerrar} alEliminar={alEliminar} idNota={idNota} />
    </Hoja>
  );
}

function Formulario({ cliente, pedidos, alTerminar, alEliminar, idNota }: { cliente: Cliente; pedidos: PedidoConItems[]; alTerminar: () => void; alEliminar: () => void; idNota?: string }) {
  const { actualizarCliente, actualizarNotaCliente, eliminarCliente } = useData();
  const { tiendaId } = useTiendaActiva();
  const toast = useToast();
  const [nombre, setNombre] = useState(cliente.nombre);
  const [telefono, setTelefono] = useState(cliente.telefono ? formatearTelefono(cliente.telefono) : "");
  const [nota, setNota] = useState(cliente.nota ?? "");
  const [errorNota, setErrorNota] = useState<string | undefined>(undefined);
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
  const notaCambiada = nota.trim() !== (cliente.nota ?? "");
  const datosCambiados = nombreLimpio !== cliente.nombre || (telefonoValido ? telefonoNormalizado !== cliente.telefono : true);
  const cambiado = datosCambiados || notaCambiada;
  const puedeGuardar = nombreLimpio !== "" && nombreLimpio.length <= MAX_NOMBRE_CLIENTE && telefonoValido && cambiado && !guardando;
  const telefonoMalo = tocado && !telefonoValido;
  useAvisarAlSalir(cambiado);

  const guardar = async () => {
    if (!puedeGuardar) return;
    setGuardando(true);
    setDuplicado(null);
    try {
      if (datosCambiados) await actualizarCliente(tiendaId, cliente.id, { nombre, telefono });
      if (notaCambiada) await actualizarNotaCliente(tiendaId, cliente.id, nota);
      toast("Datos actualizados.");
      alTerminar();
    } catch (error) {
      if (error instanceof ClienteDuplicado) setDuplicado(error.existente);
      else if (error instanceof NotaClienteLarga) setErrorNota(error.message);
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

  const cerrarBorrado = () => {
    setHojaBorradoAbierta(false);
    setConfirmandoHistorial(false);
  };
  const n = pedidos.length;

  return (
    <div className="flex flex-col gap-3.5">
      <p className="text-texto-secundario">Cambia solo lo que necesites.</p>

      <Campo
        etiqueta="Nombre"
        type="text"
        value={nombre}
        onChange={(e) => setNombre(e.target.value.slice(0, MAX_NOMBRE_CLIENTE))}
        maxLength={MAX_NOMBRE_CLIENTE}
        autoComplete="off"
      />

      <Campo
        etiqueta="WhatsApp (opcional)"
        type="tel"
        inputMode="tel"
        value={telefono}
        onChange={(e) => {
          setTelefono(e.target.value.replace(/[^\d+\-() ]/g, "").slice(0, 18));
          setDuplicado(null);
        }}
        onBlur={() => setTocado(true)}
        placeholder="809-000-0000"
        error={telefonoMalo ? "Escríbelo con 809, 829 o 849 y 7 dígitos más." : undefined}
        ayuda="Usa 809, 829 o 849 y 7 dígitos más. Déjalo vacío si no usa WhatsApp."
      />

      <CampoNota id={idNota} valor={nota} alCambiar={(v) => { setNota(v); setErrorNota(undefined); }} error={errorNota} />

      {duplicado && (
        <div role="alert">
          <Aviso tono="atencion">
            <b>Este número ya es de «{duplicado.nombre}».</b> Usa otro número o déjalo vacío.
          </Aviso>
        </div>
      )}

      <Boton tamano="grande" anchoCompleto onClick={guardar} deshabilitado={!puedeGuardar} cargando={guardando}>
        Guardar cambios
      </Boton>

      <div className="border-t border-linea pt-2">
        <Boton jerarquia="terciario" tono="peligro" anchoCompleto onClick={() => setHojaBorradoAbierta(true)} deshabilitado={guardando}>
          Borrar contacto
        </Boton>
      </div>

      <Hoja abierta={hojaBorradoAbierta} alCerrar={cerrarBorrado} titulo="Borrar contacto" altura="auto">
        <div className="flex flex-col gap-3.5">
          {n > 0 ? (
            <>
              <p className="text-texto-secundario">{cliente.nombre} tiene {n} {n === 1 ? "pedido" : "pedidos"} en el historial. ¿Qué hacemos con ellos?</p>
              <GrupoOpciones
                etiqueta="Qué hacer con el historial"
                valor={conservarPedidos ? "conservar" : "borrar"}
                alCambiar={(v) => { setConservarPedidos(v === "conservar"); setConfirmandoHistorial(false); }}
                opciones={[
                  { id: "conservar", texto: "Conservar el historial" },
                  { id: "borrar", texto: "Borrar el historial también" },
                ]}
              />
              <p className="text-secundario text-texto-secundario">
                {conservarPedidos
                  ? "Los pedidos y sus abonos se quedan, sin estar asociados a este contacto."
                  : "Se borran esos pedidos, el detalle de sus productos y sus abonos. No se puede deshacer."}
              </p>
              {cambiado && <p className="text-etiqueta font-bold text-texto-secundario">También se perderán los cambios que aún no guardaste.</p>}
              {conservarPedidos ? (
                <Boton anchoCompleto onClick={() => borrar(false)} cargando={guardando}>
                  Borrar contacto y conservar historial
                </Boton>
              ) : (
                <Boton jerarquia="peligro" tamano="grande" anchoCompleto onClick={() => setConfirmandoHistorial(true)} deshabilitado={guardando}>
                  Continuar
                </Boton>
              )}
            </>
          ) : (
            <>
              <p className="text-texto-secundario">¿Borramos a {cliente.nombre}? No tiene pedidos asociados y no se puede recuperar este contacto.</p>
              {cambiado && <p className="text-etiqueta font-bold text-texto-secundario">También se perderán los cambios que aún no guardaste.</p>}
              <Boton jerarquia="peligro" tamano="grande" anchoCompleto onClick={() => borrar(false)} cargando={guardando}>
                Sí, borrar contacto
              </Boton>
            </>
          )}
          <Boton jerarquia="secundario" tamano="grande" anchoCompleto onClick={cerrarBorrado} deshabilitado={guardando}>
            Cancelar
          </Boton>
        </div>
      </Hoja>

      <Alerta
        abierta={confirmandoHistorial}
        titulo="¿Borrar también el historial?"
        descripcion={`Vas a borrar ${n} ${n === 1 ? "pedido" : "pedidos"} y sus abonos. Esta acción no se puede deshacer.`}
        accion={{ texto: "Sí, borrar todo", tono: "peligro", alConfirmar: () => borrar(true) }}
        alCancelar={() => setConfirmandoHistorial(false)}
      />
    </div>
  );
}
