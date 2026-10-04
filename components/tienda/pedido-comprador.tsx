"use client";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { VistaSolicitud, CatalogoPublico } from "@/lib/types";
import { fuentePublica } from "@/lib/data/publica";
import { lineaCorta, mostrarDetalle } from "@/lib/tienda/catalogo";
import { temaDeTienda } from "@/lib/tienda/tema";
import { NOMBRE_PRODUCTO } from "@/lib/rubros";
import { dinero } from "@/lib/tienda/carrito";
import { descargarRecibo } from "@/lib/tienda/recibo";
import { Icono } from "./iconos";
export function PedidoComprador({
  codigo,
  demo,
  inicial,
  inicialCatalogo = null,
}: {
  codigo: string;
  demo: boolean;
  inicial: VistaSolicitud | null;
  inicialCatalogo?: CatalogoPublico | null;
}) {
  const [s, setS] = useState(inicial);
  const [catalogo, setCatalogo] = useState(inicialCatalogo);
  const [cargando, setCargando] = useState(demo);
  const [i, setI] = useState(0);
  const [pausa, setPausa] = useState(false);
  const [error, setError] = useState("");
  const [preparando, setPreparando] = useState(false);
  const hold = useRef<ReturnType<typeof setTimeout> | null>(null);
  const held = useRef(false);
  const [catalogoAnterior, setCatalogoAnterior] = useState<string | null>(null);
  useEffect(() => {
    let valido = true;
    if (demo)
      fuentePublica(true)
        .then((f) => f.verSolicitud(codigo))
        .then((s) => {
          if (valido) {
            setS(s);
            setCargando(false);
            if(s) fuentePublica(true).then(f=>f.catalogoPublico(s.tienda.slug)).then(c=>{if(valido)setCatalogo(c);}).catch(()=>{});
          }
        })
        .catch(() => {
          if (valido) setCargando(false);
        });
    try {
      const url = new URL(document.referrer);
      if (url.origin === location.origin && url.pathname.startsWith("/tienda/"))
        queueMicrotask(() => {
          if (valido) setCatalogoAnterior(url.href);
        });
    } catch {}
    return () => {
      valido = false;
      if (hold.current) clearTimeout(hold.current);
    };
  }, [codigo, demo]);
  const enlace = s
    ? `/tienda/${s.tienda.slug}${demo ? "?demo" : ""}`
    : catalogoAnterior;
  const volver = () => {
    if (enlace) location.href = enlace;
    else history.back();
  };
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (enlace) location.href = enlace;
        else history.back();
      } else if (e.key === "ArrowRight")
        setI((i) => (i + 1) % Math.max(1, s?.items.length ?? 0));
      else if (e.key === "ArrowLeft")
        setI(
          (i) =>
            (i - 1 + Math.max(1, s?.items.length ?? 0)) %
            Math.max(1, s?.items.length ?? 0),
        );
    };
    document.addEventListener("keydown", tecla);
    return () => document.removeEventListener("keydown", tecla);
  }, [enlace, s]);
  const paso = (d: number) =>
    setI((i) => (i + d + (s?.items.length ?? 1)) % (s?.items.length ?? 1));
  const gesto = (d: number) => ({
    onPointerDown: () => {
      held.current = false;
      hold.current = setTimeout(() => {
        held.current = true;
        setPausa(true);
      }, 220);
    },
    onPointerUp: () => {
      if (hold.current) clearTimeout(hold.current);
      setPausa(false);
      if (!held.current) paso(d);
    },
    onPointerCancel: () => {
      if (hold.current) clearTimeout(hold.current);
      setPausa(false);
    },
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        paso(d);
      }
    },
  });
  const recibo = async (tipo: "png" | "pdf") => {
    if (!s || preparando) return;
    setPreparando(true);
    setError("");
    try {
      await descargarRecibo(s, tipo, tema ?? undefined);
    } catch {
      setError("No pudimos preparar el recibo. Inténtalo otra vez.");
    } finally {
      setPreparando(false);
    }
  };
  const item = s?.items[i];
  const producto = catalogo?.productos.find(p=>p.id===item?.productoId);
  const nombres = NOMBRE_PRODUCTO[catalogo?.tienda.rubro ?? "general"];
  const tema = catalogo ? temaDeTienda(catalogo.tienda) : null;
  const valido = s && s.estado !== "vencido" && s.items.length > 0;
  return (
    <div
      className="catalogo-publico pedido-publico"
      style={
        {
          ...(tema ? Object.fromEntries(Object.entries(tema.colores).map(([k,v])=>["--"+k,v])) : {}),
          ...(tema ? {"--display":`"${tema.fuentes.display === "Figtree" ? "DZ Figtree" : tema.fuentes.display === "Fredoka" ? "DZ Fredoka" : tema.fuentes.display}",Georgia,serif`,"--body":`"${tema.fuentes.body === "Figtree" ? "DZ Figtree" : tema.fuentes.body}",sans-serif`} : {}),
          "--iso": `url("${s?.tienda.fotoPerfilUrl ?? s?.tienda.logoUrl ?? ""}")`,
        } as CSSProperties
      }
    >
      <div id="pvBg" className="pvov">
        <main
          className={
            "pvpage" + (!valido ? " gone" : "") + (pausa ? " paused" : "")
          }
          id="pvBody"
        >
          {valido && (
            <>
              {s.items.map((p, j) => (
                <img
                  key={p.productoId + (p.varianteId ?? "")}
                  className={"pvslide" + (j === i ? " on" : "")}
                  src={p.foto ?? ""}
                  alt=""
                  style={
                    {
                      "--dx": ["-3%", "3%", "-2.5%", "2.5%"][j % 4],
                      "--dy": ["-2%", "-2.5%", "2%", "2%"][j % 4],
                    } as CSSProperties
                  }
                />
              ))}
              <div className="pvshade" />
              <button
                className="pvtap l"
                aria-label="Producto anterior"
                {...gesto(-1)}
              />
              <button
                className="pvtap r"
                aria-label="Producto siguiente"
                {...gesto(1)}
              />
              <div className="pvbars" aria-hidden="true">
                {s.items.map((_, j) => (
                  <i
                    key={j + "-" + i}
                    className={j < i ? "done" : j === i ? "run" : ""}
                    onAnimationEnd={() => {
                      if (!pausa) paso(1);
                    }}
                  >
                    <b />
                  </i>
                ))}
              </div>
            </>
          )}
          <div className="pvtop">
            <span className="av" aria-hidden="true" />
            <div className="pvwho">
              <b>{s?.tienda.nombre ?? "Tu pedido"}</b>
              <small>Tu pedido{s ? " · #" + s.codigo : ""}</small>
            </div>
            <button
              className="pvx"
              aria-label="Volver al catálogo"
              onClick={volver}
            >
              ×
            </button>
          </div>
          {valido && item ? (
            <>
              <div className="pvcap">
                <span className="pvthx">¡Gracias por tu compra!</span>
                <h2>{item.nombre}</h2>
                <span className="pvpr">
                  <b>{dinero(item.precioUnitario * item.cantidad)}</b>
                  {item.varianteTexto ?? (producto && catalogo ? [mostrarDetalle(producto.detalles.marca),lineaCorta(producto,catalogo.tienda.rubro)].filter(Boolean).join(" · ") : "")}
                  {item.porEncargo ? " · Por encargo" : ""}
                </span>
                <span className="pvtag">
                  {i + 1} de {s.items.length}
                </span>
                <span className="pvacts">
                  <a
                    className="pvgo"
                    href={enlace + (producto ? "#p/" + producto.slug : "")}
                    onClick={async (e) => {
                      e.preventDefault();
                      try {
                        const c = await (
                          await fuentePublica(demo)
                        ).catalogoPublico(s.tienda.slug);
                        const p = c.productos.find(
                          (p) => p.id === item.productoId,
                        );
                        location.href = enlace + (p ? "#p/" + p.slug : "");
                      } catch {
                        volver();
                      }
                    }}
                  >
                    Ver {nombres.singular} <Icono nombre="back" />
                  </a>
                  <button
                    className="pvgo pvsh"
                    onClick={async () => {
                      try {
                        if (navigator.share)
                          await navigator.share({
                            title: "Tu pedido con " + s.tienda.nombre,
                            url: location.href,
                          });
                        else await navigator.clipboard.writeText(location.href);
                      } catch {}
                    }}
                  >
                    <Icono nombre="share" />
                    Compartir
                  </button>
                </span>
              </div>
              <section className="pvsheet">
                <div className="pvt">
                  <span>
                    Total · {s.items.length}{" "}
                    {s.items.length === 1 ? "producto" : "productos"}
                  </span>
                  <b>{dinero(s.total)}</b>
                </div>
                <p className="pvmeta">
                  Pedido #{s.codigo} ·{" "}
                  {new Date(s.creadaEn).toLocaleString("es-DO", {
                    timeZone: "America/Santo_Domingo",
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
                <p className="pvsec">Descargar recibo</p>
                <div className="pvrow">
                  <button
                    className="pvbtn soft"
                    data-inv="png"
                    disabled={preparando}
                    onClick={() => void recibo("png")}
                  >
                    Recibo (imagen)
                  </button>
                  <button
                    className="pvbtn soft"
                    data-inv="pdf"
                    disabled={preparando}
                    onClick={() => void recibo("pdf")}
                  >
                    PDF
                  </button>
                </div>
                {error && <p role="alert">{error}</p>}
                <button className="pvbtn pri wide" onClick={volver}>
                  Seguir explorando {s.tienda.nombre}
                </button>
              </section>
            </>
          ) : (
            <>
              <div className="pvcap static">
                <h2>
                  {cargando
                    ? "Abriendo tu pedido…"
                    : s?.estado === "vencido"
                      ? "Este pedido venció"
                      : "Este pedido no está disponible"}
                </h2>
                <p className="pvgonep">
                  {!cargando &&
                    (s
                      ? "Puedes volver al catálogo y armarlo otra vez."
                      : "Revisa el enlace o pídele a quien te lo mandó que lo envíe de nuevo.")}
                </p>
              </div>
              <div className="pvsheet">
                <button className="pvbtn pri wide" onClick={volver}>
                  {s
                    ? "Seguir explorando " + s.tienda.nombre
                    : "Volver al catálogo"}
                </button>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
