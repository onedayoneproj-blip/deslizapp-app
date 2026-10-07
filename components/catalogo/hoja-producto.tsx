"use client";

import { usePermisos } from "@/lib/data/permisos";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useConsulta, useTiendaActiva } from "@/lib/data/consulta";
import { mensajeDeError } from "@/lib/data/errores";
import { useData } from "@/lib/data/provider";
import type { Detalles } from "@/lib/rubros";
import type { MotivoAjusteInventario, Producto } from "@/lib/types";
import { textoEspera } from "@/lib/avisos";
import { avisoGuardadoConRetoques, AVISO_SIN_MARCA_AL_GUARDAR } from "@/lib/retoque-textos";
import { bienvenidaVista, marcarBienvenidaVista } from "@/lib/bienvenida-retoque";
import { DURACION } from "@/lib/movimiento";
import { mandarMarcadas, urlsGuardadasMarcadas } from "@/lib/retoque-al-subir";
import { BienvenidaRetoque, type DatosBienvenida } from "./bienvenida-retoque";
import { ListaEsperaProducto } from "./hoja-espera";
import { flushSync } from "react-dom";
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
import { reducirFoto } from "@/lib/imagen";
import { nuevoId } from "@/lib/data/db";
import { conEntregadas, MAX_MEDIOS, mediosIniciales, mediosParaGuardar, SeccionMedios, type MedioBorrador } from "./ficha-medios";
import { useTaller } from "./taller";
import { claveVariante, ejeDeFoto, presentacionesDe } from "@/lib/presentaciones";
import { HojaMotivoVariantes, SeccionPresentaciones, type EstadoPresentaciones } from "./ficha-presentaciones";
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
  const eliminado = useRef(false);
  const [retirando, setRetirando] = useState(false);
  const alSalir = useCallback(() => router.push(!eliminado.current && desdeVistaPrevia && productoId ? `/catalogo/${productoId}` : "/catalogo", { scroll: false }), [router, desdeVistaPrevia, productoId]);


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
  if (editando && (!producto || (producto.eliminadoEn && !retirando))) {
    return (
      <Hoja abierta={abierta} alCerrar={cerrar} alSalir={alSalir} protegerAtras titulo={titulo}>
        <div className="py-6 text-center">
          <p className="font-display text-xl">{producto?.eliminadoEn ? "Producto eliminado. Su historial se conserva." : "Este producto no vive aquí."}</p>
          {!producto?.eliminadoEn && <p className="mt-1 text-suave">Quizá es de otra tienda. Los productos no se mezclan.</p>}
          <button type="button" onClick={() => { eliminado.current = Boolean(producto?.eliminadoEn); cerrar(); }} className="mt-5 h-12 w-full rounded-full bg-bosque font-extrabold text-papel">
            {!producto?.eliminadoEn && desdeVistaPrevia ? "Volver al producto" : "Volver al catálogo"}
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
        <FormularioProducto key={`${tiendaId}:${producto?.id ?? "nuevo"}`} producto={producto ?? null} productos={productos} alTerminar={cerrar} alEliminar={() => { eliminado.current = true; cerrar(); }} alIniciarEliminacion={() => setRetirando(true)} alVerHistorial={historial.abrir} />
      </div>
      {productoId && historial.visitado && <div className={historial.abierto ? "" : "hidden"}><HistorialInventario key={`${tiendaId}:${productoId}`} productoId={productoId}/></div>}
    </Hoja>
  );
}

