"use client";

import { useRef, useState } from "react";
import { MOTIVOS_INVENTARIO } from "@/lib/data/inventario";
import { formatearPesos } from "@/lib/formato";
import {
  agregarSuelta,
  alternarValor,
  atajosDe,
  cambiarQueVaria,
  cambiarValores,
  claveVariante,
  colorDe,
  crearTodas,
  cuantasSalen,
  cuantasSeVan,
  cuantasUsan,
  ejeDeFoto,
  errorDeEjes,
  errorDeNombrePropio,
  estadoDe,
  LARGO_VALOR,
  listaDeCosas,
  MAX_EJES,
  MAX_VALORES,
  ordenarPresentaciones,
  ordenarValores,
  precioDe,
  puedeElegirOtra,
  quitar,
  resumenDe,
  resumenDeValores,
  tarjetaApagada,
  TEXTO_CON_PEDIDOS,
  textoCombinacion,
  textoPresentaciones,
  valoresSugeridos,
  valoresVisibles,
  VISIBLES,
  type Presentacion,
} from "@/lib/presentaciones";
import { colorPorNombre } from "@/lib/colores";
import { OPCIONES_TIPICAS, type Rubro } from "@/lib/rubros";
import type { MotivoAjusteInventario, OpcionProducto } from "@/lib/types";
import { Foto } from "../foto";
import { IconoChevronAbajo, IconoChevronArriba, IconoChevronDerecha, IconoMas } from "../iconos";
import { pastillasDeOpciones } from "@/lib/hoja-producto";
import { Hoja } from "../hoja";
import { clases, FOCO } from "../ui/comunes";
import { Alerta, Boton, Campo, CampoMonto, CampoMultilinea, Cantidad, EditorEtiquetas, Etiqueta, FilaAgregar, FilaLista, FilaPastillas, FilaVariante, GrupoOpciones, ListaAgrupada, Opcion, Tarjeta } from "../ui";

/** Lo que la ficha del producto edita de las presentaciones: los ejes, cada presentación y la foto de cada valor (por id de foto). */
export type EstadoPresentaciones = {
  opciones: OpcionProducto[];
  pres: Presentacion[];
  /** valor del eje que lleva foto → id de la foto en el borrador de la ficha. */
  fotosColor: Record<string, string>;
};

export type FotoBorrador = { id: string; url: string };

/** Si cambian los ejes, la foto de un valor solo sigue si el eje que lleva foto es el mismo y el valor sigue existiendo. */
export function podarFotosColor(fotos: Record<string, string>, antes: OpcionProducto[], despues: OpcionProducto[]): Record<string, string> {
  const a = ejeDeFoto(antes);
  const d = ejeDeFoto(despues);
  if (!a || !d || a.nombre !== d.nombre) return {};
  return Object.fromEntries(Object.entries(fotos).filter(([valor]) => d.valores.includes(valor)));
}

const plural = (nombre: string) => (/[aeiouáéíóú]$/i.test(nombre) ? `${nombre}s` : `${nombre}es`);

/**
 * Presentaciones (tableros Presentaciones: Main, Elegir, Lista): sin ellas, la tarjeta «¿Viene en varias tallas, colores o
 * tamaños?»; con ellas, una fila por combinación con su stock, el filtro por el primer eje, «Agregar presentación», la foto de cada
 * color y «Cambiar qué varía». Todo edita el borrador de la ficha: se guarda con «Guardar cambios» del producto.
 */
