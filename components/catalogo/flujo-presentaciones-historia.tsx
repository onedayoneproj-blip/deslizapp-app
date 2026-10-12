"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatearPesos } from "@/lib/formato";
import {
  alternarValor, atajosDe, cambiarEjes, claveVariante, colorDe, combinaciones,
  ejeDeFoto, errorDeEjes, errorDeNombrePropio, estadoDeReparto, listaDeCosas, MAX_EJES, MAX_PRESENTACIONES, MAX_VALORES,
  ponerATodas, ponerTodasEn, podarFotosColor, precioDe, repartoCuadra, resumenDe, textoCombinacion,
  valoresSugeridos, valoresVisibles, type EstadoPresentaciones, type Origen, type Presentacion,
} from "@/lib/presentaciones";
import { colorPorNombre } from "@/lib/colores";
import { OPCIONES_TIPICAS, type Rubro } from "@/lib/rubros";
import type { OpcionProducto } from "@/lib/types";
import { Foto } from "../foto";
import { HojaFijoAbajo } from "../hoja";
import { Boton, Campo, Cantidad, GrupoOpciones, Opcion } from "../ui";
import { HojaFotoColor, HojaPresentacion, type FotoBorrador } from "./hoja-presentacion";

type Etapa = "ejes" | "valores" | "stock";
type Detalle = { tipo: "variante"; clave: string } | { tipo: "fotos" } | null;

