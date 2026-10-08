"use client";

import { useRef, useState } from "react";
import { formatearPesos } from "@/lib/formato";
import { pastillasDeOpciones } from "@/lib/hoja-producto";
import {
  alternarValor,
  atajosDe,
  cambiarEjes,
  claveVariante,
  colorDe,
  conservarEdicion,
  cuantasSalen,
  ejeDeFoto,
  entreLos,
  errorDeNombrePropio,
  estadoDe,
  estadoDeReparto,
  LARGO_VALOR,
  listaDeCosas,
  MAX_EJES,
  MAX_VALORES,
  mismosEjes,
  ordenarValores,
  otroDe,
  pistaDeEjes,
  podarFotosColor,
  podarValores,
  ponerATodas,
  ponerTodasEn,
  precioDe,
  puedeElegirOtra,
  quitar,
  repartoCuadra,
  resumenDe,
  resumenDeValores,
  tarjetaApagada,
  TEXTO_CON_PEDIDOS,
  textoCombinacion,
  textoDeReparto,
  textoPresentaciones,
  valoresSugeridos,
  valoresVisibles,
  type EstadoPresentaciones,
  type Origen,
  type Presentacion,
} from "@/lib/presentaciones";
import { colorPorNombre } from "@/lib/colores";
import { OPCIONES_TIPICAS, type Rubro } from "@/lib/rubros";
import type { OpcionProducto } from "@/lib/types";
import { IconoChevronAbajo, IconoChevronArriba, IconoMas } from "../iconos";
import { Hoja, HojaFijoAbajo } from "../hoja";
import { clases, FOCO } from "../ui/comunes";
import { Alerta, Boton, Campo, Cantidad, EditorEtiquetas, Etiqueta, FilaLista, FilaVariante, ListaAgrupada, Opcion, Tarjeta } from "../ui";
import { HojaFotoColor, HojaPresentacion, type FotoBorrador } from "./hoja-presentacion";

const plural = (nombre: string) => (/[aeiouáéíóú]$/i.test(nombre) ? `${nombre}s` : `${nombre}es`);

type EjeBorrador = { nombre: string; valores: string[]; propia: boolean };
/** Las tarjetas del paso 1: las cosas elegidas con sus valores y el campo de «+ Otra cosa». */
type Tarjetas = { ejes: EjeBorrador[]; otraAbierta: boolean; otra: string; errorOtra: string | null; cerradas: string[] };

/** «Otro color» / «Otra talla»: el botón punteado que abre el campo para un valor propio. */
function OtroValor({ nombre, valores, alCambiar }: { nombre: string; valores: string[]; alCambiar: (v: string[]) => void }) {
  const [escribiendo, setEscribiendo] = useState(false);
  const [texto, setTexto] = useState("");
  const entrada = useRef<HTMLInputElement>(null);
  const agregar = () => {
    const nuevos = alternarValor(valores, texto);
    if (nuevos !== valores) alCambiar(nuevos);
    setTexto("");
    // Con el valor 12 el campo se cierra ahí mismo: así el siguiente toque cae donde se ve y no en una hoja que se movió.
    if (nuevos.length >= MAX_VALORES) setEscribiendo(false);
  };
  if (!escribiendo) {
    // Con los 12 el botón se queda (apagado) para que la hoja no se mueva debajo del dedo.
    const lleno = valores.length >= MAX_VALORES;
    return (
      <button
        type="button"
        disabled={lleno}
        onClick={() => {
          setEscribiendo(true);
          // El foco dentro del mismo toque: así iOS abre el teclado.
          requestAnimationFrame(() => entrada.current?.focus());
        }}
        className="tocable inline-flex h-(--alto-control) items-center gap-1.5 rounded-full border-[1.5px] border-dashed border-borde-pastilla px-4 text-cuerpo font-extrabold text-texto-secundario disabled:opacity-40"
      >
        + {otroDe(nombre)}
      </button>
    );
  }
  return (
    <input
      ref={entrada}
      autoFocus
      type="text"
      enterKeyHint="done"
      autoComplete="off"
      aria-label={otroDe(nombre)}
      placeholder="Escríbelo y toca Enter"
      maxLength={LARGO_VALOR}
      value={texto}
      onChange={(e) => setTexto(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === ",") {
          e.preventDefault();
          agregar();
        } else if (e.key === "Escape") setEscribiendo(false);
      }}
      onBlur={() => {
        // Lo escrito no se pierde al salir del campo.
        agregar();
        setEscribiendo(false);
      }}
      className="h-(--alto-control) w-44 min-w-0 rounded-full border-2 border-borde-campo bg-superficie px-4 text-cuerpo text-texto outline-none placeholder:text-texto-secundario focus:border-accion"
    />
  );
}

