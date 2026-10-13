"use client";

import { useMemo, useState, type ReactNode } from "react";
import { createPortal, flushSync } from "react-dom";
import { CATALOGO_GENERAL, contarPorCatalogo } from "@/lib/catalogo-activo";
import { esEjeColor, colorPorNombre } from "@/lib/colores";
import { usePermisos } from "@/lib/data/permisos";
import { useTiendaActiva } from "@/lib/data/consulta";
import { mensajeDeError } from "@/lib/data/errores";
import { MOTIVOS_INVENTARIO } from "@/lib/data/inventario";
import { useData } from "@/lib/data/provider";
import { fichaVisible, tieneDetallesPorRubro, type BorradorFicha } from "@/lib/ficha-tecnica";
import { formatearPesos } from "@/lib/formato";
import { textosDelPaso } from "@/lib/historia-producto";
import {
  ayudaConAntes,
  preguntaBajada,
  puedePublicar,
  resumenDescripcion,
  resumenEncargo,
  resumenPresentaciones,
  resumenStock,
  type Bajada,
} from "@/lib/hoja-producto";
import { resumenDelPlan } from "@/lib/plan-catalogo";
import {
  claveVariante,
  ejeDeFoto,
  precioDe,
  preciosVarian,
  presentacionesDe,
  quitar as quitarPresentacion,
  resumenDe,
  TEXTO_CON_PEDIDOS,
  textoCombinacion,
  type EstadoPresentaciones,
  type Presentacion,
} from "@/lib/presentaciones";
import { rubrosDeTienda, tipoDeProducto, type Detalles, type Rubro } from "@/lib/rubros";
import type { MotivoAjusteInventario, Producto } from "@/lib/types";
import { textoEspera } from "@/lib/avisos";
import { Foto } from "../foto";
import { Hoja, HojaFijoAbajo, PieFlotante, useAvisarAlSalir } from "../hoja";
import { IconoCamara } from "../iconos";
import { usePanelUI } from "../panel/ui";
import { useToast } from "../toast";
import { Boton, Cantidad, CampoMultilinea, Etiqueta, FilaLista, GrupoEleccion, Interruptor, ListaAgrupada, useToastUI } from "../ui";
import { clases, FOCO } from "../ui/comunes";
import { SeccionDetalles, sugerenciasDeDetalles } from "./ficha-detalles";
import { agregarFotoAlBorrador, conEntregadas, mediosIniciales, mediosParaGuardar, type MedioBorrador } from "./ficha-medios";
import { HojaMotivoVariantes } from "./ficha-presentaciones";
import { SeccionDescripcion, SeccionFichaTecnica } from "./ficha-tecnica";
import { FlujoPresentaciones } from "./flujo-presentaciones";
import { useGuardarProducto, variantesParaGuardar } from "./guardar-producto";
import { HojaColeccion, ConfirmacionEliminarProducto } from "./hoja-producto";
import { HojaLoQueVendes } from "./hoja-lo-que-vendes";
import { HojaPresentacion } from "./hoja-presentacion";
import { CuandoLlega } from "./inventario-historia";
import { ConfirmacionInventario, useInventarioPendiente } from "./inventario-producto";
import { EncabezadoPaso, PasoFoto, PasoNombre, PasoPrecio, TarjetaAsiSeVera } from "./pasos-producto";
import { SelectorCatalogo } from "./selector-catalogo";
import { useTaller } from "./taller";

/** Las pantallas de la historia que se abren encima del resumen (Colección y Presentaciones tienen su hoja propia). */
type Paso = "fotos" | "nombre" | "precio" | "stock" | "encargo" | "descripcion" | "ficha" | "detalles";
const TITULOS: Record<Paso, string> = {
  fotos: "Fotos", nombre: "Nombre", precio: "Precio", stock: "Stock", encargo: "Por encargo", descripcion: "Descripción", ficha: "Ficha técnica", detalles: "Detalles",
};
type Motivo = { motivo: MotivoAjusteInventario; nota: string | null };
const SIN_PRESENTACIONES: EstadoPresentaciones = { opciones: [], pres: [], fotosColor: {} };

/**
 * Editar producto como resumen (opción A, docs/prompts/editar-producto-2-resumen.md, referencia `referencias/editar-producto/`):
 * arriba la tarjeta «así se ve en tu catálogo» y debajo filas con el valor actual. Tocar una abre encima la pantalla de ese paso de
 * la historia con «Listo», que cambia solo el borrador; nada se guarda hasta «Guardar cambios». El guardado es el de siempre
 * (`useInventarioPendiente`, `useGuardarProducto`, `guardar_variantes`, ajustes con motivo).
 */
