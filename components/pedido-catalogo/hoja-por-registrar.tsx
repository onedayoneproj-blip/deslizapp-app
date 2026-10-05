"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { useConsulta, useTiendaActiva } from "@/lib/data/consulta";
import { useData } from "@/lib/data/provider";
import { formatearPesos, haceCuantoSinHora } from "@/lib/formato";
import { Esqueleto } from "../esqueleto";
import { Hoja } from "../hoja";
import { Aviso, Boton, FilaLista, ListaAgrupada } from "../ui";
import { HojaRegistrarSolicitud } from "./registrar-solicitud";

/**
 * Pedidos › Por registrar (tablero PorRegistrar): los pedidos del catálogo que llegaron por WhatsApp y la tienda todavía no
 * registró, el más reciente primero. Tocar uno abre la MISMA hoja «Pedido del catálogo» del link, encima de esta lista: al
 * cerrarla, la lista sigue donde estaba (scroll y foco).
 */
export function HojaPorRegistrar() {
  const router = useRouter();
  const { solicitudesPendientes } = useData();
  const { tiendaId } = useTiendaActiva();
  const { data, error, reintentar } = useConsulta(`solicitudes:${tiendaId}`, () => solicitudesPendientes(tiendaId));
  const [abierto, setAbierto] = useState<string | null>(null);
  const [visible, setVisible] = useState(true);
  const destino = useRef<string | null>(null);
  const [ahora] = useState(() => Date.now());
  const cerrar = useCallback(() => setVisible(false), []);
  const salir = () => router.push(destino.current ?? "/pedidos", { scroll: false });

  return (
    <Hoja abierta={visible} alCerrar={cerrar} alSalir={salir} protegerAtras titulo="Por registrar" altura="grande">
      <div className="flex flex-col gap-3 pb-2">
        <p className="text-secundario text-texto-secundario">Te llegaron desde tu catálogo por WhatsApp. Regístralos para que pasen a Nuevos.</p>
        {data === undefined && error && (
          <Aviso tono="peligro" accion={{ texto: "Reintentar", alTocar: reintentar }}>
            No pudimos ver los pedidos por registrar. Revisa tu conexión.
          </Aviso>
        )}
        {data === undefined && !error && (
          <div role="status" aria-label="Cargando pedidos por registrar" className="flex flex-col gap-2">
            <Esqueleto className="h-[60px] rounded-radio-l" />
            <Esqueleto className="h-[60px] rounded-radio-l" />
          </div>
        )}
        {data?.length === 0 && (
          <div className="py-6 text-center">
            <p className="font-display text-titulo-seccion">Nada por registrar.</p>
            <p className="mt-1 text-texto-secundario">Cuando alguien te pida por tu catálogo, aparece aquí.</p>
            <Boton jerarquia="secundario" className="mt-4" onClick={cerrar}>
              Volver a pedidos
            </Boton>
          </div>
        )}
        {data && data.length > 0 && (
          <ListaAgrupada etiqueta="Pedidos del catálogo por registrar">
            {data.map((s) => {
              const unidades = s.items.reduce((t, i) => t + i.cantidad, 0);
              return (
                <FilaLista
                  key={s.id}
                  titulo={`#${s.codigo}`}
                  detalle={`${haceCuantoSinHora(s.creadaEn, new Date(ahora))} · ${unidades} ${unidades === 1 ? "producto" : "productos"}`}
                  fin={<span className="text-destacado">{formatearPesos(s.total)}</span>}
                  onClick={() => setAbierto(s.codigo)}
                />
              );
            })}
          </ListaAgrupada>
        )}
      </div>
      {abierto && (
        <HojaRegistrarSolicitud
          key={abierto}
          codigo={abierto}
          abierta
          alCerrar={() => setAbierto(null)}
          alVerPedido={(id) => { destino.current = `/pedidos/${id}`; setVisible(false); }}
        />
      )}
    </Hoja>
  );
}