export function SeccionPresentaciones({
  rubro,
  precioProducto,
  estado,
  alCambiar,
  fotos,
  agregarFoto,
  sinPermiso,
  porque,
  avisar,
  deshabilitado,
  tienePedidos,
  variante = "seccion",
}: {
  rubro: Rubro;
  precioProducto: number;
  estado: EstadoPresentaciones;
  alCambiar: (e: EstadoPresentaciones) => void;
  fotos: FotoBorrador[];
  /** Sube una foto nueva a las del producto y devuelve su id (null si no se pudo). */
  agregarFoto: (archivo: File) => Promise<string | null>;
  sinPermiso: boolean;
  porque: string;
  avisar: (mensaje: string) => void;
  deshabilitado?: boolean;
  /** ¿Esta presentación (por id de variante) ya tiene pedidos? */
  tienePedidos: (varianteId: string) => Promise<boolean>;
  /** "fila": la fila «Cosas que cambian» de la hoja de producto (resumen en pastillas; con presentaciones se despliega). */
  variante?: "seccion" | "fila";
}) {
  const { opciones, pres, fotosColor } = estado;
  type Vista = { tipo: "elegir"; cambiar: boolean } | { tipo: "una"; clave: string } | { tipo: "foto" } | { tipo: "suelta" } | null;
  const [vista, setVista] = useState<Vista>(null);
  const [descartada, setDescartada] = useState(false);
  const [filtro, setFiltro] = useState("todas");
  const [todas, setTodas] = useState(false);
  const [desplegada, setDesplegada] = useState(false);
  const bloqueado = sinPermiso || !!deshabilitado;
  const abrir = (v: NonNullable<Vista>) => (sinPermiso ? avisar(porque) : setVista(v));

  const tiene = pres.length > 0 && opciones.length > 0;
  const primero = opciones[0];
  const ordenadas = ordenarPresentaciones(opciones, pres);
  const filtradas = filtro === "todas" || !primero ? ordenadas : ordenadas.filter((p) => p.valores[primero.nombre] === filtro);
  const visibles = todas ? filtradas : filtradas.slice(0, VISIBLES);
  const resumen = resumenDe(pres, precioProducto);
  const ejeFoto = ejeDeFoto(opciones);
  const conFoto = ejeFoto ? ejeFoto.valores.filter((v) => fotosColor[v] && fotos.some((f) => f.id === fotosColor[v])).length : 0;

  const poner = (siguiente: Partial<EstadoPresentaciones>) => {
    const e = { ...estado, ...siguiente };
    // Sin ninguna presentación el producto vuelve a su stock simple (la base lo exige: ejes sin variantes no tienen sentido).
    if (e.pres.length === 0) alCambiar({ opciones: [], pres: [], fotosColor: {} });
    else alCambiar({ ...e, fotosColor: podarFotosColor(e.fotosColor, opciones, e.opciones) });
  };
  const cambiarUna = (clave: string, cambio: Partial<Presentacion>) =>
    poner({ pres: pres.map((p) => (claveVariante(p.valores) === clave ? { ...p, ...cambio } : p)) });

  const enLista = vista?.tipo === "una" ? pres.find((p) => claveVariante(p.valores) === vista.clave) ?? null : null;

  const detalle = tiene && primero ? (
    <>
            {primero.valores.length > 1 && (
              <FilaPastillas
                etiqueta={`Filtrar por ${primero.nombre}`}
                valor={filtro}
                alCambiar={(id) => {
                  setFiltro(id);
                  setTodas(false);
                }}
                opciones={[{ id: "todas", texto: "Todas" }, ...primero.valores.map((v) => ({ id: v, texto: v }))]}
              />
            )}
            <ListaAgrupada etiqueta="Presentaciones del producto">
              {visibles.map((p) => {
                const clave = claveVariante(p.valores);
                const st = estadoDe(p);
                const propio = p.precio !== null;
                return (
                  <FilaVariante
                    key={clave}
                    texto={textoCombinacion(opciones, p.valores)}
                    color={colorDe(opciones, p.valores)}
                    stock={p.stock ?? 0}
                    alCambiar={(v) => cambiarUna(clave, { stock: v })}
                    deshabilitado={bloqueado}
                    alAbrir={() => abrir({ tipo: "una", clave })}
                    estado={st.estado === "normal" ? null : st.texto}
                    detalle={propio ? `${formatearPesos(precioDe(p, precioProducto))} · precio propio` : st.estado === "normal" ? "Editar" : undefined}
                    atenuada={!p.activa}
                  />
                );
              })}
              {!todas && filtradas.length > VISIBLES && (
                <li className="border-t border-linea">
                  <button type="button" onClick={() => setTodas(true)} className="tocable flex min-h-13 w-full items-center justify-center text-destacado text-accion">
                    Ver las {filtradas.length}
                  </button>
                </li>
              )}
            </ListaAgrupada>
            <ListaAgrupada etiqueta="Más acciones de presentaciones">
              <li className="px-4">
                <FilaAgregar texto="Agregar presentación" alTocar={() => abrir({ tipo: "suelta" })} deshabilitado={bloqueado} className="min-h-15" />
              </li>
              {ejeFoto && (
                <FilaLista
                  titulo={`Foto de cada ${ejeFoto.nombre.toLocaleLowerCase("es")}`}
                  detalle={conFoto === 0 ? "Sin fotos: se ve la del producto" : `${conFoto} de ${ejeFoto.valores.length} con foto`}
                  onClick={() => abrir({ tipo: "foto" })}
                />
              )}
            </ListaAgrupada>
            <Boton jerarquia="terciario" anchoCompleto deshabilitado={bloqueado} onClick={() => abrir({ tipo: "elegir", cambiar: true })}>
              Cambiar qué varía (talla, color…)
            </Boton>
          </>
  ) : null;

  const cuerpo = variante === "fila" ? (
    <div data-presentaciones="" data-cosas-que-cambian="">
      <button
        type="button"
        aria-expanded={tiene ? desplegada : undefined}
        onClick={() => (tiene ? setDesplegada((d) => !d) : abrir({ tipo: "elegir", cambiar: false }))}
        className="tocable flex min-h-15 w-full items-center gap-3 px-4 py-2 text-left outline-none focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-foco"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="text-destacado text-texto">Cosas que cambian</span>
          {tiene ? (
            <span className="flex flex-wrap gap-1.5">
              {pastillasDeOpciones(opciones).map((t) => (
                <Etiqueta key={t} tono="exito">{t}</Etiqueta>
              ))}
            </span>
          ) : (
            <span className="text-secundario text-texto-secundario">Talla, color, tamaño. Cada una lleva su stock.</span>
          )}
        </span>
        {tiene && desplegada ? <IconoChevronAbajo tamano={20} strokeWidth={2.2} className="shrink-0 text-texto-secundario" /> : <IconoChevronDerecha tamano={20} strokeWidth={2.2} className="shrink-0 text-texto-secundario" />}
      </button>
      {tiene && desplegada && <div className="flex flex-col gap-3 border-t border-linea p-3">{detalle}</div>}
    </div>
  ) : (
  <section aria-labelledby="titulo-presentaciones" className="flex flex-col gap-2" data-presentaciones="">
        <div className="flex items-baseline justify-between gap-3">
          <h3 id="titulo-presentaciones" className="font-display text-titulo-seccion text-texto">Presentaciones</h3>
          {tiene && (
            <span className="text-secundario text-texto-secundario">
              {resumen.total} · {resumen.enTotal} en total
            </span>
          )}
        </div>

        {!tiene && !descartada && (
          <Tarjeta className="flex flex-col gap-3 p-4">
            <p className="text-destacado text-texto">¿Viene en varias tallas, colores o tamaños?</p>
            <p className="text-secundario text-texto-secundario">Cada una lleva su propio stock, y su precio si cambia. Tu cliente elige la suya.</p>
            <Boton tamano="grande" anchoCompleto deshabilitado={bloqueado} onClick={() => abrir({ tipo: "elegir", cambiar: false })}>
              Agregar presentaciones
            </Boton>
            <Boton jerarquia="terciario" anchoCompleto deshabilitado={bloqueado} onClick={() => setDescartada(true)}>
              No, solo viene de una forma
            </Boton>
          </Tarjeta>
        )}
        {!tiene && descartada && (
          <ListaAgrupada etiqueta="Presentaciones del producto">
            <li className="px-4">
              <FilaAgregar texto="Agregar presentaciones" alTocar={() => abrir({ tipo: "elegir", cambiar: false })} deshabilitado={bloqueado} className="min-h-15" />
            </li>
          </ListaAgrupada>
        )}

        {detalle}
      </section>
  );

  return (
    <>
      {cuerpo}

      <HojaElegir
        abierta={vista?.tipo === "elegir"}
        cambiar={vista?.tipo === "elegir" && vista.cambiar}
        rubro={rubro}
        opciones={opciones}
        antes={pres}
        alCerrar={() => setVista(null)}
        alConfirmar={(ejes) => {
          const cambiando = vista?.tipo === "elegir" && vista.cambiar;
          try {
            if (cambiando) {
              const r = cambiarQueVaria(pres, ejes);
              poner({ opciones: r.opciones, pres: r.presentaciones });
              if (r.aviso) avisar(r.aviso);
            } else {
              poner({ opciones: ejes, pres: crearTodas(ejes, pres) });
            }
            setFiltro("todas");
            setTodas(false);
            setVista(null);
          } catch (e) {
            avisar(e instanceof Error ? e.message : "No se pudo.");
          }
        }}
      />
      <HojaSuelta
        abierta={vista?.tipo === "suelta"}
        opciones={opciones}
        alCerrar={() => setVista(null)}
        alAgregar={(valores) => {
          try {
            const r = agregarSuelta(opciones, pres, valores);
            poner({ opciones: r.opciones, pres: r.presentaciones });
            setVista(null);
          } catch (e) {
            avisar(e instanceof Error ? e.message : "No se pudo.");
          }
        }}
      />
      <HojaPresentacion
        abierta={vista?.tipo === "una" && enLista !== null}
        presentacion={enLista}
        opciones={opciones}
        precioProducto={precioProducto}
        fotos={fotos}
        fotosColor={fotosColor}
        alCerrar={() => setVista(null)}
        alCambiar={(cambio) => enLista && cambiarUna(claveVariante(enLista.valores), cambio)}
        alCompletar={(valores) => {
          if (!enLista) return;
          try {
            const lista = cambiarValores(pres, claveVariante(enLista.valores), valores);
            poner({ pres: lista });
            setVista({ tipo: "una", clave: claveVariante(valores) });
          } catch (e) {
            avisar(e instanceof Error ? e.message : "No se pudo.");
          }
        }}
        alElegirFoto={(valor, id) => poner({ fotosColor: id ? { ...fotosColor, [valor]: id } : Object.fromEntries(Object.entries(fotosColor).filter(([v]) => v !== valor)) })}
        alQuitar={async () => {
          if (!enLista) return null;
          const con = enLista.id ? await tienePedidos(enLista.id).catch(() => true) : false;
          return { con, hacer: () => {
            const r = quitar(pres, claveVariante(enLista.valores), con);
            poner({ pres: r.presentaciones });
            setVista(null);
            if (r.oculta) avisar(TEXTO_CON_PEDIDOS);
          } };
        }}
      />
      <HojaFotoColor
        abierta={vista?.tipo === "foto"}
        eje={ejeFoto}
        pres={pres}
        fotos={fotos}
        fotosColor={fotosColor}
        agregarFoto={agregarFoto}
        alCerrar={() => setVista(null)}
        alElegir={(valor, id) => poner({ fotosColor: id ? { ...fotosColor, [valor]: id } : Object.fromEntries(Object.entries(fotosColor).filter(([v]) => v !== valor)) })}
      />
    </>
  );
}