export function EditarProducto({
  producto,
  productos,
  ranuraCatalogo,
  internaAbierta,
  alTerminar,
  alEliminar,
  alIniciarEliminacion,
  alVerHistorial,
  alVerEspera,
  abrirStock = false,
}: {
  /** Entró desde el Stock de «Ver producto» con más de 3 presentaciones: abre el Inventario encima. */
  abrirStock?: boolean;
  producto: Producto;
  productos: Producto[];
  /** Donde va el selector de catálogo, a la derecha del título (lo pinta esta hoja por portal). */
  ranuraCatalogo: HTMLElement | null;
  /** El historial o la lista de espera están a la vista (pantalla interna): el pie y el selector no se muestran. */
  internaAbierta: boolean;
  alTerminar: () => void;
  alEliminar: () => void;
  alIniciarEliminacion: () => void;
  alVerHistorial: (boton: HTMLButtonElement) => void;
  alVerEspera: (boton: HTMLButtonElement) => void;
}) {
  const { guardarVariantes, ajustarStock, getProducto, getPedidos } = useData();
  // Editar productos es del grupo «catalogo» (Editor en adelante). La base lo exige igual.
  const { puede, porque } = usePermisos();
  const sinCatalogo = !puede("catalogo");
  const inventario = useInventarioPendiente(producto, alTerminar);
  const { tiendaId, tienda } = useTiendaActiva();
  const { abrirInventario, espera } = usePanelUI();
  const toast = useToast();
  const { mostrarToast: mostrarToastUI } = useToastUI();
  const rubro = tienda?.rubro ?? "general";
  const taller = useTaller(producto, toast);
  const guardadoComun = useGuardarProducto(producto, taller);
  const servicio = producto.tipo === "servicio";

  // Tipo de producto (catálogo): solo con más de un rubro.
  const tipos = tienda ? rubrosDeTienda(tienda) : [rubro];
  const variosTipos = tipos.length > 1;
  const [tipoElegido, setTipo] = useState<Rubro | null>(null);
  const tipoBase: Rubro = tienda ? tipoDeProducto(producto, tienda) : rubro;
  const tipo: Rubro = tipoElegido && tipos.includes(tipoElegido) ? tipoElegido : tipos.includes(tipoBase) ? tipoBase : rubro;
  const [vendiendoOtra, setVendiendoOtra] = useState(false);

  // ---- El borrador ----
  const [medios, setMedios] = useState<MedioBorrador[]>(() => mediosIniciales(producto));
  const [nombre, setNombre] = useState(producto.nombre);
  const [precio, setPrecio] = useState(String(producto.precio));
  const base = useMemo(() => new Map((producto.variantes ?? []).map((v) => [claveVariante(v.valores), v])), [producto]);
  const [presentaciones, setPresentaciones] = useState<EstadoPresentaciones>(() => {
    const opciones = producto.opciones ?? [];
    // La foto de cada valor del eje que la lleva, como id de la foto en el borrador (así sobrevive a que la foto se suba al guardar).
    const eje = ejeDeFoto(opciones);
    const guardadas = eje ? (producto.fotosPorValor?.[eje.nombre] ?? {}) : {};
    const iniciales = mediosIniciales(producto);
    const fotosColor: Record<string, string> = {};
    for (const [valor, url] of Object.entries(guardadas)) {
      const m = iniciales.find((x) => x.tipo === "foto" && x.url === url);
      if (m) fotosColor[valor] = m.id;
    }
    return { opciones, pres: presentacionesDe(producto), fotosColor };
  });
  const { opciones, pres: borradorPres } = presentaciones;
  const [detalles, setDetalles] = useState<Detalles>(producto.detalles ?? {});
  // Los Detalles por rubro solo se piden en un producto que ya los tiene (Esencias Michel).
  const [conDetalles] = useState(() => tieneDetallesPorRubro(producto.detalles));
  const [ficha, setFicha] = useState<BorradorFicha>({ tipo: "igual" });
  const descripcion = typeof detalles.descripcion === "string" ? detalles.descripcion : "";
  const ponerDescripcion = (texto: string) =>
    setDetalles((d) => {
      const { descripcion: _viejo, ...resto } = d;
      void _viejo;
      return texto.trim() ? { ...resto, descripcion: texto } : resto;
    });
  const [categoria, setCategoria] = useState<string | null>(producto.categoria ?? null);
  const [nuevaColeccion, setNuevaColeccion] = useState<string | null>(null);
  const [visibilidad, setVisibilidad] = useState({ base: producto.activo, valor: producto.activo });
  const cambioVisible = visibilidad.valor !== visibilidad.base;
  const activo = cambioVisible ? visibilidad.valor : producto.activo;
  const [porEncargo, setPorEncargo] = useState(producto.porEncargo ?? false);
  const [encargoTexto, setEncargoTexto] = useState(producto.encargoTexto ?? "");
  /** El motivo de lo que bajó en las presentaciones, puesto en el Inventario. */
  const [motivoVariantes, setMotivoVariantes] = useState<Motivo | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [pidiendoMotivo, setPidiendoMotivo] = useState(false);

  // ---- Las hojas de encima ----
  const [paso, setPaso] = useState<Paso | null>(abrirStock && producto.tipo !== "servicio" ? "stock" : null);
  // La última que se abrió sigue pintada mientras sale; `vuelta` la vuelve a empezar desde el borrador en cada apertura.
  const [visto, setVisto] = useState<{ paso: Paso; vuelta: number }>({ paso: abrirStock ? "stock" : "nombre", vuelta: 0 });
  const [presAbierta, setPresAbierta] = useState(false);
  const [coleccionAbierta, setColeccionAbierta] = useState(false);

  const tieneOpciones = opciones.length > 0 && borradorPres.length > 0;
  const precioNumero = Number(precio) || 0;
  const resumenPres = resumenDe(borradorPres, precioNumero);
  const varia = tieneOpciones && preciosVarian(borradorPres, precioNumero);
  // Lo que baja en presentaciones que ya existían pide motivo; lo que sube es reposición.
  const bajadas: (Bajada & { clave: string })[] = borradorPres.flatMap((p) => {
    const b = base.get(claveVariante(p.valores));
    const quiere = p.stock ?? 0;
    return b && p.activa && b.stock !== null && quiere < b.stock ? [{ clave: claveVariante(p.valores), donde: textoCombinacion(opciones, p.valores), unidades: b.stock - quiere }] : [];
  });
  const unidadesBajadas = bajadas.reduce((t, b) => t + b.unidades, 0);

  // Con cambios respecto a como se abrió y sin guardar, cerrar la hoja pregunta (el aviso de #115).
  const firma = JSON.stringify({
    medios: medios.map((m) => [m.tipo, m.tipo === "foto" ? m.url.slice(-40) : m.url?.slice(-40), m.tipo === "foto" ? !!m.retocar : null]),
    nombre, precio, presentaciones, detalles, ficha: ficha.tipo === "nueva" ? ficha.foto.slice(-40) : ficha.tipo, categoria, tipoElegido, nuevaColeccion, porEncargo, encargoTexto,
  });
  const [firmaInicial] = useState(firma);
  const hayCambios = firma !== firmaInicial || cambioVisible || inventario.pendiente;
  useAvisarAlSalir(hayCambios || inventario.incierto, { titulo: "¿Descartar los cambios?", texto: "Lo que cambiaste no se va a guardar." });

  const colecciones = useMemo(() => [...new Set(productos.map((p) => p.categoria).filter((c): c is string => Boolean(c)))].sort((a, b) => a.localeCompare(b, "es")), [productos]);
  const sugerencias = useMemo(() => sugerenciasDeDetalles(productos.filter((p) => p.id !== producto.id).map((p) => p.detalles)), [productos, producto.id]);
  const coleccionElegida = nuevaColeccion !== null ? nuevaColeccion.trim() || null : categoria;

  // El plan cuenta solo los visibles: con el plan lleno, uno oculto no se vuelve visible hasta hacer espacio.
  const llenoPlan = tienda != null && resumenDelPlan(productos, tienda.limiteProductos).estado === "lleno";
  const bloqueaVisible = llenoPlan && !producto.activo;
  const avisarLleno = () => mostrarToastUI("Tu catálogo está lleno", { accion: { texto: "Hacer espacio", alTocar: () => abrirInventario("espacio") } });
  const cambiarVisible = (valor: boolean) => {
    if (valor && bloqueaVisible) return;
    setVisibilidad({ base: producto.activo, valor });
  };

  const fotos = mediosParaGuardar(medios).filter((m) => m.tipo === "foto");
  const portada = fotos[0]?.url ?? null;
  const preparando = medios.some((m) => m.tipo === "video" && typeof m.progreso === "number");
  const quedaVisible = activo && !bloqueaVisible;
  const sinFotoVisible = quedaVisible && fotos.length === 0;
  const listo = puedePublicar({ nombre, precio, fotos: fotos.length, preparando, oculto: !quedaVisible });
  const fotosDelBorrador = medios.flatMap((m) => (m.tipo === "foto" ? [{ id: m.id, url: m.url }] : []));
  const desde = tieneOpciones && resumenPres.desde !== null ? resumenPres.desde : precioNumero;
  const textoPrecio = (varia ? `Desde ${formatearPesos(desde)}` : precioNumero > 0 ? formatearPesos(precioNumero) : null);
  const totalStock = tieneOpciones ? resumenPres.enTotal : inventario.propuesta;

  /** Abre una pantalla en el mismo toque y, si tiene campo, le pone el foco (reglas de teclado del iPhone). */
  const abrir = (p: Paso) => {
    if (sinCatalogo) return toast(porque);
    if (guardando || inventario.guardando) return;
    flushSync(() => {
      setVisto((v) => ({ paso: p, vuelta: v.vuelta + 1 }));
      setPaso(p);
    });
    const paneles = document.querySelectorAll<HTMLElement>("[data-hoja-panel]");
    paneles[paneles.length - 1]?.querySelector<HTMLInputElement>("input[data-campo-paso]")?.focus();
  };
  const cerrarPaso = () => setPaso(null);

  const guardar = async (motivo: MotivoAjusteInventario, nota: string | null, deVariantes: Motivo | null): Promise<boolean> => {
    if (guardando || inventario.guardando || inventario.incierto) return false;
    const coleccion = coleccionElegida;
    if (!guardadoComun.validar({ nombre, precio, medios, oculto: !quedaVisible })) return false;
    if (!(await guardadoComun.pasarBienvenida(medios))) return false;
    setGuardando(true);
    const entregadas = await guardadoComun.entregadasAlGuardar();
    const final = mediosParaGuardar(conEntregadas(medios, entregadas));
    const urls = final.flatMap((m) => (m.tipo === "foto" ? [m.url] : []));
    const primera = final.find((m) => m.tipo === "foto");
    const fotoRetocada = primera?.tipo === "foto" ? primera.retocada : false;
    // Con un solo rubro no se manda nada (todo igual que antes); con varios, el tipo va explícito.
    const catalogo = {
      medios: final, detalles, porEncargo, encargoTexto: porEncargo ? encargoTexto.trim() || null : (producto.encargoTexto ?? null),
      ...(variosTipos && tipo !== tipoBase ? { rubro: tipo } : {}),
    };
    const variantes = variantesParaGuardar(presentaciones, base);
    try {
      const bien = await inventario.guardar(
        { nombre: nombre.trim(), precio: Number(precio), fotos: urls, fotoRetocada, categoria: coleccion, ...(cambioVisible ? { activo: quedaVisible } : {}), ...catalogo },
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
        await ajustarStock(tiendaId, producto.id, delta, delta > 0 ? "reposicion" : (deVariantes?.motivo ?? "correccion_inventario"), delta > 0 ? null : (deVariantes?.nota ?? null), b.id);
      }
      const releido = guardadoComun.hayMarcadas(medios, entregadas) ? await getProducto(tiendaId, producto.id).catch(() => null) : null;
      await guardadoComun.guardarFotosDeColor(medios, entregadas, tieneOpciones ? presentaciones : SIN_PRESENTACIONES, producto);
      const falloFicha = await guardadoComun.guardarLaFicha(ficha, producto);
      toast(await guardadoComun.mandarAlTaller(medios, entregadas, releido, falloFicha ?? "Guardado. El catálogo ya se enteró."));
      inventario.finalizar(alTerminar);
      return true;
    } catch (e) {
      toast(mensajeDeError(e, "No se pudo guardar. Inténtalo otra vez."));
      setGuardando(false);
      return false;
    }
  };

  /**
   * «Guardar cambios»: el motivo de lo que bajó ya se pidió en el Stock o en el Inventario. Si una bajada llegó por otro camino (las
   * cantidades del flujo de presentaciones), se pide aquí, como antes.
   */
  const alGuardar = () => {
    if (tieneOpciones && unidadesBajadas > 0 && !motivoVariantes) return setPidiendoMotivo(true);
    const bajaSimple = inventario.pendiente && inventario.base !== null && inventario.propuesta !== null && inventario.propuesta < inventario.base;
    if (bajaSimple && !inventario.motivo) return inventario.pedirGuardar((m, n) => guardar(m, n, motivoVariantes));
    void guardar(bajaSimple ? inventario.motivo! : "reposicion", bajaSimple && inventario.motivo === "otro" ? inventario.nota.trim() || null : null, motivoVariantes);
  };

  const personasEsperando = espera.resumen?.personasPorProducto.get(producto.id) ?? 0;
  const ocupado = guardando || inventario.guardando;
  const valor = (texto: ReactNode) => <span className="block max-w-[11rem] truncate text-secundario font-normal text-texto-secundario">{texto}</span>;

  return (
    <div className="flex flex-col" data-editar-producto="">
      {variosTipos && !internaAbierta && tienda && ranuraCatalogo &&
        createPortal(
          <SelectorCatalogo
            tipos={tipos} valor={tipo} conteo={contarPorCatalogo(productos, tienda)} tamano="compacto" textoOtra="Vendo otra cosa también"
            alCambiar={(r) => { if (r !== CATALOGO_GENERAL) setTipo(r); }} alVenderOtra={() => setVendiendoOtra(true)} deshabilitado={ocupado}
            sinPermiso={sinCatalogo ? () => toast(porque) : undefined}
          />,
          ranuraCatalogo,
        )}
      {vendiendoOtra && tienda && <HojaLoQueVendes tienda={tienda} alCerrar={() => setVendiendoOtra(false)} />}

      <p className="-mt-1 font-mano text-[1.625rem] leading-tight text-atencion-texto">así se ve en tu catálogo</p>
      <TarjetaResumen portada={portada} fotos={fotos.length} nombre={nombre} precio={textoPrecio} visible={quedaVisible} presentaciones={tieneOpciones ? resumenPres.total : 0} />

      <Grupo titulo="Lo básico">
        <FilaLista titulo="Fotos" fin={<Miniaturas urls={fotos.map((f) => f.url)} />} onClick={() => abrir("fotos")} etiqueta={`Fotos: ${fotos.length === 0 ? "sin fotos" : `${fotos.length}`}`} />
        <FilaLista titulo="Nombre" fin={valor(nombre.trim() || "Sin nombre")} onClick={() => abrir("nombre")} />
        <FilaLista titulo="Precio" fin={valor(textoPrecio ?? "Sin precio")} onClick={() => abrir("precio")} />
      </Grupo>

      <Grupo titulo={servicio ? "Presentaciones" : "Presentaciones y stock"}>
        <FilaLista titulo="Presentaciones" fin={valor(resumenPresentaciones(tieneOpciones ? opciones : [], tieneOpciones ? resumenPres.total : 0))} onClick={() => (sinCatalogo ? toast(porque) : !ocupado && setPresAbierta(true))} />
        {!servicio && (
          <>
            <FilaLista titulo="Stock" fin={valor(resumenStock(totalStock))} onClick={() => abrir("stock")} />
            <FilaLista
              titulo="Es por encargo" detalle={porEncargo ? resumenEncargo(true, encargoTexto) : undefined}
              onClick={porEncargo ? () => abrir("encargo") : undefined}
              accion={<Interruptor encendido={porEncargo} etiqueta="Es por encargo" alCambiar={setPorEncargo} deshabilitado={sinCatalogo || ocupado} alTocarBloqueado={sinCatalogo ? () => toast(porque) : undefined} />}
            />
          </>
        )}
      </Grupo>

      <Grupo titulo="Hazlo brillar · opcional">
        <FilaLista titulo="Descripción" fin={valor(resumenDescripcion(descripcion, 22) ?? "Agregar")} onClick={() => abrir("descripcion")} />
        <FilaLista titulo="Colección" fin={valor(coleccionElegida ?? "Agregar")} onClick={() => (sinCatalogo ? toast(porque) : !ocupado && setColeccionAbierta(true))} />
        <FilaLista titulo="Ficha técnica" fin={valor(fichaVisible(producto.fichaUrl, ficha) ? "Subida" : "Agregar")} onClick={() => abrir("ficha")} />
        {tienda && conDetalles && <FilaLista titulo="Detalles" fin={valor(tieneDetallesPorRubro(detalles) ? "Listos" : "Agregar")} onClick={() => abrir("detalles")} />}
      </Grupo>

      <Grupo titulo="En tu catálogo">
        <FilaLista
          titulo="Visible en el catálogo" detalle={quedaVisible ? "Visible" : "Oculto del catálogo"}
          accion={
            <Interruptor
              encendido={quedaVisible} alCambiar={cambiarVisible} etiqueta="Visible en el catálogo" deshabilitado={sinCatalogo || bloqueaVisible || ocupado}
              alTocarBloqueado={sinCatalogo ? () => toast(porque) : bloqueaVisible ? avisarLleno : undefined}
            />
          }
        />
        {!espera.error && !espera.cargando && personasEsperando > 0 && <FilaLista titulo="Lista de espera" fin={valor(textoEspera(personasEsperando))} onClick={(e) => alVerEspera(e.currentTarget)} />}
        <FilaLista titulo="Historial de ajustes" onClick={(e) => alVerHistorial(e.currentTarget)} />
      </Grupo>
      {sinFotoVisible && <p role="status" className="mt-2 px-1 text-secundario text-atencion-texto" data-falta-foto="">Agrega una foto para publicar. Sin foto, se guarda oculto.</p>}
      {espera.error && <ListaAgrupada className="mt-3"><FilaLista titulo="No pudimos leer la lista de espera" onClick={() => espera.reintentar()} fin={<span>Reintentar</span>} /></ListaAgrupada>}

      {inventario.error && <p role="alert" className="mt-4 rounded-radio-m bg-atencion-suave p-4 text-secundario text-texto">{inventario.error}</p>}
      {inventario.incierto && <button type="button" disabled={inventario.guardando} onClick={() => void inventario.revisar()} className="tocable mt-2 min-h-11 font-bold underline">Revisar producto e historial</button>}
      {sinCatalogo && <p className="mt-4 rounded-radio-m bg-atencion-suave p-3 text-center text-secundario font-bold text-atencion-texto" data-sin-permiso="">{porque}</p>}
      <Boton jerarquia="terciario" tono="peligro" anchoCompleto className="mt-4" deshabilitado={sinCatalogo || ocupado || preparando} onClick={() => setEliminando(true)}>Eliminar producto</Boton>
      <div aria-hidden="true" className="h-4 shrink-0" />

      {/* En el historial o la lista de espera el pie no se ve, pero sigue ocupando su lugar: al volver, el desplazamiento es el mismo. */}
      {(
        <HojaFijoAbajo>
          <div className={internaAbierta ? "invisible" : undefined}>
          <PieFlotante className="pt-2.5" data-pie-editar="">
            <Boton tamano="grande" anchoCompleto cargando={ocupado} deshabilitado={!hayCambios || !listo || inventario.incierto || preparando || sinCatalogo} onClick={alGuardar}>
              Guardar cambios
            </Boton>
          </PieFlotante>
          </div>
        </HojaFijoAbajo>
      )}

      {guardadoComun.bienvenidaRetoque}
      <ConfirmacionEliminarProducto
        producto={producto} abierta={eliminando} pendiente={hayCambios || inventario.incierto} alCerrar={() => setEliminando(false)} alEliminar={alEliminar}
        alIniciar={alIniciarEliminacion} alOcultar={() => { setVisibilidad({ base: false, valor: false }); setEliminando(false); }}
      />
      <ConfirmacionInventario inventario={inventario} />
      <HojaMotivoVariantes
        abierta={pidiendoMotivo} unidades={unidadesBajadas} guardando={guardando} alCerrar={() => setPidiendoMotivo(false)}
        alConfirmar={async (motivo, nota) => {
          const m = { motivo, nota };
          setMotivoVariantes(m);
          const bajaSimple = inventario.pendiente && inventario.propuesta !== null && inventario.base !== null && inventario.propuesta < inventario.base;
          const bien = await guardar(bajaSimple && inventario.motivo ? inventario.motivo : "reposicion", null, m);
          if (bien) setPidiendoMotivo(false);
        }}
      />

      <FlujoPresentaciones
        abierta={presAbierta} alCerrar={() => setPresAbierta(false)} rubro={tipo} precioProducto={precioNumero} estado={presentaciones}
        stockSimple={producto.stock} publicado fotos={fotosDelBorrador} agregarFoto={(archivo) => agregarFotoAlBorrador(archivo, medios, setMedios, toast)}
        tienePedidos={async (varianteId) => (await getPedidos(tiendaId)).some((p) => p.items.some((i) => i.varianteId === varianteId))}
        avisar={toast}
        alConfirmar={(nuevo) => {
          // Al pasar a presentaciones, el stock vive en cada una: un ajuste suelto del producto se descarta (ya se repartió el guardado).
          if (nuevo.pres.length > 0 && !tieneOpciones && inventario.pendiente) inventario.recuperar();
          setPresentaciones(nuevo);
          setPresAbierta(false);
        }}
      />
      <HojaColeccion
        abierta={coleccionAbierta} alCerrar={() => setColeccionAbierta(false)} colecciones={colecciones} elegida={coleccionElegida}
        alElegir={(n, esNueva) => {
          setNuevaColeccion(esNueva ? n : null);
          setCategoria(esNueva ? categoria : n);
          setColeccionAbierta(false);
        }}
      />

      <Hoja
        abierta={paso !== null} alCerrar={cerrarPaso} titulo={visto.paso === "stock" && tieneOpciones ? "Inventario" : TITULOS[visto.paso]} altura="grande" hueco={118} anidarHojas
        historia={{ alLadoDelTitulo: visto.paso === "stock" && tieneOpciones ? <span className="ml-auto shrink-0 text-secundario text-texto-secundario" data-total-inventario="">{resumenStock(totalStock)}</span> : undefined }}
      >
        <div className="flex flex-col" data-paso-editar={visto.paso} key={visto.vuelta}>
          {visto.paso === "fotos" && (
            <PantallaFotos inicial={medios} taller={taller} avisar={toast} alListo={(m) => { setMedios(m); cerrarPaso(); }} />
          )}
          {visto.paso === "nombre" && (
            <PantallaNombre inicial={nombre} antes={producto.nombre} portada={portada} precio={textoPrecio} alListo={(n) => { setNombre(n); cerrarPaso(); }} />
          )}
          {visto.paso === "precio" && (
            <PantallaPrecio inicial={precio} antes={producto.precio} portada={portada} nombre={nombre} variaDesde={varia ? resumenPres.desde : null} alListo={(p) => { setPrecio(p); cerrarPaso(); }} />
          )}
          {visto.paso === "stock" && !tieneOpciones && (
            <PantallaStock
              base={inventario.base} inicial={inventario.propuesta} motivo={inventario.motivo} nota={inventario.nota} nombre={nombre}
              alListo={(cantidad, m) => {
                if (inventario.propuesta !== null) inventario.cambiar(cantidad - inventario.propuesta);
                inventario.setMotivo(m?.motivo ?? null);
                inventario.setNota(m?.nota ?? "");
                cerrarPaso();
              }}
            />
          )}
          {visto.paso === "stock" && tieneOpciones && (
            <PantallaInventario
              estado={presentaciones} base={base} precioProducto={precioNumero} fotos={fotosDelBorrador} motivo={motivoVariantes}
              tienePedidos={async (varianteId) => (await getPedidos(tiendaId)).some((p) => p.items.some((i) => i.varianteId === varianteId))}
              avisar={toast}
              alListo={(pres, fotosColor, m) => { setPresentaciones((e) => ({ ...e, pres, fotosColor })); setMotivoVariantes(m); cerrarPaso(); }}
            />
          )}
          {visto.paso === "encargo" && <PantallaEncargo inicial={encargoTexto} alListo={(t) => { setEncargoTexto(t); cerrarPaso(); }} />}
          {visto.paso === "descripcion" && (
            <PantallaOpcional inicial={descripcion} alListo={(d) => { ponerDescripcion(d); cerrarPaso(); }}>
              {(v, poner) => <SeccionDescripcion sinTitulo valor={v} alCambiar={poner} />}
            </PantallaOpcional>
          )}
          {visto.paso === "ficha" && (
            <PantallaOpcional inicial={ficha} alListo={(f) => { setFicha(f); cerrarPaso(); }}>
              {(v, poner) => <SeccionFichaTecnica sinTitulo actual={producto.fichaUrl} borrador={v} alCambiar={poner} sinPermiso={sinCatalogo} porque={porque} avisar={toast} />}
            </PantallaOpcional>
          )}
          {visto.paso === "detalles" && tienda && (
            <PantallaOpcional inicial={detalles} alListo={(d) => { setDetalles(d); cerrarPaso(); }}>
              {(v, poner) => <SeccionDetalles rubro={rubro} detalles={v} alCambiar={poner} sugerencias={sugerencias} />}
            </PantallaOpcional>
          )}
        </div>
      </Hoja>
    </div>
  );
}

