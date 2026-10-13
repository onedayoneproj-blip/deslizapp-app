"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal, flushSync } from "react-dom";
import { CATALOGO_GENERAL, contarPorCatalogo, guardarCatalogoAlCrear, leerCatalogoActivo, leerCatalogoAlCrear, rubroInicialDeProducto } from "@/lib/catalogo-activo";
import { vistaCatalogo } from "@/lib/catalogo-estado";
import { useConsulta, useTiendaActiva } from "@/lib/data/consulta";
import { usePermisos } from "@/lib/data/permisos";
import { useData } from "@/lib/data/provider";
import { enlaceCatalogo } from "@/lib/enlace-catalogo";
import { fichaCambiada, fichaVisible, tieneDetallesPorRubro, type BorradorFicha } from "@/lib/ficha-tecnica";
import { formatearPesos } from "@/lib/formato";
import { colorPorNombre, esEjeColor } from "@/lib/colores";
import {
  barrasLlenas,
  borradorAlSumarEje,
  conLosCreados,
  crearConHerencia,
  detallesParaGuardar,
  estaQuitada,
  inventarioCompleto,
  lineaArranque,
  loQueSePierde,
  lineaCelebracion,
  ordenDePreguntas,
  ordenParaGuardar,
  pasoAnterior,
  pasoSiguiente,
  pasosDeHistoria,
  puedeSeguir,
  quitadasTrasCambiar,
  quitarEje,
  SIN_FOTO,
  textosDeEje,
  textosDelPaso,
  textoPerdida,
  tituloCelebracion,
  totalDelBorrador,
  type PasoHistoria,
} from "@/lib/historia-producto";
import { resumenDescripcion } from "@/lib/hoja-producto";
import { resumenDelPlan } from "@/lib/plan-catalogo";
import { copiarTexto } from "@/lib/portapapeles";
import {
  agregarValor,
  alternarValor,
  atajosDe,
  claveVariante,
  COSAS_QUE_CAMBIAN,
  ejeDeFoto,
  errorDeEjes,
  errorDeNombrePropio,
  LARGO_VALOR,
  listaDeCosas,
  MAX_EJES,
  MAX_VALORES,
  ordenarValores,
  otroDe,
  preciosVarian,
  resumenDe,
  textoPresentaciones,
  valoresSugeridos,
  valoresVisibles,
  type EstadoPresentaciones,
  type Presentacion,
} from "@/lib/presentaciones";
import { cuentaParaPublicar, enlaceAlPublicar, productosQueCuentan } from "@/lib/publicar-catalogo";
import { CAMPOS_POR_RUBRO, OPCIONES_TIPICAS, rubrosDeTienda, type Detalles, type Rubro } from "@/lib/rubros";
import type { FotosPorValor, OpcionProducto, Producto } from "@/lib/types";
import { productoPublicoDeBorrador, tiendaPublicaDe } from "@/lib/vista-previa-producto";
import { Foto } from "../foto";
import { Hoja, HojaFijoAbajo, PieFlotante, useAvisarAlSalir } from "../hoja";
import { CuerpoCargando, CuerpoConError } from "../hoja-estado";
import { IconoCamara } from "../iconos";
import { MENSAJE_VISTA_PREVIA, type DatosVistaPrevia } from "../tienda/vista-previa-reel";
import { useToast } from "../toast";
import { Alerta, Boton, Campo, Cantidad, Chip, Eleccion, FilaInterruptor } from "../ui";
import { clases, FOCO } from "../ui/comunes";
import { SeccionDetalles, sugerenciasDeDetalles } from "./ficha-detalles";
import { agregarFotoAlBorrador, mediosParaGuardar, SeccionMedios, type MedioBorrador } from "./ficha-medios";
import { SeccionDescripcion, SeccionFichaTecnica } from "./ficha-tecnica";
import { BotonAtras } from "./boton-atras-historia";
import { useGuardarProducto } from "./guardar-producto";
import { HojaColeccion } from "./hoja-producto";
import { SelectorFotos, type FotoBorrador } from "./hoja-presentacion";
import { CuandoLlega, HojaInventarioHistoria, textoInventario } from "./inventario-historia";
import { HojaLoQueVendes } from "./hoja-lo-que-vendes";
import { HojaPublicarCatalogo } from "./hoja-publicar-catalogo";
import { SelectorCatalogo } from "./selector-catalogo";
import { useTaller } from "./taller";

const SIN_PRESENTACIONES: EstadoPresentaciones = { opciones: [], pres: [], fotosColor: {} };

/**
 * Crear producto «como una historia» (docs/prompts/crear-producto-historia.md, referencia `referencias/crear-producto/`): una
 * pregunta por pantalla con barras arriba, la tarjeta «así se verá» que se arma mientras se responde, el reel real al final con
 * los opcionales y «Publicar», y la celebración. Editar sigue con la hoja de producto; el guardado es el mismo
 * (`useGuardarProducto`). Al cerrar vuelve a /catalogo sin perder la búsqueda ni el filtro.
 */
export function HistoriaProducto() {
  const router = useRouter();
  const { getProductos } = useData();
  const { tiendaId } = useTiendaActiva();
  const [abierta, setAbierta] = useState(true);
  const cerrar = useCallback(() => setAbierta(false), []);
  const alSalir = useCallback(() => router.push("/catalogo", { scroll: false }), [router]);
  const { data: consultados, error, reintentar } = useConsulta(`productos:${tiendaId}`, () => getProductos(tiendaId));
  // Los creados en esta historia cuentan ya, aunque la consulta aún no los traiga: el límite del plan no se salta con «Agregar otro».
  const [creados, setCreados] = useState<Producto[]>([]);
  const productos = useMemo(() => (consultados ? conLosCreados(consultados, creados) : undefined), [consultados, creados]);
  const [paso, setPaso] = useState<PasoHistoria>("foto");
  // «Agregar otro» empieza una historia nueva (otro borrador) en la misma hoja.
  const [vuelta, setVuelta] = useState(0);
  // Un producto nuevo siempre es «producto»: hoy no se crean servicios desde la app. Si llegan, se salta el stock.
  const servicio = false;
  // Con presentaciones («Tiene tallas o colores»): cuántas cosas cambian (0 mientras no se elige ninguna). null = sin presentaciones.
  const [variantes, setVariantes] = useState<number | null>(null);
  const atrasDeLaHistoria = useRef<(() => boolean) | null>(null);
  const pasos = pasosDeHistoria(servicio, variantes);
  const llenas = barrasLlenas(paso, servicio, variantes);
  // Con varios catálogos, el selector va a la derecha de «Nuevo producto» (lo pinta la historia por portal).
  const [ranuraCatalogo, setRanuraCatalogo] = useState<HTMLSpanElement | null>(null);
  const barras = (
    <div role="progressbar" aria-label="Avance" aria-valuemin={1} aria-valuemax={pasos.length} aria-valuenow={llenas} className="flex min-w-0 items-center gap-1" data-barras-historia="">
      {pasos.map((p, i) => (
        <span key={p} className={clases("h-1 flex-1 rounded-full", i < llenas ? "bg-accion" : "bg-borde-pastilla")} />
      ))}
    </div>
  );
  return (
    <Hoja
      abierta={abierta} alCerrar={cerrar} alSalir={alSalir} protegerAtras titulo="Nuevo producto" altura="grande"
      historia={{ avance: barras, alLadoDelTitulo: <span ref={setRanuraCatalogo} className="contents" /> }}
      // Atrás del teléfono: lo mismo que «‹» (vuelve una pregunta sin perder nada); en la primera (o ya guardado) cierra como siempre.
      alVolverInterno={() => atrasDeLaHistoria.current?.() ?? false}
    >
      {error ? (
        <CuerpoConError alCerrar={alSalir} alReintentar={reintentar} textoVolver="Volver al catálogo" />
      ) : !productos ? (
        <CuerpoCargando titulo="productos" />
      ) : (
        <Historia
          key={`${tiendaId}:${vuelta}`} paso={paso} alCambiarPaso={setPaso} servicio={servicio} productos={productos} ranuraCatalogo={ranuraCatalogo}
          variantes={variantes} alCambiarVariantes={setVariantes} alCrear={(p) => setCreados((l) => [...l, p])} atrasRef={atrasDeLaHistoria}
          alOtro={() => { setVuelta((v) => v + 1); setPaso("foto"); setVariantes(null); }}
        />
      )}
    </Hoja>
  );
}

type Opcional = "descripcion" | "coleccion" | "ficha" | "detalles";

