"use client";
import { useState, useRef, useEffect } from "react";
import type { CSSProperties } from "react";
import type { CatalogoPublico, ProductoPublico } from "@/lib/types";
import { dinero } from "@/lib/tienda/carrito";
import { modoOpiniones } from "@/lib/tienda/tema";
import { detallesDe, lineaCorta, mostrarDetalle } from "@/lib/tienda/catalogo";
import {
  accionCorazon,
  agotadoPara,
  colorDeEleccion,
  coloresDelEje,
  desde,
  disponibilidadPara,
  indiceDeFoto,
  textoEjes,
  textoEleccion,
  tienePresentaciones,
  varianteDe,
  type Eleccion,
} from "@/lib/tienda/presentaciones";
import { Icono, SelloAgotado } from "./iconos";
import { Medios } from "./medios";
export function Reel({
  p,
  t,
  i,
  n,
  activo,
  siguiente,
  anterior,
  cantidadPedido,
  seleccionado,
  elegir,
  opiniones,
  avisar,
  perfil,
  compartir,
  eleccion,
  abrirPresentaciones,
  registrarBurst,
}: {
  p: ProductoPublico;
  t: CatalogoPublico["tienda"];
  i: number;
  n: number;
  activo: boolean;
  siguiente: boolean;
  anterior: boolean;
  cantidadPedido: number;
  seleccionado: (id: string | null) => boolean;
  elegir: (id: string | null, on?: boolean) => void;
  opiniones: () => void;
  avisar: (id: string | null) => void;
  perfil: () => void;
  compartir: () => void;
  /** La presentación elegida de este producto (null = todavía no eligió). Solo con presentaciones. */
  eleccion: Eleccion | null;
  /** Abre la hoja «Ver presentaciones» ("b") o la de pastillas que abre ♥ ("a"). */
  abrirPresentaciones: (modo: "a" | "b") => void;
  /** Deja que la hoja dispare el «aaah» de este reel al agregar. */
  registrarBurst: (fn: (() => void) | null) => void;
}) {
  const pres = tienePresentaciones(p);
  const [valores, setValores] = useState<Record<string, string>>(
    () => p.variantes[0]?.valores ?? {},
  );
  const [abierto, setAbierto] = useState(false);
  const burst = useRef<HTMLDivElement>(null);
  const v = pres
    ? varianteDe(p, eleccion)
    : p.variantes.find((v) =>
        p.opciones.every((o) => v.valores[o.nombre] === valores[o.nombre]),
      );
  const varianteId = v?.id ?? null;
  // Con presentaciones y sin elegir, el reel no se sella: solo si TODAS están agotadas. Elegida, solo esa combinación.
  const disp = pres
    ? disponibilidadPara(p, eleccion)
    : p.variantes.length && !v
      ? "agotado"
      : (v?.disponibilidad ?? p.disponibilidad);
  const agotado = pres ? agotadoPara(p, eleccion) : disp === "agotado";
  const encargo = disp === "por_encargo";
  const q = seleccionado(varianteId);
  // «En tu pedido»: con presentaciones, si cualquiera de ellas ya está en el pedido.
  const enPedido = pres ? p.variantes.some((x) => seleccionado(x.id)) : q;
  const mostrarLikes = !agotado && p.likes > 0;
  // «Desde RD$ X» mientras no haya una elegida y los precios sean distintos; elegida, el precio de esa.
  const desdeP = pres && !v ? desde(p) : null;
  const conDesde = !!desdeP?.varia;
  const precio = v ? (v.precioPromo ?? v.precio) : conDesde ? desdeP!.precio : (p.precioPromo ?? p.precio);
  const precioBase = v?.precio ?? p.precio;
  const quedan = v?.quedan ?? p.quedan;
  const m = t.personalizacion.mensajes as Record<string, string> | undefined;
  const txt = String(
    p.detalles.descripcion ??
      "¿Te llama la atención? Escríbeme y te cuento más.",
  );
  const short =
    txt.length > 78
      ? txt
          .slice(0, 78)
          .replace(/\s+\S*$/, "")
          .replace(/[,.:;]$/, "") + "…"
      : txt;
  const lanzarBurst = () => {
    const b = burst.current;
    if (!b) return;
    b.classList.remove("go");
    void b.offsetWidth;
    b.classList.add("go");
  };
  // Con presentaciones, el «aaah» (♥ y doble toque) depende de si ya eligió: sin elegir abre la hoja de pastillas; elegida la
  // agrega; agotada pide el aviso. La hoja usa el mismo «aaah» al agregar.
  const burstRef = useRef(lanzarBurst);
  useEffect(() => {
    burstRef.current = lanzarBurst;
  });
  useEffect(() => {
    registrarBurst(() => burstRef.current());
    return () => registrarBurst(null);
  }, [registrarBurst]);
  const corazon = () => {
    if (!pres) return null;
    return accionCorazon(p, eleccion, (id) => seleccionado(id));
  };
  const aaah = () => {
    if (pres) {
      const a = corazon()!;
      if (a.tipo === "hoja") abrirPresentaciones("a");
      else if (a.tipo === "avisar") avisar(a.varianteId);
      else if (a.tipo === "agregar") {
        elegir(a.varianteId, true);
        lanzarBurst();
      }
      return;
    }
    if (agotado || (p.variantes.length > 0 && !v)) return;
    elegir(varianteId, true);
    lanzarBurst();
  };
  // ♥ y el botón del detalle: igual que antes, salvo con presentaciones.
  const alCorazon = () => {
    if (pres) {
      const a = corazon()!;
      if (a.tipo === "quitar") elegir(a.varianteId);
      else aaah();
      return;
    }
    if (agotado) avisar(varianteId);
    else if (q) elegir(varianteId);
    else aaah();
  };
  const colores = pres ? coloresDelEje(p.opciones) : [];
  const hexElegido = pres ? colorDeEleccion(p.opciones, eleccion) : null;
  const botonPresentaciones = (clase = "") =>
    pres ? (
      <button
        type="button"
        className={"pres-btn" + (eleccion ? " elegida" : "") + (clase ? " " + clase : "")}
        data-presentaciones={p.slug}
        aria-label={
          eleccion
            ? `Cambiar presentación de ${p.nombre}: ${textoEleccion(p.opciones, eleccion)}`
            : `Ver presentaciones de ${p.nombre}`
        }
        onClick={() => abrirPresentaciones("b")}
      >
        {eleccion ? (
          <>
            {hexElegido && <i className="pres-punto" aria-hidden="true" style={{ background: hexElegido }} />}
            <span>{textoEleccion(p.opciones, eleccion)} · Cambiar ›</span>
          </>
        ) : (
          <>
            {colores.length > 0 && (
              <span className="pres-puntos" aria-hidden="true">
                {colores.slice(0, 5).map((c, i) => (
                  <i key={i} style={{ background: c }} />
                ))}
              </span>
            )}
            <span>Ver presentaciones ›</span>
          </>
        )}
      </button>
    ) : null;

  const opciones = (conPrecio = false) =>
    p.opciones.length === 0 ? null : (
      <div className="opciones-catalogo">
        {p.opciones.map((o) => (
          <div
            className="opciones-fila"
            key={o.nombre}
            role="group"
            aria-label={o.nombre}
          >
            {o.valores.map((valor) => {
              const posible = { ...valores, [o.nombre]: valor };
              const variante = p.variantes.find((v) =>
                p.opciones.every(
                  (o) => v.valores[o.nombre] === posible[o.nombre],
                ),
              );
              return (
                <button
                  key={valor}
                  className={
                    variante?.disponibilidad === "agotado" ? "agotada" : ""
                  }
                  aria-pressed={valores[o.nombre] === valor}
                  onClick={() => setValores(posible)}
                >
                  {valor}
                  {conPrecio && variante
                    ? " · " + dinero(variante.precioPromo ?? variante.precio)
                    : ""}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    );
  return (
    <article
      className={`reel${activo ? " on" : ""}${anterior ? " prev" : ""}${siguiente ? " next" : ""}${agotado ? " sold" : ""}${abierto && activo ? " open" : ""}`}
      id={"r-" + p.slug}
      data-id={p.slug}
      aria-label={p.nombre + (agotado ? ", agotado" : "")}
    >
      <div className="media" data-media={p.slug}>
        <Medios
          medios={p.medios}
          nombre={p.nombre}
          activo={activo}
          siguiente={siguiente}
          anterior={anterior}
          prioridad={i < 2}
          dobleToque={aaah}
          irA={pres ? indiceDeFoto(p, eleccion) : null}
        />
        {agotado && (
          <>
            <SelloAgotado />
            <span className="soldmsg">
              {Array.isArray(m?.agotado_foto) ? (
                m.agotado_foto.map((linea, i) => <span key={i}>{linea}</span>)
              ) : (
                <>
                  <span>Aaah… dejaste que</span>
                  <span>se lo llevaran ;(</span>
                </>
              )}
            </span>
          </>
        )}
        <div className="shade ov" />
        <div className="topmeta ov">
          <span>
            {String(i + 1).padStart(2, "0")} / {String(n).padStart(2, "0")} ·{" "}
            {p.detalles.para === "ella"
              ? "Para ella"
              : p.detalles.para === "el"
                ? "Para él"
                : p.detalles.para === "unisex"
                  ? "Para los dos"
                  : t.rubro === "perfumes"
                    ? "Perfume"
                    : "Producto"}
          </span>
          {enPedido && <span className="inbadge">En tu pedido</span>}
        </div>
        <div className="cap ov">
          <button
            className="who"
            data-profile
            onClick={perfil}
            aria-label={"Ver el perfil de " + t.nombre}
          >
            <span className="av" aria-hidden="true" />
            {t.instagram?.split("/").filter(Boolean).at(-1) ?? t.nombre}
          </button>
          <h2>{p.nombre}</h2>
          <div className="pr">
            {conDesde && <small className="pres-desde">Desde</small>}
            <strong>{dinero(precio)}</strong>
            {!pres && precio < precioBase && <del>{dinero(precioBase)}</del>}
            {pres && v && precio < precioBase && <del>{dinero(precioBase)}</del>}
            <span>
              {agotado
                ? "Agotado"
                : encargo
                  ? (p.encargoTexto ?? "Por encargo")
                  : disp === "quedan"
                    ? `Solo tengo ${quedan}`
                    : pres && !eleccion
                      ? textoEjes(p.opciones)
                      : ""}
              {!pres && lineaCorta(p, t.rubro) ? " · " + lineaCorta(p, t.rubro) : ""}
            </span>
          </div>
          {!pres && opciones()}
          {encargo && <span className="por-encargo">Por encargo</span>}
          {pres ? (
            <div className="pres-fila-cap">
              {botonPresentaciones()}
              <button
                className="mas"
                data-more={p.slug}
                aria-expanded={abierto}
                onClick={() => setAbierto(true)}
              >
                más
              </button>
            </div>
          ) : (
            <p className="txt">
              {short}{" "}
              <button
                className="mas"
                data-more={p.slug}
                aria-expanded={abierto}
                onClick={() => setAbierto(true)}
              >
                más
              </button>
            </p>
          )}
        </div>
        <div className="panel" hidden={!abierto || !activo}>
          <div className="pin">
            <h3>{p.nombre}</h3>
            <div className="fam">
              {mostrarDetalle(p.detalles.familia)}
              {lineaCorta(p, t.rubro) ? " · " + lineaCorta(p, t.rubro) : ""}
            </div>
            <p>{txt}</p>
            <dl>
              {(t.rubro === "perfumes"
                ? [
                    ["notas_salida", "Salida"],
                    ["notas_corazon", "Corazón"],
                    ["notas_fondo", "Fondo"],
                  ]
                    .filter(([key]) => p.detalles[key])
                    .map(([key, nombre]) => ({
                      nombre,
                      valor: mostrarDetalle(p.detalles[key]),
                    }))
                : detallesDe(p, t.rubro)
              ).map((d) => (
                <div key={d.nombre}>
                  <dt>{d.nombre}</dt>
                  <dd>{d.valor}</dd>
                </div>
              ))}
            </dl>
            {Array.isArray(p.detalles.ocasiones) &&
              p.detalles.ocasiones.length > 0 && (
                <p className="occ">
                  <b>Ideal para</b>
                  {Array.isArray(p.detalles.ocasiones)
                    ? p.detalles.ocasiones.join(" · ")
                    : p.detalles.ocasiones}
                </p>
              )}
            {pres ? botonPresentaciones("en-panel") : opciones(true)}
            <div className="prow">
              <button
                className={"btn " + (agotado ? "ghost" : q ? "ghost" : "heart")}
                disabled={!pres && !!p.variantes.length && !v}
                onClick={alCorazon}
              >
                {agotado
                  ? "Avísame cuando llegue"
                  : q
                    ? "Quitar de mi pedido"
                    : (m?.boton_comprar ??
                      `¡Lo quiero, ${t.nombreVendedora ?? t.nombre}!`)}
              </button>
              <button
                className="menos"
                data-less={p.slug}
                onClick={() => setAbierto(false)}
              >
                menos
              </button>
            </div>
          </div>
        </div>
        <div className="burst" ref={burst} aria-hidden="true">
          <Icono nombre="heart" />
          {Array.from({ length: 10 }, (_, k) => (
            <i
              key={k}
              className={"pp" + (k % 3 === 2 ? " sq" : "")}
              style={
                {
                  "--a": `${k * 36}deg`,
                  "--c": ["#F5C9D6", "#FF834F", "#FFF9EE", "#174B3A"][k % 4],
                } as CSSProperties
              }
            />
          ))}
          <span className="aw">
            {"a".repeat(Math.min(2 + Math.max(1, cantidadPedido), 10)) +
              "h" +
              (cantidadPedido >= 4 ? "!" : "")}
          </span>
        </div>
      </div>
      <div className="acts ov">
        <button
          className={"act" + (!agotado ? " like" : "")}
          aria-pressed={!agotado ? q : undefined}
          data-like={!agotado ? p.slug : undefined}
          aria-label={
            (agotado ? "Avísame: " : q ? "Quitar del carrito: " : "Lo quiero: ") + p.nombre +
            (mostrarLikes ? `. ${p.likes} ${p.likes === 1 ? "lo quiere" : "lo quieren"}` : "")
          }
          onClick={alCorazon}
        >
          <Icono nombre={agotado ? "wa" : "heart"} />
          {mostrarLikes && (
            <span className="likes-caption" aria-hidden="true"><span className="likes-count">{p.likes}</span><span className="likes-phrase">{p.likes === 1 ? "Lo quiere" : "Lo quieren"}</span></span>
          )}
          {!mostrarLikes && <span>{agotado ? "Avísame" : "Lo quiero"}</span>}
        </button>
        {modoOpiniones(t.personalizacion.secciones) !== "no" && (
          <button className="act" data-comments={p.slug} onClick={opiniones}>
            <Icono nombre="comment" />
            <span>{(modoOpiniones(t.personalizacion.secciones) === "si" && p.opiniones.length) || "Pregúntame"}</span>
          </button>
        )}
        <button
          className="act"
          data-sharep={p.slug}
          aria-label={"Compartir " + p.nombre}
          onClick={compartir}
        >
          <Icono nombre="share" />
          <span>Compartir</span>
        </button>
      </div>
    </article>
  );
}