/** Lectura compacta; el inventario mantiene un borrador independiente. */
export function HojaVistaProducto({ productoId }: { productoId: string }) {
  const router = useRouter();
  const historial = useHistorialInventario();
  const [vistaInterna, setVistaInterna] = useState<"historial" | "espera">("historial");
  const verInterna = (boton: HTMLButtonElement, vista: "historial" | "espera") => { flushSync(() => setVistaInterna(vista)); historial.abrir(boton); };
  const { getProducto, getPromos, getProductos } = useData();
  const { tiendaId } = useTiendaActiva();
  const [abierta, setAbierta] = useState(true);
  const destino = useRef("/catalogo");
  const cerrar = useCallback(() => setAbierta(false), []);
  const alSalir = useCallback(() => router.push(destino.current, { scroll: false }), [router]);
  const navegar = (ruta: string) => { destino.current = ruta; setAbierta(false); };
  const { data: producto, error, reintentar } = useConsulta(`producto:${tiendaId}:${productoId}`, () => getProducto(tiendaId, productoId));
  const { data: promos, error: errorPromos, reintentar: reintentarPromos } = useConsulta(`promos:${tiendaId}`, () => getPromos(tiendaId));
  const lista = useConsulta(`productos:${tiendaId}`, () => getProductos(tiendaId), true);
  return <Hoja abierta={abierta} alCerrar={cerrar} alSalir={alSalir} protegerAtras alVolverInterno={historial.volver} titulo={historial.abierto ? (vistaInterna === "espera" ? "Lista de espera" : "Historial de ajustes") : producto?.nombre ?? "Producto"} altura="auto"
    fijoArriba={historial.abierto ? <div data-volver-historial className="flex items-center gap-2 text-sm font-extrabold text-bosque"><BotonVolver onClick={historial.volver} etiqueta="Volver a la vista previa del producto"/><span aria-hidden="true">{producto?.nombre ?? "Producto"}</span></div> : undefined}>
    <div className={historial.abierto ? "hidden" : "contents"}>
    {error || errorPromos ? <CuerpoConError alCerrar={cerrar} alReintentar={() => { reintentar(); reintentarPromos(); }} textoVolver="Volver al catálogo"/> : producto === undefined || promos === undefined ? <CuerpoCargando titulo="producto"/> : !producto || producto.eliminadoEn ? <div className="py-6 text-center"><p className="font-display text-xl">{producto?.eliminadoEn ? "Producto eliminado. Su historial se conserva." : "Este producto no vive aquí."}</p><button type="button" onClick={cerrar} className="tocable mt-4 min-h-11 font-bold">Volver al catálogo</button></div> : <ContenidoVistaProducto key={`${tiendaId}:${productoId}`} producto={producto} precio={precioConPromo(producto, promos)} productos={lista.data} cargandoProductos={lista.cargando || lista.error} alNavegar={navegar} alVerHistorial={boton => verInterna(boton, "historial")} alVerEspera={boton => verInterna(boton, "espera")}/>}
    </div>
    {historial.visitado && <div className={historial.abierto ? "" : "hidden"}>{vistaInterna === "espera" && producto ? <ListaEsperaProducto key={`${tiendaId}:${productoId}`} producto={producto}/> : <HistorialInventario key={`${tiendaId}:${productoId}`} productoId={productoId}/>}</div>}
  </Hoja>;
}

