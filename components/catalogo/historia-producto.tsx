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
import { esEjeColor } from "@/lib/colores";
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
  alternarValor,
  claveVariante,
  ejeDeFoto,
  errorDeEjes,
  ordenarValores,
  preciosVarian,
  resumenDe,
  textoPresentaciones,
  valoresSugeridos,
  type EstadoPresentaciones,
  type Presentacion,
} from "@/lib/presentaciones";
import { cuentaParaPublicar, enlaceAlPublicar, productosQueCuentan } from "@/lib/publicar-catalogo";
import { CAMPOS_POR_RUBRO, rubrosDeTienda, type Detalles, type Rubro } from "@/lib/rubros";
import type { FotosPorValor, OpcionProducto, Producto } from "@/lib/types";
import { productoPublicoDeBorrador, tiendaPublicaDe } from "@/lib/vista-previa-producto";
import { Foto } from "../foto";
import { Hoja, HojaFijoAbajo, PieFlotante, useAvisarAlSalir } from "../hoja";
import { CuerpoCargando, CuerpoConError } from "../hoja-estado";
import { type DatosVistaPrevia } from "../tienda/vista-previa-reel";
import { useToast } from "../toast";
import { Alerta, Boton, Chip } from "../ui";
import { clases, FOCO } from "../ui/comunes";
import { SeccionDetalles, sugerenciasDeDetalles } from "./ficha-detalles";
import { agregarFotoAlBorrador, mediosParaGuardar, type MedioBorrador } from "./ficha-medios";
import { SeccionDescripcion, SeccionFichaTecnica } from "./ficha-tecnica";
import { BotonAtras } from "./boton-atras-historia";
import { useGuardarProducto } from "./guardar-producto";
import { HojaColeccion } from "./hoja-producto";
import { HojaInventarioHistoria, textoInventario } from "./inventario-historia";
import { HojaLoQueVendes } from "./hoja-lo-que-vendes";
import { BotonPublicar } from "./boton-publicar";
import { HojaPublicarCatalogo } from "./hoja-publicar-catalogo";
import { SelectorCatalogo } from "./selector-catalogo";
import { useTaller } from "./taller";
import {
  EncabezadoPaso, FotoDeCadaColor, HojaFotoDeColor, HojaOpcional, PasoFoto, PasoNombre, PasoPrecio, PasoStock, PastillaOpcional, PreguntaOpciones,
  QueCambia, ReelEnVivo, TarjetaAsiSeVera, TarjetaPresentaciones, ValoresDeEje, type EjeHistoria,
} from "./pasos-producto";

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
      historia={{ avance: barras, alLadoDelTitulo: <span ref={setRanuraCatalogo} className="flex min-w-0 flex-1 justify-end" /> }}
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
  const cierreMenuPublicar = useRef<(() => boolean) | null>(null);
  const atras = (): boolean => {
    if (cierreMenuPublicar.current?.()) return true;
    const a = pasoAnterior(paso, servicio, variantes);
    if (!a) return false;
    if (paso === "cambia" && !ejes.some((e) => e.valores.length > 0)) {
      // Sin nada que cambie (o con cosas elegidas pero ningún valor), el producto vuelve a un solo stock y a cinco barras: lo que se ve
      // en el precio coincide con lo que hace «Seguir». Lo que había en el Inventario queda como su stock.
      const total = totalDelBorrador(presBorrador);
      flushSync(() => {
        alCambiarVariantes(null);
        setEjes([]);
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
   * «¿Viene en varias opciones?» → «Sí» (o «Cambiar» en el resumen): siete barras en el mismo toque y «¿En qué cambia?» con lo que
   * ya había (nada, la primera vez).
   */
  const abrirVariantes = () => {
    if (sinCatalogo) return toast(porque);
    flushSync(() => alCambiarVariantes(ejes.length));
    irA("cambia");
  };
  /** «No»: sigue al stock igual que «Seguir»; sin precio, dice qué falta. */
  const sinOpciones = () => {
    if (!listoParaSeguir) return toast("Escribe el precio para seguir.");
    seguir();
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

  /**
   * Enter en el precio: con precio y sin opciones elegidas NO avanza (en el iPhone el teclado tapa la pregunta): cierra el teclado y
   * deja «¿Viene en varias opciones?» a la vista sobre el pie flotante. «Seguir» sí avanza. Con opciones elegidas, avanza como siempre.
   */
  const preguntaPendiente = Number(precio) > 0 && !(conVariantes && ejes.length > 0);
  const alEnterPrecio = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter" || !preguntaPendiente) return alEnter(e);
    e.preventDefault();
    e.currentTarget.blur();
    const mostrar = () => raiz.current?.querySelector<HTMLElement>("[data-chip-presentaciones]")?.scrollIntoView({ block: "nearest" });
    mostrar();
    // El teclado tarda en bajar: se vuelve a poner a la vista cuando el área visible ya creció.
    setTimeout(mostrar, 350);
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
          <EncabezadoPaso titulo={textos.titulo} ayuda={textos.ayuda} separacion="mt-3.5" ayudaArriba="mt-1" />
          <QueCambia rubro={tipo} ejes={ejes} alCambiar={cambiarEjes} avisar={toast} />
        </>
      )}

      {ejeDelPaso && (
        <>
          <EncabezadoPaso titulo={textos.titulo} ayuda={textos.ayuda} separacion="mt-3.5" ayudaArriba="mt-1" />
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
        <PasoFoto medios={medios} alCambiar={setMedios} taller={taller} avisar={toast} titulo={textos.titulo} ayuda={textos.ayuda} />
      )}

      {paso === "nombre" && (
        <PasoNombre titulo={textos.titulo} ayuda={textos.ayuda} valor={nombre} alCambiar={setNombre} alEnter={alEnter} />
      )}

      {paso === "precio" && (
        <>
          <PasoPrecio
            titulo={textos.titulo} ayuda={textos.ayuda} precio={precio} alCambiar={setPrecio} variaDesde={varia ? resumenPres.desde : null}
            enterKeyHint={preguntaPendiente ? "done" : "next"} alEnter={alEnterPrecio}
          />
          {/* «¿Viene en varias opciones?» aparece cuando ya hay precio (nada antes de tiempo). */}
          {(Number(precio) > 0 || conVariantes) && (
            <div className="mt-4" data-chip-presentaciones="">
              {conVariantes && ejes.length > 0 ? (
                <div className="flex items-center justify-between gap-3" data-resumen-opciones="">
                  <p className="text-destacado text-texto">{ejes.map((e) => e.nombre).join(" · ")}</p>
                  <Chip hecho onClick={abrirVariantes}>Cambiar</Chip>
                </div>
              ) : (
                <PreguntaOpciones alSi={abrirVariantes} alNo={sinOpciones} />
              )}
            </div>
          )}
        </>
      )}

      {paso === "stock" && (
        <PasoStock
          titulo={textos.titulo} ayuda={textos.ayuda} stock={stock} alCambiarStock={setStock} porEncargo={porEncargo} alCambiarEncargo={elegirEncargo}
          encargoTexto={encargoTexto} alCambiarEncargoTexto={setEncargoTexto} alEnter={alEnter}
        />
      )}

      {paso === "vista" && (
        <>
          <h2 tabIndex={-1} data-titulo-paso="" className="-mt-1 font-mano text-[1.625rem] leading-tight text-atencion-texto outline-none">{textos.titulo}</h2>
          <ReelEnVivo datos={datosVista} />
          <section aria-labelledby="titulo-brillar" className="mt-5 flex flex-col gap-0.5">
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
          {/* Al final del desplazamiento, ≥ 16 px de aire hasta donde empieza el desenfoque del pie (24 px sobre los botones). */}
          <div aria-hidden="true" className="h-7 shrink-0" />
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
          // ‹ y «Publicar │ 🕒» en una fila; el reloj («Publicar más tarde») pide confirmar y guarda oculto. Si no se puede publicar
          // (sin foto, catálogo lleno, sin permiso), el principal es «Guardar para después» (sin reloj y sin confirmación).
          <div className="flex items-center gap-2.5">
            {botonAtras}
            {sinFoto || llenoPlan || sinCatalogo ? (
              <Boton tamano="grande" className="flex-1" cargando={guardando} deshabilitado={sinCatalogo || preparando} onClick={() => guardar(false)}>Guardar para después</Boton>
            ) : (
              <BotonPublicar
                cargando={guardando} deshabilitado={preparando} cierreRef={cierreMenuPublicar}
                alPublicar={() => guardar(true)} alGuardar={() => guardar(false)}
              />
            )}
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