/** Un grupo de filas con su rótulo (Lo básico, Presentaciones y stock…). */
function Grupo({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="mt-5 flex flex-col" aria-label={titulo}>
      <h3 className="mx-1 mb-2 text-etiqueta font-extrabold text-texto-secundario">{titulo}</h3>
      <ListaAgrupada>{children}</ListaAgrupada>
    </section>
  );
}

/** Hasta tres miniaturas de las fotos (la fila Fotos). */
function Miniaturas({ urls }: { urls: string[] }) {
  if (urls.length === 0) return <span className="text-secundario font-normal text-texto-secundario">Agregar</span>;
  return (
    <span className="flex items-center gap-1.5" data-miniaturas="">
      {urls.slice(0, 3).map((u, i) => (
        <span key={`${u}-${i}`} className="relative block size-7 overflow-hidden rounded-radio-s bg-superficie-hundida">
          <Foto src={u} alt="" className="size-full" sizes="28px" />
        </span>
      ))}
    </span>
  );
}

/**
 * La tarjeta «así se ve en tu catálogo» del resumen: la portada en `cover` con el velo, «Visible» u «Oculto», el contador de
 * fotos, el nombre y el precio («Desde RD$… · 6 presentaciones»). 300 px de alto: a 390×844 se ve también el primer grupo de filas.
 */
