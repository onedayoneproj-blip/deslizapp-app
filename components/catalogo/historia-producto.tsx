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
import {
  barrasLlenas,
  lineaArranque,
  lineaCelebracion,
  OPCIONES_CUANDO_LLEGA,
  opcionDeCuandoLlega,
  pasoAnterior,
  pasoSiguiente,
  pasosDeHistoria,
  puedeSeguir,
  SIN_FOTO,
  textoCuandoLlega,
  textosDelPaso,
  tituloCelebracion,
  type PasoHistoria,
} from "@/lib/historia-producto";
import { pastillasDeOpciones, resumenDescripcion } from "@/lib/hoja-producto";
import { resumenDelPlan } from "@/lib/plan-catalogo";
import { copiarTexto } from "@/lib/portapapeles";
import { ejeDeFoto, preciosVarian, resumenDe, type EstadoPresentaciones } from "@/lib/presentaciones";
import { cuentaParaPublicar, enlaceAlPublicar, productosQueCuentan } from "@/lib/publicar-catalogo";
import { CAMPOS_POR_RUBRO, rubrosDeTienda, type Detalles, type Rubro } from "@/lib/rubros";
import type { FotosPorValor, Producto } from "@/lib/types";
import { productoPublicoDeBorrador, tiendaPublicaDe } from "@/lib/vista-previa-producto";
import { Foto } from "../foto";
import { Hoja, HojaFijoAbajo, useAvisarAlSalir } from "../hoja";
import { CuerpoCargando, CuerpoConError } from "../hoja-estado";
import { IconoCamara, IconoReloj } from "../iconos";
import { MENSAJE_VISTA_PREVIA, type DatosVistaPrevia } from "../tienda/vista-previa-reel";
import { useToast } from "../toast";
import { Boton, Campo, Cantidad, Chip, FilaInterruptor, GrupoEleccion } from "../ui";
import { clases, FOCO } from "../ui/comunes";
import { SeccionDetalles, sugerenciasDeDetalles } from "./ficha-detalles";
import { agregarFotoAlBorrador, mediosParaGuardar, SeccionMedios, type MedioBorrador } from "./ficha-medios";
import { SeccionDescripcion, SeccionFichaTecnica } from "./ficha-tecnica";
import { FlujoPresentaciones } from "./flujo-presentaciones";
import { useGuardarProducto } from "./guardar-producto";
import { HojaColeccion } from "./hoja-producto";
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
  const { data: productos, error, reintentar } = useConsulta(`productos:${tiendaId}`, () => getProductos(tiendaId));
  const [paso, setPaso] = useState<PasoHistoria>("foto");
  // «Agregar otro» empieza una historia nueva (otro borrador) en la misma hoja.
  const [vuelta, setVuelta] = useState(0);
  // Un producto nuevo siempre es «producto»: hoy no se crean servicios desde la app. Si llegan, se salta el stock.
  const servicio = false;
  const pasos = pasosDeHistoria(servicio);
  const llenas = barrasLlenas(paso, servicio);
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
      alVolverInterno={() => {
        // Atrás del teléfono: vuelve una pregunta sin perder nada; en la primera (o ya guardado) cierra como siempre.
        const antes = pasoAnterior(paso, servicio);
        if (!antes) return false;
        setPaso(antes);
        return true;
      }}
    >
      {error ? (
        <CuerpoConError alCerrar={alSalir} alReintentar={reintentar} textoVolver="Volver al catálogo" />
      ) : !productos ? (
        <CuerpoCargando titulo="productos" />
      ) : (
        <Historia
          key={`${tiendaId}:${vuelta}`} paso={paso} alCambiarPaso={setPaso} servicio={servicio} productos={productos} ranuraCatalogo={ranuraCatalogo}
          alOtro={() => { setVuelta((v) => v + 1); setPaso("foto"); }}
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
}: {
  ranuraCatalogo: HTMLElement | null;
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
  const elegirTipo = (r: Rubro) => {
    setTipo(r);
    if (tienda) guardarCatalogoAlCrear(tienda.id, r);
  };
  const tipo: Rubro = tipoElegido && tipos.includes(tipoElegido) ? tipoElegido : tipos.includes(tipoBase) ? tipoBase : rubro;
  const [vendiendoOtra, setVendiendoOtra] = useState(false);

  const [medios, setMedios] = useState<MedioBorrador[]>([]);
  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState("");
  const [stock, setStockValor] = useState(1);
  const [stockTocado, setStockTocado] = useState(false);
  const [porEncargo, setPorEncargo] = useState(false);
  const [encargoTexto, setEncargoTexto] = useState("");
  const [encargoOtro, setEncargoOtro] = useState(false);
  const [presentaciones, setPresentaciones] = useState<EstadoPresentaciones>(SIN_PRESENTACIONES);
  const [presAbierta, setPresAbierta] = useState(false);
  const [detalles, setDetalles] = useState<Detalles>({});
  const [ficha, setFicha] = useState<BorradorFicha>({ tipo: "igual" });
  const [categoria, setCategoria] = useState<string | null>(null);
  const [nuevaColeccion, setNuevaColeccion] = useState<string | null>(null);
  const [opcional, setOpcional] = useState<Opcional | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [hecho, setHecho] = useState<{ producto: Producto; visible: boolean; cuentan: number } | null>(null);
  const [publicando, setPublicando] = useState(false);

  const tieneOpciones = presentaciones.opciones.length > 0 && presentaciones.pres.length > 0;
  const resumenPres = resumenDe(presentaciones.pres, Number(precio) || 0);
  const varia = tieneOpciones && preciosVarian(presentaciones.pres, Number(precio) || 0);
  const coleccionElegida = nuevaColeccion !== null ? nuevaColeccion.trim() || null : categoria;
  const colecciones = useMemo(() => [...new Set(productos.map((p) => p.categoria).filter((c): c is string => Boolean(c)))].sort((a, b) => a.localeCompare(b, "es")), [productos]);
  const sugerencias = useMemo(() => sugerenciasDeDetalles(productos.map((p) => p.detalles)), [productos]);
  const descripcion = typeof detalles.descripcion === "string" ? detalles.descripcion : "";
  // Los Detalles se validan con el rubro principal de la tienda: solo se ofrecen si el producto va en ese catálogo.
  const conDetalles = tienda != null && tipo === tienda.rubro && CAMPOS_POR_RUBRO[tienda.rubro].length > 0;
  const fotos = mediosParaGuardar(medios).filter((m) => m.tipo === "foto");
  const portada = fotos[0]?.url ?? null;
  const preparando = medios.some((m) => m.tipo === "video" && typeof m.progreso === "number");
  // El plan cuenta solo los visibles: con el catálogo lleno, el producto nuevo se guarda oculto.
  const llenoPlan = tienda != null && resumenDelPlan(productos, tienda.limiteProductos).estado === "lleno";

  // Con algo escrito y sin guardar, cerrar pregunta (como la hoja de producto). Ya guardado, no.
  const firma = JSON.stringify({ medios: medios.length, nombre, precio, stock, porEncargo, encargoTexto, presentaciones, detalles, ficha: ficha.tipo, coleccionElegida, tipoElegido });
  const [firmaInicial] = useState(firma);
  useAvisarAlSalir(paso !== "listo" && firma !== firmaInicial);

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
  const listoParaSeguir = puedeSeguir(paso, { nombre, precio, porEncargo, encargoTexto, stock: tieneOpciones ? resumenPres.enTotal : stock });
  const seguir = () => {
    if (!listoParaSeguir) return;
    irA(pasoSiguiente(paso, servicio));
  };
  const atras = () => {
    const a = pasoAnterior(paso, servicio);
    if (a) irA(a);
  };
  const alEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    seguir();
  };

  const setStock = (v: number) => {
    setStockValor(v);
    setStockTocado(true);
  };
  const elegirEncargo = (activo: boolean) => setPorEncargo(activo);
  // «Otro» sigue abierto mientras el texto no sea una de las opciones rápidas (también al apagar y volver a prender el encargo).
  const otroAbierto = encargoOtro || (encargoTexto.trim() !== "" && opcionDeCuandoLlega(encargoTexto) === null);
  /** Por encargo no se lleva stock: tampoco en las presentaciones (si no, el catálogo las vería disponibles). */
  const presentacionesFinales: EstadoPresentaciones = !tieneOpciones
    ? SIN_PRESENTACIONES
    : porEncargo
      ? { ...presentaciones, pres: presentaciones.pres.map((p) => ({ ...p, stock: 0 })) }
      : presentaciones;
  /** Al pasar a presentaciones con el flujo de hoy: el total vuelve al stock si se quitan (como en la hoja de producto). */
  const cambiarPresentaciones = (nuevo: EstadoPresentaciones) => {
    if (nuevo.pres.length === 0 && tieneOpciones) setStockValor(resumenPres.enTotal);
    setPresentaciones(nuevo);
  };

  const guardar = async (publicar: boolean) => {
    if (guardando || !tienda) return;
    if (sinCatalogo) {
      toast(porque);
      return;
    }
    const visible = publicar && !llenoPlan;
    setGuardando(true);
    const r = await guardado.crear(
      {
        nombre, precio, medios, stock: porEncargo ? 0 : stock, presentaciones: presentacionesFinales, detalles, ficha,
        coleccion: coleccionElegida, porEncargo: !servicio && porEncargo, encargoTexto, rubro: variosTipos ? tipo : null, activo: visible,
      },
    );
    setGuardando(false);
    if (!r) return;
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
        nombre, precio: Number(precio) || 0, medios: mediosParaGuardar(medios), detalles, opciones: tieneOpciones ? presentaciones.opciones : [],
        presentaciones: presentacionesFinales.pres, stock: porEncargo ? 0 : stock, porEncargo, encargoTexto, categoria: coleccionElegida, rubro: tipo,
        fotosPorValor, fichaUrl: fichaVisible(null, ficha) && ficha.tipo === "nueva" ? ficha.foto : null,
      }),
    };
  };

  const textos = textosDelPaso(paso, porEncargo);
  const precioTarjeta = varia && resumenPres.desde !== null ? `Desde ${formatearPesos(resumenPres.desde)}` : Number(precio) > 0 ? formatearPesos(Number(precio)) : null;
  const pregunta = paso === "nombre" || paso === "precio" || paso === "stock";
  // Sin foto no se publica (regla de Lewis): se puede guardar como borrador oculto y agregarla después.
  const sinFoto = portada === null;
  // La pregunta y su línea de ayuda, como el lienzo: Fredoka 26 y 15 px, 18 px debajo de la tarjeta.
  const encabezado = (
    <div className="mt-[18px]">
      <h2 tabIndex={-1} data-titulo-paso="" className="font-display text-[1.625rem] leading-[1.1] text-texto outline-none">{textos.titulo}</h2>
      <p className="mt-[5px] text-[0.9375rem] text-texto-secundario">{textos.ayuda}</p>
    </div>
  );
  /** «Atrás» va siempre abajo, a la izquierda del botón principal (apagado en la primera pregunta). */
  const botonAtras = <BotonAtras alTocar={atras} apagado={pasoAnterior(paso, servicio) === null} />;
  const pie = (contenido: ReactNode, aviso?: ReactNode) => (
    <HojaFijoAbajo>
      {/* Barra sólida con el fondo de la hoja: el contenido pasa por detrás sin asomar; un aviso va completo encima de los botones.
          Arriba deja lo justo del lienzo (6 px en «Así se ve», 10 en las preguntas) para no tapar lo último de la pantalla. */}
      <div className={clases("pointer-events-auto flex flex-col gap-2.5 bg-fondo px-5 pb-[max(1.5rem,var(--safe-abajo))]", paso === "vista" ? "pt-1.5" : "pt-2.5")} data-pie-historia="">
        {aviso}
        {contenido}
      </div>
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

      {paso === "foto" && (
        <>
          <MarcoFoto portada={portada} total={fotos.length} />
          {medios.length === 0 && encabezado}
          <div className={medios.length === 0 ? "mt-3.5" : "mt-3"}>
            <SeccionMedios medios={medios} alCambiar={setMedios} taller={taller} avisar={toast} historia />
          </div>
          {/* El momento de voz de la foto, al final de la pantalla: sin regañar (se puede seguir sin ella). */}
          <p className="mt-3 text-center font-mano text-[1.625rem] leading-[1.1] text-atencion-texto" data-con-foto="">{SIN_FOTO}</p>
          {/* Debajo irá «Pedir a Deslizapp que retoque tu foto» (ronda futura): se deja el sitio. */}
          {medios.length > 0 && <div aria-hidden="true" className="mt-2.5 h-9" data-hueco-retoque="" />}
        </>
      )}

      {paso === "nombre" && (
        <>
          {encabezado}
          <Campo
            className="mt-4" grande etiqueta="Nombre del producto" value={nombre} onChange={(e) => setNombre(e.target.value)}
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
              className="mt-4" grande etiqueta="Precio" aria-label="Precio (RD$)" prefijo="RD$" inputMode="numeric" enterKeyHint="next" onKeyDown={alEnter}
              precio={{ digitos: precio, alCambiar: setPrecio }} placeholder="Escribe tu precio" data-precio="" data-campo-paso=""
            />
          )}
          {/* «Tiene tallas o colores» aparece cuando ya hay precio (nada antes de tiempo). */}
          {(Number(precio) > 0 || tieneOpciones) && (
            <div className="mt-2.5 flex" data-chip-presentaciones="">
              <Chip hecho={tieneOpciones} onClick={() => (sinCatalogo ? toast(porque) : setPresAbierta(true))}>
                {tieneOpciones ? pastillasDeOpciones(presentaciones.opciones).join(" · ") : "Tiene tallas o colores"}
              </Chip>
            </div>
          )}
        </>
      )}

      {paso === "stock" && (
        <>
          {encabezado}
          {porEncargo ? (
            <div className="mt-3.5 flex flex-col gap-3" data-cuando-llega="">
              <FilaInterruptor texto="Es por encargo, no llevo stock" encendido alCambiar={elegirEncargo} />
              <GrupoEleccion
                etiqueta="¿Cuándo llega?" compacta
                valor={otroAbierto ? "otro" : opcionDeCuandoLlega(encargoTexto)}
                alCambiar={(id) => {
                  if (id === "otro") {
                    // «Otro» abre el campo y le pone el foco en el mismo toque (teclado del iPhone).
                    flushSync(() => setEncargoOtro(true));
                    raiz.current?.querySelector<HTMLInputElement>("[data-campo-paso]")?.focus();
                    return;
                  }
                  setEncargoOtro(false);
                  setEncargoTexto(textoCuandoLlega(id));
                }}
                opciones={[...OPCIONES_CUANDO_LLEGA.map((o) => ({ id: o as string, texto: o })), { id: "otro", texto: "Otro" }]}
              />
              {otroAbierto && (
                <Campo
                  etiqueta="Cuándo llega" icono={IconoReloj} value={encargoTexto} maxLength={40} onChange={(e) => setEncargoTexto(e.target.value)}
                  placeholder="Llega en 7 a 10 días" enterKeyHint="next" onKeyDown={alEnter} data-campo-paso=""
                />
              )}
            </div>
          ) : (
            <>
              <div className="mt-3.5">
                {tieneOpciones ? (
                  <div className="flex items-center justify-between gap-3 rounded-radio-m border border-linea bg-superficie p-4">
                    <p className="text-destacado text-texto">{resumenPres.total} {resumenPres.total === 1 ? "presentación" : "presentaciones"} · {resumenPres.enTotal} en total</p>
                    <Boton jerarquia="secundario" tamano="compacto" onClick={() => (sinCatalogo ? toast(porque) : setPresAbierta(true))}>Cambiar</Boton>
                  </div>
                ) : (
                  <div className="flex justify-center" data-contador-stock="">
                    <Cantidad grande valor={stock} max={2147483647} alCambiar={setStock} etiquetaQuitar="Quitar uno" etiquetaAgregar="Agregar uno" />
                  </div>
                )}
              </div>
              <div className="mt-2.5">
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
          <section aria-labelledby="titulo-brillar" className="mt-2.5 flex flex-col gap-1.5">
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
          <div className="flex items-center gap-2.5">
            {botonAtras}
            {medios.length === 0 ? (
              <Boton jerarquia="terciario" tamano="grande" className="flex-1" onClick={seguir}>Seguir sin foto</Boton>
            ) : (
              <Boton tamano="grande" className="flex-1" onClick={seguir}>Seguir</Boton>
            )}
          </div>,
        )}
      {(paso === "nombre" || paso === "precio" || paso === "stock") &&
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
          llenoPlan && !sinFoto ? <p role="status" className="text-center text-secundario text-texto-secundario" data-catalogo-lleno="">Tu catálogo está lleno. Lo guardamos oculto hasta que hagas espacio.</p> : undefined,
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
      {!servicio && (
        <FlujoPresentaciones
          abierta={presAbierta} alCerrar={() => setPresAbierta(false)} rubro={tipo} precioProducto={Number(precio) || 0} estado={presentaciones}
          stockSimple={stockTocado ? stock : null} publicado={false}
          fotos={medios.flatMap((m) => (m.tipo === "foto" ? [{ id: m.id, url: m.url }] : []))}
          agregarFoto={(archivo) => agregarFotoAlBorrador(archivo, medios, setMedios, toast)}
          tienePedidos={async () => false} avisar={toast}
          alConfirmar={(nuevo) => {
            cambiarPresentaciones(nuevo);
            setPresAbierta(false);
          }}
        />
      )}
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

/** El marco de la foto (paso 1), como el lienzo: sin fotos, el hueco punteado «Tu foto va aquí»; con fotos, la portada en grande y «1/N». */
function MarcoFoto({ portada, total }: { portada: string | null; total: number }) {
  return (
    <div className="relative h-[372px] w-full shrink-0 overflow-hidden rounded-radio-l bg-superficie-hundida" data-marco-foto="">
      {portada ? (
        <>
          <Foto src={portada} alt="Portada del producto" className="absolute inset-0" sizes="(max-width: 480px) 100vw, 440px" />
          <span aria-hidden="true" className="absolute top-3 right-3 inline-flex h-[26px] items-center rounded-full bg-velo px-2.5 text-[0.8125rem] font-extrabold text-papel tabular-nums">1/{total}</span>
        </>
      ) : (
        <div aria-hidden="true" className="absolute inset-3.5 flex flex-col items-center justify-center gap-2 rounded-radio-m border-2 border-dashed border-borde-campo text-texto-secundario">
          <IconoCamara tamano={44} strokeWidth={1.8} />
          <span className="text-secundario font-bold">Tu foto va aquí</span>
        </div>
      )}
    </div>
  );
}

/** «Atrás» de la historia: el círculo de 52 px abajo a la izquierda del botón principal (en todas las hojas de la historia). */
function BotonAtras({ alTocar, apagado = false }: { alTocar: () => void; apagado?: boolean }) {
  return (
    <button
      type="button" aria-label="Atrás" onClick={alTocar} disabled={apagado}
      className={clases("tocable grid size-(--alto-boton-grande) shrink-0 place-items-center rounded-full border-[1.5px] border-accion bg-superficie text-accion disabled:opacity-35", FOCO)}
      data-atras-historia=""
    >
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
    </button>
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
    <div ref={caja} className="relative mt-1 aspect-[390/488] w-full shrink-0 overflow-hidden rounded-radio-l bg-superficie-hundida" data-reel-historia="">
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

/** La pregunta de la burbuja blanca: con tallas, por una del medio («¿Tienes en M?», como el lienzo); si no, «¿Todavía hay?». */
function preguntaDeCliente(producto: Producto): string {
  const valores = producto.opciones[0]?.valores ?? [];
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
