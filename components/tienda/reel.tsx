"use client";
import { useState, useRef } from "react";
import type { CSSProperties } from "react";
import type { CatalogoPublico, ProductoPublico } from "@/lib/types";
import { dinero } from "@/lib/tienda/carrito";
import { detallesDe, lineaCorta, mostrarDetalle } from "@/lib/tienda/catalogo";
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
  precargar,
  cantidadPedido,
  seleccionado,
  elegir,
  opiniones,
  avisar,
  perfil,
  compartir,
}: {
  p: ProductoPublico;
  t: CatalogoPublico["tienda"];
  i: number;
  n: number;
  activo: boolean;
  siguiente: boolean;
  anterior: boolean;
  precargar: boolean;
  cantidadPedido: number;
  seleccionado: (id: string | null) => boolean;
  elegir: (id: string | null, on?: boolean) => void;
  opiniones: () => void;
  avisar: (id: string | null) => void;
  perfil: () => void;
  compartir: () => void;
}) {
  const [valores, setValores] = useState<Record<string, string>>(
    () => p.variantes[0]?.valores ?? {},
  );
  const [abierto, setAbierto] = useState(false);
  const burst = useRef<HTMLDivElement>(null);
  const v = p.variantes.find((v) =>
    p.opciones.every((o) => v.valores[o.nombre] === valores[o.nombre]),
  );
  const varianteId = v?.id ?? null;
  const disp =
    p.variantes.length && !v
      ? "agotado"
      : (v?.disponibilidad ?? p.disponibilidad);
  const agotado = disp === "agotado";
  const encargo = disp === "por_encargo";
  const q = seleccionado(varianteId);
  const precio = v ? (v.precioPromo ?? v.precio) : (p.precioPromo ?? p.precio);
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
  const aaah = () => {
    if (agotado || (p.variantes.length > 0 && !v)) return;
    elegir(varianteId, true);
    const b = burst.current;
    if (!b) return;
    b.classList.remove("go");
    void b.offsetWidth;
    b.classList.add("go");
  };
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
          siguiente={siguiente && precargar}
          anterior={anterior && precargar}
          prioridad={activo}
          precargar={precargar}
          dobleToque={aaah}
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
          {q && <span className="inbadge">En tu pedido</span>}
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
            <strong>{dinero(precio)}</strong>
            {precio < precioBase && <del>{dinero(precioBase)}</del>}
            <span>
              {agotado
                ? "Agotado"
                : encargo
                  ? (p.encargoTexto ?? "Por encargo")
                  : disp === "quedan"
                    ? `Solo tengo ${quedan}`
                    : ""}
              {lineaCorta(p, t.rubro) ? " · " + lineaCorta(p, t.rubro) : ""}
            </span>
          </div>
          {opciones()}
          {encargo && <span className="por-encargo">Por encargo</span>}
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
            {opciones(true)}
            <div className="prow">
              <button
                className={"btn " + (agotado ? "ghost" : q ? "ghost" : "heart")}
                disabled={!!p.variantes.length && !v}
                onClick={() =>
                  agotado ? avisar(varianteId) : q ? elegir(varianteId) : aaah()
                }
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
          aria-label={(agotado ? "Avísame: " : "Lo quiero: ") + p.nombre}
          onClick={() =>
            agotado ? avisar(varianteId) : q ? elegir(varianteId) : aaah()
          }
        >
          <Icono nombre={agotado ? "wa" : "heart"} />
          {!agotado && p.likes > 0 && <i className="cnt">{p.likes}</i>}
          <span>{agotado ? "Avísame" : "Lo quiero"}</span>
        </button>
        {(t.personalizacion.secciones as Record<string, unknown> | undefined)
          ?.opiniones !== false && (
          <button className="act" data-comments={p.slug} onClick={opiniones}>
            <Icono nombre="comment" />
            <span>{p.opiniones.length || "Pregúntame"}</span>
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
