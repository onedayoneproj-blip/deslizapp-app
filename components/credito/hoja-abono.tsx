"use client";

import { useMemo, useState } from "react";
import { diaDeSantoDomingo, METODOS, montoDeTexto } from "@/lib/credito";
import { useTiendaActiva } from "@/lib/data/consulta";
import { MontoMayorQueDeuda, mensajeDeError } from "@/lib/data/errores";
import { useData } from "@/lib/data/provider";
import { formatearPesos } from "@/lib/formato";
import { diaLocal, fechaDeVenta } from "@/lib/venta-pasada";
import type { Abono, MetodoAbono } from "@/lib/types";
import { Hoja, useAvisarAlSalir } from "../hoja";
import { IconoCheckCirculo } from "../iconos";
import { useToast } from "../toast";
import { Aviso, Boton, Campo, CampoMonto, GrupoOpciones } from "../ui";

const NOTA_MAX = 200;
const RAPIDOS = [500, 1000];

/**
 * Hoja "Registrar abono" (referencias/credito-abonos/Abono.dc.html). Con `pedidoId` el abono va a ese pedido; sin él (desde la
 * cuenta del cliente) se reparte entre sus pedidos a crédito, del más viejo al más nuevo. `deuda` es lo que se debe en ese
 * alcance (el pedido o todo el cliente). Lleva un campo de texto: hoja "grande" (la hoja no cambia con el teclado).
 */
export function HojaAbono({
  abierta,
  alCerrar,
  clienteId,
  nombreCliente,
  pedidoId,
  numeroPedido,
  pedidos = 1,
  deuda,
  alGuardar,
  abono,
}: {
  abierta: boolean;
  alCerrar: () => void;
  clienteId: string;
  nombreCliente: string;
  pedidoId?: string;
  numeroPedido?: number;
  /** Cuántos pedidos a crédito con saldo tiene el cliente (solo cuando no hay pedido fijo). */
  pedidos?: number;
  deuda: number;
  /** Los abonos creados (uno por pedido al que se aplicó). */
  alGuardar?: (abonos: Abono[]) => void;
  /**
   * Para EDITAR un abono ya registrado (RPC editar_abono): la hoja trae sus datos, el título es "Editar abono" y el botón
   * "Guardar cambios". Se queda en su pedido (no hay reparto entre pedidos). Aquí `deuda` es lo máximo que puede valer (el saldo
   * del pedido + el monto actual del abono).
   */
  abono?: Abono;
}) {
  return (
    <Hoja abierta={abierta} alCerrar={alCerrar} titulo={abono ? "Editar abono" : "Registrar abono"} altura="grande">
      <Formulario
        clienteId={clienteId}
        nombreCliente={nombreCliente}
        pedidoId={pedidoId}
        numeroPedido={numeroPedido}
        pedidos={pedidos}
        deuda={deuda}
        alGuardar={alGuardar}
        alCerrar={alCerrar}
        abono={abono}
      />
    </Hoja>
  );
}