function TarjetaResumen({ portada, fotos, nombre, precio, visible, presentaciones }: { portada: string | null; fotos: number; nombre: string; precio: string | null; visible: boolean; presentaciones: number }) {
  const n = nombre.trim();
  return (
    <div className="relative mt-1 h-[300px] w-full shrink-0 overflow-hidden rounded-radio-l bg-superficie-hundida" data-tarjeta-resumen="">
      {portada ? (
        <>
          <Foto src={portada} alt={`Portada de ${n || "el producto"}`} className="absolute inset-0" sizes="(max-width: 480px) 100vw, 440px" />
          <div aria-hidden="true" className="absolute inset-x-0 top-1/2 bottom-0 bg-linear-to-t from-velo to-transparent" />
        </>
      ) : (
        <div aria-hidden="true" className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-texto-secundario">
          <IconoCamara tamano={40} strokeWidth={1.8} />
          <span className="text-secundario font-bold">Sin foto</span>
        </div>
      )}
      <Etiqueta tono={visible ? "exito" : "neutro"} className="absolute top-3 left-3" >{visible ? "Visible" : "Oculto"}</Etiqueta>
      {fotos > 0 && <span className="absolute top-3 right-3 inline-flex h-[26px] items-center rounded-full bg-velo px-2.5 text-[0.8125rem] font-extrabold text-papel tabular-nums" data-contador-fotos="">1 / {fotos}</span>}
      <div className={clases("absolute inset-x-4 bottom-3.5", portada ? "text-papel" : "text-texto")}>
        {n && <p className="line-clamp-2 font-display text-titulo-hoja break-words">{n}</p>}
        {precio && (
          <p className="mt-0.5 text-cuerpo tabular-nums" data-precio-resumen="">
            <span className="font-extrabold">{precio}</span>
            {presentaciones > 0 && <span className="opacity-90"> · {presentaciones === 1 ? "1 presentación" : `${presentaciones} presentaciones`}</span>}
          </p>
        )}
      </div>
    </div>
  );
}

