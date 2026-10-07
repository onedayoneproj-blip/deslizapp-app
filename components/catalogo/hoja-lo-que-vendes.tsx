"use client";

import { useState } from "react";
import { useTiendaActiva } from "@/lib/data/consulta";
import { mensajeDeError } from "@/lib/data/errores";
import { usePermisos } from "@/lib/data/permisos";
import { useData } from "@/lib/data/provider";
import { NOMBRE_TIPO, RUBROS, rubrosDeTienda, type Rubro } from "@/lib/rubros";
import type { Tienda } from "@/lib/types";
import { Hoja } from "../hoja";
import { useToast } from "../toast";
import { Boton, FilaLista, ListaAgrupada } from "../ui";
import { CheckSeleccion } from "../ui/check-seleccion";

/** «Lo que vendes»: lo que la tienda vende (tipos de producto). El primero que se marca es el principal; los Detalles siguen el principal. */
export function HojaLoQueVendes({ tienda, alCerrar, alGuardar }: { tienda: Tienda; alCerrar: () => void; alGuardar?: (t: Tienda) => void }) {
  const { guardarRubros, soloMirar: verComo } = useData();
  const { puede, porque } = usePermisos();
  const { tiendaId } = useTiendaActiva();
  const toast = useToast();
  const sinPermiso = verComo || !puede("catalogo");
  const [abierta, setAbierta] = useState(true);
  const [elegidos, setElegidos] = useState<Rubro[]>(() => rubrosDeTienda(tienda));
  const [guardando, setGuardando] = useState(false);
  const inicial = rubrosDeTienda(tienda).join(",");
  const cambio = elegidos.join(",") !== inicial;

  const alternar = (r: Rubro) => {
    if (sinPermiso) { toast(porque); return; }
    setElegidos((actual) => (actual.includes(r) ? (actual.length > 1 ? actual.filter((x) => x !== r) : actual) : [...actual, r]));
  };
  const guardar = async () => {
    setGuardando(true);
    try {
      const t = await guardarRubros(tiendaId, elegidos);
      toast("Listo. Ya se ve en tu catálogo.");
      alGuardar?.(t);
      setAbierta(false);
    } catch (e) {
      toast(mensajeDeError(e, "No se pudo guardar. Inténtalo otra vez."));
      setGuardando(false);
    }
  };

  return (
    <Hoja abierta={abierta} alCerrar={() => setAbierta(false)} alSalir={alCerrar} titulo="Lo que vendes">
      <div className="flex flex-col gap-4">
        <p className="text-secundario text-texto-secundario">Marca todo lo que vendes. El primero es el principal: de él salen los detalles de tus productos.</p>
        <ListaAgrupada etiqueta="Lo que vendes">
          {RUBROS.map((r) => {
            const marcado = elegidos.includes(r);
            return (
              <FilaLista
                key={r}
                titulo={NOMBRE_TIPO[r]}
                detalle={marcado && elegidos[0] === r && elegidos.length > 1 ? "Principal" : undefined}
                inicio={<CheckSeleccion marcado={marcado} />}
                marcada={marcado}
                onClick={() => alternar(r)}
              />
            );
          })}
        </ListaAgrupada>
        <Boton anchoCompleto deshabilitado={!cambio || guardando || sinPermiso} onClick={() => void guardar()}>{guardando ? "Guardando…" : "Guardar"}</Boton>
      </div>
    </Hoja>
  );
}
