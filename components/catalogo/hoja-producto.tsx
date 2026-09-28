"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";
import { useConsulta, useTiendaActiva } from "@/lib/data/consulta";
import { useData } from "@/lib/data/provider";
import { reducirFoto } from "@/lib/imagen";
import type { Producto } from "@/lib/types";
import { Chip, Interruptor } from "../controles";
import { Foto } from "../foto";
import { Hoja } from "../hoja";
import { IconoCamara, IconoMas, IconoMenos } from "../iconos";
import { useToast } from "../toast";
import { usePanelUI } from "../panel/ui";

/**
 * Hoja de producto sobre el Catálogo. Sin `productoId` crea; con `productoId` edita.
 * Al cerrar vuelve a /catalogo sin perder la búsqueda ni el filtro (los guarda el layout).
 */
export function HojaProducto({ productoId }: { productoId?: string }) {
  const router = useRouter();
  const { getProducto, getProductos } = useData();
  const { tiendaId } = useTiendaActiva();
  const cerrar = useCallback(() => router.push("/catalogo", { scroll: false }), [router]);

  const { data: producto, cargando } = useConsulta(`producto:${tiendaId}:${productoId ?? "nuevo"}`, () =>
    productoId ? getProducto(tiendaId, productoId) : Promise.resolve(null),
  );
  const { data: productos } = useConsulta(`productos:${tiendaId}`, () => getProductos(tiendaId));

  const editando = Boolean(productoId);
  const titulo = editando ? "Editar producto" : "Nuevo producto";

  // Editar: esperar a tener el producto (y avisar si no es de esta tienda).
  if (editando && producto === undefined && cargando) return null;
  if (editando && !producto) {
    return (
      <Hoja abierta alCerrar={cerrar} titulo={titulo}>
        <div className="py-6 text-center">
          <p className="font-display text-xl">Este producto no vive aquí.</p>
          <p className="mt-1 text-suave">Quizá es de otra tienda. Los productos no se mezclan.</p>
          <button type="button" onClick={cerrar} className="mt-5 h-12 w-full rounded-full bg-bosque font-extrabold text-papel">
            Volver al catálogo
          </button>
        </div>
      </Hoja>
    );
  }
  if (!productos) return null;

  return (
    <Hoja abierta alCerrar={cerrar} titulo={titulo}>
      <FormularioProducto key={producto?.id ?? "nuevo"} producto={producto ?? null} productos={productos} alTerminar={cerrar} />
    </Hoja>
  );
}