/** Los ejes del flujo con los que arranca el paso 1: los que el producto ya tiene o, si no tiene, lo típico de su tipo. */
const tarjetasIniciales = (rubro: Rubro, opciones: OpcionProducto[]): Tarjetas => {
  const { tipicas, otras } = listaDeCosas(OPCIONES_TIPICAS[rubro]);
  const delCatalogo = [...tipicas, ...otras];
  return {
    ejes:
      opciones.length > 0
        ? opciones.map((o) => {
            const cat = delCatalogo.find((c) => c.toLocaleLowerCase("es") === o.nombre.toLocaleLowerCase("es"));
            return { nombre: cat ?? o.nombre, valores: o.valores, propia: !cat };
          })
        : tipicas.slice(0, 1).map((nombre) => ({ nombre, valores: [], propia: false })),
    otraAbierta: false,
    otra: "",
    errorOtra: null,
    cerradas: [],
  };
};

/** Los ejes tal como se guardan: los valores sugeridos en su orden de siempre y los propios en el que se pusieron. */
const ejesFinales = (ejes: EjeBorrador[], rubro: Rubro): OpcionProducto[] =>
  ejes.map((e) => ({ nombre: e.nombre, valores: e.propia ? e.valores : ordenarValores(valoresSugeridos(e.nombre, rubro), e.valores) }));

type Detalle = { tipo: "una"; clave: string } | { tipo: "foto" } | null;

/**
 * Presentaciones en dos pasos (docs/prompts/presentaciones-por-pasos.md): «Qué cambia» (las cosas y sus valores) y «Cuántas
 * tienes» (una fila por combinación con su stock). Un solo camino para crear, agregar un valor, agregar o quitar una cosa y pasar
 * del stock simple a presentaciones. Lo que ya había se reparte en el paso 2 y «Listo» espera a que cuadre: nunca se pierde
 * stock en silencio. Edita un borrador: se aplica al producto con «Listo» y se guarda con «Guardar cambios» de la ficha.
 */
