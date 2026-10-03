"use client";

import { useMemo, useState } from "react";
import { METODOS, montoDeTexto } from "@/lib/credito";
import { useTiendaActiva } from "@/lib/data/consulta";
import { mensajeDeError } from "@/lib/data/errores";
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
}) {
  return (
    <Hoja abierta={abierta} alCerrar={alCerrar} titulo="Registrar abono" altura="grande">
      <Formulario
        clienteId={clienteId}
        nombreCliente={nombreCliente}
        pedidoId={pedidoId}
        numeroPedido={numeroPedido}
        pedidos={pedidos}
        deuda={deuda}
        alGuardar={alGuardar}
        alCerrar={alCerrar}
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
}: {
  clienteId: string;
  nombreCliente: string;
  pedidoId?: string;
  numeroPedido?: number;
  pedidos: number;
  deuda: number;
  alGuardar?: (abonos: Abono[]) => void;
  alCerrar: () => void;
}) {
  const { registrarAbono } = useData();
  const { tiendaId } = useTiendaActiva();
  const toast = useToast();
  const [texto, setTexto] = useState("");
  const [metodo, setMetodo] = useState<MetodoAbono>("efectivo");
  const [dia, setDia] = useState(() => diaLocal());
  const [nota, setNota] = useState("");
  const [guardando, setGuardando] = useState(false);

  const monto = montoDeTexto(texto);
  const pasaDeLaDeuda = monto > deuda;
  const resta = deuda - monto;
  const fecha = fechaDeVenta(dia);
  const puedeGuardar = monto > 0 && !pasaDeLaDeuda && fecha !== null && !guardando;
  // Con un monto o una nota escritos y sin guardar, cerrar la hoja pregunta
  useAvisarAlSalir(monto > 0 || nota.trim() !== "");
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
      toast(mensajeDeError(e, "No se pudo guardar el abono. Inténtalo otra vez."));
      setGuardando(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-secundario text-texto-secundario">
        {primerNombre} debe <b className="text-texto">{formatearPesos(deuda)}</b>{" "}
        {pedidoId ? `del pedido #${numeroPedido}` : pedidos === 1 ? "en 1 pedido" : `en ${pedidos} pedidos`}
      </p>

      <CampoMonto
        tamano="grande"
        etiqueta="¿Cuánto te pagó?"
        etiquetaAccesible="Monto del abono, en pesos"
        valor={texto}
        alCambiar={setTexto}
        error={pasaDeLaDeuda ? `Te debe ${formatearPesos(deuda)}; no puedes abonar más que eso.` : undefined}
      />

      <GrupoOpciones
        etiqueta="Monto rápido"
        valor={rapidos.find((r) => r.monto === monto)?.texto ?? null}
        alCambiar={(t) => setTexto(String(rapidos.find((r) => r.texto === t)?.monto ?? ""))}
        opciones={rapidos.map((r) => ({ id: r.texto, texto: r.texto }))}
      />

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
        {monto > 0 && !pasaDeLaDeuda && resta === 0 && (
          <Aviso tono="exito" icono={<IconoCheckCirculo tamano={18} className="text-texto" />} className="mov-aparece font-bold">
            Con este abono queda saldado
          </Aviso>
        )}
        {monto > 0 && !pasaDeLaDeuda && resta > 0 && (
          <Aviso tono="neutro" className="mov-aparece">
            Después de este abono debe <b>{formatearPesos(resta)}</b>
          </Aviso>
        )}
      </div>

      <Boton tamano="grande" anchoCompleto onClick={guardar} deshabilitado={!puedeGuardar}>
        Guardar abono
      </Boton>
    </div>
  );
}
