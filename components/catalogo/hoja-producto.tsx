"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";
import { CREDITOS_POR_RETOQUE } from "@/lib/config";
import { useConsulta, useTiendaActiva } from "@/lib/data/consulta";
import { mensajeDeError } from "@/lib/data/errores";
import { useData } from "@/lib/data/provider";
import type { Detalles } from "@/lib/rubros";
import type { MotivoAjusteInventario, OpcionProducto, Producto } from "@/lib/types";
import { BotonVolver } from "../selector-busqueda";
import { Foto } from "../foto";
import { Hoja, useAvisarAlSalir, useConfirmarSalida } from "../hoja";
import { useToast } from "../toast";
import { usePanelUI } from "../panel/ui";
import { CuerpoConError, CuerpoCargando } from "../hoja-estado";
import { formatearPesos } from "@/lib/formato";
import { resumenDelPlan } from "@/lib/plan-catalogo";
import { precioConPromo } from "@/lib/promos";
import { Boton, Campo, Cantidad, Etiqueta, FilaAgregar, FilaLista, GrupoOpciones, Interruptor, ListaAgrupada, useToastUI } from "../ui";
import { mediosIniciales, mediosParaGuardar, retoquesPendientes, SeccionMedios, type MedioBorrador } from "./ficha-medios";
import { claveVariante, combinaciones, HojaMotivoVariantes, SeccionOpciones, variantesBase } from "./ficha-opciones";
import { SeccionDetalles, sugerenciasDeDetalles } from "./ficha-detalles";