function ContenidoVistaProducto({ producto, precio, productos, cargandoProductos, alNavegar, alVerHistorial, alVerEspera }: { productos: Producto[] | undefined; cargandoProductos: boolean; producto: Producto; precio: ReturnType<typeof precioConPromo>; alNavegar: (ruta: string) => void; alVerEspera: (boton: HTMLButtonElement) => void; alVerHistorial: (boton: HTMLButtonElement) => void }) {
  const toast = useToast();
  const { actualizarProducto } = useData();
  const { puede, porque } = usePermisos();
  const sinCatalogo = !puede("catalogo");
  const { tiendaId, tienda } = useTiendaActiva();
  const { abrirInventario, espera } = usePanelUI();
  const { mostrarToast: mostrarToastUI } = useToastUI();
  const [guardandoVisible, setGuardandoVisible] = useState(false);
  const enviandoVisible = useRef(false);
  // La confirmación local cubre solo la breve espera de la relectura del proveedor.
  const [confirmado, setConfirmado] = useState<{ base: Producto; activo: boolean } | null>(null);
  const visible = confirmado?.base === producto ? confirmado.activo : producto.activo;
  const bloqueaVisible = !visible && tienda != null && productos != null && resumenDelPlan(productos, tienda.limiteProductos).estado === "lleno";
  const avisarLleno = () => mostrarToastUI("Tu catálogo está lleno", { accion: { texto: "Hacer espacio", alTocar: () => abrirInventario("espacio") } });
  const cambiarVisible = async (activo: boolean) => {
    if (enviandoVisible.current || cargandoProductos || !tienda) return;
    if (activo && bloqueaVisible) { avisarLleno(); return; }
    enviandoVisible.current = true; setGuardandoVisible(true);
    try {
      const p = await actualizarProducto(tiendaId, producto.id, { activo });
      setConfirmado({ base: producto, activo: p.activo });
    } catch (e) { toast(mensajeDeError(e, "No se pudo cambiar la visibilidad. Inténtalo otra vez.")); }
    finally { enviandoVisible.current = false; setGuardandoVisible(false); }
  };
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
        {producto.stock === 0 && <Etiqueta tono="fuerte" className="mt-1 self-start">Agotado</Etiqueta>}
      </div>
    </div>
    <ListaAgrupada>
      <FilaLista titulo="Visible en el catálogo" detalle={visible ? "Visible" : "Oculto del catálogo"}
        accion={<Interruptor encendido={visible} etiqueta="Visible en el catálogo" alCambiar={v => void cambiarVisible(v)} deshabilitado={sinCatalogo || guardandoVisible || inventario.guardando || cargandoProductos || !tienda || bloqueaVisible} alTocarBloqueado={sinCatalogo ? () => toast(porque) : bloqueaVisible && !guardandoVisible ? avisarLleno : undefined}/>}/>
      {!espera.error && !espera.cargando && (espera.resumen?.personasPorProducto.get(producto.id) ?? 0) > 0 && <FilaLista titulo={textoEspera(espera.resumen!.personasPorProducto.get(producto.id)!)} onClick={e => alVerEspera(e.currentTarget)}/>}
    </ListaAgrupada>
    {espera.error ? <ListaAgrupada><FilaLista titulo="No pudimos leer la lista de espera" onClick={() => espera.reintentar()} fin={<span>Reintentar</span>}/></ListaAgrupada> : espera.cargando && <p role="status" className="text-secundario text-texto-secundario">Actualizando personas en espera…</p>}
    {activas.length > 0 ? (
      // Con opciones, el stock es por combinación: se cambia en la ficha.
      <ListaAgrupada etiqueta="Stock e historial">
        <FilaLista titulo="Stock" detalle={`${activas.length} ${activas.length === 1 ? "presentación" : "presentaciones"}`} fin={<span className="text-secundario font-normal text-texto-secundario">{producto.stock ?? 0} en total</span>} onClick={sinCatalogo ? () => toast(porque) : () => navegar(`/catalogo/${producto.id}/editar`)} />
        <FilaLista titulo="Historial" onClick={(e) => alVerHistorial(e.currentTarget)} />
      </ListaAgrupada>
    ) : (
      <InventarioVistaPrevia inventario={inventario} nombre={producto.nombre} alVerHistorial={alVerHistorial} soloLectura={sinCatalogo}
        alGuardar={() => inventario.pedirGuardar(async (motivo, nota) => { const bien = await inventario.guardar({}, false, motivo, nota); if (bien) toast("Ajuste guardado. No cuenta como venta."); return bien; })}/>
    )}
    {inventario.error && <p role="alert" className="rounded-radio-m bg-atencion-suave p-4 text-secundario text-texto">{inventario.error}</p>}
    {inventario.incierto && <button type="button" disabled={inventario.guardando} onClick={() => void inventario.revisar()} className="tocable min-h-11 text-secundario font-extrabold text-accion underline">Revisar producto e historial</button>}
    {/* Con cambios de stock sin guardar, "Guardar cambios" es el único botón principal a la vista */}
    {!inventario.pendiente && <div className="grid grid-cols-2 gap-3">
      <Boton jerarquia="secundario" tamano="grande" deshabilitado={inventario.guardando || sinCatalogo} onClick={() => navegar(`/catalogo/${producto.id}/editar`)}>Editar</Boton>
      <Boton tamano="grande" deshabilitado={inventario.guardando} onClick={() => navegar(`/pedidos/nuevo?producto=${encodeURIComponent(producto.id)}`)}>Crear pedido</Boton>
    </div>}
    {sinCatalogo && <p className="text-center text-secundario text-texto-secundario" data-sin-permiso="">{porque}</p>}
    <ConfirmacionInventario inventario={inventario}/>
  </div>;
}