/** El pie de una pantalla de encima: un solo botón, «Listo» (con un aviso arriba si hace falta). */
function PieListo({ deshabilitado = false, alListo, aviso }: { deshabilitado?: boolean; alListo: () => void; aviso?: ReactNode }) {
  return (
    <HojaFijoAbajo>
      <PieFlotante className="flex flex-col gap-2.5 pt-2.5" data-pie-paso="">
        {aviso}
        <Boton tamano="grande" anchoCompleto deshabilitado={deshabilitado} onClick={alListo}>Listo</Boton>
      </PieFlotante>
    </HojaFijoAbajo>
  );
}
const Aire = () => <div aria-hidden="true" className="h-7 shrink-0" />;

function PantallaFotos({ inicial, taller, avisar, alListo }: { inicial: MedioBorrador[]; taller: ReturnType<typeof useTaller>; avisar: (m: string) => void; alListo: (m: MedioBorrador[]) => void }) {
  const [medios, setMedios] = useState(inicial);
  useAvisarAlSalir(medios !== inicial);
  const preparando = medios.some((m) => m.tipo === "video" && typeof m.progreso === "number");
  const t = textosDelPaso("foto");
  return (
    <>
      <PasoFoto medios={medios} alCambiar={setMedios} taller={taller} avisar={avisar} titulo={t.titulo} ayuda={t.ayuda} />
      <Aire />
      <PieListo deshabilitado={preparando} alListo={() => alListo(medios)} aviso={preparando ? <p role="status" className="text-center text-secundario text-texto-secundario">Espera a que el video termine de prepararse.</p> : undefined} />
    </>
  );
}