import { ControlInventario, ConfirmacionInventario, HistorialInventario, InventarioVistaPrevia, useInventarioPendiente, useHistorialInventario } from "./inventario-producto";

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
  return <Hoja abierta={abierta} alCerrar={cerrar} alSalir={alSalir} protegerAtras alVolverInterno={historial.volver} titulo={historial.abierto ? "Historial de ajustes" : producto?.nombre ?? "Producto"} altura="auto"
    fijoArriba={historial.abierto ? <div data-volver-historial className="flex items-center gap-2 text-sm font-extrabold text-bosque"><BotonVolver onClick={historial.volver} etiqueta="Volver a la vista previa del producto"/><span aria-hidden="true">{producto?.nombre ?? "Producto"}</span></div> : undefined}>
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
  const navegar = (ruta: string) => confirmarSalida(() => alNavegar(ruta));
  const activas = (producto.variantes ?? []).filter((v) => v.activa);
  return <div className="flex flex-col gap-4 text-texto">
    <div className="flex items-start gap-4">
      <div className="size-30 shrink-0 overflow-hidden rounded-radio-m bg-superficie-hundida">
        {producto.fotos[0] ? <Foto src={producto.fotos[0]} alt={`Foto de ${producto.nombre}`} className="h-full w-full" sizes="120px"/> : <div className="grid h-full place-items-center font-display text-titulo-pantalla text-texto-secundario">{producto.nombre[0]}</div>}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="flex flex-wrap items-baseline gap-x-2 text-destacado"><span>{formatearPesos(precio.precio)}</span>{precio.precioAntes && <span className="text-secundario font-normal text-texto-secundario line-through">{formatearPesos(precio.precioAntes)}</span>}</p>
        {producto.categoria && <p className="break-words text-secundario text-texto-secundario">{producto.categoria}</p>}
        {!producto.activo && <Etiqueta className="mt-1 self-start">Oculto</Etiqueta>}
      </div>
    </div>
    {activas.length > 0 ? (
      // Con opciones, el stock es por combinación: se cambia en la ficha.
      <ListaAgrupada etiqueta="Stock e historial">
        <FilaLista titulo="Stock" detalle={`${activas.length} ${activas.length === 1 ? "combinación" : "combinaciones"}`} fin={<span className="text-secundario font-normal text-texto-secundario">{producto.stock ?? 0} en total</span>} onClick={() => navegar(`/catalogo/${producto.id}/editar`)} />
        <FilaLista titulo="Historial" onClick={(e) => alVerHistorial(e.currentTarget)} />
      </ListaAgrupada>
    ) : (
      <InventarioVistaPrevia inventario={inventario} nombre={producto.nombre} alVerHistorial={alVerHistorial}
        alGuardar={() => inventario.pedirGuardar(async (motivo, nota) => { const bien = await inventario.guardar({}, false, motivo, nota); if (bien) toast("Ajuste guardado. No cuenta como venta."); return bien; })}/>
    )}
    {inventario.error && <p role="alert" className="rounded-radio-m bg-atencion-suave p-4 text-secundario text-texto">{inventario.error}</p>}
    {inventario.incierto && <button type="button" disabled={inventario.guardando} onClick={() => void inventario.revisar()} className="tocable min-h-11 text-secundario font-extrabold text-accion underline">Revisar producto e historial</button>}
    {/* Con cambios de stock sin guardar, "Guardar cambios" es el único botón principal a la vista */}
    {!inventario.pendiente && <div className="grid grid-cols-2 gap-3">
      <Boton jerarquia="secundario" tamano="grande" deshabilitado={inventario.guardando} onClick={() => navegar(`/catalogo/${producto.id}/editar`)}>Editar</Boton>
      <Boton tamano="grande" deshabilitado={inventario.guardando} onClick={() => navegar(`/pedidos/nuevo?producto=${encodeURIComponent(producto.id)}`)}>Crear pedido</Boton>
    </div>}
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
  const { crearProducto, usarCreditosRetoque, guardarVariantes, ajustarStock } = useData();
  const inventario = useInventarioPendiente(producto, alTerminar);
  const { tiendaId, tienda } = useTiendaActiva();
  const { abrirInventario } = usePanelUI();
  const toast = useToast();
  const { mostrarToast: mostrarToastUI } = useToastUI();
  const rubro = tienda?.rubro ?? "general";

  const [medios, setMedios] = useState<MedioBorrador[]>(() => mediosIniciales(producto));
  const [nombre, setNombre] = useState(producto?.nombre ?? "");
  const [precio, setPrecio] = useState(producto ? String(producto.precio) : "");
  const [stock, setStock] = useState<number | null>(producto ? producto.stock : 1);
  const [opciones, setOpciones] = useState<OpcionProducto[]>(producto?.opciones ?? []);
  const base = useMemo(() => variantesBase(producto), [producto]);
  const [stockVariantes, setStockVariantes] = useState<Record<string, number>>(() =>
    Object.fromEntries([...base.entries()].map(([k, v]) => [k, v.stock ?? 0])),
  );
  const [detalles, setDetalles] = useState<Detalles>(producto?.detalles ?? {});
  const [categoria, setCategoria] = useState<string | null>(producto?.categoria ?? null);
  const [nuevaColeccion, setNuevaColeccion] = useState<string | null>(null);
  const [eligiendoColeccion, setEligiendoColeccion] = useState(false);
  const [activo, setActivo] = useState(producto?.activo ?? true);
  const [porEncargo, setPorEncargo] = useState(producto?.porEncargo ?? false);
  const [encargoTexto, setEncargoTexto] = useState(producto?.encargoTexto ?? "");
  const [guardando, setGuardando] = useState(false);
  const [pidiendoMotivo, setPidiendoMotivo] = useState(false);

  const tieneOpciones = opciones.length > 0;
  const combos = useMemo(() => combinaciones(opciones), [opciones]);
  // Lo que baja en variantes que ya existían pide motivo (como el stock del producto); lo que sube es reposición.
  const bajadas = combos.reduce((s, c) => {
    const b = base.get(claveVariante(c));
    const quiere = stockVariantes[claveVariante(c)] ?? 0;
    return b && b.stock !== null && quiere < b.stock ? s + (b.stock - quiere) : s;
  }, 0);

  // Con cambios respecto a como se abrió y sin guardar, cerrar la hoja pregunta.
  const firma = JSON.stringify({
    medios: medios.map((m) => [m.tipo, m.tipo === "foto" ? m.url.slice(-40) : m.url?.slice(-40)]),
    nombre, precio, stock: producto ? null : stock, opciones, stockVariantes, detalles, categoria, nuevaColeccion, activo, porEncargo, encargoTexto,
  });
  const [firmaInicial] = useState(firma);
  useAvisarAlSalir(firma !== firmaInicial || inventario.pendiente || inventario.incierto);

  const colecciones = useMemo(() => {
    const todas = new Set(productos.map((p) => p.categoria).filter((c): c is string => Boolean(c)));
    return [...todas].sort((a, b) => a.localeCompare(b, "es"));
  }, [productos]);
  const sugerencias = useMemo(() => sugerenciasDeDetalles(productos.filter((p) => p.id !== producto?.id).map((p) => p.detalles)), [productos, producto?.id]);

  const coleccionElegida = nuevaColeccion !== null ? nuevaColeccion.trim() || null : categoria;

  // El plan cuenta solo los visibles. Con el plan lleno no se puede mostrar otro producto: uno nuevo se guarda oculto y
  // uno oculto no se vuelve visible hasta hacer espacio.
  const llenoPlan = tienda != null && resumenDelPlan(productos, tienda.limiteProductos).estado === "lleno";
  const bloqueaVisible = llenoPlan && !(producto?.activo ?? false);
  const cambiarVisible = (valor: boolean) => {
    if (valor && bloqueaVisible) return;
    setActivo(valor);
  };
  const avisarLleno = () =>
    mostrarToastUI("Tu catálogo está lleno", { accion: { texto: "Hacer espacio", alTocar: () => abrirInventario("espacio") } });

  const cambiarOpciones = (nuevas: OpcionProducto[]) => {
    // Al pasar a opciones, el stock vive en cada combinación: un ajuste suelto del producto se descarta.
    if (nuevas.length > 0 && opciones.length === 0 && inventario.pendiente) inventario.recuperar();
    setOpciones(nuevas);
  };

  const preparando = medios.some((m) => m.tipo === "video" && typeof m.progreso === "number");

  const guardar = async (
    motivo: MotivoAjusteInventario = "reposicion",
    nota: string | null = null,
    motivoVariantes: MotivoAjusteInventario = "correccion_inventario",
    notaVariantes: string | null = null,
  ): Promise<boolean> => {
    if (guardando || inventario.guardando || inventario.incierto) return false;
    const precioNumero = Number(precio);
    const coleccion = nuevaColeccion !== null ? nuevaColeccion.trim() || null : categoria;
    if (!nombre.trim() || !precioNumero) {
      toast("Ponle nombre y precio. Lo demás lo hacemos nosotros.");
      return false;
    }
    if (preparando) {
      toast("Espera a que el video termine de prepararse.");
      return false;
    }
    const final = mediosParaGuardar(medios);
    const fotos = final.flatMap((m) => (m.tipo === "foto" ? [m.url] : []));
    if (fotos.length === 0) {
      toast("Falta la foto. El producto es la estrella.");
      return false;
    }
    const retoques = retoquesPendientes(medios);
    if (retoques > 0 && (tienda?.creditosRetoque ?? 0) < retoques * CREDITOS_POR_RETOQUE) {
      toast("Te faltan créditos para retocar. Se recargan el día 1.");
      return false;
    }
    setGuardando(true);
    const fotoRetocada = final.find((m) => m.tipo === "foto")?.tipo === "foto" ? (final.find((m) => m.tipo === "foto") as { retocada: boolean }).retocada : false;
    const catalogo = { medios: final, detalles, porEncargo, encargoTexto: porEncargo ? encargoTexto.trim() || null : (producto?.encargoTexto ?? null) };
    const variantes = combos.map((c) => {
      const k = claveVariante(c);
      const b = base.get(k);
      // Las que ya existían conservan su stock aquí: su cambio va después como ajuste con motivo.
      return { valores: c, stock: b ? b.stock : (stockVariantes[k] ?? 0), precio: b?.precio ?? null };
    });
    try {
      if (!producto) {
        if (retoques > 0) await usarCreditosRetoque(tiendaId, retoques);
        const creado = await crearProducto(tiendaId, {
          nombre: nombre.trim(), precio: precioNumero, fotos, fotoRetocada, stock: tieneOpciones ? 0 : stock, categoria: coleccion,
          activo: activo && !bloqueaVisible, destacado: false, likes: 0, ...catalogo,
        });
        if (tieneOpciones) await guardarVariantes(tiendaId, creado.id, opciones, variantes);
        toast(retoques > 0 ? `Publicado y retocado. −${retoques * CREDITOS_POR_RETOQUE} créditos.` : activo && !bloqueaVisible ? "Publicado. Ya se está deslizando." : "Guardado como oculto. Nadie lo ve hasta que lo prendas.");
        alTerminar();
        return true;
      }
      // Más de un retoque: el último lo cobra el guardado (junto con la ficha), los demás antes.
      if (retoques > 1) await usarCreditosRetoque(tiendaId, retoques - 1);
      const bien = await inventario.guardar(
        { nombre: nombre.trim(), precio: precioNumero, fotos, fotoRetocada, categoria: coleccion, activo: activo && !bloqueaVisible, ...catalogo },
        retoques > 0, motivo, nota,
      );
      if (!bien) { setGuardando(false); return false; }
      const antes = [...base.keys()].sort().join(",");
      const ahora = combos.map(claveVariante).sort().join(",");
      if (JSON.stringify(opciones) !== JSON.stringify(producto.opciones) || antes !== ahora) {
        await guardarVariantes(tiendaId, producto.id, opciones, variantes);
      }
      for (const c of combos) {
        const k = claveVariante(c);
        const b = base.get(k);
        const quiere = stockVariantes[k] ?? 0;
        if (!b || b.stock === null || quiere === b.stock) continue;
        const delta = quiere - b.stock;
        await ajustarStock(tiendaId, producto.id, delta, delta > 0 ? "reposicion" : motivoVariantes, delta > 0 ? null : notaVariantes, b.id);
      }
      toast(retoques > 0 ? `Guardado y retocado. −${retoques * CREDITOS_POR_RETOQUE} créditos.` : "Guardado. El catálogo ya se enteró.");
      inventario.finalizar(alTerminar);
      return true;
    } catch (e) {
      toast(mensajeDeError(e, "No se pudo guardar. Inténtalo otra vez."));
      setGuardando(false);
      return false;
    }
  };

  const alGuardar = () => {
    if (producto && tieneOpciones && bajadas > 0) setPidiendoMotivo(true);
    else if (producto) inventario.pedirGuardar(guardar);
    else void guardar();
  };

  return (
    <div className="flex flex-col gap-5">
      <SeccionMedios medios={medios} alCambiar={setMedios} creditos={tienda?.creditosRetoque ?? 0} avisar={toast} />

      <Campo etiqueta="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Kiara Pink" maxLength={120} />
      <Campo
        etiqueta="Precio (RD$)"
        inputMode="numeric"
        value={precio}
        onChange={(e) => setPrecio(e.target.value.replace(/\D/g, "").slice(0, 7))}
        placeholder="0"
        className="[&_input]:font-extrabold"
      />

      {(producto?.tipo ?? "producto") === "producto" && (
        <SeccionOpciones
          rubro={rubro}
          opciones={opciones}
          alCambiarOpciones={cambiarOpciones}
          stock={Object.fromEntries(combos.map((c) => [claveVariante(c), stockVariantes[claveVariante(c)] ?? 0]))}
          alCambiarStock={(k, v) => setStockVariantes((s) => ({ ...s, [k]: v }))}
          deshabilitado={guardando}
        />
      )}

      {/* Stock sin opciones: como siempre */}
      {!tieneOpciones && (
        <div className={producto ? "" : "rounded-radio-l border border-linea bg-superficie p-4"}>
          {producto ? (
            <ControlInventario inventario={inventario} nombre={producto.nombre} alVerHistorial={alVerHistorial}
              alGuardar={() => inventario.pedirGuardar(guardar)} guardarBloqueado={guardando || preparando}/>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-destacado text-texto">En stock</p>
                  <p className="text-secundario text-texto-secundario">{stock === null ? "No llevas la cuenta de este." : "Al despachar, baja solito."}</p>
                </div>
                {stock !== null && <Cantidad valor={stock} max={2147483647} alCambiar={setStock} />}
              </div>
              <button type="button" onClick={() => setStock(stock === null ? 1 : null)} className="tocable -mb-1 flex min-h-11 items-center text-secundario font-extrabold text-texto-secundario">{stock === null ? "Mejor sí llevo la cuenta" : "No llevo la cuenta de este"}</button>
            </>
          )}
        </div>
      )}

      {/* Sin la tienda todavía no se sabe el rubro: Detalles espera para no mostrar los campos de otro. */}
      {tienda && <SeccionDetalles rubro={rubro} detalles={detalles} alCambiar={setDetalles} sugerencias={sugerencias} />}

      {/* Colección, visibilidad y por encargo: una sola lista agrupada */}
      <ListaAgrupada etiqueta="Colección y visibilidad">
        <FilaLista
          titulo="Colección"
          fin={<span className="text-secundario font-normal text-texto-secundario">{coleccionElegida ?? "Sin colección"}</span>}
          onClick={() => setEligiendoColeccion(true)}
        />
        <FilaLista
          titulo="Visible en el catálogo"
          accion={<Interruptor encendido={activo && !bloqueaVisible} alCambiar={cambiarVisible} etiqueta="Visible en el catálogo" deshabilitado={bloqueaVisible} alTocarBloqueado={producto ? avisarLleno : undefined} />}
        />
        {(producto?.tipo ?? "producto") === "producto" && (
          <FilaLista
            titulo="Por encargo"
            detalle="Se puede pedir aunque no haya."
            accion={<Interruptor encendido={porEncargo} alCambiar={setPorEncargo} etiqueta="Por encargo" />}
          />
        )}
        {porEncargo && (
          <li className="px-4 pb-4">
            <Campo
              etiqueta={<span className="sr-only">Cuándo llega</span>}
              value={encargoTexto}
              maxLength={40}
              onChange={(e) => setEncargoTexto(e.target.value)}
              placeholder="Llega en 7 a 10 días"
            />
          </li>
        )}
      </ListaAgrupada>
      {bloqueaVisible && !producto && (
        <p className="-mt-3 px-1 text-secundario text-texto-secundario">Tu catálogo está lleno. Lo guardamos oculto hasta que hagas espacio.</p>
      )}
      <HojaColeccion
        abierta={eligiendoColeccion}
        alCerrar={() => setEligiendoColeccion(false)}
        colecciones={colecciones}
        elegida={coleccionElegida}
        alElegir={(nombre, esNueva) => {
          setNuevaColeccion(esNueva ? nombre : null);
          setCategoria(esNueva ? categoria : nombre);
          setEligiendoColeccion(false);
        }}
      />

      {(!producto || !inventario.pendiente || tieneOpciones) && (
        <Boton tamano="grande" anchoCompleto cargando={guardando || inventario.guardando} deshabilitado={inventario.incierto || preparando} onClick={alGuardar}>
          {retoquesPendientes(medios) > 0
            ? `${producto ? "Guardar" : "Publicar"} · −${retoquesPendientes(medios) * CREDITOS_POR_RETOQUE} créditos`
            : producto
              ? "Guardar cambios"
              : "Publicar"}
        </Boton>
      )}
      {inventario.error && <p role="alert" className="rounded-radio-m bg-atencion-suave p-4 text-secundario text-texto">{inventario.error}</p>}
      {inventario.incierto && <button type="button" disabled={inventario.guardando} onClick={() => void inventario.revisar()} className="tocable min-h-11 font-bold underline">Revisar producto e historial</button>}
      <ConfirmacionInventario inventario={inventario}/>
      <HojaMotivoVariantes
        abierta={pidiendoMotivo}
        unidades={bajadas}
        guardando={guardando}
        alCerrar={() => setPidiendoMotivo(false)}
        alConfirmar={async (motivo, nota) => {
          const bien = await guardar("reposicion", null, motivo, nota);
          if (bien) setPidiendoMotivo(false);
        }}
      />
    </div>
  );
}

