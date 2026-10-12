"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { leerCatalogoActivo, nombreCatalogoPanel, rubroInicialDeProducto } from "@/lib/catalogo-activo";
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
import { IconoCamara, IconoCheck, IconoEtiqueta, IconoMas, IconoReloj } from "../iconos";
import { MENSAJE_VISTA_PREVIA, type DatosVistaPrevia } from "../tienda/vista-previa-reel";
import { useToast } from "../toast";
import { Boton, Campo, Cantidad, GrupoOpciones, Opcion } from "../ui";
import { clases, FOCO } from "../ui/comunes";
import { SeccionDetalles, sugerenciasDeDetalles } from "./ficha-detalles";
import { agregarFotoAlBorrador, mediosParaGuardar, SeccionMedios, type MedioBorrador } from "./ficha-medios";
import { SeccionDescripcion, SeccionFichaTecnica } from "./ficha-tecnica";
import { FlujoPresentaciones } from "./flujo-presentaciones";
import { useGuardarProducto } from "./guardar-producto";
import { HojaColeccion } from "./hoja-producto";
import { HojaLoQueVendes } from "./hoja-lo-que-vendes";
import { HojaPublicarCatalogo } from "./hoja-publicar-catalogo";
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
  const barras = (
    <div role="progressbar" aria-label="Avance" aria-valuemin={1} aria-valuemax={pasos.length} aria-valuenow={llenas} className="flex items-center gap-1.5" data-barras-historia="">
      {pasos.map((p, i) => (
        <span key={p} className={clases("h-1 flex-1 rounded-full", i < llenas ? "bg-accion" : "bg-borde-pastilla")} />
      ))}
    </div>
  );
  return (
    <Hoja
      abierta={abierta} alCerrar={cerrar} alSalir={alSalir} protegerAtras titulo="Nuevo producto" tituloOculto altura="grande" juntoACerrar={barras}
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
          key={`${tiendaId}:${vuelta}`} paso={paso} alCambiarPaso={setPaso} servicio={servicio} productos={productos}
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
}: {
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
  const tipoBase: Rubro = tienda ? rubroInicialDeProducto(tienda, leerCatalogoActivo(tienda.id)) : rubro;
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
    if (campo) campo.focus();
    else raiz.current?.querySelector<HTMLElement>("[data-titulo-paso]")?.focus();
  };
  const listoParaSeguir = puedeSeguir(paso, { nombre, precio, porEncargo, encargoTexto });
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
  const elegirEncargo = (activo: boolean) => {
    setPorEncargo(activo);
    if (!activo) setEncargoOtro(false);
  };
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
        nombre, precio, medios, stock: porEncargo ? 0 : stock, presentaciones: tieneOpciones ? presentaciones : SIN_PRESENTACIONES, detalles, ficha,
        coleccion: coleccionElegida, porEncargo: !servicio && porEncargo, encargoTexto, rubro: variosTipos ? tipo : null, activo: visible,
      },
      { sinFoto: true },
    );
    setGuardando(false);
    if (!r) return;
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
        presentaciones: tieneOpciones ? presentaciones.pres : [], stock: porEncargo ? 0 : stock, porEncargo, encargoTexto, categoria: coleccionElegida, rubro: tipo,
        fotosPorValor, fichaUrl: fichaVisible(null, ficha) && ficha.tipo === "nueva" ? ficha.foto : null,
      }),
    };
  };

  const textos = textosDelPaso(paso, porEncargo);
  const precioTarjeta = varia && resumenPres.desde !== null ? `Desde ${formatearPesos(resumenPres.desde)}` : Number(precio) > 0 ? formatearPesos(Number(precio)) : null;
  const encabezado = (
    <div className="flex flex-col gap-1">
      <h2 tabIndex={-1} data-titulo-paso="" className="font-display text-titulo-hoja text-texto outline-none">{textos.titulo}</h2>
      <p className="text-secundario text-texto-secundario">{textos.ayuda}</p>
    </div>
  );

  return (
    <div ref={raiz} className="flex flex-col gap-5" data-historia-producto="" data-paso={paso}>
      {(paso === "foto" || paso === "nombre" || paso === "precio" || paso === "stock") && (
        <TarjetaAsiSeVera portada={portada} nombre={nombre} precio={precioTarjeta} nota={paso !== "foto"} />
      )}
      {paso === "foto" && !portada && (
        // El momento de voz del paso 1 (su única Caveat): junto al marco, sin regañar.
        <p className="-mt-2 text-center font-mano text-mano text-atencion-texto" data-con-foto="">{SIN_FOTO}</p>
      )}

      {paso === "foto" && (
        <>
          {encabezado}
          <SeccionMedios
            medios={medios} alCambiar={setMedios} taller={taller} avisar={toast}
            historia={{
              pieSinFotos: (
                <Boton jerarquia="terciario" anchoCompleto onClick={seguir}>Seguir sin foto</Boton>
              ),
            }}
          />
        </>
      )}

      {paso === "nombre" && (
        <>
          {encabezado}
          <Campo
            etiqueta="Nombre del producto" icono={IconoEtiqueta} value={nombre} onChange={(e) => setNombre(e.target.value)}
            placeholder="El nombre de tu producto" maxLength={120} enterKeyHint="next" onKeyDown={alEnter} data-campo-paso=""
          />
          {variosTipos && (
            <div className="flex flex-col gap-2" data-catalogo-historia="">
              <GrupoOpciones
                titulo="¿En qué catálogo va?" valor={tipo}
                alCambiar={(id) => (sinCatalogo ? toast(porque) : setTipo(id))}
                opciones={tipos.map((r) => ({ id: r, texto: nombreCatalogoPanel(r) }))}
              />
              <Boton jerarquia="terciario" className="self-start" icono={<IconoMas tamano={18} />} onClick={() => (sinCatalogo ? toast(porque) : setVendiendoOtra(true))}>
                Vendo otra cosa también
              </Boton>
            </div>
          )}
        </>
      )}

      {paso === "precio" && (
        <>
          {encabezado}
          {varia && resumenPres.desde !== null ? (
            <p className="text-destacado text-texto" data-precio-desde="">Varía por presentación · desde {formatearPesos(resumenPres.desde)}</p>
          ) : (
            <Campo
              etiqueta="Precio" aria-label="Precio (RD$)" prefijo="RD$" inputMode="numeric" enterKeyHint="next" onKeyDown={alEnter}
              precio={{ digitos: precio, alCambiar: setPrecio }} placeholder="Escribe el precio" data-precio="" data-campo-paso=""
            />
          )}
          <PastillasPresentaciones presentaciones={presentaciones} alAbrir={() => (sinCatalogo ? toast(porque) : setPresAbierta(true))} />
        </>
      )}

      {paso === "stock" && (
        <>
          {encabezado}
          {porEncargo ? (
            <div className="flex flex-col gap-3" data-cuando-llega="">
              <GrupoOpciones
                etiqueta="¿Cuándo llega?"
                valor={encargoOtro ? "otro" : opcionDeCuandoLlega(encargoTexto)}
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
              {encargoOtro && (
                <Campo
                  etiqueta="Cuándo llega" icono={IconoReloj} value={encargoTexto} maxLength={40} onChange={(e) => setEncargoTexto(e.target.value)}
                  placeholder="Llega en 7 a 10 días" enterKeyHint="next" onKeyDown={alEnter} data-campo-paso=""
                />
              )}
            </div>
          ) : tieneOpciones ? (
            <div className="flex items-center justify-between gap-3 rounded-radio-l border border-linea bg-superficie p-4">
              <p className="text-destacado text-texto">{resumenPres.total} {resumenPres.total === 1 ? "presentación" : "presentaciones"} · {resumenPres.enTotal} en total</p>
              <Boton jerarquia="secundario" tamano="compacto" onClick={() => (sinCatalogo ? toast(porque) : setPresAbierta(true))}>Cambiar</Boton>
            </div>
          ) : (
            <div className="flex justify-center py-2" data-contador-stock="">
              <Cantidad grande valor={stock} max={2147483647} alCambiar={setStock} etiquetaQuitar="Quitar uno" etiquetaAgregar="Agregar uno" />
            </div>
          )}
          <div className="flex justify-center">
            <Opcion casilla elegida={porEncargo} onClick={() => elegirEncargo(!porEncargo)}>Es por encargo, no llevo stock</Opcion>
          </div>
        </>
      )}

      {paso === "vista" && (
        <>
          {encabezado}
          <ReelEnVivo datos={datosVista} />
          <section aria-labelledby="titulo-brillar" className="flex flex-col gap-2">
            <h3 id="titulo-brillar" className="text-secundario font-extrabold text-texto-secundario">Hazlo brillar · opcional</h3>
            <div className="flex flex-wrap gap-2" data-opcionales="">
              <PastillaOpcional texto="Descripción" hecha={descripcion.trim().length > 0} detalle={resumenDescripcion(descripcion)} alTocar={() => setOpcional("descripcion")} />
              <PastillaOpcional texto="Colección" hecha={coleccionElegida !== null} detalle={coleccionElegida} alTocar={() => setOpcional("coleccion")} />
              <PastillaOpcional texto="Ficha técnica" hecha={fichaCambiada(ficha)} alTocar={() => setOpcional("ficha")} />
              {conDetalles && <PastillaOpcional texto="Detalles" hecha={tieneDetallesPorRubro(detalles)} alTocar={() => setOpcional("detalles")} />}
            </div>
          </section>
          {llenoPlan && <p className="text-secundario text-texto-secundario" data-catalogo-lleno="">Tu catálogo está lleno. Lo guardamos oculto hasta que hagas espacio.</p>}
          {sinCatalogo && <p className="rounded-radio-m bg-atencion-suave p-3 text-center text-secundario font-bold text-atencion-texto" data-sin-permiso="">{porque}</p>}
        </>
      )}

      {paso === "listo" && hecho && (
        <Celebracion
          producto={hecho.producto} visible={hecho.visible} cuentan={hecho.cuentan} alOtro={alOtro}
          compartir={tienda ? <CompartirCatalogo tiendaNombre={tienda.nombre} alPublicar={() => (esDuena ? setPublicando(true) : toast(porque))} /> : null}
        />
      )}

      {paso !== "listo" && paso !== "foto" && (
        <HojaFijoAbajo>
          <div className="pointer-events-auto mx-4 mb-[max(0.75rem,var(--safe-abajo))] flex flex-col gap-1" data-pie-historia="">
            <div className="flex items-center gap-3">
              <button type="button" aria-label="Atrás" onClick={atras} className={clases("tocable grid size-(--alto-boton-grande) shrink-0 place-items-center rounded-full border-[1.5px] border-accion bg-superficie text-accion shadow-flotante", FOCO)} data-atras-historia="">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
              </button>
              {paso === "vista" ? (
                <Boton jerarquia="resalte" tamano="grande" className="flex-1 shadow-flotante" cargando={guardando} deshabilitado={llenoPlan || sinCatalogo || preparando} onClick={() => guardar(true)}>Publicar</Boton>
              ) : (
                <Boton tamano="grande" className="flex-1 shadow-flotante" deshabilitado={!listoParaSeguir} onClick={seguir}>Seguir</Boton>
              )}
            </div>
            {paso === "vista" && (
              <Boton jerarquia="terciario" anchoCompleto deshabilitado={guardando || sinCatalogo || preparando} onClick={() => guardar(false)}>Guardar sin publicar</Boton>
            )}
          </div>
        </HojaFijoAbajo>
      )}
      {paso === "foto" && medios.length > 0 && (
        <HojaFijoAbajo>
          <div className="pointer-events-auto mx-4 mb-[max(0.75rem,var(--safe-abajo))]" data-pie-historia="">
            <Boton tamano="grande" anchoCompleto className="shadow-flotante" onClick={seguir}>Seguir</Boton>
          </div>
        </HojaFijoAbajo>
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
 * La tarjeta «así se verá»: la portada con la proporción del reel del catálogo (4:5, la foto cubre el marco como `.media img`) y,
 * con el velo, el nombre y el precio mientras se escriben. Su tamaño sale del ancho y del alto de la pantalla (`dvh`, que el
 * teclado del iPhone no cambia): nunca cambia al abrir el teclado, y deja sitio al campo y a «Seguir» (360×640 incluido).
 */
function TarjetaAsiSeVera({ portada, nombre, precio, nota }: { portada: string | null; nombre: string; precio: string | null; nota: boolean }) {
  const n = nombre.trim();
  return (
    <div
      className={clases(
        "relative aspect-[4/5] w-[max(9rem,min(62%,calc((100dvh-27.5rem)*0.8)))] shrink-0 self-center overflow-hidden rounded-radio-l",
        portada ? "bg-superficie-hundida" : "border-2 border-dashed border-borde-campo bg-superficie",
      )}
      data-tarjeta-asi-se-vera="" aria-label={`Así se verá: ${n || "sin nombre"}${precio ? `, ${precio}` : ""}`} role="img"
    >
      {portada ? (
        <>
          <Foto src={portada} alt="" className="absolute inset-0" sizes="(max-width: 480px) 62vw, 280px" />
          <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-3/5 bg-linear-to-t from-velo to-transparent" />
          {nota && <span aria-hidden="true" className="absolute top-2 left-3 font-mano text-mano text-papel [text-shadow:0_1px_4px_rgb(0_0_0/0.35)]">así se verá</span>}
        </>
      ) : (
        <div aria-hidden="true" className="flex h-full flex-col items-center justify-center gap-2 text-texto-secundario">
          <IconoCamara tamano={36} strokeWidth={1.8} />
          <span className="text-secundario">Tu foto va aquí</span>
        </div>
      )}
      {(n || precio) && (
        <div aria-hidden="true" className={clases("absolute inset-x-3 bottom-3", portada ? "text-papel" : "text-texto")}>
          {n && <p className="line-clamp-2 font-display text-titulo-seccion break-words">{n}</p>}
          {precio && <p className="text-cuerpo font-extrabold tabular-nums" data-precio-tarjeta="">{precio}</p>}
        </div>
      )}
    </div>
  );
}

/** «Tiene tallas o colores»: abre el flujo de presentaciones de hoy (PR 1). Con presentaciones, muestra lo que cambia. */
function PastillasPresentaciones({ presentaciones, alAbrir }: { presentaciones: EstadoPresentaciones; alAbrir: () => void }) {
  const tiene = presentaciones.opciones.length > 0 && presentaciones.pres.length > 0;
  return (
    <div className="flex flex-wrap items-center gap-2" data-chip-presentaciones="">
      <Boton jerarquia="secundario" tamano="compacto" icono={tiene ? <IconoCheck tamano={16} /> : <IconoMas tamano={16} />} onClick={alAbrir}>
        {tiene ? pastillasDeOpciones(presentaciones.opciones).join(" · ") : "Tiene tallas o colores"}
      </Boton>
    </div>
  );
}

/** Una pastilla de «Hazlo brillar»: abre su hoja; hecha, lleva el check y dice qué tiene. */
function PastillaOpcional({ texto, hecha, detalle, alTocar }: { texto: string; hecha: boolean; detalle?: string | null; alTocar: () => void }) {
  return (
    <Boton
      jerarquia="secundario" tamano="compacto" icono={hecha ? <IconoCheck tamano={16} /> : <IconoMas tamano={16} />} onClick={alTocar}
      aria-label={hecha ? `${texto}: ${detalle ?? "lista"}. Cambiar` : `Agregar ${texto.toLowerCase()}`} data-opcional={texto} data-hecha={hecha ? "" : undefined}
      className={hecha ? "border-accion-suave bg-accion-suave text-texto" : undefined}
    >
      {texto}
    </Boton>
  );
}

/** Las hojas de los opcionales: lo de hoy (descripción, ficha, detalles) en su propia hoja con «Listo». */
function HojaOpcional({ abierta, titulo, grande = false, alCerrar, children }: { abierta: boolean; titulo: string; grande?: boolean; alCerrar: () => void; children: ReactNode }) {
  return (
    <Hoja abierta={abierta} alCerrar={alCerrar} titulo={titulo} altura={grande ? "grande" : "auto"}>
      <div className="flex flex-col gap-4">
        {children}
        <Boton tamano="grande" anchoCompleto onClick={alCerrar}>Listo</Boton>
      </div>
    </Hoja>
  );
}

/**
 * El reel real del comprador con el borrador, solo (sin la cabecera ni las pestañas del catálogo): `/vista-previa-reel` en un
 * iframe del mismo sitio, con `components/tienda/reel.tsx`, su CSS y el tema de la tienda. El marco es 4:5, como el reel: hasta
 * 352×440 y, en pantallas más bajas, lo que deja ver los opcionales sobre «Publicar» sin desplazar (`dvh`). Se le vuelve a mandar
 * el borrador cuando cambia (al volver de un opcional).
 */
function ReelEnVivo({ datos }: { datos: () => DatosVistaPrevia | null }) {
  const marco = useRef<HTMLIFrameElement>(null);
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
  // El borrador cambia con los opcionales: se manda de nuevo (la vista previa reemplaza lo que tenía).
  const d = datos();
  const clave = JSON.stringify(d && "producto" in d ? d.producto : null);
  useEffect(mandar, [clave]);
  return (
    <div className="relative aspect-[4/5] w-[max(12rem,min(100%,22rem,calc((100dvh-27rem)*0.8)))] shrink-0 self-center overflow-hidden rounded-radio-l bg-black" data-reel-historia="">
      <iframe ref={marco} src="/vista-previa-reel" title="Así lo verá tu cliente" className="absolute inset-0 size-full border-0" />
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

/** La celebración: el titular a mano, la foto con una ligera inclinación y unas formas de marca quietas. Sin confeti. */
function Celebracion({ producto, visible, cuentan, alOtro, compartir }: { producto: Producto; visible: boolean; cuentan: number; alOtro: () => void; compartir: ReactNode }) {
  const foto = producto.medios.find((m) => m.tipo === "foto")?.url ?? producto.fotos[0] ?? null;
  const arranque = visible ? lineaArranque(cuentan) : null;
  return (
    <div className="mov-aparece flex flex-col items-center gap-5 pt-4 text-center" data-celebracion="">
      <div aria-hidden="true" className="relative aspect-[4/5] w-48">
        <span className="absolute -top-4 -left-5 size-10 rounded-full bg-marca-rosa" />
        <span className="absolute top-8 -right-6 size-7 rotate-12 rounded-radio-s bg-resalte" />
        <span className="absolute bottom-6 -left-7 size-8 -rotate-12 rounded-radio-s bg-accion-suave" />
        <span className="absolute -right-3 -bottom-3 size-5 rounded-full bg-accion" />
        <div className="absolute inset-0 -rotate-4 overflow-hidden rounded-radio-l bg-superficie-hundida shadow-flotante" data-foto-celebracion="">
          {foto ? (
            <Foto src={foto} alt="" className="absolute inset-0" sizes="200px" />
          ) : (
            <div className="grid h-full place-items-center font-display text-titulo-pantalla text-texto-secundario">{producto.nombre[0]}</div>
          )}
        </div>
      </div>
      <h2 tabIndex={-1} data-titulo-paso="" className="font-mano text-mano-celebracion text-atencion-texto outline-none">{tituloCelebracion(visible)}</h2>
      <div className="flex flex-col gap-1">
        <p className="text-cuerpo text-texto">{lineaCelebracion(producto.nombre, visible)}</p>
        {arranque && <p className="text-secundario text-texto-secundario" data-arranque="">{arranque}</p>}
      </div>
      <div className="flex w-full flex-col gap-3">
        <Boton tamano="grande" anchoCompleto onClick={alOtro}>Agregar otro</Boton>
        {compartir}
      </div>
    </div>
  );
}
