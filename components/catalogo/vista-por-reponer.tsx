"use client";

import { useMemo, useState } from "react";
import { useTiendaActiva } from "@/lib/data/consulta";
import { mensajeDeError } from "@/lib/data/errores";
import { useData } from "@/lib/data/provider";
import { diaMesCorto } from "@/lib/formato";
import { mensajeReposicion, porReponer, type LineaPorReponer, type VentasProducto } from "@/lib/inventario-catalogo";
import { copiarTexto } from "@/lib/portapapeles";
import type { Producto } from "@/lib/types";
import { IconoCompartir } from "../iconos";
import { BotonVerMas } from "../ver-mas";
import { Boton, Cantidad, CheckSeleccion, FilaLista, GrupoOpciones, ListaAgrupada, useToastUI, VistaPreviaWhatsApp } from "../ui";
import { MiniaturaProducto } from "./miniatura-producto";

type Modo = "viene" | "tengo";

function subtitulo(l: LineaPorReponer<Producto>, agotado: boolean): string {
  if (!agotado) return l.producto.stock === 1 ? "Queda 1" : `Quedan ${l.producto.stock}`;
  return l.ultimaVenta ? `Vendido ${diaMesCorto(l.ultimaVenta)}` : "Nunca se vendió";
}

/**
 * "Por reponer": lo agotado (vendidos primero) y lo que se está acabando, para pedirlo al proveedor o, si ya llegó, sumarlo al stock.
 * `marcados` (cantidad por producto) vive en la hoja para que "Hacer espacio" sepa qué se va a reponer.
 */
export function VistaPorReponer({
  productos,
  ventas,
  marcados,
  alCambiarMarcados,
  alTerminar,
}: {
  productos: Producto[];
  ventas: Map<string, VentasProducto>;
  marcados: Record<string, number> | null;
  alCambiarMarcados: (m: Record<string, number> | null) => void;
  alTerminar: () => void;
}) {
  const { tiendaId } = useTiendaActiva();
  const { reponerStock } = useData();
  const { mostrarToast } = useToastUI();
  const reponer = useMemo(() => porReponer(productos, ventas), [productos, ventas]);
  const agotados = useMemo(() => [...reponer.vendidos, ...reponer.sinVentas], [reponer]);
  const sel = marcados ?? {};

  const [modo, setModo] = useState<Modo>("viene");
  // Los que se están acabando van detrás de "Ver N más"; si no hay agotados, se ven de entrada.
  const [verAcaban, setVerAcaban] = useState(false);
  const [sumando, setSumando] = useState(false);
  const mostrarAcaban = verAcaban || agotados.length === 0;

  const lineas = [...agotados, ...(mostrarAcaban ? reponer.seAcaban : [])];
  const todas = [...agotados, ...reponer.seAcaban];
  const elegidas = todas.filter((l) => sel[l.producto.id] !== undefined);
  const unidades = elegidas.reduce((suma, l) => suma + sel[l.producto.id]!, 0);
  const texto = mensajeReposicion(elegidas.map((l) => ({ cantidad: sel[l.producto.id]!, nombre: l.producto.nombre })));
  const hayShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const alternar = (l: LineaPorReponer<Producto>) => {
    const { [l.producto.id]: _quitado, ...resto } = sel;
    void _quitado;
    alCambiarMarcados(sel[l.producto.id] === undefined ? { ...sel, [l.producto.id]: l.sugerida } : resto);
  };

  const enviar = async () => {
    if (hayShare) {
      try {
        await navigator.share({ text: texto });
      } catch {
        // Cerrar la hoja de compartir sin elegir nada no es un error.
      }
      return;
    }
    // Sin hoja nativa: WhatsApp deja elegir el chat.
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank", "noopener,noreferrer");
  };

  const copiar = () => void copiarTexto(texto).then((ok) => mostrarToast(ok ? "Lista copiada" : "No se pudo copiar. Inténtalo otra vez."));

  const sumar = async () => {
    setSumando(true);
    try {
      await reponerStock(
        tiendaId,
        elegidas.map((l) => ({ productoId: l.producto.id, cantidad: sel[l.producto.id]! })),
      );
      alCambiarMarcados(null);
      mostrarToast(`Sumaste ${unidades} al stock`);
      alTerminar();
    } catch (e) {
      mostrarToast(mensajeDeError(e, "No se pudo sumar al stock. Inténtalo otra vez."));
    } finally {
      setSumando(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <p className="font-mano text-mano text-atencion-texto">Que vuelva lo que se fue volando</p>

      <ListaAgrupada etiqueta="Productos por reponer">
        {lineas.map((l) => {
          const agotado = l.producto.stock === 0;
          const cantidad = sel[l.producto.id];
          return (
            <FilaLista
              key={l.producto.id}
              marcada={cantidad !== undefined}
              onClick={() => alternar(l)}
              inicio={
                <span className="flex items-center gap-3">
                  <CheckSeleccion marcado={cantidad !== undefined} />
                  <MiniaturaProducto producto={l.producto} />
                </span>
              }
              titulo={l.producto.nombre}
              detalle={subtitulo(l, agotado)}
              accion={
                cantidad !== undefined ? (
                  <Cantidad
                    valor={cantidad}
                    min={1}
                    alCambiar={(v) => alCambiarMarcados({ ...sel, [l.producto.id]: v })}
                    etiquetaQuitar={`Quitar uno de ${l.producto.nombre}`}
                    etiquetaAgregar={`Agregar uno de ${l.producto.nombre}`}
                  />
                ) : undefined
              }
            />
          );
        })}
        {!mostrarAcaban && (
          <BotonVerMas
            forma="fila"
            quedan={reponer.seAcaban.length}
            pagina={reponer.seAcaban.length}
            mostrados={agotados.length}
            total={agotados.length + reponer.seAcaban.length}
            sufijo="que se están acabando"
            alTocar={() => setVerAcaban(true)}
          />
        )}
      </ListaAgrupada>

      <GrupoOpciones
        titulo="¿Ya tienes la mercancía en tus manos?"
        valor={modo}
        alCambiar={setModo}
        opciones={[
          { id: "viene", texto: "Todavía viene" },
          { id: "tengo", texto: "¡Ya la tengo!" },
        ]}
      />

      {modo === "viene" ? (
        <div className="flex flex-col gap-3">
          {elegidas.length > 0 ? <VistaPreviaWhatsApp texto={texto} sinDestinatario /> : <p className="text-secundario text-texto-secundario">Marca lo que quieres pedir y te armamos la lista.</p>}
          <Boton tamano="grande" anchoCompleto icono={<IconoCompartir tamano={20} />} deshabilitado={elegidas.length === 0} onClick={() => void enviar()}>
            Enviar lista
          </Boton>
          {!hayShare && (
            <Boton jerarquia="terciario" anchoCompleto deshabilitado={elegidas.length === 0} onClick={copiar}>
              Copiar lista
            </Boton>
          )}
        </div>
      ) : (
        <Boton tamano="grande" anchoCompleto deshabilitado={elegidas.length === 0} cargando={sumando} onClick={() => void sumar()}>
          Sumar {unidades} al stock
        </Boton>
      )}
    </div>
  );
}