function Historia({
  paso,
  alCambiarPaso,
  servicio,
  productos,
  alOtro,
  ranuraCatalogo,
  variantes,
  alCambiarVariantes,
  alCrear,
  atrasRef,
}: {
  alCrear: (p: Producto) => void;
  /** Donde la historia deja su «atrás» para el del teléfono (la hoja lo llama). */
  atrasRef: React.MutableRefObject<(() => boolean) | null>;
  ranuraCatalogo: HTMLElement | null;
  variantes: number | null;
  alCambiarVariantes: (n: number | null) => void;
  paso: PasoHistoria;
  alCambiarPaso: (p: PasoHistoria) => void;
  servicio: boolean;
  productos: Producto[];
  alOtro: () => void;
}) {
  const { publicarMiCatalogo } = useData();
  const { puede, porque, esDuena } = usePermisos();
  const sinCatalogo = !puede("catalogo");
  const { tienda } = useTiendaActiva();
  const toast = useToast();
  const taller = useTaller(null, toast);
  const guardado = useGuardarProducto(null, taller);
  const raiz = useRef<HTMLDivElement>(null);

  // Tipo de producto (catálogo): solo con más de un rubro. Sale con el catálogo que se estaba viendo (como la hoja de producto).
  const rubro = tienda?.rubro ?? "general";
  const tipos = tienda ? rubrosDeTienda(tienda) : [rubro];
  const variosTipos = tipos.length > 1;
  const [tipoElegido, setTipo] = useState<Rubro | null>(null);
  // Sale con el último catálogo en el que se creó (por tienda); si no hay, el que se estaba viendo en Catálogo.
  const tipoBase: Rubro = tienda ? (leerCatalogoAlCrear(tienda.id, tipos) ?? rubroInicialDeProducto(tienda, leerCatalogoActivo(tienda.id))) : rubro;
  // El catálogo elegido se recuerda solo al crear de verdad (en `guardar`): un borrador abandonado no cambia el de la próxima vez.
  const elegirTipo = (r: Rubro) => setTipo(r);
  const tipo: Rubro = tipoElegido && tipos.includes(tipoElegido) ? tipoElegido : tipos.includes(tipoBase) ? tipoBase : rubro;
  const [vendiendoOtra, setVendiendoOtra] = useState(false);

  const [medios, setMedios] = useState<MedioBorrador[]>([]);
  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState("");
  const [stock, setStock] = useState(1);
  const [porEncargo, setPorEncargo] = useState(false);
  const [encargoTexto, setEncargoTexto] = useState("");
  // Presentaciones como historia: las cosas que cambian (en el orden en que se eligieron) con sus valores, y lo del Inventario.
  const [ejes, setEjes] = useState<EjeHistoria[]>([]);
  /** «Otra» en la pregunta del precio: «¿En qué cambia?» abre con el campo de «+ Otra» listo. */
  const [abrirOtra, setAbrirOtra] = useState(false);
  const [presBorrador, setPresBorrador] = useState<Presentacion[]>([]);
  const [quitadas, setQuitadas] = useState<string[]>([]);
  const [fotosColor, setFotosColor] = useState<Record<string, string>>({});
  const [inventarioAbierto, setInventarioAbierto] = useState(false);
  const [inventarioListo, setInventarioListo] = useState(false);
  const [quitarValor, setQuitarValor] = useState<{ eje: string; valores: string[]; quitados: string[]; texto: string } | null>(null);
  const [sumarEje, setSumarEje] = useState<{ nuevos: EjeHistoria[]; nombre: string; texto: string; borrador: Presentacion[] } | null>(null);
  const [fotoDe, setFotoDe] = useState<string | null>(null);
  const [detalles, setDetalles] = useState<Detalles>({});
  const [ficha, setFicha] = useState<BorradorFicha>({ tipo: "igual" });
  const [categoria, setCategoria] = useState<string | null>(null);
  const [nuevaColeccion, setNuevaColeccion] = useState<string | null>(null);
  const [opcional, setOpcional] = useState<Opcional | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [hecho, setHecho] = useState<{ producto: Producto; visible: boolean; cuentan: number } | null>(null);
  const [publicando, setPublicando] = useState(false);

  const conVariantes = variantes !== null;
  // Lo que se guarda: las cosas con valores (el color primero) y una presentación por combinación; las que ya tenían cantidad o
  // precio la conservan, las nuevas empiezan en 0 y las quitadas en su detalle no vuelven.
  const opcionesFinales: OpcionProducto[] = ordenParaGuardar(ejes)
    .map((e) => ({ nombre: e.nombre, valores: e.propia ? e.valores : ordenarValores(valoresSugeridos(e.nombre, tipo), e.valores) }))
    .filter((o) => o.valores.length > 0);
  const presentaciones: EstadoPresentaciones = !conVariantes || opcionesFinales.length !== ejes.length || ejes.length === 0
    ? SIN_PRESENTACIONES
    : {
        opciones: opcionesFinales,
        pres: crearConHerencia(opcionesFinales, presBorrador).filter((p) => !estaQuitada(quitadas, p.valores)),
        fotosColor: Object.fromEntries(Object.entries(fotosColor).filter(([v]) => opcionesFinales.some((o) => esEjeColor(o.nombre) && o.valores.includes(v)))),
      };
  const tieneOpciones = presentaciones.opciones.length > 0 && presentaciones.pres.length > 0;
  const preguntasEjes = ordenDePreguntas(ejes);
  const resumenPres = resumenDe(presentaciones.pres, Number(precio) || 0);
  const varia = tieneOpciones && preciosVarian(presentaciones.pres, Number(precio) || 0);
  const coleccionElegida = nuevaColeccion !== null ? nuevaColeccion.trim() || null : categoria;
  const colecciones = useMemo(() => [...new Set(productos.map((p) => p.categoria).filter((c): c is string => Boolean(c)))].sort((a, b) => a.localeCompare(b, "es")), [productos]);
  const sugerencias = useMemo(() => sugerenciasDeDetalles(productos.map((p) => p.detalles)), [productos]);
  const descripcion = typeof detalles.descripcion === "string" ? detalles.descripcion : "";
  // Los Detalles se validan con el rubro principal de la tienda: solo se ofrecen si el producto va en ese catálogo.
  const conDetalles = tienda != null && tipo === tienda.rubro && CAMPOS_POR_RUBRO[tienda.rubro].length > 0;
  // Lo que se guarda (y ve la vista previa): los Detalles del rubro solo en su catálogo; la descripción, siempre.
  const detallesFinales = detallesParaGuardar(detalles, conDetalles);
  const fotos = mediosParaGuardar(medios).filter((m) => m.tipo === "foto");
  const portada = fotos[0]?.url ?? null;
  const preparando = medios.some((m) => m.tipo === "video" && typeof m.progreso === "number");
  // El plan cuenta solo los visibles: con el catálogo lleno, el producto nuevo se guarda oculto.
  const llenoPlan = tienda != null && resumenDelPlan(productos, tienda.limiteProductos).estado === "lleno";

  // Con algo escrito y sin guardar, cerrar pregunta (como la hoja de producto). Ya guardado, no.
  const firma = JSON.stringify({ medios: medios.length, nombre, precio, stock, porEncargo, encargoTexto, ejes, presBorrador, detalles, ficha: ficha.tipo, coleccionElegida, tipoElegido });
  const [firmaInicial] = useState(firma);
  // El aviso cuenta solo lo que se pierde de verdad: las fotos subidas y las presentaciones armadas.
  const nFotos = fotos.length;
  const nPres = tieneOpciones ? presentaciones.pres.length : 0;
  const textoAviso = [
    "Lo que escribiste se va a perder.",
    nFotos > 0 ? (nFotos === 1 ? "La foto que subiste se va a descartar." : `Las ${nFotos} fotos que subiste se van a descartar.`) : null,
    nPres > 0 ? (nPres === 1 ? "Se va a perder la presentación y sus cantidades." : `Se van a perder las ${nPres} presentaciones y sus cantidades.`) : null,
  ].filter(Boolean).join(" ");
  useAvisarAlSalir(paso !== "listo" && firma !== firmaInicial, { texto: textoAviso });

  /** Cambia de pregunta en el mismo toque y pone el foco en su campo (o en su título): reglas de teclado del iPhone. */
  const irA = (p: PasoHistoria) => {
    flushSync(() => alCambiarPaso(p));
    const campo = raiz.current?.querySelector<HTMLInputElement>("[data-campo-paso]");
    if (campo) {
      campo.focus();
      // En pantallas cortas, el campo queda a la vista sobre la barra de abajo (la hoja la cuenta en su scroll-padding).
      campo.scrollIntoView({ block: "nearest" });
    } else raiz.current?.querySelector<HTMLElement>("[data-titulo-paso]")?.focus();
  };
  // La cosa de la pantalla en que se está (eje1 / eje2) y si es la última pantalla de valores (la que abre el Inventario).
  const ejeDelPaso = paso === "eje1" ? preguntasEjes[0] : paso === "eje2" ? preguntasEjes[1] : undefined;
  const ultimoEje = ejeDelPaso !== undefined && ejeDelPaso === preguntasEjes[preguntasEjes.length - 1];
  const errorEjes = ultimoEje ? errorDeEjes(opcionesFinales) : null;
  const inventarioLleno = inventarioCompleto(presentaciones.pres, porEncargo, encargoTexto);
  const listoParaSeguir =
    paso === "cambia" ? ejes.length > 0
    : ejeDelPaso ? ejeDelPaso.valores.length > 0 && errorEjes === null
    : puedeSeguir(paso, { nombre, precio, porEncargo, encargoTexto, stock });
  const seguir = () => {
    if (!listoParaSeguir) return;
    // Desde la última pantalla de valores: el Inventario (otra hoja encima) hasta que quede listo; después, «Así se ve».
    if (ultimoEje && (!inventarioListo || !inventarioLleno)) return setInventarioAbierto(true);
    irA(pasoSiguiente(paso, servicio, variantes));
  };
  const atras = (): boolean => {
    const a = pasoAnterior(paso, servicio, variantes);
    if (!a) return false;
    if (paso === "cambia" && ejes.length === 0) {
      // Sin nada que cambie, el producto vuelve a un solo stock: lo que había en el Inventario queda como su stock.
      const total = totalDelBorrador(presBorrador);
      flushSync(() => {
        alCambiarVariantes(null);
        if (total > 0) setStock(total);
        setPresBorrador([]);
        setQuitadas([]);
        setInventarioListo(false);
      });
    }
    irA(a);
    return true;
  };
  useEffect(() => {
    atrasRef.current = atras;
  });
  /**
   * «¿Viene en varias opciones?»: siete barras en el mismo toque y «¿En qué cambia?». Con el nombre de una pastilla, solo esa cosa
   * ya marcada; con `null` («Otra»), nada marcado y el campo de «+ Otra» listo. Sin argumento (el resumen «Cambiar»), lo que ya había.
   */
  const abrirVariantes = (cosa?: string | null) => {
    if (sinCatalogo) return toast(porque);
    const iniciales: EjeHistoria[] = cosa === undefined ? ejes : cosa === null ? [] : [{ nombre: cosa, valores: [], propia: false }];
    flushSync(() => {
      setEjes(iniciales);
      setAbrirOtra(cosa === null);
      alCambiarVariantes(iniciales.length);
    });
    irA("cambia");
  };
  const aplicarEjes = (nuevos: EjeHistoria[]) => {
    setEjes(nuevos);
    alCambiarVariantes(nuevos.length);
  };
  const cambiarEjes = (nuevos: EjeHistoria[]) => {
    const quedan = nuevos.map((e) => e.nombre);
    const sale = ejes.some((e) => !quedan.includes(e.nombre));
    const entra = nuevos.find((e) => !ejes.some((x) => x.nombre === e.nombre));
    if (sale && nuevos.length > 0) {
      // Dejar de cambiar por una cosa no pierde lo puesto en el Inventario: se suma en lo que queda (las quitadas siguen fuera).
      const todas = crearConHerencia(presentaciones.opciones, presBorrador);
      const r = quitarEje(todas.length > 0 ? todas : presBorrador, quitadas, quedan);
      setPresBorrador(r.pres);
      setQuitadas(r.quitadas);
    }
    // Lo que había para repartir: el Inventario de ahora o, si se quitaron todas las cosas y se elige otra, lo que quedó guardado.
    const previas = ejes.length > 0 ? (tieneOpciones ? presentaciones.pres : []) : presBorrador;
    const ejesPrevios = Object.keys(previas[0]?.valores ?? {});
    const mismos = ejesPrevios.length === quedan.length && quedan.every((n) => ejesPrevios.includes(n));
    if (entra && previas.length > 0 && !mismos) {
      // Sumar una cosa reparte de nuevo: lo puesto vuelve a 0 (lo quitado sigue quitado y lo oculto, oculto). Si había algo, se pregunta antes.
      const unidades = totalDelBorrador(previas);
      const precios = previas.filter((p) => p.precio !== null).length;
      const borrador = borradorAlSumarEje(previas);
      if (unidades > 0 || precios > 0) {
        const texto = `${unidades === 1 ? "La 1 que pusiste en el Inventario vuelve a 0" : unidades > 0 ? `Las ${unidades} que pusiste en el Inventario vuelven a 0` : "Los precios propios se quitan"} para ponerlas por ${quedan.map((n) => n.toLocaleLowerCase("es")).join(" y ")}.`;
        return setSumarEje({ nuevos, nombre: entra.nombre, texto, borrador });
      }
      setPresBorrador(borrador);
    }
    aplicarEjes(nuevos);
  };
  const ponerValores = (nombreEje: string, valores: string[]) => {
    const antes = ejes.find((e) => e.nombre === nombreEje)?.valores ?? [];
    setEjes((l) => l.map((e) => (e.nombre === nombreEje ? { ...e, valores } : e)));
    setQuitadas((q) => quitadasTrasCambiar(q, nombreEje, antes, valores));
    // Lo de un valor quitado se pierde de verdad (cantidades y precios): si se vuelve a elegir, empieza en 0.
    const fuera = antes.filter((v) => !valores.includes(v));
    if (fuera.length > 0) {
      setPresBorrador((l) => l.filter((p) => !fuera.includes(p.valores[nombreEje] ?? "")));
      // La foto de un color quitado también se va: si se vuelve a elegir, se elige otra vez.
      if (esEjeColor(nombreEje)) setFotosColor((f) => Object.fromEntries(Object.entries(f).filter(([v]) => !fuera.includes(v))));
    }
  };
  /** Quitar un valor que ya tiene cantidades pregunta antes: esas unidades se pierden. */
  /**
   * Cambia los valores de una cosa (un toque o un atajo como «Única»): si alguno que se quita tiene cantidades (aunque estén
   * escondidas por encargo) o precios propios, se pregunta antes, porque se pierden.
   */
  const ponerValoresConAviso = (eje: EjeHistoria, valores: string[]) => {
    const quitados = eje.valores.filter((v) => !valores.includes(v));
    const pierde = quitados.map((v) => loQueSePierde(presentaciones.pres, eje.nombre, v)).reduce((t, x) => ({ unidades: t.unidades + x.unidades, precios: t.precios + x.precios }), { unidades: 0, precios: 0 });
    if (pierde.unidades > 0 || pierde.precios > 0) return setQuitarValor({ eje: eje.nombre, valores, quitados, texto: textoPerdida(pierde) });
    ponerValores(eje.nombre, valores);
  };
  const alternarValorDe = (eje: EjeHistoria, valor: string) => ponerValoresConAviso(eje, alternarValor(eje.valores, valor));
  const cambiarPres = (lista: Presentacion[]) => {
    const quedan = new Set(lista.map((p) => claveVariante(p.valores)));
    setQuitadas((q) => [...q, ...presentaciones.pres.map((p) => claveVariante(p.valores)).filter((k) => !quedan.has(k) && !q.includes(k))]);
    setPresBorrador(lista);
  };
  const fotosDelBorrador = medios.flatMap((m) => (m.tipo === "foto" ? [{ id: m.id, url: m.url }] : []));
  const alEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    seguir();
  };

  const elegirEncargo = (activo: boolean) => setPorEncargo(activo);
  /** Por encargo no se lleva stock: tampoco en las presentaciones (si no, el catálogo las vería disponibles). */
  const presentacionesFinales: EstadoPresentaciones = !tieneOpciones
    ? SIN_PRESENTACIONES
    : porEncargo
      ? { ...presentaciones, pres: presentaciones.pres.map((p) => ({ ...p, stock: 0 })) }
      : presentaciones;

  const guardar = async (publicar: boolean) => {
    if (guardando || !tienda) return;
    if (sinCatalogo) {
      toast(porque);
      return;
    }
    // Con presentaciones, nunca se guarda sin una a la vista (ni sin cantidades o plazo), aunque algo se colara hasta aquí.
    if (conVariantes && !inventarioLleno) {
      setInventarioAbierto(true);
      return;
    }
    const visible = publicar && !llenoPlan;
    setGuardando(true);
    const r = await guardado.crear(
      {
        nombre, precio, medios, stock: porEncargo ? 0 : stock, presentaciones: presentacionesFinales, detalles: detallesFinales, ficha,
        coleccion: coleccionElegida, porEncargo: !servicio && porEncargo, encargoTexto, rubro: variosTipos ? tipo : null, activo: visible,
      },
    );
    setGuardando(false);
    if (!r) return;
    alCrear(r.producto);
    if (variosTipos) guardarCatalogoAlCrear(tienda.id, tipo);
    // Lo que dice la celebración ya es el aviso de siempre; solo se avisa aparte lo que trae algo más (taller, ficha).
    if (!r.comun) toast(r.mensaje);
    const otros = productos.filter((p) => p.id !== r.producto.id);
    setHecho({ producto: r.producto, visible, cuentan: productosQueCuentan(otros) + (cuentaParaPublicar(r.producto) ? 1 : 0) });
    irA("listo");
  };

  /** El borrador como lo vería quien compra: lo que el reel del paso «Así se ve» recibe. */
  const datosVista = (): DatosVistaPrevia | null => {
    if (!tienda) return null;
    const medioDeId = new Map(medios.flatMap((m) => (m.tipo === "foto" ? [[m.id, m.url] as const] : [])));
    const ejeFoto = ejeDeFoto(tieneOpciones ? presentaciones.opciones : []);
    const fotosPorValor: FotosPorValor = {};
    if (ejeFoto) {
      for (const [valor, id] of Object.entries(presentaciones.fotosColor)) {
        const url = medioDeId.get(id);
        if (url && ejeFoto.valores.includes(valor)) (fotosPorValor[ejeFoto.nombre] ??= {})[valor] = url;
      }
    }
    return {
      tienda: tiendaPublicaDe(tienda),
      producto: productoPublicoDeBorrador({
        nombre, precio: Number(precio) || 0, medios: mediosParaGuardar(medios), detalles: detallesFinales, opciones: tieneOpciones ? presentaciones.opciones : [],
        presentaciones: presentacionesFinales.pres, stock: porEncargo ? 0 : stock, porEncargo, encargoTexto, categoria: coleccionElegida, rubro: tipo,
        fotosPorValor, fichaUrl: fichaVisible(null, ficha) && ficha.tipo === "nueva" ? ficha.foto : null,
      }),
    };
  };

  const textos = ejeDelPaso ? textosDeEje(ejeDelPaso.nombre, paso === "eje2") : textosDelPaso(paso, porEncargo);
  const desde = tieneOpciones && resumenPres.desde !== null ? resumenPres.desde : Number(precio) || 0;
  const precioTarjeta = (conVariantes || varia) && desde > 0 ? `Desde ${formatearPesos(desde)}` : Number(precio) > 0 ? formatearPesos(Number(precio)) : null;
  const pregunta = paso === "nombre" || paso === "precio" || paso === "stock";
  const preguntaEjes = paso === "cambia" || paso === "eje1" || paso === "eje2";
  // Sin foto no se publica (regla de Lewis): se puede guardar como borrador oculto y agregarla después.
  const sinFoto = portada === null;
  // La pregunta y su línea de ayuda, como el lienzo: Fredoka 26 y 15 px, 12 px debajo de la tarjeta.
  const encabezado = (
    <div className="mt-3">
      <h2 tabIndex={-1} data-titulo-paso="" className="font-display text-[1.625rem] leading-[1.1] text-texto outline-none">{textos.titulo}</h2>
      <p className="mt-[5px] text-[0.9375rem] text-texto-secundario">{textos.ayuda}</p>
    </div>
  );
  /** «Atrás» va siempre abajo, a la izquierda del botón principal (apagado en la primera pregunta). */
  const botonAtras = <BotonAtras alTocar={atras} apagado={pasoAnterior(paso, servicio, variantes) === null} />;
  const pie = (contenido: ReactNode, aviso?: ReactNode) => (
    <HojaFijoAbajo>
      {/* Sin recuadro: los botones flotan sobre un desenfoque progresivo (PieFlotante). Arriba deja lo justo del lienzo
          (6 px en «Así se ve», 10 en las preguntas); un aviso va completo encima de los botones, en su propia píldora. */}
      <PieFlotante className={clases("flex flex-col gap-2.5", paso === "vista" ? "pt-1.5" : "pt-2.5")} data-pie-historia="">
        {aviso}
        {contenido}
      </PieFlotante>
    </HojaFijoAbajo>
  );

  return (
    <div ref={raiz} className="flex flex-col" data-historia-producto="" data-paso={paso}>
      {variosTipos && paso !== "listo" && tienda && ranuraCatalogo &&
        // El catálogo no es una pregunta: va en la cabecera, junto a las barras, y recuerda el último usado (por tienda).
        createPortal(
          <SelectorCatalogo
            tipos={tipos} valor={tipo} conteo={contarPorCatalogo(productos, tienda)} tamano="compacto" textoOtra="Vendo otra cosa también"
            alCambiar={(r) => { if (r !== CATALOGO_GENERAL) elegirTipo(r); }} alVenderOtra={() => setVendiendoOtra(true)} deshabilitado={guardando}
            sinPermiso={sinCatalogo ? () => toast(porque) : undefined}
          />,
          ranuraCatalogo,
        )}

      {pregunta && (
        <TarjetaAsiSeVera
          portada={portada} nombre={nombre} precio={precioTarjeta}
          llega={paso === "stock" && porEncargo && encargoTexto.trim() ? encargoTexto.trim() : null}
        />
      )}

      {preguntaEjes && <TarjetaPresentaciones portada={portada} nombre={nombre} precio={precioTarjeta} opciones={opcionesFinales} />}

      {paso === "cambia" && (
        <>
          <div className="mt-3.5">
            <h2 tabIndex={-1} data-titulo-paso="" className="font-display text-[1.625rem] leading-[1.1] text-texto outline-none">{textos.titulo}</h2>
            <p className="mt-1 text-[0.9375rem] text-texto-secundario">{textos.ayuda}</p>
          </div>
          <QueCambia rubro={tipo} ejes={ejes} alCambiar={cambiarEjes} avisar={toast} empezarEnOtra={abrirOtra} />
        </>
      )}

      {ejeDelPaso && (
        <>
          <div className="mt-3.5">
            <h2 tabIndex={-1} data-titulo-paso="" className="font-display text-[1.625rem] leading-[1.1] text-texto outline-none">{textos.titulo}</h2>
            <p className="mt-1 text-[0.9375rem] text-texto-secundario">{textos.ayuda}</p>
          </div>
          <ValoresDeEje key={ejeDelPaso.nombre} eje={ejeDelPaso} rubro={tipo} alAlternar={(v) => alternarValorDe(ejeDelPaso, v)} alPoner={(v) => ponerValoresConAviso(ejeDelPaso, v)} />
          {esEjeColor(ejeDelPaso.nombre) && ejeDelPaso.valores.length > 0 && (
            <FotoDeCadaColor valores={ejeDelPaso.valores} fotos={fotosDelBorrador} fotosColor={fotosColor} alAbrir={setFotoDe} />
          )}
          {ultimoEje && errorEjes && <p role="status" className="mt-3 text-secundario font-bold text-atencion-texto">{errorEjes}</p>}
          {ultimoEje && inventarioListo && tieneOpciones && (
            // Al cerrar el Inventario con «Listo», su resumen queda aquí; «Editar» lo vuelve a abrir.
            <section aria-labelledby="titulo-inventario" className="mt-4" data-resumen-inventario="">
              <p id="titulo-inventario" className="mx-0.5 mb-2 text-secundario font-extrabold text-texto-secundario">Inventario</p>
              <div className="flex h-16 items-center gap-2.5 rounded-radio-m border border-linea bg-superficie pr-3 pl-3.5">
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-cuerpo font-extrabold text-texto">{textoPresentaciones(resumenPres.total)} · {textoInventario(resumenPres.enTotal, porEncargo)}</span>
                  <span className="text-[0.8125rem] text-texto-secundario">Cantidades de cada {opcionesFinales.map((o) => o.nombre.toLocaleLowerCase("es")).reverse().join(" y ")}</span>
                </span>
                <Boton jerarquia="secundario" tamano="compacto" onClick={() => setInventarioAbierto(true)}>Editar</Boton>
              </div>
            </section>
          )}
        </>
      )}

      {paso === "foto" && (
        <>
          <MarcoFoto portada={portada} total={fotos.length} />
          {medios.length === 0 && encabezado}
          <div className={medios.length === 0 ? "mt-3.5" : "mt-2"}>
            <SeccionMedios medios={medios} alCambiar={setMedios} taller={taller} avisar={toast} historia />
          </div>
          {/* El momento de voz de la foto, al final de la pantalla: sin regañar (se puede seguir sin ella). */}
          <p className="mt-2 text-center font-mano text-[1.625rem] leading-[1.1] text-atencion-texto" data-con-foto="">{SIN_FOTO}</p>
          {/* Debajo irá «Pedir a Deslizapp que retoque tu foto» (ronda futura): se deja el sitio. */}
          {medios.length > 0 && <div aria-hidden="true" className="mt-1 h-9" data-hueco-retoque="" />}
        </>
      )}

      {paso === "nombre" && (
        <>
          {encabezado}
          <Campo
            className="mt-3" grande etiqueta="Nombre del producto" value={nombre} onChange={(e) => setNombre(e.target.value)}
            maxLength={120} enterKeyHint="next" onKeyDown={alEnter} data-campo-paso=""
          />
        </>
      )}

      {paso === "precio" && (
        <>
          {encabezado}
          {varia && resumenPres.desde !== null ? (
            <p className="mt-4 text-destacado text-texto" data-precio-desde="">Varía por presentación · desde {formatearPesos(resumenPres.desde)}</p>
          ) : (
            <Campo
              className="mt-3" grande etiqueta="Precio" aria-label="Precio (RD$)" prefijo="RD$" inputMode="numeric" enterKeyHint="next" onKeyDown={alEnter}
              precio={{ digitos: precio, alCambiar: setPrecio }} placeholder="Escribe tu precio" data-precio="" data-campo-paso=""
            />
          )}
          {/* «¿Viene en varias opciones?» aparece cuando ya hay precio (nada antes de tiempo). */}
          {(Number(precio) > 0 || conVariantes) && (
            <div className="mt-4" data-chip-presentaciones="">
              {tieneOpciones ? (
                <div className="flex items-center justify-between gap-3" data-resumen-opciones="">
                  <p className="text-destacado text-texto">{ejes.map((e) => e.nombre).join(" · ")}</p>
                  <Chip hecho onClick={() => abrirVariantes()}>Cambiar</Chip>
                </div>
              ) : (
                <>
                  <h2 className="text-titulo-seccion text-texto" data-pregunta-opciones="">¿Viene en varias opciones?</h2>
                  <div role="group" aria-label="¿Viene en varias opciones?" className="mt-2.5 flex flex-wrap gap-2">
                    {OPCIONES_TIPICAS[tipo].slice(0, MAX_EJES).map((cosa) => (
                      <Eleccion key={cosa} accion elegida={false} onClick={() => abrirVariantes(cosa)}>{cosa}</Eleccion>
                    ))}
                    <Eleccion accion elegida={false} onClick={() => abrirVariantes(null)}>Otra</Eleccion>
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}

      {paso === "stock" && (
        <>
          {encabezado}
          {porEncargo ? (
            <div className="mt-3.5 flex flex-col gap-3">
              <FilaInterruptor texto="Es por encargo, no llevo stock" encendido alCambiar={elegirEncargo} />
              <CuandoLlega texto={encargoTexto} alCambiar={setEncargoTexto} alEnter={alEnter} />
            </div>
          ) : (
            <>
              <div className="mt-2.5 flex justify-center" data-contador-stock="">
                <Cantidad grande valor={stock} max={2147483647} alCambiar={setStock} etiquetaQuitar="Quitar uno" etiquetaAgregar="Agregar uno" />
              </div>
              <div className="mt-1.5">
                <FilaInterruptor texto="Es por encargo, no llevo stock" encendido={false} alCambiar={elegirEncargo} />
              </div>
            </>
          )}
        </>
      )}

      {paso === "vista" && (
        <>
          <h2 tabIndex={-1} data-titulo-paso="" className="-mt-1 font-mano text-[1.625rem] leading-tight text-atencion-texto outline-none">{textos.titulo}</h2>
          <ReelEnVivo datos={datosVista} />
          <section aria-labelledby="titulo-brillar" className="mt-1 flex flex-col gap-0.5">
            {sinFoto ? (
              <p id="titulo-brillar" className="text-secundario leading-[18px] font-extrabold text-atencion-texto" data-falta-foto="">
                Agrega una foto para publicar ·{" "}
                <button type="button" className={clases("tocable font-extrabold underline-offset-2 hover:underline", FOCO)} onClick={() => irA("foto")}>Volver a la foto</button>
              </p>
            ) : (
              <h3 id="titulo-brillar" className="text-secundario leading-[18px] font-extrabold text-texto-secundario">Hazlo brillar · opcional</h3>
            )}
            {/* En una fila, como el lienzo; si no caben (con «Detalles»), se desliza. */}
            <div className="-mx-5 flex gap-1.5 overflow-x-auto px-5 py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" data-opcionales="">
              <PastillaOpcional texto="Descripción" hecha={descripcion.trim().length > 0} detalle={resumenDescripcion(descripcion)} alTocar={() => setOpcional("descripcion")} />
              <PastillaOpcional texto="Colección" hecha={coleccionElegida !== null} detalle={coleccionElegida} alTocar={() => setOpcional("coleccion")} />
              <PastillaOpcional texto="Ficha técnica" hecha={fichaCambiada(ficha)} alTocar={() => setOpcional("ficha")} />
              {conDetalles && <PastillaOpcional texto="Detalles" hecha={tieneDetallesPorRubro(detalles)} alTocar={() => setOpcional("detalles")} />}
            </div>
          </section>
          {sinCatalogo && <p className="mt-4 rounded-radio-m bg-atencion-suave p-3 text-center text-secundario font-bold text-atencion-texto" data-sin-permiso="">{porque}</p>}
        </>
      )}

      {paso === "listo" && hecho && <Celebracion producto={hecho.producto} visible={hecho.visible} cuentan={hecho.cuentan} />}

      {paso === "foto" &&
        pie(
          // Primer paso: sin «‹» (no hay a dónde volver); el botón principal ocupa todo el pie y queda centrado.
          <div className="flex items-center gap-2.5">
            {medios.length === 0 ? (
              <Boton jerarquia="terciario" tamano="grande" className="flex-1" onClick={seguir}>Seguir sin foto</Boton>
            ) : (
              <Boton tamano="grande" className="flex-1" onClick={seguir}>Seguir</Boton>
            )}
          </div>,
        )}
      {(paso === "nombre" || paso === "precio" || paso === "stock" || preguntaEjes) &&
        pie(
          <div className="flex items-center gap-2.5">
            {botonAtras}
            <Boton tamano="grande" className="flex-1" deshabilitado={!listoParaSeguir} onClick={seguir}>Seguir</Boton>
          </div>,
        )}
      {paso === "vista" &&
        pie(
          // Como el lienzo: ‹ y «Publicar» (la llamada emocional) en una fila, y «Guardar sin publicar» debajo.
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2.5">
              {botonAtras}
              <Boton
                jerarquia="resalte" tamano="grande" className="flex-1" cargando={guardando}
                deshabilitado={sinFoto || llenoPlan || sinCatalogo || preparando} onClick={() => guardar(true)}
              >
                Publicar
              </Boton>
            </div>
            <Boton jerarquia="terciario" className="h-9!" anchoCompleto deshabilitado={guardando || sinCatalogo || preparando} onClick={() => guardar(false)}>Guardar sin publicar</Boton>
          </div>,
          llenoPlan && !sinFoto ? <p role="status" className="rounded-radio-m bg-fondo/90 px-3 py-1.5 text-center text-secundario text-texto-secundario" data-catalogo-lleno="">Tu catálogo está lleno. Lo guardamos oculto hasta que hagas espacio.</p> : undefined,
        )}
      {paso === "listo" &&
        hecho &&
        pie(
          <div className="flex flex-col gap-2.5">
            <Boton tamano="grande" anchoCompleto onClick={alOtro}>Agregar otro</Boton>
            {tienda && <CompartirCatalogo tiendaNombre={tienda.nombre} alPublicar={() => (esDuena ? setPublicando(true) : toast(porque))} />}
          </div>,
        )}

      {guardado.bienvenidaRetoque}
      {vendiendoOtra && tienda && <HojaLoQueVendes tienda={tienda} alCerrar={() => setVendiendoOtra(false)} />}
      {conVariantes && (
        <HojaInventarioHistoria
          abierta={inventarioAbierto} alCerrar={() => setInventarioAbierto(false)}
          alListo={() => { setInventarioListo(true); setInventarioAbierto(false); }}
          estado={presentaciones} alCambiarPres={cambiarPres}
          alElegirFoto={(valor, id) => setFotosColor((f) => (id ? { ...f, [valor]: id } : Object.fromEntries(Object.entries(f).filter(([v]) => v !== valor))))}
          precioProducto={Number(precio) || 0} porEncargo={porEncargo} encargoTexto={encargoTexto}
          alCambiarEncargo={setPorEncargo} alCambiarEncargoTexto={setEncargoTexto} fotos={fotosDelBorrador} avisar={toast}
        />
      )}
      <HojaFotoDeColor
        valor={fotoDe} fotos={fotosDelBorrador} fotosColor={fotosColor} alCerrar={() => setFotoDe(null)}
        alElegir={(valor, id) => setFotosColor((f) => (id ? { ...f, [valor]: id } : Object.fromEntries(Object.entries(f).filter(([v]) => v !== valor))))}
        alSubir={(archivo) => agregarFotoAlBorrador(archivo, medios, setMedios, toast)}
      />
      <Alerta
        abierta={sumarEje !== null}
        titulo={`¿Sumar ${sumarEje?.nombre ?? ""}?`}
        descripcion={sumarEje?.texto ?? ""}
        alCancelar={() => setSumarEje(null)}
        accion={{
          texto: "Sumar", tono: "peligro",
          alConfirmar: () => {
            const q = sumarEje!;
            setSumarEje(null);
            setPresBorrador(q.borrador);
            aplicarEjes(q.nuevos);
          },
        }}
      />
      <Alerta
        abierta={quitarValor !== null}
        titulo={`¿Quitar ${quitarValor?.quitados.join(", ") ?? ""}?`}
        descripcion={quitarValor?.texto ?? ""}
        alCancelar={() => setQuitarValor(null)}
        accion={{
          texto: "Quitar", tono: "peligro",
          alConfirmar: () => {
            const q = quitarValor!;
            setQuitarValor(null);
            ponerValores(q.eje, q.valores);
          },
        }}
      />
      <HojaOpcional abierta={opcional === "descripcion"} titulo="Descripción" grande alCerrar={() => setOpcional(null)}>
        <SeccionDescripcion
          valor={descripcion}
          alCambiar={(texto) => setDetalles((d) => {
            const { descripcion: _viejo, ...resto } = d;
            void _viejo;
            return texto.trim() ? { ...resto, descripcion: texto } : resto;
          })}
          deshabilitado={sinCatalogo} alTocarBloqueado={() => toast(porque)} sinTitulo
        />
      </HojaOpcional>
      <HojaOpcional abierta={opcional === "ficha"} titulo="Ficha técnica" alCerrar={() => setOpcional(null)}>
        <SeccionFichaTecnica sinTitulo actual={null} borrador={ficha} alCambiar={setFicha} sinPermiso={sinCatalogo} porque={porque} avisar={toast} />
      </HojaOpcional>
      {conDetalles && tienda && (
        <HojaOpcional abierta={opcional === "detalles"} titulo="Detalles" grande alCerrar={() => setOpcional(null)}>
          <SeccionDetalles rubro={tienda.rubro} detalles={detalles} alCambiar={setDetalles} sugerencias={sugerencias} />
        </HojaOpcional>
      )}
      <HojaColeccion
        abierta={opcional === "coleccion"} alCerrar={() => setOpcional(null)} colecciones={colecciones} elegida={coleccionElegida}
        alElegir={(n, esNueva) => {
          setNuevaColeccion(esNueva ? n : null);
          setCategoria(esNueva ? categoria : n);
          setOpcional(null);
        }}
      />
      {tienda && (
        <HojaPublicarCatalogo
          abierta={publicando} alCerrar={() => setPublicando(false)} enlace={enlaceAlPublicar(tienda.slug)} productos={productosQueCuentan(productos)}
          alAgregarMas={() => { setPublicando(false); alOtro(); }}
          alConfirmar={async () => {
            try {
              await publicarMiCatalogo(tienda.id);
              setPublicando(false);
              toast("¡Tu catálogo ya está en línea!");
            } catch (e) {
              toast(e instanceof Error && e.message ? e.message : "No se pudo. Inténtalo otra vez.");
            }
          }}
        />
      )}
    </div>
  );
}

/**
 * La tarjeta «así se verá» de las preguntas, como el lienzo: 372 px de alto, de margen a margen, la misma y en el mismo lugar en
 * los tres pasos (no se encoge con el teclado ni con la pantalla: lo demás se desplaza). La portada la cubre (`cover`); encima, el
 * velo del catálogo con el nombre, el precio y «Llega en …» a medida que se responden (nada antes de tiempo).
 */
function TarjetaAsiSeVera({ portada, nombre, precio, llega }: { portada: string | null; nombre: string; precio: string | null; llega: string | null }) {
  const n = nombre.trim();
  return (
    <div
      className="relative h-[372px] w-full shrink-0 overflow-hidden rounded-radio-l bg-superficie-hundida"
      data-tarjeta-asi-se-vera="" aria-label={`Así se verá: ${n || "sin nombre"}${precio ? `, ${precio}` : ""}${llega ? `, ${llega}` : ""}`} role="img"
    >
      {portada ? (
        <>
          <Foto src={portada} alt="" className="absolute inset-0" sizes="(max-width: 480px) 100vw, 440px" />
          <div aria-hidden="true" className="absolute inset-x-0 top-1/2 bottom-0 bg-linear-to-t from-velo to-transparent" />
        </>
      ) : (
        <div aria-hidden="true" className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-texto-secundario">
          <IconoCamara tamano={44} strokeWidth={1.8} />
          <span className="text-secundario font-bold">Sin foto</span>
        </div>
      )}
      <span aria-hidden="true" className={clases("absolute top-2.5 left-3.5 font-mano text-mano", portada ? "text-papel [text-shadow:0_1px_4px_rgb(0_0_0/0.35)]" : "text-texto-secundario")}>así se verá</span>
      {(n || precio) && (
        <div aria-hidden="true" className={clases("absolute inset-x-4 bottom-3.5", portada ? "text-papel" : "text-texto")}>
          {n && <p className="line-clamp-2 font-display text-titulo-hoja break-words">{n}</p>}
          {precio && <p className="mt-0.5 text-cuerpo font-extrabold tabular-nums" data-precio-tarjeta="">{precio}</p>}
          {llega && <p className="mt-0.5 text-secundario font-bold opacity-90" data-llega-tarjeta="">{llega}</p>}
        </div>
      )}
    </div>
  );
}

/**
 * El marco de la foto (paso 1), como el lienzo: sin fotos, el hueco punteado «Toca para agregar fotos», que es un botón y abre el
 * selector nativo del teléfono (Fototeca / Tomar foto / Elegir archivo); con fotos, la portada en grande y «1/N» (tocarla no abre nada).
 */
function MarcoFoto({ portada, total }: { portada: string | null; total: number }) {
  const caja = "relative h-[372px] w-full shrink-0 overflow-hidden rounded-radio-l bg-superficie-hundida";
  if (portada) {
    return (
      <div className={caja} data-marco-foto="">
        <Foto src={portada} alt="Portada del producto" className="absolute inset-0" sizes="(max-width: 480px) 100vw, 440px" />
        <span aria-hidden="true" className="absolute top-3 right-3 inline-flex h-[26px] items-center rounded-full bg-velo px-2.5 text-[0.8125rem] font-extrabold text-papel tabular-nums">1/{total}</span>
      </div>
    );
  }
  return (
    <button
      type="button"
      aria-label="Agregar fotos"
      // El selector vive en la sección de fotos del mismo paso (hermana de este botón): sin `capture`, para que el teléfono ofrezca su menú.
      onClick={(e) => e.currentTarget.parentElement?.querySelector<HTMLInputElement>("[data-entrada-medios]")?.click()}
      className={clases(caja, "tocable block outline-none focus-visible:outline-3 focus-visible:outline-foco")}
      data-marco-foto=""
      data-marco-vacio=""
    >
      <span aria-hidden="true" className="absolute inset-3.5 flex flex-col items-center justify-center gap-2 rounded-radio-m border-2 border-dashed border-borde-campo text-texto-secundario">
        <IconoCamara tamano={44} strokeWidth={1.8} />
        <span className="text-secundario font-bold">Toca para agregar fotos</span>
      </span>
    </button>
  );
}

type EjeHistoria = { nombre: string; valores: string[]; propia: boolean };

/**
 * La tarjeta «así se verá» de las pantallas de presentaciones (prototipo v4, b11–b14): 350×212, la foto en `cover`, el nombre, «Desde
 * RD$…» y, a medida que se eligen, la píldora de la otra cosa («Talla S · M · L») y los puntos de color.
 */
function TarjetaPresentaciones({ portada, nombre, precio, opciones }: { portada: string | null; nombre: string; precio: string | null; opciones: OpcionProducto[] }) {
  const n = nombre.trim();
  const otra = opciones.find((o) => !esEjeColor(o.nombre));
  const color = opciones.find((o) => esEjeColor(o.nombre));
  return (
    <div className="relative h-[212px] w-full shrink-0 overflow-hidden rounded-radio-l bg-superficie-hundida" data-tarjeta-presentaciones="" role="img"
      aria-label={`Así se verá: ${[n || "sin nombre", precio, otra ? `${otra.nombre} ${otra.valores.join(", ")}` : null, color ? `${color.valores.join(", ")}` : null].filter(Boolean).join(", ")}`}
    >
      {portada ? (
        <>
          <Foto src={portada} alt="" className="absolute inset-0 [&_img]:object-[50%_30%]" sizes="(max-width: 480px) 100vw, 440px" />
          <div aria-hidden="true" className="absolute inset-x-0 top-[40%] bottom-0 bg-linear-to-t from-velo to-transparent" />
        </>
      ) : (
        <div aria-hidden="true" className="absolute inset-0 grid place-items-center text-texto-secundario"><IconoCamara tamano={36} strokeWidth={1.8} /></div>
      )}
      <span aria-hidden="true" className={clases("absolute top-2 left-3.5 font-mano text-mano", portada ? "text-papel [text-shadow:0_1px_4px_rgb(0_0_0/0.35)]" : "text-texto-secundario")}>así se verá</span>
      <div aria-hidden="true" className={clases("absolute inset-x-3.5 bottom-3", portada ? "text-papel" : "text-texto")}>
        {n && <p className="truncate font-display text-[1.375rem] leading-tight">{n}</p>}
        <div className="mt-0.5 flex flex-wrap items-center gap-2.5">
          {precio && <span className="text-cuerpo font-extrabold tabular-nums" data-precio-tarjeta="">{precio}</span>}
          {otra && otra.valores.length > 0 && (
            <span className="inline-flex h-[22px] items-center rounded-full bg-white/20 px-2 text-etiqueta" data-pildora-eje="">{otra.nombre} {otra.valores.join(" · ")}</span>
          )}
          {color && color.valores.length > 0 && (
            <span className="inline-flex items-center gap-1" data-puntos-color="">
              {color.valores.slice(0, 6).map((v) => (
                <span key={v} className="size-[18px] rounded-full border-[1.5px] border-white/70" style={{ background: colorPorNombre(v) ?? undefined }} />
              ))}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/** «¿En qué cambia?» (b11): lo típico del catálogo y otras cosas, hasta 2, y «+ Otra» para una propia. */
function QueCambia({ rubro, ejes, alCambiar, avisar, empezarEnOtra = false }: { rubro: Rubro; ejes: EjeHistoria[]; alCambiar: (e: EjeHistoria[]) => void; avisar: (m: string) => void; empezarEnOtra?: boolean }) {
  const { tipicas, otras } = listaDeCosas(OPCIONES_TIPICAS[rubro]);
  const lista = [...new Set([...[...tipicas, ...otras].slice(0, 4), ...ejes.map((e) => e.nombre)])];
  const [otra, setOtra] = useState<string | null>(empezarEnOtra ? "" : null);
  const [error, setError] = useState<string | null>(null);
  const caja = useRef<HTMLDivElement>(null);
  const llenos = ejes.length >= MAX_EJES;
  // Con 2 elegidas las demás se ven igual (como el lienzo); tocarlas explica el máximo.
  const lleno = () => avisar(`Ya elegiste ${MAX_EJES}: quita una para elegir otra.`);
  const alternar = (nombre: string) => {
    if (ejes.some((e) => e.nombre === nombre)) return alCambiar(ejes.filter((e) => e.nombre !== nombre));
    if (llenos) return lleno();
    alCambiar([...ejes, { nombre, valores: [], propia: !COSAS_QUE_CAMBIAN.some((c) => c === nombre) }]);
  };
  const listoOtra = () => {
    const e = errorDeNombrePropio(otra ?? "", ejes.map((x) => x.nombre), [...tipicas, ...otras]);
    if (e) return setError(e);
    alCambiar([...ejes, { nombre: (otra ?? "").trim(), valores: [], propia: true }]);
    setOtra(null);
    setError(null);
  };
  return (
    <div ref={caja} className="mt-3.5" data-que-cambia="">
      <div role="group" aria-label="Lo que cambia" className="flex flex-wrap gap-2">
        {lista.map((nombre) => {
          const elegida = ejes.some((e) => e.nombre === nombre);
          return <Eleccion key={nombre} casilla elegida={elegida} onClick={() => alternar(nombre)}>{nombre}</Eleccion>;
        })}
        {otra === null && (
          <Eleccion
            accion elegida={false}
            onClick={() => {
              if (llenos) return lleno();
              flushSync(() => setOtra(""));
              caja.current?.querySelector<HTMLInputElement>("input")?.focus();
            }}
          >
            + Otra
          </Eleccion>
        )}
      </div>
      {otra !== null && (
        <div className="mt-3 flex items-start gap-2">
          <Campo
            className="flex-1" etiqueta="¿Qué otra cosa cambia?" placeholder="Por ejemplo: Aroma" maxLength={LARGO_VALOR} value={otra} error={error} data-campo-paso=""
            enterKeyHint="done" onChange={(e) => { setOtra(e.target.value); setError(null); }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); listoOtra(); } }}
          />
          <Boton tamano="compacto" className="mt-7" deshabilitado={!otra.trim()} onClick={listoOtra}>Listo</Boton>
        </div>
      )}
      <p className="mx-0.5 mt-2.5 text-[0.8125rem] text-texto-secundario">Hasta {MAX_EJES}. Para la mayoría basta con talla y color.</p>
    </div>
  );
}

/** Los valores de una cosa (b12, b13): los sugeridos y los propios para tocar, «+ Otra» para escribir uno y los atajos («XS a XL»). */
function ValoresDeEje({ eje, rubro, alAlternar, alPoner }: { eje: EjeHistoria; rubro: Rubro; alAlternar: (v: string) => void; alPoner: (v: string[]) => void }) {
  const sugeridos = eje.propia ? [] : valoresSugeridos(eje.nombre, rubro);
  const atajos = atajosDe(eje.nombre, rubro).filter((a) => a.texto !== "30 · 50 · 100 ml" || rubro === "perfumes").filter((a) => a.texto !== "36 a 42");
  const color = esEjeColor(eje.nombre);
  const [otro, setOtro] = useState<string | null>(null);
  const caja = useRef<HTMLDivElement>(null);
  const agregar = () => {
    // Solo suma: escribir uno que ya está («Negro», «negro ») no lo quita.
    if (otro?.trim()) {
      const valores = agregarValor(eje.valores, otro);
      if (valores !== eje.valores) alPoner(valores);
    }
    setOtro(null);
  };
  return (
    <div ref={caja} className="mt-3.5" data-valores-eje={eje.nombre}>
      <div role="group" aria-label={eje.nombre} className="flex flex-wrap gap-2">
        {valoresVisibles(sugeridos, eje.valores).map((v) => {
          const elegida = eje.valores.includes(v);
          const c = color ? colorPorNombre(v) : null;
          return (
            <Eleccion key={v} casilla elegida={elegida} deshabilitada={!elegida && eje.valores.length >= MAX_VALORES} onClick={() => alAlternar(v)}>
              {c && <span aria-hidden="true" className="size-4 shrink-0 rounded-full border-[1.5px] border-borde-pastilla" style={{ background: c }} />}
              {v}
            </Eleccion>
          );
        })}
        {otro === null ? (
          <Eleccion
            accion elegida={false} deshabilitada={eje.valores.length >= MAX_VALORES}
            onClick={() => {
              flushSync(() => setOtro(""));
              caja.current?.querySelector<HTMLInputElement>("input")?.focus();
            }}
          >
            + {otroDe(eje.nombre).split(" ")[0]}
          </Eleccion>
        ) : (
          <input
            type="text" enterKeyHint="done" autoComplete="off" aria-label={otroDe(eje.nombre)} placeholder="Escríbelo y toca Enter" maxLength={LARGO_VALOR}
            value={otro} onChange={(e) => setOtro(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); agregar(); }
              else if (e.key === "Escape") setOtro(null);
            }}
            onBlur={agregar}
            className="h-(--alto-control) w-52 min-w-0 rounded-full border-2 border-accion bg-superficie px-4 text-cuerpo text-texto outline-none placeholder:text-texto-secundario"
          />
        )}
      </div>
      {atajos.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2" data-atajos="">
          {atajos.map((a) => <Boton key={a.texto} jerarquia="secundario" tamano="compacto" onClick={() => alPoner(a.valores)}>{a.texto}</Boton>)}
        </div>
      )}
    </div>
  );
}

/** «Foto de cada color · opcional» (b13): una tarjeta punteada por color elegido; sin fotos subidas, apagadas con una pista. */
function FotoDeCadaColor({ valores, fotos, fotosColor, alAbrir }: { valores: string[]; fotos: FotoBorrador[]; fotosColor: Record<string, string>; alAbrir: (valor: string) => void }) {
  const sinFotos = fotos.length === 0;
  return (
    <section aria-labelledby="titulo-foto-color" className="mt-3.5" data-foto-cada-color="">
      <p id="titulo-foto-color" className="mx-0.5 mb-2 text-secundario font-extrabold text-texto-secundario">Foto de cada color · opcional</p>
      <div className="grid grid-cols-2 gap-2.5">
        {valores.map((v) => {
          const i = fotos.findIndex((f) => f.id === fotosColor[v]);
          const f = i >= 0 ? fotos[i]! : null;
          return (
            <button
              key={v} type="button" disabled={sinFotos} onClick={() => alAbrir(v)} aria-label={`Foto de ${v}: ${f ? `foto ${i + 1}` : "elegir"}`}
              className={clases("tocable flex min-w-0 items-center gap-2.5 rounded-radio-m border-[1.5px] border-dashed border-borde-campo bg-superficie p-2 text-left disabled:opacity-40", FOCO)}
            >
              <span aria-hidden="true" className="relative block h-[54px] w-11 shrink-0 overflow-hidden rounded-radio-s bg-superficie-hundida">
                {(f ?? fotos[0]) && <Foto src={(f ?? fotos[0])!.url} alt="" className="size-full" sizes="44px" />}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-secundario font-extrabold text-texto">{v}</span>
                <span className="text-etiqueta font-normal text-texto-secundario">{f ? `Foto ${i + 1}` : "Elegir foto"}</span>
              </span>
            </button>
          );
        })}
      </div>
      {sinFotos && <p className="mx-0.5 mt-2 text-[0.8125rem] text-texto-secundario" data-pista-foto-color="">Sube fotos en el primer paso para elegir la de cada color.</p>}
    </section>
  );
}

/** Elegir la foto de un color entre las del producto (o subir otra), con «‹» y «Listo» abajo como toda la historia. */
function HojaFotoDeColor({
  valor, fotos, fotosColor, alCerrar, alElegir, alSubir,
}: {
  valor: string | null;
  fotos: FotoBorrador[];
  fotosColor: Record<string, string>;
  alCerrar: () => void;
  alElegir: (valor: string, id: string | null) => void;
  alSubir: (archivo: File) => Promise<string | null>;
}) {
  const [ultimo, setUltimo] = useState<string | null>(valor);
  if (valor && valor !== ultimo) setUltimo(valor);
  const v = valor ?? ultimo;
  return (
    <Hoja abierta={valor !== null} alCerrar={alCerrar} titulo={`Foto de ${v ?? ""}`} altura="auto">
      {v && (
        <div className="flex flex-col gap-4">
          <p className="text-secundario text-texto-secundario">Tu cliente la ve al elegir {v}. Escoges entre las fotos del producto.</p>
          <SelectorFotos
            fotos={fotos} elegida={fotosColor[v] ?? null} usadas={Object.fromEntries(Object.entries(fotosColor).filter(([x]) => x !== v))}
            alElegir={(id) => alElegir(v, id)} alQuitar={fotosColor[v] ? () => alElegir(v, null) : undefined}
            alSubir={async (archivo) => { const id = await alSubir(archivo); if (id) alElegir(v, id); }}
          />
          <div className="flex items-center gap-2.5">
            <BotonAtras alTocar={alCerrar} />
            <Boton tamano="grande" className="flex-1" onClick={alCerrar}>Listo</Boton>
          </div>
        </div>
      )}
    </Hoja>
  );
}

/** Una pastilla de «Hazlo brillar»: abre su hoja; hecha, lleva el check y dice qué tiene. */
function PastillaOpcional({ texto, hecha, detalle, alTocar }: { texto: string; hecha: boolean; detalle?: string | null; alTocar: () => void }) {
  return (
    <Chip hecho={hecha} onClick={alTocar} className="h-[34px]! gap-1! px-2.5! text-[0.8125rem]!" aria-label={hecha ? `${texto}: ${detalle ?? "lista"}. Cambiar` : `Agregar ${texto.toLowerCase()}`} data-opcional={texto} data-hecha={hecha ? "" : undefined}>
      {texto}
    </Chip>
  );
}

/** Las hojas de los opcionales: lo de hoy (descripción, ficha, detalles) en su propia hoja con «Listo». */
function HojaOpcional({ abierta, titulo, grande = false, alCerrar, children }: { abierta: boolean; titulo: string; grande?: boolean; alCerrar: () => void; children: ReactNode }) {
  return (
    <Hoja abierta={abierta} alCerrar={alCerrar} titulo={titulo} altura={grande ? "grande" : "auto"}>
      <div className="flex flex-col gap-4">
        {children}
        <div className="flex items-center gap-2.5">
          <BotonAtras alTocar={alCerrar} />
          <Boton tamano="grande" className="flex-1" onClick={alCerrar}>Listo</Boton>
        </div>
      </div>
    </Hoja>
  );
}

/**
 * El reel real del comprador con el borrador, solo (sin la cabecera ni las pestañas del catálogo): `/vista-previa-reel` en un
 * iframe del mismo sitio, con `components/tienda/reel.tsx`, su CSS y el tema de la tienda. Como el lienzo, se arma a su tamaño de
 * siempre (390×488) y se REDUCE en proporción al ancho de la tarjeta (350×438 a 390 px), sin recortar ni reacomodar su contenido.
 * Se le vuelve a mandar el borrador cuando cambia (al volver de un opcional).
 */
const REEL_W = 390;
const REEL_H = 488;
function ReelEnVivo({ datos }: { datos: () => DatosVistaPrevia | null }) {
  const marco = useRef<HTMLIFrameElement>(null);
  const caja = useRef<HTMLDivElement>(null);
  const listo = useRef(false);
  const ultimos = useRef(datos);
  useEffect(() => {
    ultimos.current = datos;
  });
  const mandar = () => {
    const d = ultimos.current();
    if (d && listo.current) marco.current?.contentWindow?.postMessage({ tipo: MENSAJE_VISTA_PREVIA, datos: d }, location.origin);
  };
  useEffect(() => {
    const alMensaje = (e: MessageEvent) => {
      if (e.origin !== location.origin || e.source !== marco.current?.contentWindow || e.data?.tipo !== `${MENSAJE_VISTA_PREVIA}-listo`) return;
      listo.current = true;
      const d = ultimos.current();
      if (d) marco.current?.contentWindow?.postMessage({ tipo: MENSAJE_VISTA_PREVIA, datos: d }, location.origin);
    };
    window.addEventListener("message", alMensaje);
    return () => window.removeEventListener("message", alMensaje);
  }, []);
  // La escala sale del ancho de la tarjeta (no del teclado ni del alto): se escribe directo en el estilo, sin estado de React.
  useEffect(() => {
    const el = caja.current;
    if (!el) return;
    const ajustar = () => {
      if (marco.current) marco.current.style.transform = `scale(${el.clientWidth / REEL_W})`;
    };
    ajustar();
    const obs = new ResizeObserver(ajustar);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  const d = datos();
  const clave = JSON.stringify(d && "producto" in d ? d.producto : null);
  useEffect(mandar, [clave]);
  return (
    <div ref={caja} className="relative aspect-[390/488] w-full shrink-0 overflow-hidden rounded-radio-l bg-superficie-hundida" data-reel-historia="">
      <iframe
        ref={marco} src="/vista-previa-reel" title="Así lo verá tu cliente" className="absolute top-0 left-0 origin-top-left border-0"
        style={{ width: REEL_W, height: REEL_H }}
      />
    </div>
  );
}

/** «Compartir mi catálogo»: publicado, comparte el enlace; sin publicar, abre la hoja de publicar de hoy. */
function CompartirCatalogo({ tiendaNombre, alPublicar }: { tiendaNombre: string; alPublicar: () => void }) {
  const { tienda } = useTiendaActiva();
  const toast = useToast();
  if (!tienda) return null;
  const enlace = enlaceCatalogo(tienda.urlCatalogo);
  const vista = vistaCatalogo({ tiendaEstado: tienda.estado, catalogoEstado: tienda.catalogoEstado, publicadoEn: tienda.catalogoPublicadoEn, enlaceValido: enlace !== null, visto: true });
  if (vista === "publicado" || vista === "recien") {
    const compartir = () => {
      if (!enlace) return;
      if (typeof navigator.share === "function") {
        navigator.share({ title: tiendaNombre, url: enlace.href }).catch(() => {
          // Cerrar la hoja de compartir sin elegir nada no es un error.
        });
        return;
      }
      void copiarTexto(enlace.href).then((ok) => toast(ok ? "Enlace copiado" : "No se pudo copiar. Ábrelo y copia el enlace desde ahí."));
    };
    return <Boton jerarquia="secundario" tamano="grande" anchoCompleto onClick={compartir}>Compartir mi catálogo</Boton>;
  }
  if (vista !== "sin") return null;
  return <Boton jerarquia="secundario" tamano="grande" anchoCompleto onClick={alPublicar}>Compartir mi catálogo</Boton>;
}

/** El corazón de «Lo quiero» del catálogo (relleno), para la celebración. */
function Corazon({ tamano, className, style }: { tamano: number; className: string; style: React.CSSProperties }) {
  return (
    <svg aria-hidden="true" width={tamano} height={tamano} viewBox="0 0 24 24" fill="currentColor" className={clases("absolute", className)} style={style}>
      <path d="M12 20s-7-4.4-8.6-8.8C2.3 8.1 4.3 5 7.4 5c2 0 3.3 1 4.6 2.6C13.3 6 14.6 5 16.6 5c3.1 0 5.1 3.1 4 6.2C19 15.6 12 20 12 20z" />
    </svg>
  );
}

/** La pregunta de la burbuja blanca: con tallas, por la del medio («¿Tienes en M?», como el lienzo); si no, «¿Todavía hay?». */
function preguntaDeCliente(producto: Producto): string {
  // El color se guarda primero: la talla se busca por nombre.
  const valores = producto.opciones.find((o) => /^talla/i.test(o.nombre.trim()))?.valores ?? [];
  const valor = valores[Math.floor((valores.length - 1) / 2)];
  return valor ? `¿Tienes en ${valor}?` : "¿Todavía hay?";
}

/**
 * La celebración, como el lienzo (b10): la portada inclinada y, alrededor, los corazones de «Lo quiero» y dos burbujas de mensaje
 * (una pregunta y «¡Lo quiero!») que aparecen una tras otra y flotan apenas (`cel-vivo`, docs/08). Un solo titular a mano y una línea.
 */
function Celebracion({ producto, visible, cuentan }: { producto: Producto; visible: boolean; cuentan: number }) {
  const foto = producto.medios.find((m) => m.tipo === "foto")?.url ?? producto.fotos[0] ?? null;
  const arranque = visible ? lineaArranque(cuentan) : null;
  const burbuja = "cel-vivo absolute rounded-[14px] px-3 py-2 text-secundario font-extrabold whitespace-nowrap text-texto shadow-[0_4px_12px_-4px_rgb(16_54_42/0.35)]";
  return (
    <div className="flex flex-col items-center pt-5 text-center" data-celebracion="">
      <div aria-hidden="true" className="relative h-[290px] w-[230px]">
        <Corazon tamano={34} className="cel-vivo -left-[30px] top-1.5 text-resalte" style={{ "--d": 0, "--ciclo": "3.2s" } as React.CSSProperties} />
        <Corazon tamano={26} className="cel-vivo -right-6 top-[70px] text-[var(--jugada-rosa)]" style={{ "--d": 2, "--ciclo": "3.4s" } as React.CSSProperties} />
        <Corazon tamano={22} className="cel-vivo -left-4 bottom-9 text-marca-rosa-fija" style={{ "--d": 4, "--ciclo": "3.3s" } as React.CSSProperties} />
        <div className="absolute inset-0 -rotate-4 overflow-hidden rounded-radio-l bg-superficie-hundida shadow-flotante" data-foto-celebracion="">
          {foto ? (
            <Foto src={foto} alt="" className="absolute inset-0" sizes="230px" />
          ) : (
            <div className="grid h-full place-items-center font-display text-titulo-pantalla text-texto-secundario">{producto.nombre[0]}</div>
          )}
        </div>
        <span className={clases(burbuja, "-top-1.5 -right-[34px] rounded-bl-[3px] bg-superficie")} style={{ "--d": 1, "--ciclo": "3.6s" } as React.CSSProperties} data-burbuja="">
          {preguntaDeCliente(producto)}
        </span>
        <span className={clases(burbuja, "bottom-1.5 -left-[38px] rounded-br-[3px] bg-chat-burbuja")} style={{ "--d": 3, "--ciclo": "3.8s" } as React.CSSProperties} data-burbuja="">
          ¡Lo quiero!
        </span>
      </div>
      <h2 tabIndex={-1} data-titulo-paso="" className="mt-[30px] font-mano text-[2.5rem] leading-none text-atencion-texto outline-none">{tituloCelebracion(visible)}</h2>
      <p className="mt-2.5 text-cuerpo text-texto-secundario" data-linea-celebracion="">
        {lineaCelebracion(producto.nombre, visible, arranque)}
      </p>
    </div>
  );
}