function PantallaNombre({ inicial, antes, portada, precio, alListo }: { inicial: string; antes: string; portada: string | null; precio: string | null; alListo: (n: string) => void }) {
  const [nombre, setNombre] = useState(inicial);
  useAvisarAlSalir(nombre !== inicial);
  const t = textosDelPaso("nombre");
  const valido = nombre.trim().length > 0;
  return (
    <>
      <TarjetaAsiSeVera portada={portada} nombre={nombre} precio={precio} llega={null} />
      <PasoNombre titulo={t.titulo} ayuda={ayudaConAntes(antes, nombre, t.ayuda)} valor={nombre} alCambiar={setNombre} alEnter={(e) => { if (e.key === "Enter") { e.preventDefault(); if (valido) alListo(nombre); } }} />
      <Aire />
      <PieListo deshabilitado={!valido} alListo={() => alListo(nombre)} />
    </>
  );
}

function PantallaPrecio({ inicial, antes, portada, nombre, variaDesde, alListo }: { inicial: string; antes: number; portada: string | null; nombre: string; variaDesde: number | null; alListo: (p: string) => void }) {
  const [precio, setPrecio] = useState(inicial);
  useAvisarAlSalir(precio !== inicial);
  const t = textosDelPaso("precio");
  const valido = variaDesde !== null || Number(precio) > 0;
  const ahora = Number(precio) > 0 ? formatearPesos(Number(precio)) : "";
  return (
    <>
      <TarjetaAsiSeVera portada={portada} nombre={nombre} precio={variaDesde !== null ? `Desde ${formatearPesos(variaDesde)}` : ahora || null} llega={null} />
      <PasoPrecio
        titulo={t.titulo} ayuda={variaDesde !== null ? "Cada presentación tiene su precio: se cambia en Presentaciones." : ayudaConAntes(formatearPesos(antes), ahora, t.ayuda)}
        precio={precio} alCambiar={setPrecio} variaDesde={variaDesde} enterKeyHint="done"
        alEnter={(e) => { if (e.key === "Enter") { e.preventDefault(); if (valido) alListo(precio); } }}
      />
      <Aire />
      <PieListo deshabilitado={!valido} alListo={() => alListo(precio)} />
    </>
  );
}