type EjeBorrador = { nombre: string; valores: string[]; propia: boolean };
type EstadoHoja = { ejes: EjeBorrador[]; otraAbierta: boolean; otra: string; errorOtra: string | null; cerradas: string[] };

/** «Otro color» / «Otro tamaño»: el botón punteado que abre el campo para un valor propio. */
function OtroValor({ nombre, valores, alCambiar }: { nombre: string; valores: string[]; alCambiar: (v: string[]) => void }) {
  const [escribiendo, setEscribiendo] = useState(false);
  const [texto, setTexto] = useState("");
  const entrada = useRef<HTMLInputElement>(null);
  const agregar = () => {
    const nuevos = alternarValor(valores, texto);
    if (nuevos !== valores) alCambiar(nuevos);
    setTexto("");
  };
  const lleno = valores.length >= MAX_VALORES;
  if (!escribiendo) {
    if (lleno) return null;
    return (
      <button
        type="button"
        onClick={() => {
          setEscribiendo(true);
          // El foco dentro del mismo toque: así iOS abre el teclado.
          requestAnimationFrame(() => entrada.current?.focus());
        }}
        className="tocable inline-flex h-(--alto-control) items-center gap-1.5 rounded-full border-[1.5px] border-dashed border-borde-pastilla px-4 text-cuerpo font-extrabold text-texto-secundario"
      >
        + Otro {nombre.toLocaleLowerCase("es")}
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
      aria-label={`Otro ${nombre.toLocaleLowerCase("es")}`}
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

/** «Elegir» (¿Qué cambia de una a otra?): una lista de tarjetas; cada cosa elegida se expande ahí mismo con sus valores. */
function HojaElegir({
  abierta,
  cambiar,
  rubro,
  opciones,
  antes,
  alCerrar,
  alConfirmar,
}: {
  abierta: boolean;
  cambiar: boolean;
  rubro: Rubro;
  opciones: OpcionProducto[];
  antes: Presentacion[];
  alCerrar: () => void;
  alConfirmar: (ejes: OpcionProducto[]) => void;
}) {
  const { tipicas, otras } = listaDeCosas(OPCIONES_TIPICAS[rubro]);
  const delCatalogo = [...tipicas, ...otras];
  const inicial = (): EstadoHoja => ({
    ejes: cambiar
      ? opciones.map((o) => {
          const cat = delCatalogo.find((c) => c.toLocaleLowerCase("es") === o.nombre.toLocaleLowerCase("es"));
          return { nombre: cat ?? o.nombre, valores: o.valores, propia: !cat };
        })
      : tipicas.slice(0, 1).map((nombre) => ({ nombre, valores: [], propia: false })),
    otraAbierta: false,
    otra: "",
    errorOtra: null,
    cerradas: [],
  });
  const [estado, setEstado] = useState(inicial);
  const [abiertaAntes, setAbiertaAntes] = useState(abierta);
  const [confirmar, setConfirmar] = useState<OpcionProducto[] | null>(null);
  if (abierta !== abiertaAntes) {
    setAbiertaAntes(abierta);
    if (abierta) setEstado(inicial());
  }
  const { ejes, otraAbierta, otra, errorOtra, cerradas } = estado;
  const llenos = !puedeElegirOtra(ejes.length);
  const finales: OpcionProducto[] = ejes.map((e) => ({ nombre: e.nombre, valores: e.propia ? e.valores : ordenarValores(valoresSugeridos(e.nombre, rubro), e.valores) }));
  const completos = ejes.length > 0 && finales.every((e) => e.nombre && e.valores.length > 0);
  const error = completos ? errorDeEjes(finales) : null;
  const n = completos ? cuantasSalen(finales) : 0;
  const elegir = (nombre: string) =>
    setEstado((s) => {
      if (s.ejes.some((e) => e.nombre === nombre) || !puedeElegirOtra(s.ejes.length)) return s;
      return { ...s, ejes: [...s.ejes, { nombre, valores: [], propia: false }], otraAbierta: false, cerradas: s.cerradas.filter((c) => c !== nombre) };
    });
  // Quitar se lleva la cosa y todos sus valores, sin confirmar; volver a elegirla la deja vacía y abierta.
  const quitarEje = (nombre: string) => setEstado((s) => ({ ...s, ejes: s.ejes.filter((e) => e.nombre !== nombre), cerradas: s.cerradas.filter((c) => c !== nombre) }));
  const alternarAbierta = (nombre: string) => setEstado((s) => ({ ...s, cerradas: s.cerradas.includes(nombre) ? s.cerradas.filter((c) => c !== nombre) : [...s.cerradas, nombre] }));
  const ponerValores = (nombre: string, valores: string[]) => setEstado((s) => ({ ...s, ejes: s.ejes.map((e) => (e.nombre === nombre ? { ...e, valores } : e)) }));
  const listoOtra = () => {
    const e = errorDeNombrePropio(otra, ejes.map((x) => x.nombre), tipicas);
    if (e) return setEstado((s) => ({ ...s, errorOtra: e }));
    setEstado((s) => ({ ...s, ejes: [...s.ejes, { nombre: otra.trim(), valores: [], propia: true }], otraAbierta: false, otra: "", errorOtra: null }));
  };
  const confirmarYa = (f: OpcionProducto[]) => {
    if (cambiar && cuantasSeVan(antes, f) > 0) setConfirmar(f);
    else alConfirmar(f);
  };

  /** Sin elegir: toda la tarjeta es el botón; elegida: nombre + chevron colapsa, «Quitar» arriba a la derecha. */
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
  const propias = ejes.filter((e) => e.propia);
  const mostrarOtra = otraAbierta && !llenos;

  return (
    <Hoja abierta={abierta} alCerrar={alCerrar} titulo={cambiar ? "Qué varía" : "Presentaciones"} altura="grande" avisarAlSalir={ejes.some((e) => e.valores.length > 0) && !cambiar}>
      <div className="flex flex-col gap-5">
        <p id="elegir-titulo" className="font-display text-titulo-hoja text-texto">¿Qué cambia de una a otra?</p>
        <div className="flex flex-col gap-2" role="group" aria-labelledby="elegir-titulo">
          {[...tipicas, ...otras].map((nombre) => tarjeta(nombre, false))}
          {propias.map((e) => tarjeta(e.nombre, true))}
          {mostrarOtra ? (
            <Tarjeta className="flex flex-col gap-3">
              <Campo
                etiqueta="¿Qué otra cosa cambia?"
                placeholder="Ej: Aroma"
                ayuda="Ej: Material, Aroma, Estampado."
                maxLength={LARGO_VALOR}
                value={otra}
                error={errorOtra}
                enterKeyHint="done"
                onChange={(e) => setEstado((s) => ({ ...s, otra: e.target.value, errorOtra: null }))}
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
            <p role="status" className="flex h-13 items-center justify-center rounded-radio-l border-[1.5px] border-dashed border-borde-pastilla text-destacado text-texto-secundario">
              Ya elegiste {MAX_EJES}: es el máximo.
            </p>
          ) : (
            <button
              type="button"
              onClick={() => setEstado((s) => ({ ...s, otraAbierta: true }))}
              className={clases("tocable flex h-13 items-center justify-center rounded-radio-l border-[1.5px] border-dashed border-borde-pastilla text-destacado text-texto-secundario", FOCO)}
            >
              + Otra cosa
            </button>
          )}
        </div>
        {error && <p role="alert" className="text-secundario font-bold text-peligro">{error}</p>}
        <Boton tamano="grande" anchoCompleto deshabilitado={!completos || !!error} onClick={() => confirmarYa(finales)}>
          {cambiar ? "Guardar" : `Crear ${n === 1 ? "la 1" : `las ${n}`}`}
        </Boton>
      </div>
      <Alerta
        abierta={confirmar !== null}
        titulo={`¿Quitar ${confirmar ? cuantasSeVan(antes, confirmar) : 0} ${confirmar && cuantasSeVan(antes, confirmar) === 1 ? "presentación" : "presentaciones"}?`}
        descripcion="Se van con su stock al guardar el producto. Si alguna ya tiene pedidos, solo queda oculta."
        alCancelar={() => setConfirmar(null)}
        accion={{ texto: "Sí, cambiar", tono: "peligro", alConfirmar: () => { const f = confirmar!; setConfirmar(null); alConfirmar(f); } }}
      />
    </Hoja>
  );
}

/** «Agregar presentación» (suelta): un valor por eje, de los que ya hay o uno nuevo. */
function HojaSuelta({ abierta, opciones, alCerrar, alAgregar }: { abierta: boolean; opciones: OpcionProducto[]; alCerrar: () => void; alAgregar: (valores: Record<string, string>) => void }) {
  const [elegidos, setElegidos] = useState<Record<string, string>>({});
  const [nuevos, setNuevos] = useState<Record<string, string>>({});
  const [abiertaAntes, setAbiertaAntes] = useState(abierta);
  if (abierta !== abiertaAntes) {
    setAbiertaAntes(abierta);
    if (abierta) {
      setElegidos({});
      setNuevos({});
    }
  }
  const valores: Record<string, string> = {};
  for (const o of opciones) valores[o.nombre] = (nuevos[o.nombre]?.trim() || elegidos[o.nombre]) ?? "";
  const listo = opciones.length > 0 && opciones.every((o) => valores[o.nombre]);
  return (
    <Hoja abierta={abierta} alCerrar={alCerrar} titulo="Agregar presentación" altura="grande">
      <div className="flex flex-col gap-5">
        {opciones.map((o) => (
          <div key={o.nombre} className="flex flex-col gap-2">
            <GrupoOpciones
              titulo={o.nombre}
              valor={nuevos[o.nombre]?.trim() ? null : (elegidos[o.nombre] ?? null)}
              alCambiar={(v) => {
                setElegidos((s) => ({ ...s, [o.nombre]: v }));
                setNuevos((s) => ({ ...s, [o.nombre]: "" }));
              }}
              opciones={o.valores.map((v) => ({ id: v, texto: v }))}
              compacta
            />
            <Campo
              etiqueta={`¿Otro valor de ${o.nombre.toLocaleLowerCase("es")}?`}
              placeholder="Escríbelo aquí"
              maxLength={LARGO_VALOR}
              value={nuevos[o.nombre] ?? ""}
              enterKeyHint="done"
              onChange={(e) => setNuevos((s) => ({ ...s, [o.nombre]: e.target.value }))}
            />
          </div>
        ))}
        <Boton tamano="grande" anchoCompleto deshabilitado={!listo} onClick={() => alAgregar(valores)}>
          Agregar
        </Boton>
      </div>
    </Hoja>
  );
}

/** La hoja de UNA presentación (tablero «Hoja»): stock, precio (el mismo o uno propio), foto del color, ocultar y quitar. */
function HojaPresentacion({
  abierta,
  presentacion,
  opciones,
  precioProducto,
  fotos,
  fotosColor,
  alCerrar,
  alCambiar,
  alCompletar,
  alElegirFoto,
  alQuitar,
}: {
  abierta: boolean;
  presentacion: Presentacion | null;
  opciones: OpcionProducto[];
  precioProducto: number;
  fotos: FotoBorrador[];
  fotosColor: Record<string, string>;
  alCerrar: () => void;
  alCambiar: (cambio: Partial<Presentacion>) => void;
  alCompletar: (valores: Record<string, string>) => void;
  alElegirFoto: (valor: string, id: string | null) => void;
  alQuitar: () => Promise<{ con: boolean; hacer: () => void } | null>;
}) {
  // Se recuerda la última presentación para que la hoja no se vacíe mientras sale.
  const [ultima, setUltima] = useState<Presentacion | null>(null);
  if (presentacion && presentacion !== ultima) setUltima(presentacion);
  const p = presentacion ?? ultima;
  const [propio, setPropio] = useState(false);
  const [textoPrecio, setTextoPrecio] = useState("");
  const [eligiendoFoto, setEligiendoFoto] = useState(false);
  const [quitando, setQuitando] = useState<{ con: boolean; hacer: () => void } | null>(null);
  const [comprobando, setComprobando] = useState(false);
  const clave = p ? claveVariante(p.valores) : "";
  const [claveAntes, setClaveAntes] = useState("");
  const [abiertaAntes, setAbiertaAntes] = useState(false);
  if (p && (clave !== claveAntes || abierta !== abiertaAntes)) {
    setClaveAntes(clave);
    setAbiertaAntes(abierta);
    if (abierta) {
      setPropio(p.precio !== null);
      setTextoPrecio(p.precio !== null ? String(p.precio) : "");
      setEligiendoFoto(false);
    }
  }
  if (!p) return <Hoja abierta={false} alCerrar={alCerrar} titulo="Presentación" altura="auto">{null}</Hoja>;
  const texto = textoCombinacion(opciones, p.valores);
  const color = colorDe(opciones, p.valores);
  const eje = ejeDeFoto(opciones);
  const valorFoto = eje ? p.valores[eje.nombre] : null;
  const idFoto = valorFoto ? fotosColor[valorFoto] : undefined;
  const foto = idFoto ? fotos.find((f) => f.id === idFoto) ?? null : null;
  const usan = eje && valorFoto ? cuantasUsan([p], eje.nombre, valorFoto) : 0;
  void usan;
  const conSin = opciones.some((o) => /^sin /i.test(p.valores[o.nombre] ?? ""));
  return (
    <Hoja abierta={abierta} alCerrar={alCerrar} titulo={<span className="flex items-center gap-2.5">{color && <span aria-hidden="true" className="size-6 rounded-full border border-linea" style={{ background: color }} />}{texto}</span>} altura="auto">
      <div className="flex flex-col gap-4" data-hoja-presentacion="">
        <Tarjeta className="flex items-center justify-between gap-3 p-4">
          <div>
            <p className="text-destacado text-texto">Stock</p>
            <p className="text-secundario text-texto-secundario">Al despachar, baja solito.</p>
          </div>
          <Cantidad valor={p.stock ?? 0} max={2147483647} alCambiar={(v) => alCambiar({ stock: v })} etiquetaQuitar={`Quitar uno de ${texto}`} etiquetaAgregar={`Agregar uno de ${texto}`} />
        </Tarjeta>

        <Tarjeta className="flex flex-col gap-3 p-4">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-destacado text-texto">Precio</p>
            <p className="text-secundario text-texto-secundario">El del producto: {formatearPesos(precioProducto)}</p>
          </div>
          <GrupoOpciones
            etiqueta="Precio de esta presentación"
            compacta
            valor={propio ? "propio" : "mismo"}
            alCambiar={(v) => {
              setPropio(v === "propio");
              if (v === "mismo") {
                setTextoPrecio("");
                alCambiar({ precio: null });
              }
            }}
            opciones={[{ id: "mismo", texto: "El mismo" }, { id: "propio", texto: "Uno propio" }]}
          />
          {propio && (
            <CampoMonto
              etiqueta="Precio de esta presentación"
              etiquetaAccesible="Precio de esta presentación, en pesos"
              valor={textoPrecio}
              alCambiar={(d) => {
                const limpio = d.replace(/\D/g, "").slice(0, 7);
                setTextoPrecio(limpio);
                alCambiar({ precio: limpio ? Number(limpio) : null });
              }}
            />
          )}
        </Tarjeta>

        {conSin && (
          <Tarjeta className="flex flex-col gap-3 p-4">
            <p className="text-destacado text-texto">¿Cuál es?</p>
            {opciones.map((o) => (
              <GrupoOpciones
                key={o.nombre}
                titulo={o.nombre}
                compacta
                valor={p.valores[o.nombre] ?? null}
                alCambiar={(v) => alCompletar({ ...p.valores, [o.nombre]: v })}
                opciones={o.valores.map((v) => ({ id: v, texto: v }))}
              />
            ))}
          </Tarjeta>
        )}

        {eje && valorFoto && (
          <Tarjeta className="flex flex-col gap-3 p-4">
            <div className="flex items-center gap-3">
              <span aria-hidden="true" className="relative block size-14 shrink-0 overflow-hidden rounded-radio-s bg-superficie-hundida">
                {foto ? <Foto src={foto.url} alt="" className="size-full" sizes="56px" /> : null}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-destacado text-texto">Foto</p>
                <p className="text-secundario text-texto-secundario">
                  {foto ? `La del ${eje.nombre.toLocaleLowerCase("es")} ${valorFoto}. Sirve para todas las ${valorFoto.toLocaleLowerCase("es")}.` : "Sin foto: se ve la del producto."}
                </p>
              </div>
              <Boton jerarquia="terciario" tamano="compacto" onClick={() => setEligiendoFoto((v) => !v)}>
                {foto ? "Cambiar" : "Elegir"}
              </Boton>
            </div>
            {eligiendoFoto && (
              <SelectorFotos
                fotos={fotos}
                elegida={idFoto ?? null}
                usadas={fotosColor}
                alElegir={(id) => {
                  alElegirFoto(valorFoto, id);
                  setEligiendoFoto(false);
                }}
                alQuitar={foto ? () => { alElegirFoto(valorFoto, null); setEligiendoFoto(false); } : undefined}
              />
            )}
          </Tarjeta>
        )}

        <Boton tamano="grande" anchoCompleto onClick={alCerrar}>Listo</Boton>
        <div className="flex items-center justify-between gap-3">
          <Boton jerarquia="terciario" onClick={() => alCambiar({ activa: !p.activa })}>
            {p.activa ? "Ocultar esta presentación" : "Mostrar de nuevo"}
          </Boton>
          <Boton
            jerarquia="terciario"
            tono="peligro"
            cargando={comprobando}
            onClick={async () => {
              setComprobando(true);
              const r = await alQuitar();
              setComprobando(false);
              if (r) setQuitando(r);
            }}
          >
            Quitar
          </Boton>
        </div>
      </div>
      <Alerta
        abierta={quitando !== null}
        titulo={quitando?.con ? `Quitar ${texto}` : `¿Quitar ${texto}?`}
        descripcion={quitando?.con ? TEXTO_CON_PEDIDOS : "Se va con su stock al guardar el producto."}
        alCancelar={() => setQuitando(null)}
        accion={{ texto: quitando?.con ? `Ocultar ${texto}` : "Quitar", tono: quitando?.con ? "accion" : "peligro", alConfirmar: () => { const q = quitando!; setQuitando(null); q.hacer(); } }}
      />
    </Hoja>
  );
}

/** Las fotos del producto para elegir una: cuadros con su número y, si otro valor ya la usa, cuál. */
function SelectorFotos({
  fotos,
  elegida,
  usadas,
  alElegir,
  alQuitar,
  alSubir,
}: {
  fotos: FotoBorrador[];
  elegida: string | null;
  usadas: Record<string, string>;
  alElegir: (id: string) => void;
  alQuitar?: () => void;
  alSubir?: (archivo: File) => void;
}) {
  const entrada = useRef<HTMLInputElement>(null);
  const valorDe = (id: string) => Object.entries(usadas).find(([, f]) => f === id)?.[0];
  if (fotos.length === 0 && !alSubir) return <p className="text-secundario text-texto-secundario">Primero sube una foto del producto.</p>;
  return (
    <div className="flex flex-col gap-2">
      <div role="radiogroup" aria-label="Fotos del producto" className="grid grid-cols-4 gap-2">
        {fotos.map((f, i) => {
          const es = f.id === elegida;
          const otro = valorDe(f.id);
          return (
            <button
              key={f.id}
              type="button"
              role="radio"
              aria-checked={es}
              aria-label={`Foto ${i + 1}${otro ? `, de ${otro}` : ""}${es ? ", elegida" : ""}`}
              onClick={() => alElegir(f.id)}
              className={`tocable relative aspect-[4/5] overflow-hidden rounded-radio-m bg-superficie-hundida ${es ? "ring-3 ring-accion" : ""}`}
            >
              <Foto src={f.url} alt="" className="size-full" sizes="25vw" />
              <span className="absolute bottom-1 left-1 rounded-full bg-superficie px-1.5 text-etiqueta text-texto">
                {i + 1}{otro ? ` · ${otro}` : ""}{es ? " ✓" : ""}
              </span>
            </button>
          );
        })}
        {alSubir && (
          <button type="button" onClick={() => entrada.current?.click()} className="tocable grid aspect-[4/5] place-items-center rounded-radio-m border-2 border-dashed border-borde-pastilla text-secundario font-extrabold text-texto-secundario">
            + Subir otra
          </button>
        )}
      </div>
      {alSubir && (
        <input ref={entrada} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => { const a = e.target.files?.[0]; e.target.value = ""; if (a) alSubir(a); }} />
      )}
      {alQuitar && (
        <Boton jerarquia="terciario" tamano="compacto" tono="peligro" onClick={alQuitar} className="self-start">
          Quitar la foto de este color
        </Boton>
      )}
    </div>
  );
}

/** «Foto de cada color» (tablero «Foto»): una fila por valor del eje, su foto actual y el selector de las fotos del producto. */
function HojaFotoColor({
  abierta,
  eje,
  pres,
  fotos,
  fotosColor,
  agregarFoto,
  alCerrar,
  alElegir,
}: {
  abierta: boolean;
  eje: OpcionProducto | null;
  pres: Presentacion[];
  fotos: FotoBorrador[];
  fotosColor: Record<string, string>;
  agregarFoto: (archivo: File) => Promise<string | null>;
  alCerrar: () => void;
  alElegir: (valor: string, id: string | null) => void;
}) {
  const [valor, setValor] = useState<string | null>(null);
  const [abiertaAntes, setAbiertaAntes] = useState(abierta);
  if (abierta !== abiertaAntes) {
    setAbiertaAntes(abierta);
    if (abierta) setValor(null);
  }
  if (!eje) return <Hoja abierta={false} alCerrar={alCerrar} titulo="Foto" altura="auto">{null}</Hoja>;
  const esColor = /^colou?r(es)?$/i.test(eje.nombre);
  const nombre = eje.nombre.toLocaleLowerCase("es");
  return (
    <Hoja abierta={abierta} alCerrar={alCerrar} titulo={esColor ? "Foto de cada color" : `Foto de cada ${nombre}`} altura="auto">
      <div className="flex flex-col gap-4" data-hoja-foto-color="">
        <p className="text-secundario text-texto-secundario">
          Así ve tu cliente el producto del {esColor ? "color" : nombre} que elige. Una foto por {nombre}, no por combinación.
        </p>
        <ListaAgrupada etiqueta={`Foto de cada ${nombre}`}>
          {eje.valores.map((v) => {
            const f = fotos.find((x) => x.id === fotosColor[v]) ?? null;
            const n = fotos.findIndex((x) => x.id === fotosColor[v]) + 1;
            const c = esColor ? colorPorNombre(v) : null;
            const usan = cuantasUsan(pres, eje.nombre, v);
            return (
              <li key={v} className="flex min-h-18 items-center gap-3 border-t border-linea px-4 py-2 first:border-t-0">
                <span aria-hidden="true" className="relative block size-12 shrink-0 overflow-hidden rounded-radio-s border border-dashed border-borde-pastilla bg-superficie-hundida">
                  {f && <Foto src={f.url} alt="" className="size-full" sizes="48px" />}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="flex items-center gap-2 text-destacado text-texto">
                    {c && <span aria-hidden="true" className="size-3.5 rounded-full border border-linea" style={{ background: c }} />}
                    {v}
                  </span>
                  <span className={f ? "text-secundario text-texto-secundario" : "text-secundario font-extrabold text-atencion-texto"}>
                    {f ? `Foto ${n} · ${textoPresentaciones(usan)}` : "Sin foto: se ve la del producto"}
                  </span>
                </span>
                <Boton jerarquia="terciario" tamano="compacto" onClick={() => setValor(valor === v ? null : v)}>
                  {f ? "Cambiar" : "Elegir"}
                </Boton>
              </li>
            );
          })}
        </ListaAgrupada>
        {valor && (
          <div className="flex flex-col gap-2">
            <p className="font-display text-titulo-hoja text-texto">Elegir foto para {valor}</p>
            <SelectorFotos
              fotos={fotos}
              elegida={fotosColor[valor] ?? null}
              usadas={Object.fromEntries(Object.entries(fotosColor).filter(([v]) => v !== valor))}
              alElegir={(id) => {
                alElegir(valor, id);
                setValor(null);
              }}
              alQuitar={fotosColor[valor] ? () => { alElegir(valor, null); setValor(null); } : undefined}
              alSubir={async (archivo) => {
                const id = await agregarFoto(archivo);
                if (id) {
                  alElegir(valor, id);
                  setValor(null);
                }
              }}
            />
            <p className="text-secundario text-texto-secundario">Escoges entre las fotos que ya subiste al producto. ¿Falta una? Súbela aquí mismo.</p>
          </div>
        )}
        <Boton tamano="grande" anchoCompleto onClick={alCerrar}>Listo</Boton>
      </div>
    </Hoja>
  );
}

/**
 * Por qué baja el stock de unas variantes (como el ajuste del producto): daño, pérdida, corrección u otro (con nota). Las subidas
 * van como reposición sin preguntar.
 */
export function HojaMotivoVariantes({
  abierta,
  unidades,
  guardando,
  alCerrar,
  alConfirmar,
}: {
  abierta: boolean;
  unidades: number;
  guardando: boolean;
  alCerrar: () => void;
  alConfirmar: (motivo: MotivoAjusteInventario, nota: string | null) => void;
}) {
  const [motivo, setMotivo] = useState<MotivoAjusteInventario | null>(null);
  const [nota, setNota] = useState("");
  const listo = motivo !== null && (motivo !== "otro" || nota.trim().length > 0);
  return (
    <Hoja abierta={abierta} alCerrar={alCerrar} titulo="¿Por qué baja el stock?">
      <div className="flex flex-col gap-4">
        <p className="text-secundario text-texto-secundario">
          Retirarás {unidades} {unidades === 1 ? "unidad" : "unidades"}. Se guarda como ajuste, no como venta.
        </p>
        <GrupoOpciones
          etiqueta="Motivo del ajuste"
          valor={motivo}
          alCambiar={setMotivo}
          opciones={(["dano", "perdida", "correccion_inventario", "otro"] as const).map((m) => ({ id: m, texto: MOTIVOS_INVENTARIO[m] }))}
        />
        {motivo === "otro" && <CampoMultilinea etiqueta="Cuéntanos el motivo" maxLength={200} filas={3} value={nota} onChange={(e) => setNota(e.target.value)} />}
        <Boton tamano="grande" anchoCompleto cargando={guardando} deshabilitado={!listo} onClick={() => motivo && alConfirmar(motivo, motivo === "otro" ? nota.trim() : null)}>
          Guardar ajuste
        </Boton>
      </div>
    </Hoja>
  );
}