/** Rama de presentaciones del flujo de creación. Comparte el modelo, límites, detalle y guardado de variantes existentes. */
export function FlujoPresentacionesHistoria({
  activa, rubro, nombre, precioProducto, fotoPortada, estado, stockSimple, porEncargo, encargoTexto,
  fotos, agregarFoto, alCambiar, alCambiarEncargo, alCambiarPlazo, alAtras, alListo, avisar, alEtapa,
}: {
  activa: boolean;
  rubro: Rubro;
  nombre: string;
  precioProducto: number;
  fotoPortada: string | null;
  estado: EstadoPresentaciones;
  stockSimple: number | null;
  porEncargo: boolean;
  encargoTexto: string;
  fotos: FotoBorrador[];
  agregarFoto: (archivo: File) => Promise<string | null>;
  alCambiar: (estado: EstadoPresentaciones) => void;
  alCambiarEncargo: (valor: boolean) => void;
  alCambiarPlazo: (valor: string) => void;
  alAtras: () => void;
  alListo: () => void;
  avisar: (mensaje: string) => void;
  alEtapa: (actual: number, total: number) => void;
}) {
  const tipicas = useMemo(() => listaDeCosas(OPCIONES_TIPICAS[rubro]), [rubro]);
  const sugeridas = [...tipicas.tipicas, ...tipicas.otras];
  const [etapa, setEtapa] = useState<Etapa>(estado.opciones.length ? "stock" : "ejes");
  const [ejes, setEjes] = useState<string[]>(() => estado.opciones.length ? estado.opciones.map((o) => o.nombre) : OPCIONES_TIPICAS[rubro].slice(0, MAX_EJES));
  const [valores, setValores] = useState<Record<string, string[]>>(() => Object.fromEntries(estado.opciones.map((o) => [o.nombre, [...o.valores]])));
  const [indice, setIndice] = useState(0);
  const [origenes, setOrigenes] = useState<Origen[]>([]);
  const [detalle, setDetalle] = useState<Detalle>(null);
  const [mostrarPoner, setMostrarPoner] = useState(false);
  const [cantidadTodas, setCantidadTodas] = useState(1);
  const [otroAbierto, setOtroAbierto] = useState(false);
  const [otroTexto, setOtroTexto] = useState("");
  const titulo = useRef<HTMLHeadingElement>(null);

  const totalPasos = 5 + Math.max(1, ejes.length || estado.opciones.length);
  const pasoInterno = etapa === "ejes" ? 1 : etapa === "valores" ? 2 + indice : 2 + ejes.length;
  useEffect(() => { if (activa) alEtapa(pasoInterno, totalPasos); }, [activa, pasoInterno, totalPasos, alEtapa]);
  useEffect(() => { if (activa) titulo.current?.focus({ preventScroll: true }); }, [etapa, indice, activa]);

  const opcionesVista = ejes.map((e) => ({ nombre: e, valores: valores[e] ?? [] }));
  const combinacionesVista = opcionesVista.every((o) => o.valores.length > 0) ? combinaciones(opcionesVista) : [];
  const presVista = combinacionesVista.map((v) => estado.pres.find((p) => claveVariante(p.valores) === claveVariante(v)) ?? { valores: v, stock: 0, precio: null, activa: true });
  const resumenVista = resumenDe(presVista, precioProducto);
  const nombreColor = opcionesVista.find((o) => /^(color|colores)$/i.test(o.nombre));
  const nombreTalla = opcionesVista.find((o) => /^(talla|tamaño|tamano)$/i.test(o.nombre));
  const colorFotos = ejeDeFoto(estado.opciones);
  const detallePres = detalle?.tipo === "variante" ? estado.pres.find((p) => claveVariante(p.valores) === detalle.clave) ?? null : null;
  const importeValores = (nombreEje: string, siguientes: string[]) => setValores((actuales) => ({ ...actuales, [nombreEje]: siguientes }));

  const elegirEje = (eje: string) => {
    setEjes((actuales) => {
      const siguiente = actuales.includes(eje) ? actuales.filter((x) => x !== eje) : actuales.length < MAX_EJES ? [...actuales, eje] : actuales;
      setIndice(0);
      return siguiente;
    });
  };
  const seguirAValores = () => {
    if (!ejes.length) { avisar("Elige qué cambia de una a otra."); return; }
    setEtapa("valores");
    setIndice(0);
  };
  const opcionesFinales = (): OpcionProducto[] => ejes.map((nombreEje) => ({
    nombre: nombreEje,
    valores: valores[nombreEje] ?? [],
  })).sort((a, b) => Number(/^(color|colores)$/i.test(b.nombre)) - Number(/^(color|colores)$/i.test(a.nombre)));
  const irAlStock = () => {
    const nuevas = opcionesFinales();
    const error = errorDeEjes(nuevas);
    if (error) { avisar(error); return; }
    if (combinaciones(nuevas).length > MAX_PRESENTACIONES) { avisar(`Hasta ${MAX_PRESENTACIONES} presentaciones.`); return; }
    try {
      const cambio = cambiarEjes(estado.opciones, estado.pres, nuevas, estado.opciones.length ? null : stockSimple);
      setOrigenes(cambio.origenes);
      const antesParaFotos = estado.opciones.length ? estado.opciones : nuevas;
      const siguiente = { opciones: cambio.opciones, pres: cambio.presentaciones, fotosColor: podarFotosColor(estado.fotosColor, antesParaFotos, cambio.opciones) };
      alCambiar(siguiente);
      setEtapa("stock");
    } catch (e) {
      avisar(e instanceof Error ? e.message : "Revisa los valores de las presentaciones.");
    }
  };
  const cambiarUna = (clave: string, cambio: Partial<Presentacion>) => {
    alCambiar({ ...estado, pres: estado.pres.map((p) => claveVariante(p.valores) === clave ? { ...p, ...cambio } : p) });
  };
  const presActivas = estado.pres.filter((p) => p.activa);
  const totalStock = presActivas.reduce((n, p) => n + (p.stock ?? 0), 0);
  const pendientes = !repartoCuadra(origenes, estado.pres);
  const reparto = estadoDeReparto(origenes, estado.pres);
  const permitirListo = porEncargo ? !!encargoTexto.trim() : totalStock > 0 && !pendientes;
  const irAtras = () => {
    if (detalle) { setDetalle(null); return; }
    if (etapa === "ejes") { alAtras(); return; }
    if (etapa === "stock") { setEtapa("valores"); setIndice(Math.max(0, ejes.length - 1)); return; }
    if (indice > 0) { setIndice((i) => i - 1); return; }
    setEtapa("ejes");
  };
  const seguir = () => {
    if (etapa === "ejes") { seguirAValores(); return; }
    if (etapa === "valores") {
      const eje = ejes[indice];
      if (!eje || !(valores[eje]?.length)) { avisar(`Elige al menos un valor de ${eje ?? "la opción"}.`); return; }
      if (indice < ejes.length - 1) { setIndice((i) => i + 1); return; }
      irAlStock();
      return;
    }
    if (porEncargo) {
      if (!encargoTexto.trim()) { avisar("Dinos cuándo llega para seguir."); return; }
    } else {
      if (pendientes) { avisar("Reparte todo el stock para seguir."); return; }
      if (totalStock === 0) { avisar("Elige cuántas tienes o marca por encargo."); return; }
    }
    alListo();
  };

  if (!activa) return null;
  const plural = (eje: string) => /[aeiouáéíóú]$/i.test(eje) ? `${eje.toLocaleLowerCase("es")}s` : `${eje.toLocaleLowerCase("es")}es`;
  const pregunta = etapa === "ejes" ? "¿En qué cambia?" : etapa === "stock" ? (porEncargo ? "¿Cuándo llega?" : "¿Cuántos tienes de cada una?") : (() => {
    const eje = ejes[indice] ?? "opción";
    const esColor = /^(color|colores)$/i.test(eje);
    return `${indice ? "¿Y qué" : "¿Qué"} ${esColor ? "colores" : plural(eje)} hay?`;
  })();
  const ayuda = etapa === "ejes" ? "Elige lo que cambia entre una y otra." : etapa === "stock" ? (porEncargo ? "Cuéntales cuándo lo tendrán." : "Cada vez que despachas, baja solito.") : /^(color|colores)$/i.test(ejes[indice] ?? "") ? "Puedes poner una foto para cada uno." : "Toca las que vendes.";

  return <>
    <div className="flex min-h-0 flex-1 flex-col items-center gap-3 overflow-y-auto pb-4" data-presentaciones-historia data-etapa={etapa} data-paso-variantes={pasoInterno} key={`${etapa}:${indice}`}>
      <div className="w-full max-w-[350px]">
        <div className="relative h-[212px] w-full overflow-hidden rounded-radio-l bg-superficie-hundida" data-tarjeta-variantes="">
          {fotoPortada ? <Foto src={fotoPortada} alt="" className="size-full object-cover object-[50%_30%]" sizes="350px" /> : <div className="grid size-full place-items-center text-texto-secundario">Tu foto aparecerá aquí</div>}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-transparent" />
          <span className="absolute left-3.5 top-2 font-mano text-[22px] text-white">así se verá</span>
          <div className="absolute inset-x-3.5 bottom-2.5 text-white">
            <p className="font-display text-[22px] leading-tight">{nombre || "Nombre del producto"}</p>
            <div className="mt-0.5 flex flex-wrap items-center gap-2.5">
              <span className="text-secundario font-extrabold">Desde {formatearPesos(resumenVista.desde ?? precioProducto)}</span>
              {nombreTalla && nombreTalla.valores.length > 0 && <span className="rounded-full bg-white/20 px-2 py-0.5 text-etiqueta font-extrabold">{nombreTalla.nombre} {nombreTalla.valores.join(" · ")}</span>}
              {nombreColor && <span className="flex items-center">{nombreColor.valores.slice(0, 5).map((v, i) => <span key={v} aria-label={v} className={`size-[18px] rounded-full border-[1.5px] border-white ${i ? "-ml-1.5" : ""}`} style={{ background: colorPorNombre(v) ?? "#9c8b6e" }} />)}</span>}
            </div>
          </div>
        </div>
        <div className="mt-4">
          <h2 ref={titulo} tabIndex={-1} className="font-display text-titulo-seccion leading-tight text-texto outline-none">{pregunta}</h2>
          <p className="mt-1 text-cuerpo text-texto-secundario">{ayuda}</p>
        </div>

        {etapa === "ejes" && <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Qué cambia">
          {sugeridas.map((eje) => <Opcion key={eje} casilla elegida={ejes.includes(eje)} deshabilitada={!ejes.includes(eje) && ejes.length >= MAX_EJES} onClick={() => elegirEje(eje)}>{eje}</Opcion>)}
          {!otroAbierto && <button type="button" disabled={ejes.length >= MAX_EJES} onClick={() => setOtroAbierto(true)} className="tocable inline-flex h-(--alto-control) shrink-0 items-center rounded-full border-[1.5px] border-dashed border-borde-pastilla bg-superficie px-4 text-cuerpo font-extrabold text-texto disabled:opacity-40">+ Otra</button>}
          {otroAbierto && <div className="mt-2 w-full"><Campo etiqueta="Qué otra cosa cambia" placeholder="Escribe qué cambia" maxLength={20} value={otroTexto} onChange={(e) => setOtroTexto(e.target.value)} />
            <Boton tamano="compacto" deshabilitado={!otroTexto.trim()} onClick={() => { const n = otroTexto.trim(); const error = errorDeNombrePropio(n, ejes, sugeridas); if (error) { avisar(error); return; } if (!n || ejes.length >= MAX_EJES) return; setEjes((a) => [...a, n]); setValores((v) => ({ ...v, [n]: v[n] ?? [] })); setOtroTexto(""); setOtroAbierto(false); }}>Agregar</Boton></div>}
          <p className="w-full px-0.5 text-secundario text-texto-secundario">Hasta 2. Para la mayoría basta con talla y color.</p>
        </div>}

        {etapa === "valores" && (() => {
          const eje = ejes[indice] ?? "";
          const esColor = /^(color|colores)$/i.test(eje);
          const actuales = valores[eje] ?? [];
          const sugeridosDeEje = /^(color|colores)$/i.test(eje) ? ["Crema", "Bosque", "Rosa", "Negro"] : valoresSugeridos(eje, rubro);
          const atajos = atajosDe(eje, rubro);
          return <div className="mt-4 flex flex-col gap-3">
            <div className="flex flex-wrap gap-2" role="group" aria-label={`Valores de ${eje}`}>
              {valoresVisibles(sugeridosDeEje, actuales).map((v) => <Opcion key={v} casilla elegida={actuales.includes(v)} deshabilitada={!actuales.includes(v) && actuales.length >= MAX_VALORES} onClick={() => importeValores(eje, alternarValor(actuales, v))}>
                {esColor && <span aria-hidden="true" className="mr-1.5 inline-block size-3.5 rounded-full border border-linea align-[-2px]" style={{ background: colorPorNombre(v) ?? "transparent" }} />}{v}
              </Opcion>)}
              <OtroValorHistoria nombre={eje} valores={actuales} alCambiar={(v) => importeValores(eje, v)} />
            </div>
            {atajos.length > 0 && <div className="flex flex-wrap gap-2">{atajos.map((a) => <Opcion key={a.texto} elegida={a.valores.every((v) => actuales.includes(v))} onClick={() => importeValores(eje, a.valores.slice(0, MAX_VALORES))}>{a.texto}</Opcion>)}</div>}
            {esColor && <>
              <p className="mt-1 text-secundario font-extrabold text-texto-secundario">Foto de cada color · opcional</p>
              <div className="grid grid-cols-2 gap-2.5">
                {actuales.map((v) => {
                  const foto = fotos.find((f) => f.id === estado.fotosColor[v]);
                  const numero = fotos.findIndex((f) => f.id === estado.fotosColor[v]) + 1;
                  return <button key={v} type="button" data-foto-valor={v} onClick={() => setDetalle({ tipo: "fotos" })} className="tocable flex min-h-[70px] min-w-0 items-center gap-2 rounded-radio-m border border-dashed border-borde-pastilla bg-superficie px-2 text-left">
                    <span className="block size-11 shrink-0 overflow-hidden rounded-radio-s bg-superficie-hundida">{foto ? <Foto src={foto.url} alt="" className="size-full" sizes="44px" /> : fotoPortada ? <Foto src={fotoPortada} alt="" className="size-full object-cover" sizes="44px" /> : null}</span>
                    <span className="min-w-0"><span className="block truncate text-secundario font-extrabold">{v}</span><span className="block truncate text-etiqueta text-texto-secundario">{foto ? `Foto ${numero}` : "Elegir foto"}</span></span>
                  </button>;
                })}
              </div>
            </>}
          </div>;
        })()}

        {etapa === "stock" && (porEncargo ? <div className="mt-4 flex flex-col gap-3">
          <button type="button" aria-pressed="true" onClick={() => { alCambiarEncargo(false); alCambiar({ ...estado, pres: estado.pres.map((p) => ({ ...p, stock: 0 })) }); }} className="tocable min-h-12 rounded-full border border-accion bg-superficie-hundida px-4 text-secundario font-bold">Es por encargo, no llevo stock</button>
          <GrupoOpciones etiqueta="Cuándo llega" valor={["3 a 5 días", "1 a 2 semanas", "1 mes"].includes(encargoTexto) ? encargoTexto : null} alCambiar={(v) => alCambiarPlazo(v)} opciones={[{ id: "3 a 5 días", texto: "3 a 5 días" }, { id: "1 a 2 semanas", texto: "1 a 2 semanas" }, { id: "1 mes", texto: "1 mes" }, { id: "__otro", texto: "Otro" }]} />
          {(!["3 a 5 días", "1 a 2 semanas", "1 mes"].includes(encargoTexto)) && <Campo etiqueta="Otro plazo" autoFocus={encargoTexto === "__otro" || !!encargoTexto} maxLength={40} placeholder="Escríbelo en hasta 40 letras" value={encargoTexto === "__otro" ? "" : encargoTexto} onChange={(e) => alCambiarPlazo(e.target.value)} />}
        </div> : <div className="mt-3 flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-secundario font-extrabold text-texto-secundario">Mismo precio · {formatearPesos(precioProducto)}</span>
            {estado.pres.length > 1 && <Boton jerarquia="secundario" tamano="compacto" onClick={() => setMostrarPoner((v) => !v)}>{mostrarPoner ? "Aplicar a todas" : "Poner a todas"}</Boton>}
          </div>
          {mostrarPoner && <div className="flex items-center justify-between rounded-radio-m bg-superficie p-2"><span className="text-secundario text-texto-secundario">Unidades por presentación</span><Cantidad valor={cantidadTodas} max={2147483647} alCambiar={setCantidadTodas} etiquetaQuitar="Quitar una unidad a todas" etiquetaAgregar="Agregar una unidad a todas" /><Boton tamano="compacto" onClick={() => { alCambiar({ ...estado, pres: ponerATodas(estado.pres, cantidadTodas) }); setMostrarPoner(false); }}>Aplicar</Boton></div>}
          {reparto.some((r) => r.faltan !== 0) && <div role="status" className="flex flex-col gap-2 rounded-radio-m bg-atencion-suave p-3 text-secundario font-bold text-atencion-texto">
            {reparto.filter((r) => r.faltan !== 0).map(({ origen, faltan }) => {
              const fila = estado.pres.find((p) => origen.filas.includes(claveVariante(p.valores)) && p.activa);
              return <div key={origen.id} className="flex flex-wrap items-center justify-between gap-2"><span>{origen.titulo ? `Tenías ${origen.total} de ${origen.titulo}.` : `Tenías ${origen.total}.`} {faltan > 0 ? `Faltan ${faltan} por repartir.` : `Te pasaste por ${Math.abs(faltan)}.`}</span>{fila && <Boton jerarquia="secundario" tamano="compacto" onClick={() => alCambiar({ ...estado, pres: ponerTodasEn(estado.pres, origen, claveVariante(fila.valores)) })}>Ponerlas todas en {textoCombinacion(estado.opciones, fila.valores)}</Boton>}</div>;
            })}
          </div>}
          <div className="max-h-[262px] overflow-y-auto pr-0.5" data-grupos-stock="">
            {(estado.opciones[0]?.valores ?? []).map((grupo) => {
              const filas = estado.pres.filter((p) => p.valores[estado.opciones[0]!.nombre] === grupo);
              const suma = filas.filter((p) => p.activa).reduce((n, p) => n + (p.stock ?? 0), 0);
              const hex = colorDe([estado.opciones[0]!], { [estado.opciones[0]!.nombre]: grupo });
              return <section key={grupo} className="mb-2.5 overflow-hidden rounded-radio-m border border-linea bg-superficie" aria-label={`${estado.opciones[0]!.nombre} ${grupo}`}>
                <div className="flex h-9 items-center gap-2 bg-superficie-hundida px-3.5"><span className="size-4 shrink-0 rounded-full border border-linea" style={hex ? { background: hex } : undefined}/><span className="min-w-0 flex-1 truncate text-secundario font-extrabold">{grupo}</span><span className="text-etiqueta text-texto-secundario" data-total-grupo>{suma} en total</span></div>
                {filas.map((p) => {
                  const clave = claveVariante(p.valores);
                  const etiqueta = textoCombinacion(estado.opciones.slice(1), Object.fromEntries(estado.opciones.slice(1).map((o) => [o.nombre, p.valores[o.nombre] ?? ""])));
                  return <div key={clave} className="flex h-[46px] items-center gap-2.5 border-t border-linea px-3">
                    <span className="w-7 truncate text-destacado font-extrabold text-texto">{etiqueta || grupo}</span><button type="button" onClick={() => setDetalle({ tipo: "variante", clave })} className="min-w-0 flex-1 truncate text-left text-etiqueta text-texto-secundario">{p.precio !== null ? `${formatearPesos(precioDe(p, precioProducto))} · propio` : "Detalle"}</button>
                    <Cantidad valor={p.stock ?? 0} max={2147483647} alCambiar={(v) => cambiarUna(clave, { stock: v })} etiquetaQuitar={`Quitar uno de ${textoCombinacion(estado.opciones, p.valores)}`} etiquetaAgregar={`Agregar uno de ${textoCombinacion(estado.opciones, p.valores)}`} className="[&>button]:size-9 [&>span]:min-w-6 [&>span]:text-destacado" />
                  </div>;
                })}
              </section>;
            })}
          </div>
          <p className="px-1 text-secundario text-texto-secundario" data-total-presentaciones>{presActivas.length} presentaciones · {totalStock} en total</p>
          <button type="button" aria-pressed={false} onClick={() => { alCambiarEncargo(true); alCambiarPlazo(encargoTexto || "3 a 5 días"); alCambiar({ ...estado, pres: estado.pres.map((p) => ({ ...p, stock: 0 })) }); }} className="tocable min-h-12 rounded-full border border-borde-pastilla bg-superficie px-4 text-secundario font-bold">Es por encargo, no llevo stock</button>
        </div>)}
      </div>
    </div>

    <HojaFijoAbajo>
      <div className="pointer-events-auto flex items-center gap-3 border-t border-linea bg-fondo px-5 pt-3 pb-[max(12px,var(--safe-abajo))]">
        <button type="button" aria-label="Atrás" onClick={irAtras} className="tocable grid size-14 shrink-0 place-items-center rounded-full border border-borde-pastilla bg-superficie text-titulo-seccion">‹</button>
        <Boton anchoCompleto tamano="grande" onClick={seguir} deshabilitado={etapa === "stock" && !permitirListo}>{etapa === "stock" ? `Listo · ${porEncargo ? 0 : totalStock} en total` : "Seguir"}</Boton>
      </div>
    </HojaFijoAbajo>

    <HojaPresentacion abierta={detalle?.tipo === "variante"} presentacion={detallePres} opciones={estado.opciones} precioProducto={precioProducto} fotos={fotos} fotosColor={estado.fotosColor} alCerrar={() => setDetalle(null)} alCambiar={(c) => detallePres && cambiarUna(claveVariante(detallePres.valores), c)} alCompletar={() => {}} alElegirFoto={(v, id) => alCambiar({ ...estado, fotosColor: id ? { ...estado.fotosColor, [v]: id } : Object.fromEntries(Object.entries(estado.fotosColor).filter(([x]) => x !== v)) })} alQuitar={async () => null} mostrarQuitar={false} />
    <HojaFotoColor abierta={detalle?.tipo === "fotos"} eje={etapa === "valores" ? { nombre: ejes[indice] ?? "Color", valores: valores[ejes[indice] ?? ""] ?? [] } : colorFotos} pres={estado.pres} fotos={fotos} fotosColor={estado.fotosColor} agregarFoto={agregarFoto} alCerrar={() => setDetalle(null)} alElegir={(v, id) => alCambiar({ ...estado, fotosColor: id ? { ...estado.fotosColor, [v]: id } : Object.fromEntries(Object.entries(estado.fotosColor).filter(([x]) => x !== v)) })} />
  </>;
}

