"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";
import { CREDITOS_POR_RETOQUE, RETOQUE_REAL } from "@/lib/config";
import { useConsulta, useTiendaActiva } from "@/lib/data/consulta";
import { CreditosInsuficientes, mensajeDeError } from "@/lib/data/errores";
import { useData } from "@/lib/data/provider";
import { reducirFoto, retocarFoto } from "@/lib/imagen";
import type { Producto } from "@/lib/types";
import { BotonVolver } from "../selector-busqueda";
import { Chip, Interruptor } from "../controles";
import { Foto } from "../foto";
import { Hoja, useAvisarAlSalir, useConfirmarSalida } from "../hoja";
import { IconoCamara, IconoCreditos, IconoMas, IconoMenos } from "../iconos";
import { useToast } from "../toast";
import { usePanelUI } from "../panel/ui";
import { CuerpoConError, CuerpoCargando } from "../hoja-estado";
import { formatearPesos } from "@/lib/formato";
import { precioConPromo } from "@/lib/promos";

import { ControlInventario, ConfirmacionInventario, HistorialInventario, useInventarioPendiente, useHistorialInventario } from "./inventario-producto";

/**
 * Hoja de producto sobre el Catálogo. Sin `productoId` crea; con `productoId` edita.
 * Al cerrar vuelve a /catalogo sin perder la búsqueda ni el filtro (los guarda el layout).
 */
export function HojaProducto({ productoId, desdeVistaPrevia = false }: { productoId?: string; desdeVistaPrevia?: boolean }) {
  const router = useRouter();
  const historial = useHistorialInventario();
  const { getProducto, getProductos } = useData();
  const { tiendaId } = useTiendaActiva();
  const [abierta, setAbierta] = useState(true);
  const cerrar = useCallback(() => setAbierta(false), []);
  const alSalir = useCallback(() => router.push(desdeVistaPrevia && productoId ? `/catalogo/${productoId}` : "/catalogo", { scroll: false }), [router, desdeVistaPrevia, productoId]);


  const { data: producto, cargando, error, reintentar } = useConsulta(`producto:${tiendaId}:${productoId ?? "nuevo"}`, () =>
    productoId ? getProducto(tiendaId, productoId) : Promise.resolve(null),
  );
  const { data: productos, error: errorProductos, reintentar: reintentarProductos } = useConsulta(`productos:${tiendaId}`, () => getProductos(tiendaId));

  const editando = Boolean(productoId);
  const tituloFicha = editando ? "Editar producto" : "Nuevo producto";
  const titulo = historial.abierto ? "Historial de ajustes" : tituloFicha;

  // Editar: esperar a tener el producto (y avisar si no es de esta tienda).
  if (editando && producto === undefined && cargando) {
    return <Hoja abierta={abierta} alCerrar={cerrar} alSalir={alSalir} protegerAtras titulo={titulo}><CuerpoCargando titulo="producto" /></Hoja>;
  }
  if (editando && error) {
    return <Hoja abierta={abierta} alCerrar={cerrar} alSalir={alSalir} protegerAtras titulo={titulo}><CuerpoConError alCerrar={alSalir} alReintentar={reintentar} textoVolver="Volver al catálogo" /></Hoja>;
  }
  if (errorProductos) {
    return <Hoja abierta={abierta} alCerrar={cerrar} alSalir={alSalir} protegerAtras titulo={titulo}><CuerpoConError alCerrar={alSalir} alReintentar={reintentarProductos} textoVolver={desdeVistaPrevia ? "Volver al producto" : "Volver al catálogo"} /></Hoja>;
  }
  if (editando && !producto) {
    return (
      <Hoja abierta={abierta} alCerrar={cerrar} alSalir={alSalir} protegerAtras titulo={titulo}>
        <div className="py-6 text-center">
          <p className="font-display text-xl">Este producto no vive aquí.</p>
          <p className="mt-1 text-suave">Quizá es de otra tienda. Los productos no se mezclan.</p>
          <button type="button" onClick={alSalir} className="mt-5 h-12 w-full rounded-full bg-bosque font-extrabold text-papel">
            {desdeVistaPrevia ? "Volver al producto" : "Volver al catálogo"}
          </button>
        </div>
      </Hoja>
    );
  }
  if (!productos) return <Hoja abierta={abierta} alCerrar={cerrar} alSalir={alSalir} protegerAtras titulo={titulo}><CuerpoCargando titulo="productos" /></Hoja>;

  return (
    <Hoja abierta={abierta} alCerrar={cerrar} alSalir={alSalir} protegerAtras alVolverInterno={historial.volver} titulo={titulo} altura="grande"
      fijoArriba={historial.abierto ? <div data-volver-historial className="flex items-center gap-2 text-sm font-extrabold text-bosque"><BotonVolver onClick={historial.volver} etiqueta={`Volver a ${tituloFicha}`} /><span aria-hidden="true">{tituloFicha}</span></div> : undefined}>
      <div className={historial.abierto ? "hidden" : "contents"}>
        <FormularioProducto key={producto?.id ?? "nuevo"} producto={producto ?? null} productos={productos} alTerminar={cerrar} alVerHistorial={historial.abrir} />
      </div>
      {productoId && historial.visitado && <div className={historial.abierto ? "" : "hidden"}><HistorialInventario key={`${tiendaId}:${productoId}`} productoId={productoId}/></div>}
    </Hoja>
  );
}