function FormularioProducto({
  producto,
  productos,
  alTerminar,
  alEliminar,
  alIniciarEliminacion,
  alVerHistorial,
}: {
  producto: Producto | null;
  productos: Producto[];
  alTerminar: () => void;
  alEliminar: () => void;
  alIniciarEliminacion: () => void;
  alVerHistorial: (boton: HTMLButtonElement) => void;
}) {
  const { crearProducto, guardarVariantes, guardarFotoValor, ajustarStock, trabajosRetoque, getProducto, getPedidos } = useData();
  // Crear y editar productos es del grupo «catalogo» (Editor en adelante). La base lo exige igual.
  const { puede, porque } = usePermisos();
  const sinCatalogo = !puede("catalogo");
  const inventario = useInventarioPendiente(producto, alTerminar);
  const { tiendaId, tienda } = useTiendaActiva();
  const { abrirInventario } = usePanelUI();
  const toast = useToast();
  const { mostrarToast: mostrarToastUI } = useToastUI();
  const rubro = tienda?.rubro ?? "general";
  const taller = useTaller(producto, toast);

  const [medios, setMedios] = useState<MedioBorrador[]>(() => mediosIniciales(producto));
  const [nombre, setNombre] = useState(producto?.nombre ?? "");
  const [precio, setPrecio] = useState(producto ? String(producto.precio) : "");
  const [stock, setStock] = useState<number | null>(producto ? producto.stock : 1);
  // Las presentaciones (tallas, colores, tamaños): se editan aquí y se guardan con el producto.
  const base = useMemo(() => new Map((producto?.variantes ?? []).map((v) => [claveVariante(v.valores), v])), [producto]);
  const [presentaciones, setPresentaciones] = useState<EstadoPresentaciones>(() => {
    const opciones = producto?.opciones ?? [];
    const pres = presentacionesDe(producto);
    // La foto de cada valor del eje que la lleva, como id de la foto en el borrador (así sobrevive a que la foto se suba al guardar).
    const eje = ejeDeFoto(opciones);
    const guardadas = eje ? (producto?.fotosPorValor?.[eje.nombre] ?? {}) : {};
    const fotosColor: Record<string, string> = {};
    for (const [valor, url] of Object.entries(guardadas)) {
      const m = medios.find((x) => x.tipo === "foto" && x.url === url);
      if (m) fotosColor[valor] = m.id;
    }
    return { opciones, pres: pres.length > 0 ? pres : [], fotosColor };
  });
  const { opciones, pres: borradorPres, fotosColor } = presentaciones;
  const [detalles, setDetalles] = useState<Detalles>(producto?.detalles ?? {});
  const [categoria, setCategoria] = useState<string | null>(producto?.categoria ?? null);
  const [nuevaColeccion, setNuevaColeccion] = useState<string | null>(null);
  const [eligiendoColeccion, setEligiendoColeccion] = useState(false);
  const [visibilidad, setVisibilidad] = useState({ base: producto?.activo ?? true, valor: producto?.activo ?? true });
  const cambioVisible = visibilidad.valor !== visibilidad.base;
  const activo = cambioVisible ? visibilidad.valor : (producto?.activo ?? visibilidad.valor);
  const [porEncargo, setPorEncargo] = useState(producto?.porEncargo ?? false);
  const [encargoTexto, setEncargoTexto] = useState(producto?.encargoTexto ?? "");
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [pidiendoMotivo, setPidiendoMotivo] = useState(false);
  // La bienvenida del retoque, antes de guardar un producto con fotos marcadas por primera vez en esta tienda.
  const [bienvenida, setBienvenida] = useState<{ datos: DatosBienvenida; resolver: (ok: boolean) => void } | null>(null);

  const tieneOpciones = opciones.length > 0 && borradorPres.length > 0;
  // Lo que baja en variantes que ya existían pide motivo (como el stock del producto); lo que sube es reposición.
  const bajadas = borradorPres.reduce((s, p) => {
    const b = base.get(claveVariante(p.valores));
    const quiere = p.stock ?? 0;
    return b && b.stock !== null && quiere < b.stock ? s + (b.stock - quiere) : s;
  }, 0);

  // Con cambios respecto a como se abrió y sin guardar, cerrar la hoja pregunta.
  const firma = JSON.stringify({
    medios: medios.map((m) => [m.tipo, m.tipo === "foto" ? m.url.slice(-40) : m.url?.slice(-40), m.tipo === "foto" ? !!m.retocar : null]),
    nombre, precio, stock: producto ? null : stock, presentaciones, detalles, categoria, nuevaColeccion, activo: visibilidad.valor, porEncargo, encargoTexto,
  });
  const [firmaInicial] = useState(firma);
  useAvisarAlSalir(firma !== firmaInicial || cambioVisible || inventario.pendiente || inventario.incierto);

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
    setVisibilidad({ base: producto?.activo ?? true, valor });
  };
  const avisarLleno = () =>
    mostrarToastUI("Tu catálogo está lleno", { accion: { texto: "Hacer espacio", alTocar: () => abrirInventario("espacio") } });

  const cambiarPresentaciones = (nuevo: EstadoPresentaciones) => {
    // Al pasar a presentaciones, el stock vive en cada una: un ajuste suelto del producto se descarta.
    if (nuevo.pres.length > 0 && !tieneOpciones && inventario.pendiente) inventario.recuperar();
    setPresentaciones(nuevo);
  };

  /** Una foto nueva elegida desde «Foto de cada color»: entra a las del producto y devuelve su id. */
  const agregarFotoDeColor = async (archivo: File): Promise<string | null> => {
    if (medios.length >= MAX_MEDIOS) {
      toast(`Ya tiene ${MAX_MEDIOS}. Quita uno para agregar otro.`);
      return null;
    }
    try {
      const url = await reducirFoto(archivo);
      const id = nuevoId();
      setMedios((l) => (l.length >= MAX_MEDIOS ? l : [...l, { id, tipo: "foto", url, retocada: false }]));
      return id;
    } catch {
      toast("Esa foto no quiso cargar. Prueba con otra.");
      return null;
    }
  };
  /** ¿Esta presentación ya salió en algún pedido? Entonces quitarla solo la oculta. */
  const tienePedidosVariante = async (varianteId: string) => (await getPedidos(tiendaId)).some((p) => p.items.some((i) => i.varianteId === varianteId));

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
    if (mediosParaGuardar(medios).every((m) => m.tipo !== "foto")) {
      toast("Falta la foto. El producto es la estrella.");
      return false;
    }
    // Fotos nuevas marcadas «Retocar esta foto»: la primera vez, la bienvenida va ANTES de guardar y de reservar créditos.
    const marcadasAhora = medios.filter((m) => m.tipo === "foto" && m.retocar && !taller.guardada(m.url));
    if (marcadasAhora.length > 0 && taller.marcaLista === true && !bienvenidaVista(tiendaId)) {
      const foto = marcadasAhora[0]!.tipo === "foto" ? (marcadasAhora[0] as { url: string }).url : null;
      const sigue = await new Promise<boolean>((resolver) =>
        setBienvenida({ datos: { n: Date.now(), foto, referencias: (taller.marca?.referencias ?? []).slice(0, 3).map((r) => r.url) }, resolver }),
      );
      // Cancelar vuelve al formulario: no se guarda nada y las fotos siguen marcadas por si quiere apagarlas.
      if (!sigue) return false;
      // La bienvenida es una hoja apilada: se espera a que termine de salir (y de devolver su entrada del historial) antes de
      // guardar, porque al guardar se cierra esta hoja y las dos salidas a la vez dejarían la dirección en la pantalla de antes.
      await new Promise((r) => setTimeout(r, DURACION.entrada + 150));
    }
    setGuardando(true);
    // Si el taller entregó una foto mientras la ficha estaba abierta, se guarda la retocada (nunca se vuelve a la original).
    let entregadas = taller.entregadas;
    if (producto) {
      try {
        entregadas = (await trabajosRetoque(tiendaId)).filter((t) => t.productoId === producto.id && t.estado === "entregado" && t.medioUrlRetocado);
      } catch {
        // Sin conexión para mirar el taller: se usa lo último leído.
      }
    }
    const final = mediosParaGuardar(conEntregadas(medios, entregadas));
    const fotos = final.flatMap((m) => (m.tipo === "foto" ? [m.url] : []));
    const fotoRetocada = final.find((m) => m.tipo === "foto")?.tipo === "foto" ? (final.find((m) => m.tipo === "foto") as { retocada: boolean }).retocada : false;
    const catalogo = { medios: final, detalles, porEncargo, encargoTexto: porEncargo ? encargoTexto.trim() || null : (producto?.encargoTexto ?? null) };
    const variantes = borradorPres.map((p) => {
      const b = base.get(claveVariante(p.valores));
      // Las que ya existían conservan su stock aquí: su cambio va después como ajuste con motivo.
      // Una oculta no admite ajuste aparte (la base solo ajusta activas): su stock va directo en el guardado.
      return { valores: p.valores, stock: b && p.activa ? b.stock : (p.stock ?? 0), precio: p.precio, activa: p.activa };
    });
    // Fotos nuevas marcadas «Retocar esta foto» (en el orden de las fotos que se guardan).
    const marcadasPorFoto = conEntregadas(medios, entregadas).flatMap((m) => (m.tipo === "foto" ? [!!m.retocar && !taller.guardada(m.url)] : []));
    const totalMarcadas = marcadasPorFoto.filter(Boolean).length;
    /** Ya guardado el producto, manda al taller cada foto marcada con su URL guardada. Nunca deshace el guardado. */
    const mandarAlTaller = async (guardado: Producto | null, base: string) => {
      if (totalMarcadas === 0) return base;
      // Sin Mi marca lista no se manda nada al taller: el producto ya quedó guardado.
      if (taller.marcaLista !== true) return AVISO_SIN_MARCA_AL_GUARDAR;
      const urls = urlsGuardadasMarcadas(marcadasPorFoto, (guardado?.medios ?? []).flatMap((m) => (m.tipo === "foto" ? [m.url] : [])));
      const r = await mandarMarcadas(urls, totalMarcadas, (url) => taller.pedirDe(guardado!.id, url, { silencioso: true }));
      return avisoGuardadoConRetoques(base, r.marcadas, r.enviadas);
    };
    /** La foto de cada color se guarda al final, con las fotos ya guardadas: el borrador la lleva por id y aquí se busca su url. */
    const guardarFotosDeColor = async (guardado: Producto, finalMedios: typeof final = final) => {
      const eje = ejeDeFoto(tieneOpciones ? opciones : []);
      if (!eje) return;
      const vivo = (await getProducto(tiendaId, guardado.id).catch(() => null)) ?? guardado;
      // Los medios guardados van en el mismo orden que los del borrador.
      const idsEnOrden = conEntregadas(medios, entregadas).filter((m) => m.tipo === "foto" || m.url).map((m) => m.id);
      const urlDeId = (id: string) => {
        const i = idsEnOrden.indexOf(id);
        const m = i >= 0 ? vivo.medios[i] : undefined;
        return m && m.tipo === "foto" ? m.url : null;
      };
      void finalMedios;
      const guardadas = vivo.fotosPorValor?.[eje.nombre] ?? {};
      for (const valor of eje.valores) {
        const quiere = fotosColor[valor] ? urlDeId(fotosColor[valor]) : null;
        const hay = guardadas[valor] ?? null;
        if (quiere === hay) continue;
        await guardarFotoValor(tiendaId, guardado.id, eje.nombre, valor, quiere);
      }
    };
    try {
      if (!producto) {
        // Una sola llamada: la ficha y las variantes (si algo falla, no queda nada a medias).
        const creado = await crearProducto(
          tiendaId,
          {
            nombre: nombre.trim(), precio: precioNumero, fotos, fotoRetocada, stock: tieneOpciones ? 0 : stock, categoria: coleccion,
            activo: activo && !bloqueaVisible, destacado: false, likes: 0, ...catalogo,
          },
          { retoques: 0, ...(tieneOpciones ? { opciones, variantes } : {}) },
        );
        await guardarFotosDeColor(creado);
        const mensaje = activo && !bloqueaVisible ? "Publicado. Ya se está deslizando." : "Guardado como oculto. Nadie lo ve hasta que lo prendas.";
        toast(await mandarAlTaller(creado, mensaje));
        alTerminar();
        return true;
      }
      const bien = await inventario.guardar(
        { nombre: nombre.trim(), precio: precioNumero, fotos, fotoRetocada, categoria: coleccion, ...(cambioVisible ? { activo: activo && !bloqueaVisible } : {}), ...catalogo },
        false, motivo, nota,
      );
      if (!bien) { setGuardando(false); return false; }
      const efectivas = tieneOpciones ? borradorPres : [];
      const antes = [...base.keys()].sort().join(",");
      const ahora = efectivas.map((p) => claveVariante(p.valores)).sort().join(",");
      const otroPrecioOEstado = efectivas.some((p) => {
        const b = base.get(claveVariante(p.valores));
        return b && (b.precio !== p.precio || b.activa !== p.activa);
      });
      if (JSON.stringify(tieneOpciones ? opciones : []) !== JSON.stringify(producto.opciones) || (tieneOpciones ? antes !== ahora : producto.opciones.length > 0) || otroPrecioOEstado) {
        await guardarVariantes(tiendaId, producto.id, tieneOpciones ? opciones : [], tieneOpciones ? variantes : []);
      }
      for (const p of efectivas) {
        const b = base.get(claveVariante(p.valores));
        const quiere = p.stock ?? 0;
        if (!b || !p.activa || b.stock === null || quiere === b.stock) continue;
        const delta = quiere - b.stock;
        await ajustarStock(tiendaId, producto.id, delta, delta > 0 ? "reposicion" : motivoVariantes, delta > 0 ? null : notaVariantes, b.id);
      }
      const guardado = totalMarcadas > 0 ? await getProducto(tiendaId, producto.id).catch(() => null) : null;
      await guardarFotosDeColor(producto, final);
      toast(await mandarAlTaller(guardado, "Guardado. El catálogo ya se enteró."));
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
      <SeccionMedios medios={medios} alCambiar={setMedios} taller={taller} avisar={toast} />
      <BienvenidaRetoque
        datos={bienvenida?.datos ?? null}
        alCancelar={() => {
          bienvenida?.resolver(false);
          setBienvenida(null);
        }}
        alConfirmar={() => {
          marcarBienvenidaVista(tiendaId);
          bienvenida?.resolver(true);
          setBienvenida(null);
        }}
      />

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
        <SeccionPresentaciones
          rubro={rubro}
          precioProducto={Number(precio) || 0}
          estado={presentaciones}
          alCambiar={cambiarPresentaciones}
          fotos={medios.flatMap((m) => (m.tipo === "foto" ? [{ id: m.id, url: m.url }] : []))}
          agregarFoto={agregarFotoDeColor}
          sinPermiso={sinCatalogo}
          porque={porque}
          avisar={toast}
          deshabilitado={guardando}
          tienePedidos={tienePedidosVariante}
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
          detalle={activo && !bloqueaVisible ? "Visible" : "Oculto del catálogo"}
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

      {sinCatalogo && <p className="rounded-radio-m bg-atencion-suave p-3 text-center text-secundario font-bold text-atencion-texto" data-sin-permiso="">{porque}</p>}
      {(!producto || !inventario.pendiente || tieneOpciones) && (
        <Boton tamano="grande" anchoCompleto cargando={guardando || inventario.guardando} deshabilitado={inventario.incierto || preparando || sinCatalogo} onClick={alGuardar}>
          {producto ? "Guardar cambios" : "Publicar"}
        </Boton>
      )}
      {inventario.error && <p role="alert" className="rounded-radio-m bg-atencion-suave p-4 text-secundario text-texto">{inventario.error}</p>}
      {inventario.incierto && <button type="button" disabled={inventario.guardando} onClick={() => void inventario.revisar()} className="tocable min-h-11 font-bold underline">Revisar producto e historial</button>}
      {producto && <Boton jerarquia="terciario" tono="peligro" anchoCompleto deshabilitado={sinCatalogo || guardando || inventario.guardando || preparando} onClick={() => setEliminando(true)}>Eliminar producto</Boton>}
      {producto && <ConfirmacionEliminarProducto producto={producto} abierta={eliminando} pendiente={firma !== firmaInicial || cambioVisible || inventario.pendiente || inventario.incierto} alCerrar={() => setEliminando(false)} alEliminar={alEliminar} alIniciar={alIniciarEliminacion} alOcultar={() => { setVisibilidad({ base: false, valor: false }); setEliminando(false); }}/>}
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

/** Misma Hoja apilada y botones de peligro del panel; el borrador permanece montado. */
function ConfirmacionEliminarProducto({ producto, abierta, pendiente, alCerrar, alEliminar, alIniciar, alOcultar }: { producto: Producto; abierta: boolean; pendiente: boolean; alCerrar: () => void; alEliminar: () => void; alIniciar: () => void; alOcultar: () => void }) {
  const { tiendaId } = useTiendaActiva();
  const { revisarEliminacionProducto, eliminarProducto, actualizarProducto, refrescar } = useData();
  const revision = useConsulta(`eliminar-producto:${tiendaId}:${producto.id}:${abierta}`, () => abierta ? revisarEliminacionProducto(tiendaId, producto.id) : Promise.resolve(null), true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [incierto, setIncierto] = useState(false);
  const enviando = useRef(false);
  const toast = useToast();
  const completado = useRef(false);
  const vigente = useRef(true);
  useEffect(() => { vigente.current = true; return () => { vigente.current = false; }; }, []);
  const r = revision.data;
  const bloqueado = Boolean(r && (r.pedidosPendientes || r.solicitudesPendientes || r.avisosPendientes));
  const cerrar = () => { if (!enviando.current) alCerrar(); };
  const guardar = async (ocultar: boolean) => {
    if (enviando.current || producto.tiendaId !== tiendaId || (!ocultar && (!r || revision.cargando || revision.error || bloqueado || incierto))) return;
    enviando.current = true; setGuardando(true); setError(null);
    try {
      if (ocultar) {
        await actualizarProducto(tiendaId, producto.id, { activo: false });
        if (!vigente.current) return;
        toast("Oculto del catálogo. Su historial y pendientes se conservan."); alOcultar();
      } else {
        alIniciar();
        await eliminarProducto(tiendaId, producto.id);
        if (!vigente.current) return;
        completado.current = true;
        toast("Producto eliminado. Su historial se conserva."); alCerrar();
      }
    } catch {
      if (!vigente.current) return;
      setError("No confirmamos el cambio. Revisa el estado y los pendientes antes de repetirlo.");
      setIncierto(true);
    } finally { enviando.current = false; if (vigente.current) setGuardando(false); }
  };
  return <Hoja abierta={abierta} alCerrar={cerrar} alSalir={() => { if (completado.current) alEliminar(); }} titulo="¿Eliminar producto?" altura="auto">
    <div className="flex flex-col gap-4">
      <p className="text-destacado break-words">{producto.nombre}</p>
      <p className="text-cuerpo text-texto-secundario">Saldrá del catálogo y de los selectores de nuevos pedidos. Conservamos pedidos, ventas, pagos, comprobantes, ajustes y sus fotos y videos para el historial.</p>
      {pendiente && <p className="text-secundario text-texto-secundario">Si lo eliminas, los cambios de esta ficha sin guardar se descartarán.</p>}
      {revision.error ? <><p role="alert" className="text-cuerpo text-texto-secundario">No pudimos comprobar si se puede eliminar. Esta tienda necesita tener habilitada la eliminación; mientras tanto puedes ocultarlo.</p><Boton jerarquia="secundario" onClick={revision.reintentar}>Reintentar</Boton></> : revision.cargando || !r ? <p role="status">Revisando pendientes…</p> : bloqueado ? <div role="status" className="text-cuerpo text-texto-secundario"><p>Antes de eliminar, resuelve estos pendientes. Puedes ocultarlo y seguir administrándolo.</p><ul className="mt-2 list-disc pl-5">{r.pedidosPendientes > 0 && <li>{r.pedidosPendientes} {r.pedidosPendientes === 1 ? "pedido en curso" : "pedidos en curso"}.</li>}{r.solicitudesPendientes > 0 && <li>{r.solicitudesPendientes} solicitudes por registrar.</li>}{r.avisosPendientes > 0 && <li>{r.avisosPendientes} solicitudes de reposición sin avisar.</li>}</ul></div> : r.conHistorial && <p className="text-secundario text-texto-secundario">Este producto tiene historial. Se conserva completo; no se borra para siempre.</p>}
      {error && <p role="alert" className="text-peligro text-secundario">{error}</p>}
      {incierto && <Boton jerarquia="secundario" deshabilitado={guardando} onClick={() => { refrescar(); revision.reintentar(); setIncierto(false); setError(null); }}>Revisar estado y pendientes</Boton>}
      {bloqueado || revision.error ? <Boton jerarquia="secundario" cargando={guardando} deshabilitado={incierto} onClick={() => void guardar(true)}>Ocultar producto</Boton> : <Boton jerarquia="peligro" cargando={guardando} deshabilitado={!r || revision.cargando || incierto} onClick={() => void guardar(false)}>{r?.conHistorial ? "Eliminar y conservar historial" : "Sí, eliminar producto"}</Boton>}
      <Boton jerarquia="secundario" deshabilitado={guardando} onClick={cerrar}>Cancelar</Boton>
    </div>
  </Hoja>;
}
