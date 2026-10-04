"use client";

import { useMemo, useState } from "react";
import { useTiendaActiva } from "@/lib/data/consulta";
import { mensajeDeError } from "@/lib/data/errores";
import { useData } from "@/lib/data/provider";
import { diaMesCorto } from "@/lib/formato";
import { lineasDeReposicion, mensajeReposicion, porReponer, type LineaReponer, type VentasProducto } from "@/lib/inventario-catalogo";
import { copiarTexto } from "@/lib/portapapeles";
import type { AvisoLlegada, Producto } from "@/lib/types";
import { useConsulta } from "@/lib/data/consulta";
import { IconoCompartir } from "../iconos";
import { BotonVerMas } from "../ver-mas";
import { Boton, Cantidad, CheckSeleccion, FilaLista, GrupoOpciones, ListaAgrupada, useToastUI, VistaPreviaWhatsApp } from "../ui";
import { MiniaturaProducto } from "./miniatura-producto";
import { Esperan } from "./stock-producto";
import { TarjetaYaLlego } from "./tarjeta-ya-llego";

type Modo = "viene" | "tengo";

function subtitulo(l: LineaReponer<Producto>): string {
  const agotado = l.stock === 0;
  const estado = !agotado ? (l.stock === 1 ? "Queda 1" : `Quedan ${l.stock}`) : l.varianteTexto ? "Agotado" : l.ultimaVenta ? `Vendido ${diaMesCorto(l.ultimaVenta)}` : "Nunca se vendió";
  return l.varianteTexto ? `${l.varianteTexto} · ${estado}` : estado;
}

/** El nombre en la lista para el proveedor: con la variante si la hay ("Camisa de lino L · Arena"). */
const nombreLinea = (l: LineaReponer<Producto>) => (l.varianteTexto ? `${l.producto.nombre} ${l.varianteTexto}` : l.producto.nombre);

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
  const { reponerStock, avisosPendientes } = useData();
  const { mostrarToast } = useToastUI();
  const { data: avisos } = useConsulta(`avisos:${tiendaId}`, () => avisosPendientes(tiendaId));
  const reponer = useMemo(() => porReponer(productos, ventas), [productos, ventas]);
  const agotados = useMemo(() => lineasDeReposicion([...reponer.vendidos, ...reponer.sinVentas]), [reponer]);
  const seAcaban = useMemo(() => lineasDeReposicion(reponer.seAcaban), [reponer]);
  // Después de sumar: lo repuesto que alguien esperaba ("Ya llegó"), tomado en ese momento.
  const [llegaron, setLlegaron] = useState<{ producto: Producto; avisos: AvisoLlegada[] }[] | null>(null);
  const sel = marcados ?? {};

  const [modo, setModo] = useState<Modo>("viene");
  // Los que se están acabando van detrás de "Ver N más"; si no hay agotados, se ven de entrada.
  const [verAcaban, setVerAcaban] = useState(false);
  const [sumando, setSumando] = useState(false);
  const mostrarAcaban = verAcaban || agotados.length === 0;

  const lineas = [...agotados, ...(mostrarAcaban ? seAcaban : [])];
  const todas = [...agotados, ...seAcaban];
  const elegidas = todas.filter((l) => sel[l.clave] !== undefined);
  const unidades = elegidas.reduce((suma, l) => suma + sel[l.clave]!, 0);
  const texto = mensajeReposicion(elegidas.map((l) => ({ cantidad: sel[l.clave]!, nombre: nombreLinea(l) })));
  const hayShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const alternar = (l: LineaReponer<Producto>) => {
    const { [l.clave]: _quitado, ...resto } = sel;
    void _quitado;
    alCambiarMarcados(sel[l.clave] === undefined ? { ...sel, [l.clave]: l.sugerida } : resto);
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
        elegidas.map((l) => ({ productoId: l.producto.id, cantidad: sel[l.clave]!, varianteId: l.varianteId })),
      );
      // ¿Alguien esperaba algo de lo repuesto? (un aviso de variante cuenta si se repuso esa variante; uno sin variante, con el producto)
      const repuestas = new Set(elegidas.map((l) => l.clave));
      const esperando = productos
        .map((producto) => ({
          producto,
          avisos: (avisos ?? []).filter((a) => a.productoId === producto.id && (repuestas.has(a.varianteId ? `${producto.id}:${a.varianteId}` : producto.id) || (!a.varianteId && [...repuestas].some((c) => c.startsWith(`${producto.id}:`))))),
        }))
        .filter((x) => x.avisos.length > 0);
      alCambiarMarcados(null);
      mostrarToast(`Sumaste ${unidades} al stock`);
      if (esperando.length > 0) setLlegaron(esperando);
      else alTerminar();
    } catch (e) {
      mostrarToast(mensajeDeError(e, "No se pudo sumar al stock. Inténtalo otra vez."));
    } finally {
      setSumando(false);
    }
  };

  if (llegaron) {
    return (
      <div className="flex flex-col gap-4">
        {llegaron.map((x) => (
          <TarjetaYaLlego key={x.producto.id} producto={x.producto} avisos={x.avisos} />
        ))}
        <Boton tamano="grande" anchoCompleto onClick={alTerminar}>
          Listo
        </Boton>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="font-mano text-mano text-atencion-texto">Que vuelva lo que se fue volando</p>

      <ListaAgrupada etiqueta="Productos por reponer">
        {lineas.map((l) => {
          const cantidad = sel[l.clave];
          const esperan = (avisos ?? []).filter((a) => a.productoId === l.producto.id && (!l.varianteId || a.varianteId === l.varianteId || !a.varianteId));
          return (
            <FilaLista
              key={l.clave}
              marcada={cantidad !== undefined}
              onClick={() => alternar(l)}
              inicio={
                <span className="flex items-center gap-3">
                  <CheckSeleccion marcado={cantidad !== undefined} />
                  <MiniaturaProducto producto={l.producto} />
                </span>
              }
              titulo={l.producto.nombre}
              detalle={subtitulo(l)}
              accion={
                cantidad !== undefined ? (
                  <Cantidad
                    valor={cantidad}
                    min={1}
                    alCambiar={(v) => alCambiarMarcados({ ...sel, [l.clave]: v })}
                    etiquetaQuitar={`Quitar uno de ${nombreLinea(l)}`}
                    etiquetaAgregar={`Agregar uno de ${nombreLinea(l)}`}
                  />
                ) : esperan.length > 0 ? (
                  <Esperan producto={l.producto} avisos={esperan} />
                ) : undefined
              }
            />
          );
        })}
        {!mostrarAcaban && (
          <BotonVerMas
            forma="fila"
            quedan={seAcaban.length}
            pagina={seAcaban.length}
            mostrados={agotados.length}
            total={agotados.length + seAcaban.length}
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