function FormularioProducto({
  producto,
  productos,
  alTerminar,
}: {
  producto: Producto | null;
  productos: Producto[];
  alTerminar: () => void;
}) {
  const { crearProducto, actualizarProducto } = useData();
  const { tiendaId, tienda } = useTiendaActiva();
  const { abrirPlan } = usePanelUI();
  const toast = useToast();
  const entradaFoto = useRef<HTMLInputElement>(null);

  const [foto, setFoto] = useState<string | null>(producto?.fotos[0] ?? null);
  const [procesandoFoto, setProcesandoFoto] = useState(false);
  const [nombre, setNombre] = useState(producto?.nombre ?? "");
  const [precio, setPrecio] = useState(producto ? String(producto.precio) : "");
  const [stock, setStock] = useState<number | null>(producto ? producto.stock : 1);
  const [categoria, setCategoria] = useState<string | null>(producto?.categoria ?? null);
  const [nuevaColeccion, setNuevaColeccion] = useState<string | null>(null);
  const [activo, setActivo] = useState(producto?.activo ?? true);
  const [guardando, setGuardando] = useState(false);

  const colecciones = useMemo(() => {
    const todas = new Set(productos.map((p) => p.categoria).filter((c): c is string => Boolean(c)));
    return [...todas].sort((a, b) => a.localeCompare(b, "es"));
  }, [productos]);

  const lleno = !producto && tienda != null && productos.length >= tienda.limiteProductos;

  const elegirFoto = async (archivo: File | undefined) => {
    if (!archivo) return;
    setProcesandoFoto(true);
    try {
      setFoto(await reducirFoto(archivo));
    } catch {
      toast("Esa foto no quiso cargar. Prueba con otra.");
    } finally {
      setProcesandoFoto(false);
    }
  };

  const guardar = async () => {
    const precioNumero = Number(precio);
    const coleccion = nuevaColeccion !== null ? nuevaColeccion.trim() || null : categoria;
    if (!nombre.trim() || !precioNumero) {
      toast("Ponle nombre y precio. Lo demás lo hacemos nosotros.");
      return;
    }
    if (!foto) {
      toast("Falta la foto. El producto es la estrella.");
      return;
    }
    setGuardando(true);
    try {
      const fotos = producto ? [foto, ...producto.fotos.slice(1)] : [foto];
      const datos = { nombre: nombre.trim(), precio: precioNumero, fotos, stock, categoria: coleccion, activo };
      if (producto) {
        await actualizarProducto(tiendaId, producto.id, datos);
        toast("Guardado. El catálogo ya se enteró.");
      } else {
        await crearProducto(tiendaId, { ...datos, fotoRetocada: false, destacado: false, likes: 0 });
        toast(activo ? "Publicado. Ya se está deslizando." : "Guardado como oculto. Nadie lo ve hasta que lo prendas.");
      }
      alTerminar();
    } catch {
      toast("No se pudo guardar. Inténtalo otra vez.");
      setGuardando(false);
    }
  };

  const campo =
    "h-[50px] w-full min-w-0 rounded-2xl border-[1.5px] border-borde bg-white px-3.5 text-base text-bosque outline-none focus:border-bosque";

  return (
    <div className="flex flex-col gap-3.5">
      {lleno && tienda && (
        <div className="rounded-[18px] bg-mandarina/20 px-4 py-3 text-sm">
          <b>Tu plan está lleno ({productos.length} de {tienda.limiteProductos}).</b> En la demo puedes seguir; en la vida real, toca
          subir de plan.{" "}
          <button type="button" onClick={abrirPlan} className="font-extrabold underline">
            Ver plan
          </button>
        </div>
      )}

      {/* Foto */}
      <input
        ref={entradaFoto}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          void elegirFoto(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {foto ? (
        <div className="relative aspect-square w-full overflow-hidden rounded-3xl bg-arena">
          <Foto src={foto} alt="Foto del producto" className="h-full w-full" sizes="440px" />
          <button
            type="button"
            onClick={() => entradaFoto.current?.click()}
            className="absolute right-3 bottom-3 flex h-10 items-center gap-1.5 rounded-full bg-papel/95 px-3.5 text-[13px] font-extrabold"
          >
            <IconoCamara tamano={18} /> Cambiar foto
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => entradaFoto.current?.click()}
          disabled={procesandoFoto}
          className="flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-apagado bg-white text-[15px] font-bold text-suave"
        >
          <IconoCamara tamano={40} />
          {procesandoFoto ? "Acomodando la foto…" : "Sube la foto del celular"}
          <span className="font-mano text-[19px] font-semibold text-mandarina">nosotros le ponemos la luz</span>
        </button>
      )}

      <label className="flex flex-col gap-1.5 text-[13.5px] font-bold">
        Nombre
        <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Kiara Pink" className={campo} />
      </label>

      <label className="flex flex-col gap-1.5 text-[13.5px] font-bold">
        Precio (RD$)
        <input
          type="text"
          inputMode="numeric"
          value={precio}
          onChange={(e) => setPrecio(e.target.value.replace(/\D/g, "").slice(0, 7))}
          placeholder="0"
          className={`${campo} font-bold`}
        />
      </label>

      {/* Stock */}
      <div className="rounded-[18px] border-[1.5px] border-borde bg-white py-2 pr-2 pl-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-extrabold">En stock</p>
            <p className="text-[12.5px] text-suave">{stock === null ? "No llevas la cuenta de este." : "Al despachar, baja solito."}</p>
          </div>
          {stock !== null && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setStock(Math.max(0, stock - 1))}
                aria-label="Quitar uno"
                className="grid h-11 w-11 place-items-center rounded-[14px] bg-arena"
              >
                <IconoMenos tamano={20} />
              </button>
              <span className="min-w-[34px] text-center font-display text-[22px] tabular-nums" aria-live="polite">
                {stock}
              </span>
              <button
                type="button"
                onClick={() => setStock(stock + 1)}
                aria-label="Agregar uno"
                className="grid h-11 w-11 place-items-center rounded-[14px] bg-bosque text-papel"
              >
                <IconoMas tamano={20} />
              </button>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setStock(stock === null ? 1 : null)}
          className="mt-1 mb-0.5 text-[12.5px] font-bold text-suave underline"
        >
          {stock === null ? "Mejor sí llevo la cuenta" : "No llevo la cuenta de este"}
        </button>
      </div>

      {/* Colección */}
      <div>
        <p className="mb-2 text-[13.5px] font-bold">
          Colección <span className="font-semibold text-suave">(opcional)</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {colecciones.map((c) => (
            <Chip
              key={c}
              alto={40}
              elegido={nuevaColeccion === null && categoria === c}
              onClick={() => {
                setNuevaColeccion(null);
                setCategoria(categoria === c ? null : c);
              }}
            >
              {c}
            </Chip>
          ))}
          <Chip alto={40} elegido={nuevaColeccion !== null} onClick={() => setNuevaColeccion(nuevaColeccion === null ? "" : null)}>
            + Nueva
          </Chip>
        </div>
        {nuevaColeccion !== null && (
          <input
            type="text"
            autoFocus
            value={nuevaColeccion}
            onChange={(e) => setNuevaColeccion(e.target.value)}
            placeholder="Ej: Para él"
            aria-label="Nombre de la colección nueva"
            className={`${campo} mt-2`}
          />
        )}
      </div>

      {/* Visible */}
      <div className="flex items-center justify-between gap-3 rounded-[18px] border-[1.5px] border-borde bg-white py-3 pr-3 pl-4">
        <div>
          <p className="font-extrabold">Visible en el catálogo</p>
          <p className="text-[12.5px] text-suave">Apágalo para esconderlo sin borrarlo.</p>
        </div>
        <Interruptor encendido={activo} alCambiar={setActivo} etiqueta="Visible en el catálogo" />
      </div>

      <button
        type="button"
        onClick={guardar}
        disabled={guardando || procesandoFoto}
        className="h-14 rounded-full bg-bosque text-[16.5px] font-extrabold text-papel transition active:scale-[0.98] disabled:opacity-60"
      >
        {producto ? "Guardar cambios" : "Publicar"}
      </button>
    </div>
  );
}