export function FlujoPresentaciones({
  abierta,
  alCerrar,
  rubro,
  precioProducto,
  estado,
  stockSimple,
  publicado,
  fotos,
  agregarFoto,
  tienePedidos,
  avisar,
  alConfirmar,
}: {
  abierta: boolean;
  alCerrar: () => void;
  rubro: Rubro;
  precioProducto: number;
  /** Lo que tiene el producto ahora. */
  estado: EstadoPresentaciones;
  /** El stock simple de antes (producto sin presentaciones): se reparte al crearlas. null = no llevaba la cuenta. */
  stockSimple: number | null;
  /** ¿El producto ya se publicó? Solo entonces una presentación sin stock dice «Agotada». */
  publicado: boolean;
  fotos: FotoBorrador[];
  agregarFoto: (archivo: File) => Promise<string | null>;
  tienePedidos: (varianteId: string) => Promise<boolean>;
  avisar: (mensaje: string) => void;
  alConfirmar: (nuevo: EstadoPresentaciones) => void;
}) {
  const editando = estado.pres.length > 0 && estado.opciones.length > 0;
  const arrancar = () => ({
    paso: (editando ? 2 : 1) as 1 | 2,
    desdePaso1: false,
    tarjetas: tarjetasIniciales(rubro, editando ? estado.opciones : []),
    borrador: { opciones: editando ? estado.opciones : [], pres: editando ? estado.pres : [], fotosColor: editando ? estado.fotosColor : {} } as EstadoPresentaciones,
    origenes: [] as Origen[],
    abiertos: null as string[] | null,
  });
  const [s, setS] = useState(arrancar);
  const [abiertaAntes, setAbiertaAntes] = useState(abierta);
  if (abierta !== abiertaAntes) {
    setAbiertaAntes(abierta);
    if (abierta) setS(arrancar());
  }
  const [detalle, setDetalle] = useState<Detalle>(null);
  const [preguntar, setPreguntar] = useState<{ texto: string; aplicar: () => void } | null>(null);
  const [todas, setTodas] = useState(0);

  const { paso, tarjetas, borrador, origenes } = s;
  const { ejes, otraAbierta, otra, errorOtra, cerradas } = tarjetas;
  const { tipicas, otras } = listaDeCosas(OPCIONES_TIPICAS[rubro]);
  const finales = ejesFinales(ejes, rubro);
  const ponerTarjetas = (f: (t: Tarjetas) => Tarjetas) => setS((x) => ({ ...x, tarjetas: f(x.tarjetas) }));
  const ponerBorrador = (f: (b: EstadoPresentaciones) => EstadoPresentaciones) => setS((x) => ({ ...x, borrador: f(x.borrador) }));
  const cambiarUna = (clave: string, cambio: Partial<Presentacion>) =>
    ponerBorrador((b) => ({ ...b, pres: b.pres.map((p) => (claveVariante(p.valores) === clave ? { ...p, ...cambio } : p)) }));

  // ---- Paso 1: qué cambia ----
  const llenos = !puedeElegirOtra(ejes.length);
  const pista = pistaDeEjes(finales);
  const n = pista ? 0 : cuantasSalen(finales);
  const elegir = (nombre: string) =>
    ponerTarjetas((t) => (t.ejes.some((e) => e.nombre === nombre) || !puedeElegirOtra(t.ejes.length) ? t : { ...t, ejes: [...t.ejes, { nombre, valores: [], propia: false }], otraAbierta: false, cerradas: t.cerradas.filter((c) => c !== nombre) }));
  const quitarEje = (nombre: string) => ponerTarjetas((t) => ({ ...t, ejes: t.ejes.filter((e) => e.nombre !== nombre), cerradas: t.cerradas.filter((c) => c !== nombre) }));
  const alternarAbierta = (nombre: string) => ponerTarjetas((t) => ({ ...t, cerradas: t.cerradas.includes(nombre) ? t.cerradas.filter((c) => c !== nombre) : [...t.cerradas, nombre] }));
  const ponerValores = (nombre: string, valores: string[]) => ponerTarjetas((t) => ({ ...t, ejes: t.ejes.map((e) => (e.nombre === nombre ? { ...e, valores } : e)) }));
  const listoOtra = () => {
    const e = errorDeNombrePropio(otra, ejes.map((x) => x.nombre), tipicas);
    // La cosa propia nace arriba de la lista, donde se ve, y no al final de la página.
    if (e) return ponerTarjetas((t) => ({ ...t, errorOtra: e }));
    ponerTarjetas((t) => ({ ...t, ejes: [...t.ejes, { nombre: otra.trim(), valores: [], propia: true }], otraAbierta: false, otra: "", errorOtra: null }));
  };

  /** Pasa al paso 2 con los ejes elegidos. Si algo se va o se mueve, antes se pregunta. */
  const siguiente = () => {
    if (pista) return;
    const ya = borrador.pres.length > 0 && mismosEjes(finales, borrador.opciones);
    const ir = () => {
      if (ya) return setS((x) => ({ ...x, paso: 2, desdePaso1: true }));
      try {
        // Siempre desde lo que el producto tenía al abrir, con lo ya tocado en el paso 2 encima.
        const c = cambiarEjes(estado.opciones, estado.pres, finales, stockSimple);
        setS((x) => ({
          ...x,
          paso: 2,
          desdePaso1: true,
          origenes: c.origenes,
          abiertos: null,
          borrador: { opciones: c.opciones, pres: conservarEdicion(c.presentaciones, x.borrador.pres), fotosColor: podarFotosColor(x.borrador.fotosColor, x.borrador.opciones, c.opciones) },
        }));
      } catch (e) {
        avisar(e instanceof Error ? e.message : "No se pudo.");
      }
    };
    if (ya) return ir();
    let c;
    try {
      c = cambiarEjes(estado.opciones, estado.pres, finales, stockSimple);
    } catch (e) {
      return avisar(e instanceof Error ? e.message : "No se pudo.");
    }
    if (c.confirmar) setPreguntar({ texto: c.confirmar, aplicar: ir });
    else ir();
  };

  const volverAUnSoloStock = estado.pres.length > 0 ? resumenDe(estado.pres, precioProducto) : null;

  // ---- Paso 2: cuántas tienes ----
  const { opciones, pres, fotosColor } = borrador;
  const primero = opciones[0];
  const segundo = opciones[1];
  const resumen = resumenDe(pres, precioProducto);
  const repartos = estadoDeReparto(origenes, pres);
  const cuadra = repartoCuadra(origenes, pres);
  const ejeNuevo = opciones.find((o) => !estado.opciones.some((x) => x.nombre === o.nombre));
  const entre = origenes.some((o) => o.titulo) && ejeNuevo ? `entre ${entreLos(ejeNuevo.nombre)}` : "entre ellas";
  const pendiente = repartos.filter((e) => e.faltan !== 0);
  const faltanEnTotal = repartos.reduce((t, e) => t + Math.max(0, e.faltan), 0);
  const sobranEnTotal = repartos.reduce((t, e) => t + Math.max(0, -e.faltan), 0);
  const ejeFoto = ejeDeFoto(opciones);
  const conFoto = ejeFoto ? ejeFoto.valores.filter((v) => fotosColor[v] && fotos.some((f) => f.id === fotosColor[v])).length : 0;
  const grupos = primero && segundo ? primero.valores.map((v) => ({ valor: v, filas: pres.filter((p) => p.valores[primero.nombre] === v) })).filter((g) => g.filas.length > 0) : [{ valor: "", filas: pres }];
  const abiertos = s.abiertos ?? (pres.length <= 24 ? grupos.map((g) => g.valor) : grupos.slice(0, 1).map((g) => g.valor));
  const alternarGrupo = (valor: string) => setS((x) => ({ ...x, abiertos: abiertos.includes(valor) ? abiertos.filter((a) => a !== valor) : [...abiertos, valor] }));
  const valorTodas = pres.length > 0 && pres.filter((p) => p.activa).every((p) => p.stock === pres.find((q) => q.activa)?.stock) ? (pres.find((q) => q.activa)?.stock ?? 0) : todas;
  const enLista = detalle?.tipo === "una" ? pres.find((p) => claveVariante(p.valores) === detalle.clave) ?? null : null;
  const origenDe = (filas: Presentacion[]) => repartos.find((e) => e.origen.titulo && filas.length > 0 && e.origen.filas.every((k) => filas.some((f) => claveVariante(f.valores) === k)));

  const cambios = paso === 1 ? !editando && ejes.some((e) => e.valores.length > 0) : JSON.stringify(borrador) !== JSON.stringify(editando ? { opciones: estado.opciones, pres: estado.pres, fotosColor: estado.fotosColor } : { opciones: [], pres: [], fotosColor: {} });

  const listo = () => {
    if (pres.length === 0) return alConfirmar({ opciones: [], pres: [], fotosColor: {} });
    const podadas = podarValores(opciones, pres);
    alConfirmar({ ...borrador, opciones: podadas, fotosColor: podarFotosColor(fotosColor, opciones, podadas) });
  };

  const tarjeta = (nombre: string, propia: boolean) => {
    const eje = ejes.find((e) => e.nombre === nombre);
    if (!eje) {
      const apagada = tarjetaApagada(false, ejes.length);
      return (
        <button
          key={nombre}
          type="button"
          aria-pressed={false}
          disabled={apagada}
          onClick={() => elegir(nombre)}
          className={clases("tocable flex min-h-14 w-full items-center justify-between gap-3 rounded-radio-l border border-linea bg-superficie px-4 py-2 text-left disabled:opacity-40", FOCO)}
        >
          <span className="min-w-0 truncate text-destacado font-extrabold text-texto">{nombre}</span>
          <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-superficie-hundida text-texto-secundario">
            <IconoMas tamano={20} />
          </span>
        </button>
      );
    }
    const colapsada = cerradas.includes(nombre);
    const sugeridos = propia ? [] : valoresSugeridos(nombre, rubro);
    const atajos = atajosDe(nombre, rubro).filter((a) => a.texto !== "30 · 50 · 100 ml");
    return (
      <Tarjeta key={nombre} className="flex flex-col gap-3">
        <div data-eje={nombre} role="group" aria-label={nombre} className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <button
              type="button"
              aria-expanded={!colapsada}
              aria-label={`${colapsada ? "Expandir" : "Contraer"} ${nombre}`}
              onClick={() => alternarAbierta(nombre)}
              className={clases("tocable flex min-h-11 min-w-0 flex-col items-start justify-center text-left", FOCO)}
            >
              <span className="flex max-w-full items-center gap-1.5 text-destacado font-extrabold text-texto">
                <span className="truncate">{nombre}</span>
                {colapsada ? <IconoChevronAbajo tamano={18} className="shrink-0 text-texto-secundario" /> : <IconoChevronArriba tamano={18} className="shrink-0 text-texto-secundario" />}
              </span>
              {colapsada && <span className="max-w-full truncate text-secundario text-texto-secundario">{resumenDeValores(eje.valores)}</span>}
            </button>
            <Boton jerarquia="terciario" tamano="compacto" aria-label={`Quitar ${nombre}`} onClick={() => quitarEje(nombre)}>
              Quitar
            </Boton>
          </div>
          {!colapsada &&
            (propia ? (
              <EditorEtiquetas etiqueta={plural(nombre)} rotuloVisible={false} valores={eje.valores} alCambiar={(v) => ponerValores(nombre, v)} maximo={MAX_VALORES} largoMaximo={LARGO_VALOR} />
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  {valoresVisibles(sugeridos, eje.valores).map((v) => {
                    const puesto = eje.valores.includes(v);
                    return (
                      <Opcion key={v} casilla elegida={puesto} deshabilitada={!puesto && eje.valores.length >= MAX_VALORES} onClick={() => ponerValores(nombre, alternarValor(eje.valores, v))}>
                        {v}
                      </Opcion>
                    );
                  })}
                  <OtroValor nombre={nombre} valores={eje.valores} alCambiar={(v) => ponerValores(nombre, v)} />
                </div>
                {atajos.length > 0 && (
                  <div className="flex flex-wrap items-center gap-x-1 text-secundario text-texto-secundario">
                    Rápido:
                    {atajos.map((a) => (
                      <Boton key={a.texto} jerarquia="terciario" tamano="compacto" onClick={() => ponerValores(nombre, a.valores)}>
                        {a.texto}
                      </Boton>
                    ))}
                  </div>
                )}
              </>
            ))}
        </div>
      </Tarjeta>
    );
  };

  const fila = (p: Presentacion, agrupada: boolean) => {
    const clave = claveVariante(p.valores);
    const st = estadoDe(p, publicado);
    return (
      <FilaVariante
        key={clave}
        texto={agrupada && segundo ? (p.valores[segundo.nombre] ?? "") : textoCombinacion(opciones, p.valores)}
        color={agrupada ? null : colorDe(opciones, p.valores)}
        stock={p.stock ?? 0}
        alCambiar={(v) => cambiarUna(clave, { stock: v })}
        alAbrir={() => setDetalle({ tipo: "una", clave })}
        estado={st.estado === "normal" ? null : st.texto}
        detalle={p.precio !== null ? `${formatearPesos(precioDe(p, precioProducto))} · precio propio` : undefined}
        atenuada={!p.activa}
      />
    );
  };

  const nombreHoja = paso === 1 ? "Qué cambia" : "Cuántas tienes";

  return (
    <Hoja
      abierta={abierta}
      alCerrar={alCerrar}
      titulo={nombreHoja}
      altura="grande"
      avisarAlSalir={cambios}
      fijoArriba={
        <div data-paso-presentaciones={paso} className="flex flex-col gap-2">
          <p className="text-secundario font-extrabold text-texto-secundario">Paso {paso} de 2</p>
          <div aria-hidden="true" className="flex gap-1.5">
            <i className="h-1 flex-1 rounded-full bg-accion" />
            <i className={clases("h-1 flex-1 rounded-full", paso === 2 ? "bg-accion" : "bg-linea")} />
          </div>
        </div>
      }
    >
      {paso === 1 ? (
        <div className="flex flex-col gap-5 pb-24" data-paso="que-cambia">
          <p id="elegir-titulo" className="font-display text-titulo-hoja text-texto">¿Qué cambia de una a otra?</p>
          <div className="flex flex-col gap-2" role="group" aria-labelledby="elegir-titulo">
            {ejes.filter((e) => e.propia).map((e) => tarjeta(e.nombre, true))}
            {[...tipicas, ...otras].map((nombre) => tarjeta(nombre, false))}
            {otraAbierta && !llenos ? (
              <Tarjeta className="flex flex-col gap-3">
                <Campo
                  etiqueta="¿Qué otra cosa cambia?"
                  placeholder="Ej: Aroma"
                  ayuda="Ej: Material, Aroma, Estampado."
                  maxLength={LARGO_VALOR}
                  value={otra}
                  error={errorOtra}
                  enterKeyHint="done"
                  onChange={(e) => ponerTarjetas((t) => ({ ...t, otra: e.target.value, errorOtra: null }))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      listoOtra();
                    }
                  }}
                />
                <Boton tamano="compacto" onClick={listoOtra} deshabilitado={!otra.trim()}>
                  Listo
                </Boton>
              </Tarjeta>
            ) : llenos ? (
              <p role="status" className="flex min-h-13 items-center justify-center rounded-radio-l border-[1.5px] border-dashed border-borde-pastilla px-4 py-2 text-center text-destacado text-texto-secundario">
                Ya elegiste {MAX_EJES}: es el máximo. Quita una para elegir otra.
              </p>
            ) : (
              <button
                type="button"
                onClick={() => ponerTarjetas((t) => ({ ...t, otraAbierta: true }))}
                className={clases("tocable flex h-13 items-center justify-center rounded-radio-l border-[1.5px] border-dashed border-borde-pastilla text-destacado text-texto-secundario", FOCO)}
              >
                + Otra cosa
              </button>
            )}
          </div>
          {ejes.length === 0 && volverAUnSoloStock && (
            <div className="flex flex-col gap-2 rounded-radio-l bg-superficie-hundida p-4">
              <p className="text-secundario text-texto">Sin nada que cambie, el producto vuelve a tener un solo stock: {volverAUnSoloStock.enTotal}.</p>
              <Boton
                jerarquia="terciario"
                tono="peligro"
                anchoCompleto
                onClick={() =>
                  setPreguntar({
                    texto: `Las ${volverAUnSoloStock.total} presentaciones se van y su stock (${volverAUnSoloStock.enTotal}) pasa al producto. Si alguna ya tiene pedidos, solo queda oculta.`,
                    aplicar: () => alConfirmar({ opciones: [], pres: [], fotosColor: {} }),
                  })
                }
              >
                Volver a un solo stock
              </Boton>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4 pb-28" data-paso="cuantas">
          <div className="flex items-center justify-between gap-3 rounded-radio-l border border-linea bg-superficie p-4" data-resumen-presentaciones="">
            <div className="flex min-w-0 flex-col gap-1.5">
              <span className="flex flex-wrap gap-1.5">
                {pastillasDeOpciones(opciones).map((t) => (
                  <Etiqueta key={t} tono="exito">{t}</Etiqueta>
                ))}
              </span>
              <span className="text-secundario text-texto-secundario">{textoPresentaciones(resumen.total)} · {resumen.enTotal} en total</span>
            </div>
            <Boton jerarquia="terciario" tamano="compacto" onClick={() => setS((x) => ({ ...x, paso: 1 }))}>Cambiar qué cambia</Boton>
          </div>

          {pendiente.length > 0 && (
            <p role="status" className="rounded-radio-m bg-atencion-suave p-3 text-secundario font-bold text-atencion-texto" data-reparto="">
              {textoDeReparto(pendiente[0]!, entre)}
              {pendiente.length > 1 ? ` Y ${pendiente.length - 1 === 1 ? "otra" : `${pendiente.length - 1} más`} por repartir.` : ""}
            </p>
          )}
          {origenes.length === 1 && !origenes[0]!.titulo && pres.length > 0 && !cuadra && (
            <Boton jerarquia="secundario" anchoCompleto onClick={() => ponerBorrador((b) => ({ ...b, pres: ponerTodasEn(b.pres, origenes[0]!, claveVariante(b.pres[0]!.valores)) }))}>
              Ponerlas todas en {textoCombinacion(opciones, pres[0]!.valores)}
            </Boton>
          )}

          {origenes.length === 0 && pres.length > 1 && (
            <div className="flex items-center justify-between gap-3 rounded-radio-l border border-linea bg-superficie p-3 pl-4">
              <span className="text-destacado text-texto">Poner a todas</span>
              <Cantidad valor={valorTodas} max={2147483647} alCambiar={(v) => { setTodas(v); ponerBorrador((b) => ({ ...b, pres: ponerATodas(b.pres, v) })); }} etiquetaQuitar="Quitar uno a todas" etiquetaAgregar="Agregar uno a todas" />
            </div>
          )}

          {pres.length === 0 ? (
            <p role="status" className="rounded-radio-l border-[1.5px] border-dashed border-borde-pastilla p-4 text-center text-secundario text-texto-secundario">
              No queda ninguna presentación. Cambia qué cambia, o toca Listo para dejar un solo stock.
            </p>
          ) : (
            grupos.map((g) => {
              const agrupado = g.valor !== "";
              const origen = agrupado ? origenDe(g.filas) : undefined;
              const enGrupo = g.filas.filter((p) => p.activa).reduce((t, p) => t + (p.stock ?? 0), 0);
              const abierto = !agrupado || abiertos.includes(g.valor);
              const c = agrupado && primero ? colorPorNombre(g.valor) : null;
              return (
                <section key={g.valor || "todas"} className="flex flex-col gap-2" aria-label={agrupado ? `${primero!.nombre} ${g.valor}` : "Presentaciones del producto"}>
                  {agrupado && (
                    <div className="flex items-center gap-2 px-1">
                      <button
                        type="button"
                        aria-expanded={abierto}
                        onClick={() => alternarGrupo(g.valor)}
                        className={clases("tocable flex min-h-11 min-w-0 flex-1 items-center gap-2 text-left text-destacado font-extrabold text-texto", FOCO)}
                      >
                        {c && <span aria-hidden="true" className="size-4 shrink-0 rounded-full border border-linea" style={{ background: c }} />}
                        <span className="truncate">{g.valor}</span>
                        <span className={clases("shrink-0 text-secundario font-extrabold", origen && origen.faltan !== 0 ? "text-atencion-texto" : "text-texto-secundario")} data-grupo-total="">
                          {origen ? `· ${origen.repartido} de ${origen.origen.total}` : `· ${enGrupo}`}
                        </span>
                        {abierto ? <IconoChevronArriba tamano={18} className="shrink-0 text-texto-secundario" /> : <IconoChevronAbajo tamano={18} className="shrink-0 text-texto-secundario" />}
                      </button>
                      {origen && origen.faltan !== 0 && g.filas[0] && (
                        <Boton jerarquia="terciario" tamano="compacto" onClick={() => ponerBorrador((b) => ({ ...b, pres: ponerTodasEn(b.pres, origen.origen, claveVariante(g.filas[0]!.valores)) }))}>
                          Todas en {g.filas[0].valores[segundo!.nombre]}
                        </Boton>
                      )}
                    </div>
                  )}
                  {abierto && <ListaAgrupada etiqueta={agrupado ? `${g.valor}: cuántas tienes` : "Presentaciones del producto"}>{g.filas.map((p) => fila(p, agrupado))}</ListaAgrupada>}
                </section>
              );
            })
          )}

          {ejeFoto && pres.length > 0 && (
            <ListaAgrupada etiqueta="Fotos">
              <FilaLista
                titulo={`Foto de cada ${ejeFoto.nombre.toLocaleLowerCase("es")}`}
                detalle={conFoto === 0 ? "Sin fotos: se ve la del producto" : `${conFoto} de ${ejeFoto.valores.length} con foto`}
                onClick={() => setDetalle({ tipo: "foto" })}
              />
            </ListaAgrupada>
          )}
          {pres.length > 0 && <p className="px-1 text-secundario text-texto-secundario">Toca una para ponerle precio propio, foto u ocultarla.</p>}
        </div>
      )}

      <HojaFijoAbajo>
        <div className="pointer-events-auto mx-4 mb-[max(0.75rem,var(--safe-abajo))] flex flex-col gap-2" data-barra-flujo="">
          {paso === 1 && pista && ejes.length > 0 && (
            <p role="status" data-pista="" className="self-center rounded-full bg-superficie px-4 py-1.5 text-center text-secundario font-extrabold text-texto-secundario shadow-flotante">
              {pista}
            </p>
          )}
          {paso === 2 && !cuadra && (
            <p role="status" className="self-center rounded-full bg-superficie px-4 py-1.5 text-secundario font-extrabold text-atencion-texto shadow-flotante">
              {faltanEnTotal > 0 ? `Faltan ${faltanEnTotal} por repartir` : `Te pasaste por ${sobranEnTotal}`}
            </p>
          )}
          <div className="flex gap-3">
            {paso === 2 && s.desdePaso1 && (
              <Boton jerarquia="secundario" tamano="grande" className="shadow-flotante" onClick={() => setS((x) => ({ ...x, paso: 1 }))}>Atrás</Boton>
            )}
            <div className="min-w-0 flex-1">
              {paso === 1 ? (
                <Boton tamano="grande" anchoCompleto className="shadow-flotante" deshabilitado={!!pista} onClick={siguiente}>
                  {pista ? "Siguiente" : `Siguiente · ${textoPresentaciones(n)}`}
                </Boton>
              ) : (
                <Boton tamano="grande" anchoCompleto className="shadow-flotante" deshabilitado={!cuadra || pres.length === 0} onClick={listo}>
                  {`Listo · ${resumen.enTotal} en total`}
                </Boton>
              )}
            </div>
          </div>
        </div>
      </HojaFijoAbajo>

      <HojaPresentacion
        abierta={detalle?.tipo === "una" && enLista !== null}
        presentacion={enLista}
        opciones={opciones}
        precioProducto={precioProducto}
        fotos={fotos}
        fotosColor={fotosColor}
        alCerrar={() => setDetalle(null)}
        alCambiar={(cambio) => enLista && cambiarUna(claveVariante(enLista.valores), cambio)}
        alCompletar={(valores) => {
          if (!enLista) return;
          const nueva = claveVariante(valores);
          if (nueva !== claveVariante(enLista.valores) && pres.some((p) => claveVariante(p.valores) === nueva)) return avisar("Esa presentación ya existe.");
          ponerBorrador((b) => ({ ...b, pres: b.pres.map((p) => (claveVariante(p.valores) === claveVariante(enLista.valores) ? { ...p, valores } : p)) }));
          setDetalle({ tipo: "una", clave: nueva });
        }}
        alElegirFoto={(valor, id) => ponerBorrador((b) => ({ ...b, fotosColor: id ? { ...b.fotosColor, [valor]: id } : Object.fromEntries(Object.entries(b.fotosColor).filter(([v]) => v !== valor)) }))}
        alQuitar={async () => {
          if (!enLista) return null;
          const con = enLista.id ? await tienePedidos(enLista.id).catch(() => true) : false;
          return {
            con,
            hacer: () => {
              const r = quitar(pres, claveVariante(enLista.valores), con);
              ponerBorrador((b) => ({ ...b, pres: r.presentaciones }));
              setDetalle(null);
              if (r.oculta) avisar(TEXTO_CON_PEDIDOS);
            },
          };
        }}
      />
      <HojaFotoColor
        abierta={detalle?.tipo === "foto"}
        eje={ejeFoto}
        pres={pres}
        fotos={fotos}
        fotosColor={fotosColor}
        agregarFoto={agregarFoto}
        alCerrar={() => setDetalle(null)}
        alElegir={(valor, id) => ponerBorrador((b) => ({ ...b, fotosColor: id ? { ...b.fotosColor, [valor]: id } : Object.fromEntries(Object.entries(b.fotosColor).filter(([v]) => v !== valor)) }))}
      />
      <Alerta
        abierta={preguntar !== null}
        titulo="¿Seguir con el cambio?"
        descripcion={preguntar?.texto ?? ""}
        alCancelar={() => setPreguntar(null)}
        accion={{ texto: "Sí, cambiar", tono: "peligro", alConfirmar: () => { const q = preguntar!; setPreguntar(null); q.aplicar(); } }}
      />
    </Hoja>
  );
}