/** Lectura compacta; el inventario mantiene un borrador independiente. */
export function HojaVistaProducto({ productoId }: { productoId: string }) {
  const router = useRouter();
  const historial = useHistorialInventario();
  const { getProducto, getPromos } = useData();
  const { tiendaId } = useTiendaActiva();
  const [abierta, setAbierta] = useState(true);
  const destino = useRef("/catalogo");
  const cerrar = useCallback(() => setAbierta(false), []);
  const alSalir = useCallback(() => router.push(destino.current, { scroll: false }), [router]);
  const navegar = (ruta: string) => { destino.current = ruta; setAbierta(false); };
  const { data: producto, error, reintentar } = useConsulta(`producto:${tiendaId}:${productoId}`, () => getProducto(tiendaId, productoId));
  const { data: promos, error: errorPromos, reintentar: reintentarPromos } = useConsulta(`promos:${tiendaId}`, () => getPromos(tiendaId));
  return <Hoja abierta={abierta} alCerrar={cerrar} alSalir={alSalir} protegerAtras alVolverInterno={historial.volver} titulo={historial.abierto ? "Historial de ajustes" : "Vista previa del producto"} altura="auto"
    fijoArriba={historial.abierto ? <div data-volver-historial className="flex items-center gap-2 text-sm font-extrabold text-bosque"><BotonVolver onClick={historial.volver} etiqueta="Volver a la vista previa del producto"/><span aria-hidden="true">Producto</span></div> : undefined}>
    <div className={historial.abierto ? "hidden" : "contents"}>
    {error || errorPromos ? <CuerpoConError alCerrar={cerrar} alReintentar={() => { reintentar(); reintentarPromos(); }} textoVolver="Volver al catálogo"/> : producto === undefined || promos === undefined ? <CuerpoCargando titulo="producto"/> : !producto ? <div className="py-6 text-center"><p className="font-display text-xl">Este producto no vive aquí.</p><button type="button" onClick={cerrar} className="tocable mt-4 min-h-11 font-bold">Volver al catálogo</button></div> : <ContenidoVistaProducto key={`${tiendaId}:${productoId}`} producto={producto} precio={precioConPromo(producto, promos)} alNavegar={navegar} alVerHistorial={historial.abrir}/>}
    </div>
    {historial.visitado && <div className={historial.abierto ? "" : "hidden"}><HistorialInventario key={`${tiendaId}:${productoId}`} productoId={productoId}/></div>}
  </Hoja>;
}