function Formulario({
  clienteId,
  nombreCliente,
  pedidoId,
  numeroPedido,
  pedidos,
  deuda,
  alGuardar,
  alCerrar,
  abono,
}: {
  clienteId: string;
  nombreCliente: string;
  pedidoId?: string;
  numeroPedido?: number;
  pedidos: number;
  deuda: number;
  alGuardar?: (abonos: Abono[]) => void;
  alCerrar: () => void;
  abono?: Abono;
}) {
  const { registrarAbono, editarAbono } = useData();
  const { tiendaId } = useTiendaActiva();
  const toast = useToast();
  const [texto, setTexto] = useState(abono ? String(abono.monto) : "");
  const [metodo, setMetodo] = useState<MetodoAbono>(abono?.metodo ?? "efectivo");
  const [dia, setDia] = useState(() => (abono ? diaDeSantoDomingo(Date.parse(abono.fecha)) : diaLocal()));
  const [nota, setNota] = useState(abono?.nota ?? "");
  const [guardando, setGuardando] = useState(false);
  // Lo máximo que dijo la base al editar (por si el saldo cambió mientras tanto)
  const [maximoBase, setMaximoBase] = useState<number | null>(null);

  const monto = montoDeTexto(texto);
  const tope = maximoBase ?? deuda;
  const pasaDeLaDeuda = monto > tope;
  const resta = deuda - monto;
  const fecha = fechaDeVenta(dia);
  const puedeGuardar = monto > 0 && !pasaDeLaDeuda && fecha !== null && !guardando;
  // Con un monto o una nota escritos y sin guardar (al editar: con algo distinto a lo guardado), cerrar la hoja pregunta
  const diaOriginal = abono ? diaDeSantoDomingo(Date.parse(abono.fecha)) : null;
  const hayCambios = abono
    ? monto !== abono.monto || metodo !== abono.metodo || dia !== diaOriginal || nota.trim() !== (abono.nota ?? "")
    : monto > 0 || nota.trim() !== "";
  useAvisarAlSalir(hayCambios && !guardando);
  const primerNombre = nombreCliente.split(" ")[0] ?? nombreCliente;

  // Botones rápidos: solo los que no superan lo que se debe, sin repetir (Todo, Mitad y montos fijos)
  const rapidos = useMemo(() => {
    const lista: { texto: string; monto: number }[] = [{ texto: `Todo · ${formatearPesos(deuda)}`, monto: deuda }];
    const mitad = Math.floor(deuda / 2);
    if (mitad > 0 && mitad < deuda) lista.push({ texto: `Mitad · ${formatearPesos(mitad)}`, monto: mitad });
    for (const m of RAPIDOS) if (m < deuda && !lista.some((r) => r.monto === m)) lista.push({ texto: formatearPesos(m), monto: m });
    return lista;
  }, [deuda]);

  const guardar = async () => {
    if (!puedeGuardar || fecha === null) return;
    setGuardando(true);
    try {
      if (abono) {
        // Un día que no se tocó conserva su hora; otro día = mediodía de ese día (nunca futuro)
        await editarAbono(tiendaId, abono.id, {
          monto,
          metodo,
          fecha: dia === diaOriginal ? abono.fecha : dia === diaLocal() ? new Date().toISOString() : fecha,
          nota: nota.trim() || null,
        });
        toast("Abono actualizado");
        alCerrar();
        return;
      }
      // Hoy = ahora; un día pasado = mediodía de ese día (nunca una fecha futura)
      const abonos = await registrarAbono({
        tiendaId,
        clienteId,
        monto,
        metodo,
        fecha: dia === diaLocal() ? undefined : fecha,
        nota: nota.trim() || null,
        pedidoId,
      });
      toast("Abono guardado");
      alGuardar?.(abonos);
      alCerrar();
    } catch (e) {
      if (abono && e instanceof MontoMayorQueDeuda) {
        setMaximoBase(e.deuda);
        setGuardando(false);
        return;
      }
      toast(mensajeDeError(e, "No se pudo guardar el abono. Inténtalo otra vez."));
      setGuardando(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {abono ? (
        <p className="text-secundario text-texto-secundario">
          Abono de {primerNombre} al pedido #{numeroPedido}
        </p>
      ) : (
        <p className="text-secundario text-texto-secundario">
          {primerNombre} debe <b className="text-texto">{formatearPesos(deuda)}</b>{" "}
          {pedidoId ? `del pedido #${numeroPedido}` : pedidos === 1 ? "en 1 pedido" : `en ${pedidos} pedidos`}
        </p>
      )}

      <CampoMonto
        tamano="grande"
        etiqueta="¿Cuánto te pagó?"
        etiquetaAccesible="Monto del abono, en pesos"
        valor={texto}
        alCambiar={setTexto}
        error={pasaDeLaDeuda ? (abono ? `Lo máximo para este abono es ${formatearPesos(tope)}` : `Te debe ${formatearPesos(deuda)}; no puedes abonar más que eso.`) : undefined}
      />

      {!abono && (
      <GrupoOpciones
        etiqueta="Monto rápido"
        valor={rapidos.find((r) => r.monto === monto)?.texto ?? null}
        alCambiar={(t) => setTexto(String(rapidos.find((r) => r.texto === t)?.monto ?? ""))}
        opciones={rapidos.map((r) => ({ id: r.texto, texto: r.texto }))}
      />
      )}

      <GrupoOpciones titulo="¿Cómo te pagó?" valor={metodo} alCambiar={setMetodo} opciones={METODOS.map((m) => ({ id: m.id, texto: m.texto }))} />

      <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2">
        <Campo
          etiqueta="Fecha"
          type="date"
          value={dia}
          max={diaLocal()}
          onChange={(e) => setDia(e.target.value)}
          className="[&_input]:max-w-full [&_input]:appearance-none"
          error={fecha === null ? "Elige un día que ya pasó (hoy también vale)." : undefined}
        />
        <Campo
          etiqueta="Nota (opcional)"
          type="text"
          value={nota}
          maxLength={NOTA_MAX}
          onChange={(e) => setNota(e.target.value.slice(0, NOTA_MAX))}
          placeholder="Ej. le di cambio"
          enterKeyHint="done"
        />
      </div>

      <div aria-live="polite" className="empty:hidden">
        {!abono && monto > 0 && !pasaDeLaDeuda && resta === 0 && (
          <Aviso tono="exito" icono={<IconoCheckCirculo tamano={18} className="text-texto" />} className="mov-aparece font-bold">
            Con este abono queda saldado
          </Aviso>
        )}
        {!abono && monto > 0 && !pasaDeLaDeuda && resta > 0 && (
          <Aviso tono="neutro" className="mov-aparece">
            Después de este abono debe <b>{formatearPesos(resta)}</b>
          </Aviso>
        )}
      </div>

      <Boton tamano="grande" anchoCompleto onClick={guardar} deshabilitado={!puedeGuardar}>
        {abono ? "Guardar cambios" : "Guardar abono"}
      </Boton>
    </div>
  );
}
