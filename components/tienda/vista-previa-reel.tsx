"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { CatalogoPublico, ProductoPublico } from "@/lib/types";
import { temaDeTienda } from "@/lib/tienda/tema";
import { portada } from "@/lib/tienda/catalogo";
import { Reel } from "./reel";
import { Icono } from "./iconos";
import { colorDePortada } from "./medios";

/** Lo que el panel le manda a esta vista (mismo sitio, por `postMessage`). */
export type DatosVistaPrevia = { tienda: CatalogoPublico["tienda"]; producto: ProductoPublico };
export const MENSAJE_VISTA_PREVIA = "deslizapp-vista-previa";
export const AVISO_VISTA_PREVIA = "Así lo verá tu cliente";

/**
 * «Cómo se ve» (docs/prompts/presentaciones-por-pasos.md §8): el MISMO reel del catálogo del comprador (`reel.tsx`, `catalogo.css`,
 * el tema y la cabecera de la tienda) alimentado con el borrador de la hoja de producto. Vive en su propia página porque el
 * catálogo se desplaza como un documento entero: dentro de un iframe del panel no se pisan los estilos ni el scroll. Sin pedir, sin
 * carrito y sin escribir nada: los botones de comprar se ven y solo avisan.
 */
export function VistaPreviaReel() {
  const [datos, setDatos] = useState<DatosVistaPrevia | null>(null);
  const [toast, setToast] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const aviso = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [tinteOscuro, setTinteOscuro] = useState(false);

  useEffect(() => {
    const alMensaje = (e: MessageEvent) => {
      if (e.origin !== location.origin || e.data?.tipo !== MENSAJE_VISTA_PREVIA) return;
      setDatos(e.data.datos as DatosVistaPrevia);
    };
    window.addEventListener("message", alMensaje);
    window.parent.postMessage({ tipo: `${MENSAJE_VISTA_PREVIA}-listo` }, location.origin);
    return () => window.removeEventListener("message", alMensaje);
  }, []);

  const avisar = useCallback((msg: string = AVISO_VISTA_PREVIA) => {
    setToast(msg);
    if (aviso.current) clearTimeout(aviso.current);
    aviso.current = setTimeout(() => setToast(""), 2200);
  }, []);
  useEffect(() => () => { if (aviso.current) clearTimeout(aviso.current); }, []);

  // El tamaño del reel, como en el catálogo (components/tienda/catalogo.tsx): sale del ancho y alto de la pantalla.
  useLayoutEffect(() => {
    if (!datos) return;
    const html = document.documentElement;
    html.classList.add("catalogo-html");
    html.style.overflow = "hidden";
    const layout = () => {
      const el = root.current;
      if (!el) return;
      const vw = html.clientWidth;
      const vh = window.innerHeight;
      const tabs = el.querySelector<HTMLElement>(".htabs");
      const tb = 24 + (tabs?.offsetTop ?? 40) + (tabs?.offsetHeight ?? 30);
      const peek = vh < 700 ? 36 : 52;
      const top = Math.max(54, tb) + peek;
      const H = Math.max(260, Math.min(vw * 1.25, vh - top - peek, 760));
      const W = Math.min(vw, H / 1.25);
      const extra = Math.max(0, vh - top - peek - H);
      const pt = top + extra / 2;
      const pb = peek + extra / 2;
      const vars: Record<string, string> = {
        "--W": W + "px",
        "--H": H + "px",
        "--pt": pt + 72 + "px",
        "--pb": pb + 160 + "px",
        "--vh": vh + "px",
        "--run": "72px",
        "--glowH": 72 + pt + H * 0.35 + "px",
        "--bagR": (vw - W) / 2 + (vw >= 900 ? -80 : 6) + "px",
        "--bagT": pt + H - 70 - (vw >= 900 ? 0 : 12) + "px",
      };
      for (const [k, v] of Object.entries(vars)) el.style.setProperty(k, v);
      window.scrollTo(0, 72);
    };
    layout();
    window.addEventListener("resize", layout);
    return () => {
      window.removeEventListener("resize", layout);
      html.classList.remove("catalogo-html");
      html.style.overflow = "";
    };
  }, [datos !== null]); // eslint-disable-line react-hooks/exhaustive-deps

  const slugTienda = datos?.tienda.slug;
  const fotoPortada = datos ? portada(datos.producto) : "";
  useEffect(() => {
    if (!datos) return;
    const tema = temaDeTienda(datos.tienda);
    const t = tema.tintes[datos.producto.slug];
    if (t) {
      root.current?.style.setProperty("--tint", t.c);
      return;
    }
    let vigente = true;
    if (fotoPortada)
      colorDePortada(fotoPortada).then((c) => {
        if (c && vigente) {
          root.current?.style.setProperty("--tint", c.c);
          setTinteOscuro(c.dark);
        }
      });
    return () => { vigente = false; };
  }, [slugTienda, fotoPortada]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!datos) return <div className="catalogo-publico catalogo-vacio"><p>Armando la vista…</p></div>;
  const { tienda: t, producto: p } = datos;
  const tema = temaDeTienda(t);
  const estilo = {
    ...Object.fromEntries(Object.entries(tema.colores).map(([k, v]) => ["--" + k, v])),
    "--display": `"${tema.fuentes.display === "Figtree" ? "DZ Figtree" : tema.fuentes.display === "Fredoka" ? "DZ Fredoka" : tema.fuentes.display}",Georgia,serif`,
    "--body": `"${tema.fuentes.body === "Figtree" ? "DZ Figtree" : tema.fuentes.body}",system-ui,sans-serif`,
    "--iso": `url("${t.fotoPerfilUrl ?? t.logoUrl ?? ""}")`,
  } as CSSProperties;
  return (
    <div className={"catalogo-publico view-reels" + (tinteOscuro ? " tint-dark" : "")} ref={root} style={estilo} data-vista-previa-reel="">
      <header className="hdr">
        <button className="hback" aria-label="Volver" onClick={() => avisar()}><Icono nombre="back" /></button>
        <button className="logo" aria-label={t.nombre + ", ir al perfil"} onClick={() => avisar()}>
          {tema.cabecera ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className="wm"
              alt={t.nombre}
              src={
                "data:image/svg+xml;charset=utf-8," +
                encodeURIComponent(
                  tema.cabecera
                    .replace(/var\(--logo1\)/g, "#fff")
                    .replace(/var\(--logo2\)/g, "#fff")
                    .replace(/var\(--logod\)/g, "#E8C98F"),
                )
              }
            />
          ) : (
            <span className="nombre-cabecera">{t.nombre}</span>
          )}
        </button>
        <button className="help" aria-label="Cómo usar la página" onClick={() => avisar()}><Icono nombre="help" /></button>
        <button className="hsearch" aria-label="Buscar" onClick={() => avisar()}><Icono nombre="search" /></button>
        <nav className="htabs" aria-label="Qué ver">
          <button className="htab" data-tab="new" aria-pressed="true" onClick={() => avisar()}>Novedades</button>
          <button className="htab" data-tab="col" aria-pressed="false" onClick={() => avisar()}><span>Colecciones</span></button>
        </nav>
      </header>
      <main className="reels" id="reels" aria-label="Productos">
        {fotoPortada && (
          <div className="glow" aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={fotoPortada} alt="" />
          </div>
        )}
        <Reel
          p={p}
          t={t}
          i={0}
          n={1}
          activo
          anterior={false}
          siguiente={false}
          cantidadPedido={0}
          seleccionado={() => false}
          elegir={() => avisar()}
          eleccion={null}
          abrirPresentaciones={() => avisar()}
          abrirFicha={() => avisar()}
          registrarBurst={() => {}}
          perfil={() => avisar()}
          opiniones={() => avisar()}
          avisar={() => avisar()}
          compartir={() => avisar()}
        />
      </main>
      {toast && <div className="dztoast on" role="status">{toast}</div>}
    </div>
  );
}