function ContenidoVistaProducto({ producto, precio, alNavegar, alVerHistorial }: { producto: Producto; precio: ReturnType<typeof precioConPromo>; alNavegar: (ruta: string) => void; alVerHistorial: (boton: HTMLButtonElement) => void }) {
  const toast = useToast();
  const inventario = useInventarioPendiente(producto);
  useAvisarAlSalir(inventario.pendiente || inventario.incierto);
  const confirmarSalida = useConfirmarSalida();
  const estado = producto.stock === 0 ? "Agotado" : !producto.activo ? "Oculto" : "Visible en el catálogo";
  const navegar = (ruta: string) => confirmarSalida(() => alNavegar(ruta));
  return <div className="flex flex-col gap-4 text-bosque">
    <div className="flex items-start gap-4">
      <div className="h-28 w-28 shrink-0 overflow-hidden rounded-[18px] bg-arena">
        {producto.fotos[0] ? <Foto src={producto.fotos[0]} alt={`Foto de ${producto.nombre}`} className="h-full w-full" sizes="112px"/> : <div className="grid h-full place-items-center font-display text-4xl text-bosque/30">{producto.nombre[0]}</div>}
      </div>
      <div className="min-w-0 flex-1">
        <h2 title={producto.nombre} className="line-clamp-3 break-words font-display text-[23px] leading-tight">{producto.nombre}</h2>
        <p className="mt-1 flex flex-wrap items-baseline gap-x-2"><b className="text-[18px]">{formatearPesos(precio.precio)}</b>{precio.precioAntes && <span className="text-sm text-suave line-through">{formatearPesos(precio.precioAntes)}</span>}</p>
        <span className={`mt-2 inline-block rounded-full px-2.5 py-1 text-xs font-extrabold ${producto.stock === 0 ? "bg-bosque text-papel" : !producto.activo ? "bg-arena" : "bg-menta"}`}>{estado}</span>
        {producto.categoria && <p className="mt-1 break-words text-sm text-suave">{producto.categoria}</p>}
      </div>
    </div>
    <ControlInventario inventario={inventario} nombre={producto.nombre} alVerHistorial={alVerHistorial}
      alGuardar={() => inventario.pedirGuardar(async (motivo, nota) => { const bien = await inventario.guardar({}, false, motivo, nota); if (bien) toast("Ajuste guardado. No cuenta como venta."); return bien; })}/>
    {inventario.error && <p role="alert" className="rounded-2xl bg-rosa p-4 text-sm">{inventario.error}</p>}
    {inventario.incierto && <button type="button" disabled={inventario.guardando} onClick={() => void inventario.revisar()} className="tocable min-h-11 font-bold underline">Revisar producto e historial</button>}
    <button type="button" disabled={inventario.guardando} onClick={() => navegar(`/pedidos/nuevo?producto=${encodeURIComponent(producto.id)}`)} className="tocable h-14 rounded-full bg-bosque font-extrabold text-papel">Crear pedido</button>
    <button type="button" disabled={inventario.guardando} onClick={() => navegar(`/catalogo/${producto.id}/editar`)} className="tocable h-12 rounded-full border-[1.5px] border-bosque bg-white font-extrabold">Editar</button>
    <ConfirmacionInventario inventario={inventario}/>
  </div>;
}