function OtroValorHistoria({ nombre, valores, alCambiar }: { nombre: string; valores: string[]; alCambiar: (valores: string[]) => void }) {
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState("");
  const entrada = useRef<HTMLInputElement>(null);
  const agregar = () => {
    const nuevos = alternarValor(valores, texto);
    if (nuevos !== valores) alCambiar(nuevos);
    setTexto("");
    if (nuevos.length >= MAX_VALORES) setAbierto(false);
  };
  return abierto ? <input ref={entrada} autoFocus aria-label={`Otro ${nombre.toLocaleLowerCase("es")}`} maxLength={20} value={texto} placeholder="Escríbelo y toca Enter" enterKeyHint="done" className="h-(--alto-campo) w-56 rounded-radio-m border-2 border-borde-campo bg-superficie px-3.5 text-cuerpo outline-none focus:border-accion" onChange={(e) => setTexto(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); agregar(); setAbierto(false); } if (e.key === "Escape") setAbierto(false); }} onBlur={() => { if (texto.trim()) agregar(); setAbierto(false); }} /> : <Opcion elegida={false} deshabilitada={valores.length >= MAX_VALORES} onClick={() => { setAbierto(true); requestAnimationFrame(() => entrada.current?.focus()); }}>+ Otro</Opcion>;
}