const SIN_COLECCION = "\u0000sin-coleccion";

/** Selector de colección: las colecciones como Opción, "Sin colección" y "Agregar colección" (pide el nombre). */
function HojaColeccion({
  abierta,
  alCerrar,
  colecciones,
  elegida,
  alElegir,
}: {
  abierta: boolean;
  alCerrar: () => void;
  colecciones: string[];
  elegida: string | null;
  /** `esNueva`: el nombre no existía todavía (se crea al guardar el producto). */
  alElegir: (nombre: string | null, esNueva: boolean) => void;
}) {
  const [agregando, setAgregando] = useState(false);
  const [nombre, setNombre] = useState("");
  // La colección nueva que aún no existe en la tienda sigue apareciendo como opción mientras no se guarde.
  const todas = elegida && !colecciones.includes(elegida) ? [...colecciones, elegida] : colecciones;
  const limpio = nombre.trim();
  const agregar = () => {
    if (!limpio) return;
    const existente = colecciones.find((c) => c.localeCompare(limpio, "es", { sensitivity: "accent" }) === 0);
    setAgregando(false);
    setNombre("");
    alElegir(existente ?? limpio, existente === undefined);
  };
  return (
    <Hoja abierta={abierta} alCerrar={alCerrar} titulo="Colección">
      <div className="flex flex-col gap-4">
        <GrupoOpciones
          etiqueta="Colección del producto"
          valor={elegida ?? SIN_COLECCION}
          alCambiar={(id) => alElegir(id === SIN_COLECCION ? null : id, id !== SIN_COLECCION && !colecciones.includes(id))}
          opciones={[{ id: SIN_COLECCION, texto: "Sin colección" }, ...todas.map((c) => ({ id: c, texto: c }))]}
        />
        {agregando ? (
          <div className="flex flex-col gap-3">
            <Campo etiqueta="Nombre de la colección" autoFocus value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Para él" maxLength={60} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); agregar(); } }} />
            <Boton anchoCompleto deshabilitado={!limpio} onClick={agregar}>Agregar colección</Boton>
          </div>
        ) : (
          <ListaAgrupada>
            <li className="px-4">
              <FilaAgregar texto="Agregar colección" alTocar={() => setAgregando(true)} />
            </li>
          </ListaAgrupada>
        )}
      </div>
    </Hoja>
  );
}