function FormularioProducto({
  producto,
  productos,
  alTerminar,
  alVerHistorial,
}: {
  producto: Producto | null;
  productos: Producto[];
  alTerminar: () => void;
  alVerHistorial: (boton: HTMLButtonElement) => void;
}) {
  const { crearProducto, usarCreditosRetoque } = useData();
  const inventario = useInventarioPendiente(producto, alTerminar);
  const { tiendaId, tienda } = useTiendaActiva();
  const { abrirPlan } = usePanelUI();
  const toast = useToast();
  const entradaFoto = useRef<HTMLInputElement>(null);

  const [foto, setFoto] = useState<string | null>(producto?.fotos[0] ?? null);
  const [fotoNueva, setFotoNueva] = useState(false);
  const [procesandoFoto, setProcesandoFoto] = useState(false);
  // Retoque (simulado): `retocada` es la versión con luz de `foto`, la misma que se guarda.
  const [retocar, setRetocar] = useState(false);
  const [vista, setVista] = useState<"antes" | "despues">("despues");
  const [retocada, setRetocada] = useState<{ de: string; url: string } | null>(null);
  const [procesandoRetoque, setProcesandoRetoque] = useState(false);
  const [nombre, setNombre] = useState(producto?.nombre ?? "");
  const [precio, setPrecio] = useState(producto ? String(producto.precio) : "");
  const [stock, setStock] = useState<number | null>(producto ? producto.stock : 1);
  const [categoria, setCategoria] = useState<string | null>(producto?.categoria ?? null);
  const [nuevaColeccion, setNuevaColeccion] = useState<string | null>(null);
  const [activo, setActivo] = useState(producto?.activo ?? true);
  const [guardando, setGuardando] = useState(false);
  // Con cambios respecto a como se abrió y sin guardar, cerrar la hoja pregunta (de la foto solo importa si cambió, no su contenido)
  const firma = JSON.stringify({ hayFoto: foto !== null, fotoNueva, retocar, nombre, precio, stock: producto ? null : stock, categoria, nuevaColeccion, activo });
  const [firmaInicial] = useState(firma);
  useAvisarAlSalir(firma !== firmaInicial || inventario.pendiente || inventario.incierto);

  const colecciones = useMemo(() => {
    const todas = new Set(productos.map((p) => p.categoria).filter((c): c is string => Boolean(c)));
    return [...todas].sort((a, b) => a.localeCompare(b, "es"));
  }, [productos]);

  const lleno = !producto && tienda != null && productos.length >= tienda.limiteProductos;

  const creditos = tienda?.creditosRetoque ?? 0;
  const alcanzan = creditos >= CREDITOS_POR_RETOQUE;
  const retoqueActivo = retocar && alcanzan && Boolean(foto);
  const retoqueListo = retoqueActivo && retocada !== null && retocada.de === foto;
  const yaRetocada = Boolean(producto?.fotoRetocada) && !fotoNueva;

  const prepararRetoque = async (src: string) => {
    setProcesandoRetoque(true);
    try {
      setRetocada({ de: src, url: await retocarFoto(src) });
    } catch {
      setRetocar(false);
      toast("Esta foto no se dejó retocar. Prueba con otra.");
    } finally {
      setProcesandoRetoque(false);
    }
  };

  const elegirFoto = async (archivo: File | undefined) => {
    if (!archivo) return;
    setProcesandoFoto(true);
    try {
      const nueva = await reducirFoto(archivo);
      setFoto(nueva);
      setFotoNueva(true);
      // Foto recién subida: el retoque viene prendido si hay créditos (como en el prototipo).
      setRetocar(alcanzan);
      setVista("despues");
      if (alcanzan) void prepararRetoque(nueva);
    } catch {
      toast("Esa foto no quiso cargar. Prueba con otra.");
    } finally {
      setProcesandoFoto(false);
    }
  };

  const alternarRetoque = (prender: boolean) => {
    setRetocar(prender);
    if (!prender || !foto) return;
    setVista("despues");
    if (retocada?.de !== foto) void prepararRetoque(foto);
  };

  const retoqueBloqueado = () =>
    toast(!foto ? "Primero la foto. Después le ponemos la luz." : "Te faltan créditos para retocar. Se recargan el día 1.");

  const guardar = async (motivo: import("@/lib/types").MotivoAjusteInventario = "reposicion", nota: string | null = null): Promise<boolean> => {
    if (guardando || inventario.guardando || inventario.incierto) return false;
    const precioNumero = Number(precio);
    const coleccion = nuevaColeccion !== null ? nuevaColeccion.trim() || null : categoria;
    if (!nombre.trim() || !precioNumero) {
      toast("Ponle nombre y precio. Lo demás lo hacemos nosotros.");
      return false;
    }
    if (!foto) {
      toast("Falta la foto. El producto es la estrella.");
      return false;
    }
    setGuardando(true);
    const usarRetoque = retoqueListo;
    if (usarRetoque && !producto) {
      try {
        await usarCreditosRetoque(tiendaId, 1);
      } catch (e) {
        toast(e instanceof CreditosInsuficientes ? "Te faltan créditos para retocar. Se recargan el día 1." : mensajeDeError(e));
        setRetocar(false);
        setGuardando(false);
        return false;
      }
    }
    try {
      const fotoFinal = usarRetoque ? retocada!.url : foto;
      const fotos = producto ? [fotoFinal, ...producto.fotos.slice(1)] : [fotoFinal];
      const fotoRetocada = usarRetoque || yaRetocada;
      const datos = { nombre: nombre.trim(), precio: precioNumero, fotos, fotoRetocada, stock, categoria: coleccion, activo };
      const menos = `−${CREDITOS_POR_RETOQUE} créditos.`;
      if (producto) {
        const bien = await inventario.guardar({
          nombre: datos.nombre, precio: datos.precio, fotos: datos.fotos,
          fotoRetocada: datos.fotoRetocada, categoria: datos.categoria, activo: datos.activo,
        }, usarRetoque, motivo, nota);
        if (!bien) { setGuardando(false); return false; }
        toast(usarRetoque ? `Guardado y retocado${producto.fotoRetocada ? " otra vez" : ""}. ${menos}` : "Guardado. El catálogo ya se enteró.");
      } else {
        await crearProducto(tiendaId, { ...datos, destacado: false, likes: 0 });
        toast(
          usarRetoque
            ? `Publicado y retocado. ${menos}`
            : activo
              ? "Publicado. Ya se está deslizando."
              : "Guardado como oculto. Nadie lo ve hasta que lo prendas.",
        );
      }
      if (producto) inventario.finalizar(alTerminar);
      else alTerminar();
      return true;
    } catch (e) {
      toast(mensajeDeError(e, "No se pudo guardar. Inténtalo otra vez."));
      setGuardando(false);
      return false;
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
          {/* Antes (abajo) y después (encima): se pasa de una a otra con un fundido, sin corte. */}
          <Foto src={foto} alt="Foto del producto" className="h-full w-full" sizes="440px" />
          {retocada?.de === foto && (
            <span
              aria-hidden={!(retoqueListo && vista === "despues")}
              className="absolute inset-0 transition-opacity duration-(--mov-normal) ease-(--curva-salida)"
              style={{ opacity: retoqueListo && vista === "despues" ? 1 : 0 }}
            >
              <Foto src={retocada.url} alt="Foto del producto, retocada" className="h-full w-full" sizes="440px" />
            </span>
          )}
          {retoqueActivo && (
            <div role="group" aria-label="Comparar foto" className="mov-aparece absolute top-3 left-3 grid grid-cols-2 rounded-full bg-papel/90 p-[3px]">
              {/* Indicador que se desliza entre Antes y Después */}
              <span
                aria-hidden="true"
                className="absolute inset-y-[3px] left-[3px] w-[calc(50%-3px)] rounded-full bg-bosque transition-transform duration-(--mov-normal) ease-(--curva-salida)"
                style={{ transform: vista === "despues" ? "translateX(100%)" : "none" }}
              />
              {(["antes", "despues"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVista(v)}
                  aria-pressed={vista === v}
                  className={`tocable relative h-[34px] rounded-full px-3.5 before:absolute before:-inset-y-[5px] before:inset-x-0 before:content-[''] text-[13px] font-extrabold ${vista === v ? "text-papel" : "text-bosque"}`}
                >
                  {v === "antes" ? "Antes" : "Después"}
                </button>
              ))}
            </div>
          )}
          {procesandoRetoque && (
            <div className="mov-aparece absolute inset-0 grid place-items-center bg-papel/40">
              <span className="rounded-full bg-bosque px-4 py-2 text-sm font-extrabold text-papel">Poniéndole la luz…</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => entradaFoto.current?.click()}
            className="absolute bottom-3 left-3 flex h-11 items-center gap-1.5 rounded-full bg-papel/95 px-3.5 text-[13px] font-extrabold"
          >
            <IconoCamara tamano={18} /> Cambiar foto
          </button>
          {((retoqueListo && vista === "despues") || (!retoqueActivo && yaRetocada)) && (
            <span className="mov-aparece absolute right-3 bottom-3 rounded-full bg-bosque px-3 py-1.5 text-[12.5px] font-extrabold text-papel">
              {retoqueActivo ? "Retocada ✦" : "Ya está retocada"}
            </span>
          )}
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
          <span className="font-mano text-[19px] font-semibold text-mandarina-texto">nosotros le ponemos la luz</span>
        </button>
      )}

      {/* Retoque */}
      <div
        className={`relative isolate flex flex-col gap-2.5 overflow-hidden rounded-[22px] px-4 py-3.5 ${
          !alcanzan ? "bg-arena" : retoqueActivo ? "bg-rosa text-bosque-oscuro" : "bg-rosa"
        }`}
      >
        {/* Al prender el retoque, la tarjeta pasa a Mandarina con un fundido (capa de opacidad). */}
        <span
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-mandarina transition-opacity duration-(--mov-normal) ease-(--curva-salida)"
          style={{ opacity: retoqueActivo ? 1 : 0 }}
        />
        <div className="flex items-center gap-3">
          <span className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-[14px] bg-bosque text-papel">
            <IconoCreditos tamano={22} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 text-[15.5px] font-extrabold">
              {yaRetocada ? "Retocar otra vez" : "Retocar foto"}
              {!RETOQUE_REAL && (
                <span data-etiqueta-demo className="rounded-full bg-bosque/10 px-2 py-[2px] text-[11px] leading-none font-extrabold tracking-wide text-bosque uppercase">
                  Demo
                </span>
              )}
            </p>
            <p className="text-[13px] font-semibold">
              {!alcanzan
                ? `Te faltan ${CREDITOS_POR_RETOQUE - creditos} créditos (tienes ${creditos}). Se recargan el día 1.`
                : retoqueActivo
                  ? `Usa ${CREDITOS_POR_RETOQUE} créditos: te quedan ${creditos} → ${creditos - CREDITOS_POR_RETOQUE}.`
                  : `Luz, fondo y color de estudio. Usa ${CREDITOS_POR_RETOQUE} créditos.`}
            </p>
          </div>
          <Interruptor
            encendido={retoqueActivo}
            alCambiar={alternarRetoque}
            etiqueta="Retocar foto"
            deshabilitado={!alcanzan || !foto}
            alTocarBloqueado={retoqueBloqueado}
          />
        </div>
        {!alcanzan && (
          <button type="button" onClick={abrirPlan} className="h-11 rounded-full bg-bosque text-[14.5px] font-extrabold text-papel">
            Ver plan
          </button>
        )}
      </div>

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
      <div className={producto ? "" : "rounded-[18px] border-[1.5px] border-borde bg-white p-4"}>
        {producto ? (
          <ControlInventario inventario={inventario} nombre={producto.nombre} alVerHistorial={alVerHistorial}
            alGuardar={() => inventario.pedirGuardar(guardar)} guardarBloqueado={guardando || procesandoFoto || procesandoRetoque}/>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-extrabold">En stock</p>
                <p className="text-[12.5px] text-suave">{stock === null ? "No llevas la cuenta de este." : "Al despachar, baja solito."}</p>
              </div>
              {stock !== null && (
                <div className="flex items-center gap-1.5">
                  <button type="button" onClick={() => setStock(Math.max(0, stock - 1))} aria-label="Quitar uno" className="tocable grid h-11 w-11 place-items-center rounded-[14px] bg-arena"><IconoMenos tamano={20} /></button>
                  <span className="min-w-[34px] text-center font-display text-[22px] tabular-nums" aria-live="polite">{stock}</span>
                  <button type="button" onClick={() => setStock(stock + 1)} aria-label="Agregar uno" className="tocable grid h-11 w-11 place-items-center rounded-[14px] bg-bosque text-papel"><IconoMas tamano={20} /></button>
                </div>
              )}
            </div>
            <button type="button" onClick={() => setStock(stock === null ? 1 : null)} className="tocable -mb-1 flex min-h-11 items-center text-[12.5px] font-bold text-suave">{stock === null ? "Mejor sí llevo la cuenta" : "No llevo la cuenta de este"}</button>
          </>
        )}
      </div>

      {/* Colección */}
      <div>
        <p className="mb-2 text-[13.5px] font-bold">
          Colección <span className="font-semibold text-suave">(opcional)</span>
        </p>
        <div className="flex flex-wrap gap-x-2 gap-y-3">
          {colecciones.map((c) => (
            <Chip
              key={c}
              elegido={nuevaColeccion === null && categoria === c}
              onClick={() => {
                setNuevaColeccion(null);
                setCategoria(categoria === c ? null : c);
              }}
            >
              {c}
            </Chip>
          ))}
          <Chip elegido={nuevaColeccion !== null} onClick={() => setNuevaColeccion(nuevaColeccion === null ? "" : null)}>
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

      {(!producto || !inventario.pendiente) && <button
        type="button"
        onClick={() => producto ? inventario.pedirGuardar(guardar) : void guardar()}
        disabled={guardando || inventario.guardando || inventario.incierto || procesandoFoto || procesandoRetoque}
        className="h-14 rounded-full bg-bosque text-[16.5px] font-extrabold text-papel tocable disabled:opacity-60"
      >
        {retoqueActivo
          ? `${producto ? "Guardar" : "Publicar"} · −${CREDITOS_POR_RETOQUE} créditos`
          : producto
            ? "Guardar cambios"
            : "Publicar"}
      </button>}
      {inventario.error && <p role="alert" className="rounded-2xl bg-rosa p-4 text-sm">{inventario.error}</p>}
      {inventario.incierto && <button type="button" disabled={inventario.guardando} onClick={() => void inventario.revisar()} className="tocable min-h-11 font-bold underline">Revisar producto e historial</button>}
      <ConfirmacionInventario inventario={inventario}/>
    </div>
  );
}
