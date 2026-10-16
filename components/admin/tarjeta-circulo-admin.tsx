"use client";

import { useCallback, useEffect, useState } from "react";
import { Boton, Etiqueta, Tarjeta } from "@/components/ui";
import { Hoja } from "@/components/hoja";
import { useAdmin } from "@/lib/data/admin/provider";
import { sumarMeses, diaRD } from "@/lib/admin/reglas";
import { conDescuentoCirculo, DESCUENTO_CIRCULO, descuentoVigente } from "@/lib/circulo";
import type { CirculoTienda } from "@/lib/types";

const fecha = (v: string) => new Intl.DateTimeFormat("es-DO", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" }).format(new Date(v.slice(0, 10) + "T00:00:00Z"));
const monto = (v: number) => new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP", maximumFractionDigits: 0 }).format(v);

/**
 * Círculo Deslizapp en la ficha de la tienda (docs/14): marcar y desmarcar, y el monto que le toca con el 30 % mientras
 * `descuentoHasta` sea futuro. Va con el titular: todas sus tiendas llevan el aro.
 */
export function TarjetaCirculoAdmin({ tiendaId, precioMensual, pruebaHasta }: { tiendaId: string; precioMensual: number | null; pruebaHasta: string | null }) {
  const admin = useAdmin();
  const [circulo, setCirculo] = useState<CirculoTienda | null | undefined>(undefined);
  const [abierta, setAbierta] = useState(false);
  const [hasta, setHasta] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [hoy] = useState(() => diaRD(Date.now()));

  const leer = useCallback(async () => {
    try {
      setCirculo(await admin.circuloTienda(tiendaId));
    } catch {
      setCirculo(null);
      setAviso("No pudimos leer el Círculo de esta tienda.");
    }
  }, [admin, tiendaId]);
  useEffect(() => {
    const id = window.setTimeout(() => void leer(), 0);
    return () => window.clearTimeout(id);
  }, [leer]);

  const abrir = () => {
    // El 30 % dura el primer año, después de los 30 días de prueba (docs/14).
    setHasta(circulo?.descuentoHasta?.slice(0, 10) ?? sumarMeses(pruebaHasta && pruebaHasta > hoy ? pruebaHasta : hoy, 12));
    setAviso(null);
    setAbierta(true);
  };
  const guardar = async (marcar: boolean, fin: string | null) => {
    setOcupado(true);
    setAviso(null);
    try {
      setCirculo(await admin.marcarCirculo(tiendaId, marcar, fin));
      setAbierta(false);
    } catch {
      setAviso("No se pudo guardar. Inténtalo otra vez.");
    } finally {
      setOcupado(false);
    }
  };

  if (circulo === undefined) return null;
  const vigente = descuentoVigente(circulo, hoy);
  return (
    <Tarjeta className="mt-3" data-circulo-admin="">
      <div className="flex items-start justify-between gap-2">
        <h2 className="font-display text-titulo-hoja font-bold">Círculo Deslizapp</h2>
        <Etiqueta tono={circulo ? "exito" : "neutro"}>{circulo ? "del Círculo" : "no es del Círculo"}</Etiqueta>
      </div>
      {circulo ? (
        <>
          <p className="mt-2 text-secundario text-texto-secundario">
            Desde {fecha(circulo.desde)} · {circulo.descuentoHasta ? `${DESCUENTO_CIRCULO} % menos hasta ${fecha(circulo.descuentoHasta)}` : "sin descuento"}. Todas las tiendas de su titular llevan el aro.
          </p>
          {precioMensual !== null && (
            <p className="mt-1 text-secundario" data-monto-sugerido="">
              Monto sugerido: <strong>{monto(vigente ? conDescuentoCirculo(precioMensual) : precioMensual)}</strong> al mes{vigente ? ` (${monto(precioMensual)} con el ${DESCUENTO_CIRCULO} % menos)` : ""}.
            </p>
          )}
        </>
      ) : (
        <p className="mt-2 text-secundario text-texto-secundario">Márcala para darle el aro y el {DESCUENTO_CIRCULO} % menos el primer año.</p>
      )}
      {aviso && <p role="alert" className="mt-2 text-secundario text-atencion-texto">{aviso}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <Boton jerarquia="secundario" onClick={abrir}>{circulo ? "Cambiar fecha" : "Marcar como del Círculo"}</Boton>
        {circulo && <Boton jerarquia="secundario" deshabilitado={ocupado} onClick={() => void guardar(false, null)}>Quitar del Círculo</Boton>}
      </div>
      <Hoja abierta={abierta} alCerrar={() => setAbierta(false)} titulo="Círculo Deslizapp">
        <div className="space-y-4 px-5 pb-8">
          <label className="flex flex-col gap-1.5 text-secundario font-extrabold">
            El {DESCUENTO_CIRCULO} % dura hasta
            <input type="date" value={hasta} min={hoy} onChange={(e) => setHasta(e.target.value)} className="h-(--alto-campo) rounded-radio-m border-2 border-borde-campo bg-superficie px-3.5 text-cuerpo font-normal text-texto" />
          </label>
          {aviso && <p role="alert" className="text-secundario text-atencion-texto">{aviso}</p>}
          <div className="flex justify-end gap-2">
            <Boton jerarquia="secundario" onClick={() => setAbierta(false)}>Cancelar</Boton>
            <Boton deshabilitado={ocupado} onClick={() => void guardar(true, hasta || null)}>{ocupado ? "Guardando…" : "Guardar"}</Boton>
          </div>
        </div>
      </Hoja>
    </Tarjeta>
  );
}