/** «Bajaste 2 en Blanco · M. ¿Qué pasó?»: los motivos de siempre y la nota de «Otro». No cuenta como venta. */
function MotivoBajada({ pregunta, motivo, nota, alMotivo, alNota }: { pregunta: string; motivo: MotivoAjusteInventario | null; nota: string; alMotivo: (m: MotivoAjusteInventario) => void; alNota: (n: string) => void }) {
  return (
    <section className="mt-3 flex flex-col gap-3 rounded-radio-l border border-linea bg-superficie p-4" data-motivo-bajada="" aria-label="Motivo del ajuste">
      <p className="text-cuerpo font-extrabold text-texto">{pregunta}</p>
      <GrupoEleccion
        etiqueta="Motivo del ajuste" compacta valor={motivo}
        alCambiar={alMotivo} opciones={(["dano", "perdida", "correccion_inventario", "otro"] as const).map((m) => ({ id: m, texto: MOTIVOS_INVENTARIO[m] }))}
      />
      {motivo === "otro" && <CampoMultilinea etiqueta="Cuéntanos el motivo" maxLength={200} filas={3} value={nota} onChange={(e) => alNota(e.target.value)} />}
      <p className="text-secundario text-texto-secundario">No cuenta como venta. Queda en el historial.</p>
    </section>
  );
}
const motivoListo = (motivo: MotivoAjusteInventario | null, nota: string) => motivo !== null && (motivo !== "otro" || nota.trim().length > 0);

/** El stock de un producto sin presentaciones: la cantidad grande y, si baja, el motivo ahí mismo. */
function PantallaStock({ base, inicial, motivo: motivoInicial, nota: notaInicial, nombre, alListo }: {
  base: number | null; inicial: number | null; motivo: MotivoAjusteInventario | null; nota: string; nombre: string;
  alListo: (cantidad: number, motivo: Motivo | null) => void;
}) {
  const [cantidad, setCantidad] = useState(inicial ?? 0);
  const [motivo, setMotivo] = useState<MotivoAjusteInventario | null>(motivoInicial === "reposicion" ? null : motivoInicial);
  const [nota, setNota] = useState(notaInicial);
  useAvisarAlSalir(cantidad !== (inicial ?? 0) || motivo !== motivoInicial || nota !== notaInicial);
  const bajo = base !== null && cantidad < base;
  const pregunta = bajo ? preguntaBajada([{ donde: null, unidades: base - cantidad }]) : null;
  const valido = !bajo || motivoListo(motivo, nota);
  return (
    <>
      <EncabezadoPaso titulo="¿Cuántos tienes ahora?" ayuda="Cuéntalos como están hoy en tu casa o tu tienda." separacion="mt-0" />
      {base === null || inicial === null ? (
        <p role="status" data-sin-cantidad="" className="mt-4 text-secundario text-texto-secundario">Este producto no tiene su cantidad guardada. Se ve como 0.</p>
      ) : (
        <>
          <div className="mt-4 flex justify-center" data-contador-stock="">
            <Cantidad grande valor={cantidad} max={2147483647} alCambiar={setCantidad} etiquetaQuitar={`Disminuir stock de ${nombre}`} etiquetaAgregar={`Aumentar stock de ${nombre}`} />
          </div>
          {cantidad !== base && <p className="mt-2 text-center text-secundario text-texto-secundario" data-antes-stock="">Antes: {base}.</p>}
          {pregunta && <MotivoBajada pregunta={pregunta} motivo={motivo} nota={nota} alMotivo={setMotivo} alNota={setNota} />}
        </>
      )}
      <Aire />
      <PieListo deshabilitado={!valido} alListo={() => alListo(cantidad, bajo && motivo ? { motivo, nota: motivo === "otro" ? nota.trim() : null } : null)} />
    </>
  );
}

/**
 * El Inventario de un producto con presentaciones (referencia `A-stock.dc.html`): un grupo por la primera cosa, una fila por la
 * otra con − / +, «antes 3» en la que cambió y, si algo bajó, el motivo debajo de su grupo. Tocar una fila abre su detalle como
 * pantalla interna (precio propio, foto, ocultar, quitar). «Listo» no deja salir con una bajada sin motivo.
 */
