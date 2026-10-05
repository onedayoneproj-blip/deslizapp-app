"use client";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import dynamic from "next/dynamic";
import { estadoComprador } from "@/lib/pedido-catalogo";
import type { VistaSolicitud, CatalogoPublico } from "@/lib/types";
import { fuentePublica } from "@/lib/data/publica";
import { lineaCorta, mostrarDetalle } from "@/lib/tienda/catalogo";
import { temaDeTienda } from "@/lib/tienda/tema";
import { NOMBRE_PRODUCTO } from "@/lib/rubros";
import { dinero } from "@/lib/tienda/carrito";
import { descargarRecibo } from "@/lib/tienda/recibo";
import { Icono } from "./iconos";

// La vista de la tienda (Registrar) solo se carga si hay sesión o la piden: el comprador no la descarga.
const TiendaEnPedido = dynamic(() => import("../pedido-catalogo/tienda-en-pedido").then((m) => m.TiendaEnPedido), { ssr: false });

/** Sin sesión de Supabase (cookie) no se carga nada de la tienda al abrir. */
function hayCookieDeSesion(): boolean {
  try {
    return /(^|;\s*)sb-[^=]*auth-token/.test(document.cookie);
  } catch {
    return false;
  }
}

const FINALES = new Set(["cancelado", "vencido"]);
export function PedidoComprador({
  codigo,
  demo,
  inicial,
  inicialCatalogo = null,
  errorInicial = false,
}: {
  codigo: string;
  demo: boolean;
  inicial: VistaSolicitud | null;
  inicialCatalogo?: CatalogoPublico | null;
  errorInicial?: boolean;
}) {
  const [s, setS] = useState(inicial);
  const [catalogo, setCatalogo] = useState(inicialCatalogo);
  const [cargando, setCargando] = useState(demo);
  const [falloLectura, setFalloLectura] = useState(errorInicial);
  const [intentoLectura, setIntentoLectura] = useState(0);
  const [i, setI] = useState(0);
  const [pausa, setPausa] = useState(false);
  const [error, setError] = useState("");
  const [preparando, setPreparando] = useState(false);
  const hold = useRef<ReturnType<typeof setTimeout> | null>(null);
  const held = useRef(false);
  const [catalogoAnterior, setCatalogoAnterior] = useState<string | null>(null);
  useEffect(() => {
    let valido = true;
    if (demo || intentoLectura > 0)
      fuentePublica(demo)
        .then((f) => f.verSolicitud(codigo))
        .then((s) => {
          if (valido) {
            setS(s);
            setCargando(false);
            setFalloLectura(false);
            if(s) fuentePublica(demo).then(f=>f.catalogoPublico(s.tienda.slug)).then(c=>{if(valido)setCatalogo(c);}).catch(()=>{});
          }
        })
        .catch(() => {
          if (valido) { setCargando(false); setFalloLectura(true); }
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
  }, [codigo, demo, intentoLectura]);
  // El estado cambia cuando la tienda lo registra o lo despacha: se vuelve a leer al volver a la pestaña, al recuperar el foco
  // y, mientras se ve la página, cada 45 s (sin Realtime ni anillo). Lo ya final (cancelado o vencido) no se sigue leyendo.
  const estadoActual = s?.estado;
  useEffect(() => {
    if (estadoActual && FINALES.has(estadoActual)) return;
    let vivo = true;
    let ultima = Date.now();
    const releer = () => {
      if (document.visibilityState !== "visible" || Date.now() - ultima < 5_000) return;
      ultima = Date.now();
      fuentePublica(demo)
        .then((f) => f.verSolicitud(codigo))
        .then((nueva) => {
          if (vivo && nueva) setS(nueva);
        })
        .catch(() => {});
    };
    const reloj = window.setInterval(releer, 45_000);
    document.addEventListener("visibilitychange", releer);
    window.addEventListener("focus", releer);
    return () => {
      vivo = false;
      window.clearInterval(reloj);
      document.removeEventListener("visibilitychange", releer);
      window.removeEventListener("focus", releer);
    };
  }, [codigo, demo, estadoActual]);

  // ¿Es la tienda? Solo con sesión (o en la demo, si lo pide): la vista de la tienda se monta encima, sin frenar al comprador.
  const [tienda, setTienda] = useState<"no" | "comprobar" | "entrar">("no");
  useEffect(() => {
    if (demo) return;
    if (hayCookieDeSesion() || new URLSearchParams(location.search).has("error_login")) queueMicrotask(() => setTienda("comprobar"));
  }, [demo]);

  const enlace = s
    ? `/tienda/${s.tienda.slug}${demo ? "?demo" : ""}`
    : catalogoAnterior;
  const volver = () => {
    if (enlace) location.href = enlace;
    else history.back();
  };
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      // Con la hoja de la tienda abierta, las teclas son de la hoja.
      if (document.querySelector('[role="dialog"]')) return;
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
  const indice = Math.min(i, Math.max(0, (s?.items.length ?? 1) - 1));
  const item = s?.items[indice];
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
      <div id="pvBg" className={"pvov" + (tienda !== "no" ? " tienda-abierta" : "")}>
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
                  className={"pvslide" + (j === indice ? " on" : "")}
                  src={p.foto ?? undefined}
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
                    key={j + "-" + indice}
                    className={j < indice ? "done" : j === indice ? "run" : ""}
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
                  {indice + 1} de {s.items.length}
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
                    Ver {nombres.singular} <span style={{ display: "inline-flex", transform: "scaleX(-1)" }}><Icono nombre="back" /></span>
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
              <section className="pvsheet" aria-labelledby="pvest-titulo">
                <EstadoDelPedido vista={s} />
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
                <p className="pvest-tienda">
                  ¿Eres la tienda?{" "}
                  <button type="button" onClick={() => setTienda("entrar")}>
                    Entra para registrarlo
                  </button>
                </p>
              </section>
            </>
          ) : (
            <>
              <div className="pvcap static">
                <h2>
                  {cargando
                    ? "Abriendo tu pedido…"
                    : falloLectura
                      ? "No pudimos abrir tu pedido"
                      : s?.estado === "vencido"
                      ? "Este pedido venció"
                      : "Este pedido no está disponible"}
                </h2>
                <p className="pvgonep">
                  {!cargando &&
                    (falloLectura ? "Revisa la conexión y vuelve a intentarlo. Tu enlace sigue aquí." : s?.estado === "vencido"
                      ? "Nadie lo registró en 7 días. Si todavía te interesa, vuélvelo a armar."
                      : s
                        ? "Puedes volver al catálogo y armarlo otra vez."
                        : "Revisa el enlace o pídele a quien te lo mandó que lo envíe de nuevo.")}
                </p>
              </div>
              <div className="pvsheet">
                {falloLectura && <button className="pvbtn pri wide" onClick={() => { setCargando(true); setIntentoLectura(n => n + 1); }}>Reintentar</button>}
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
      {tienda !== "no" && s && (
        <TiendaEnPedido
          codigo={s.codigo}
          demo={demo}
          pedirEntrar={tienda === "entrar"}
          alCerrar={() => setTienda("no")}
          alCambiarEstado={(nueva) => setS(nueva)}
        />
      )}
    </div>
  );
}

const PASOS = ["Enviado", "Confirmado", "Despachado"] as const;

/** La cabecera de la hoja: punto y estado como título, total, la línea corta y la barra de tres tramos (Estados). */
function EstadoDelPedido({ vista }: { vista: VistaSolicitud }) {
  const e = estadoComprador(vista);
  const cancelado = e.estado === "cancelado";
  return (
    <div className={"pvest " + e.estado}>
      <div className="pvest-fila">
        <h2 id="pvest-titulo">{e.titulo}</h2>
        <b className="pvest-total">{dinero(vista.total)}</b>
      </div>
      <p className="pvest-linea">{e.linea}</p>
      <ol className="pvest-pasos" aria-label={cancelado ? "Pedido cancelado" : `Paso ${e.paso} de 3: ${PASOS[e.paso - 1]}`}>
        {PASOS.map((paso, n) => (
          <li
            key={paso}
            className={(n < e.paso ? "lleno" : "") + (n === e.paso - 1 ? " actual" : "")}
            aria-current={n === e.paso - 1 ? "step" : undefined}
          >
            {cancelado ? <span className="sr-only">{paso}</span> : paso}
          </li>
        ))}
      </ol>
    </div>
  );
}