function PantallaInventario({ estado, base, precioProducto, fotos, motivo: motivoInicial, tienePedidos, avisar, alListo }: {
  estado: EstadoPresentaciones; base: Map<string, { stock: number | null }>; precioProducto: number; fotos: { id: string; url: string }[]; motivo: Motivo | null;
  tienePedidos: (varianteId: string) => Promise<boolean>; avisar: (m: string) => void;
  alListo: (pres: Presentacion[], fotosColor: Record<string, string>, motivo: Motivo | null) => void;
}) {
  const { opciones } = estado;
  const [pres, setPres] = useState(estado.pres);
  const [fotosColor, setFotosColor] = useState(estado.fotosColor);
  const [motivo, setMotivo] = useState<MotivoAjusteInventario | null>(motivoInicial?.motivo ?? null);
  const [nota, setNota] = useState(motivoInicial?.nota ?? "");
  const [detalle, setDetalle] = useState<string | null>(null);
  useAvisarAlSalir(pres !== estado.pres || fotosColor !== estado.fotosColor || motivo !== (motivoInicial?.motivo ?? null));
  // Un grupo por color si lo hay (como la referencia), si no por la primera cosa; una fila por la otra.
  const primero = opciones.find((o) => esEjeColor(o.nombre)) ?? opciones[0];
  const segundo = opciones.find((o) => o !== primero);
  const cambiarUna = (clave: string, cambio: Partial<Presentacion>) => setPres((l) => l.map((p) => (claveVariante(p.valores) === clave ? { ...p, ...cambio } : p)));
  const grupos = primero && segundo
    ? primero.valores.map((v) => ({ valor: v, filas: pres.filter((p) => p.valores[primero.nombre] === v) })).filter((g) => g.filas.length > 0)
    : [{ valor: "", filas: pres }];
  const antesDe = (p: Presentacion) => base.get(claveVariante(p.valores))?.stock ?? null;
  const bajadas: Bajada[] = pres.flatMap((p) => {
    const b = antesDe(p);
    return p.activa && b !== null && (p.stock ?? 0) < b ? [{ donde: textoCombinacion(opciones, p.valores), unidades: b - (p.stock ?? 0) }] : [];
  });
  const pregunta = preguntaBajada(bajadas);
  const primeraBajada = pres.find((p) => { const b = antesDe(p); return p.activa && b !== null && (p.stock ?? 0) < b; });
  const grupoDelMotivo = primeraBajada && primero && segundo ? primeraBajada.valores[primero.nombre] : "";
  const valido = pregunta === null || motivoListo(motivo, nota);
  const enLista = detalle ? pres.find((p) => claveVariante(p.valores) === detalle) ?? null : null;

  const fila = (p: Presentacion, agrupada: boolean) => {
    const clave = claveVariante(p.valores);
    const texto = agrupada && segundo ? (p.valores[segundo.nombre] ?? "") : textoCombinacion(opciones, p.valores);
    const nombre = textoCombinacion(opciones, p.valores);
    const antes = antesDe(p);
    const cambio = antes !== null && p.activa && (p.stock ?? 0) !== antes;
    const bajo = cambio && (p.stock ?? 0) < antes!;
    return (
      <li key={clave} className={clases("flex min-h-14 items-center gap-2.5 border-t border-linea pr-3 pl-4 first:border-t-0", bajo && "bg-atencion-suave", !p.activa && "opacity-50")} data-fila-inventario={nombre}>
        <button type="button" onClick={() => setDetalle(clave)} aria-label={`${nombre}: ${p.stock ?? 0}${cambio ? `, antes ${antes}` : ""}. Ver detalle`} className={clases("tocable flex min-h-11 min-w-0 flex-1 flex-col items-start justify-center text-left", FOCO)}>
          <span className="flex max-w-full items-baseline gap-2">
            <span className="truncate text-destacado font-extrabold text-texto">{texto}</span>
            {cambio && <span className={clases("shrink-0 text-secundario font-extrabold", bajo ? "text-atencion-texto" : "text-texto-secundario")} data-antes="">antes {antes}</span>}
          </span>
          {p.precio !== null && <span className="text-[0.8125rem] text-texto-secundario">{formatearPesos(precioDe(p, precioProducto))} · propio</span>}
          {!p.activa && <span className="text-[0.8125rem] text-texto-secundario">Oculta</span>}
        </button>
        <Cantidad redonda valor={p.stock ?? 0} max={2147483647} alCambiar={(v) => cambiarUna(clave, { stock: v })} etiquetaQuitar={`Quitar uno de ${nombre}`} etiquetaAgregar={`Agregar uno de ${nombre}`} />
      </li>
    );
  };

  const motivoBloque = pregunta && <MotivoBajada pregunta={pregunta} motivo={motivo} nota={nota} alMotivo={setMotivo} alNota={setNota} />;
  return (
    <>
      <EncabezadoPaso titulo="¿Cuántos tienes ahora?" ayuda="Cuéntalos como están hoy en tu casa o tu tienda." separacion="mt-0" />
      <div className="mt-3 flex flex-col gap-3" data-inventario-editar="">
        {grupos.map((g) => {
          const agrupado = g.valor !== "";
          const enGrupo = g.filas.filter((p) => p.activa).reduce((t, p) => t + (p.stock ?? 0), 0);
          const c = agrupado && primero && esEjeColor(primero.nombre) ? colorPorNombre(g.valor) : null;
          return (
            <section key={g.valor || "todas"} aria-label={agrupado ? `${primero!.nombre} ${g.valor}` : "Presentaciones"} data-grupo-inventario={g.valor}>
              {agrupado && (
                <p className="mx-1 mb-1.5 flex items-center gap-1.5 text-etiqueta font-extrabold text-texto-secundario">
                  {c && <span aria-hidden="true" className="size-3 shrink-0 rounded-full border border-borde-pastilla" style={{ background: c }} />}
                  {g.valor} · {enGrupo}
                </p>
              )}
              <ul className="overflow-hidden rounded-radio-l border border-linea bg-superficie">{g.filas.map((p) => fila(p, agrupado))}</ul>
              {g.valor === grupoDelMotivo && motivoBloque}
            </section>
          );
        })}
        {pres.length > 0 && <p className="px-1 text-secundario text-texto-secundario">Toca una para ponerle precio propio, foto u ocultarla.</p>}
      </div>
      <Aire />
      <PieListo deshabilitado={!valido} alListo={() => alListo(pres, fotosColor, pregunta && motivo ? { motivo, nota: motivo === "otro" ? nota.trim() : null } : null)} />
      <HojaPresentacion
        abierta={enLista !== null} presentacion={enLista} opciones={opciones} precioProducto={precioProducto} fotos={fotos} fotosColor={fotosColor}
        alCerrar={() => setDetalle(null)}
        alCambiar={(cambio) => enLista && cambiarUna(claveVariante(enLista.valores), cambio)}
        alCompletar={(valores) => {
          if (!enLista) return;
          const nueva = claveVariante(valores);
          if (nueva !== claveVariante(enLista.valores) && pres.some((p) => claveVariante(p.valores) === nueva)) return avisar("Esa presentación ya existe.");
          setPres((l) => l.map((p) => (claveVariante(p.valores) === claveVariante(enLista.valores) ? { ...p, valores } : p)));
          setDetalle(nueva);
        }}
        alElegirFoto={(valor, id) => setFotosColor((f) => (id ? { ...f, [valor]: id } : Object.fromEntries(Object.entries(f).filter(([v]) => v !== valor))))}
        alQuitar={async () => {
          if (!enLista) return null;
          const con = enLista.id ? await tienePedidos(enLista.id).catch(() => true) : false;
          return {
            con,
            hacer: () => {
              const r = quitarPresentacion(pres, claveVariante(enLista.valores), con);
              setPres(r.presentaciones);
              setDetalle(null);
              if (r.oculta) avisar(TEXTO_CON_PEDIDOS);
            },
          };
        }}
      />
    </>
  );
}

function PantallaEncargo({ inicial, alListo }: { inicial: string; alListo: (t: string) => void }) {
  const [texto, setTexto] = useState(inicial);
  useAvisarAlSalir(texto !== inicial);
  const t = textosDelPaso("stock", true);
  return (
    <>
      <EncabezadoPaso titulo={t.titulo} ayuda={t.ayuda} separacion="mt-0" />
      <div className="mt-3.5">
        <CuandoLlega texto={texto} alCambiar={setTexto} alEnter={(e) => { if (e.key === "Enter") { e.preventDefault(); alListo(texto); } }} />
      </div>
      <Aire />
      <PieListo alListo={() => alListo(texto)} />
    </>
  );
}

/** Descripción, ficha técnica o detalles: lo de hoy, con su copia del borrador y «Listo». */
function PantallaOpcional<T>({ inicial, alListo, children }: { inicial: T; alListo: (v: T) => void; children: (v: T, poner: (v: T) => void) => ReactNode }) {
  const [v, setV] = useState(inicial);
  const [primero] = useState(inicial);
  useAvisarAlSalir(v !== primero);
  return (
    <>
      <div className="flex flex-col gap-4">{children(v, setV)}</div>
      <Aire />
      <PieListo alListo={() => alListo(v)} />
    </>
  );
}
