"use client";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { temaDeTienda } from "@/lib/tienda/tema";
import { portada } from "@/lib/tienda/catalogo";
import type { ProductoPublico } from "@/lib/types";
import { Reel } from "../tienda/reel";
import { colorDePortada } from "../tienda/medios";
import { AVISO_VISTA_PREVIA, MENSAJE_VISTA_PREVIA, type DatosVistaPrevia } from "../tienda/vista-previa-reel";

/**
 * «Así se ve en tu catálogo» de la historia de crear producto: SOLO el reel del comprador (`components/tienda/reel.tsx`, con
 * `catalogo.css` y el tema de la tienda), sin la cabecera ni las pestañas del catálogo, llenando el marco 4:5 donde lo monta el
 * panel (un iframe del mismo sitio, como «Vista previa»). Recibe el borrador por `postMessage`; nada se pide ni se escribe.
 */
export function ReelSolo() {
  const [producto, setProducto] = useState<{ datos: DatosVistaPrevia; p: ProductoPublico } | null>(null);
  const [toast, setToast] = useState("");
  const aviso = useRef<ReturnType<typeof setTimeout> | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const [tinteOscuro, setTinteOscuro] = useState(false);

  useEffect(() => {
    const alMensaje = (e: MessageEvent) => {
      if (e.origin !== location.origin || e.data?.tipo !== MENSAJE_VISTA_PREVIA) return;
      const d = e.data.datos as DatosVistaPrevia;
      if ("producto" in d) setProducto({ datos: d, p: d.producto });
    };
    window.addEventListener("message", alMensaje);
    window.parent.postMessage({ tipo: `${MENSAJE_VISTA_PREVIA}-listo` }, location.origin);
    return () => window.removeEventListener("message", alMensaje);
  }, []);
  useEffect(() => {
    const html = document.documentElement;
    html.classList.add("catalogo-html");
    html.style.overflow = "hidden";
    return () => {
      html.classList.remove("catalogo-html");
      html.style.overflow = "";
    };
  }, []);

  const avisar = useCallback(() => {
    setToast(AVISO_VISTA_PREVIA);
    if (aviso.current) clearTimeout(aviso.current);
    aviso.current = setTimeout(() => setToast(""), 2200);
  }, []);
  useEffect(() => () => { if (aviso.current) clearTimeout(aviso.current); }, []);

  // El tinte del fondo sale de la portada, como en el catálogo.
  const foto = producto ? portada(producto.p) : "";
  useEffect(() => {
    if (!foto) return;
    let vigente = true;
    colorDePortada(foto).then((c) => {
      if (c && vigente) {
        root.current?.style.setProperty("--tint", c.c);
        setTinteOscuro(c.dark);
      }
    });
    return () => { vigente = false; };
  }, [foto]);

  if (!producto) return <div className="catalogo-publico catalogo-vacio" />;
  const t = producto.datos.tienda;
  const tema = temaDeTienda(t);
  const estilo = {
    ...Object.fromEntries(Object.entries(tema.colores).map(([k, v]) => ["--" + k, v])),
    "--display": `"${tema.fuentes.display === "Figtree" ? "DZ Figtree" : tema.fuentes.display === "Fredoka" ? "DZ Fredoka" : tema.fuentes.display}",Georgia,serif`,
    "--body": `"${tema.fuentes.body === "Figtree" ? "DZ Figtree" : tema.fuentes.body}",system-ui,sans-serif`,
    "--iso": `url("${t.fotoPerfilUrl ?? t.logoUrl ?? ""}")`,
    // El reel llena el marco (4:5): sin cabecera, sin espacio arriba ni abajo.
    "--W": "100vw",
    "--H": "100vh",
    "--pt": "0px",
    "--pb": "0px",
    "--vh": "100vh",
    "--run": "0px",
    // Sin foto, el fondo del reel es el hueco de la foto del panel (b16), no un gris.
    ...(foto ? {} : { "--tint": "#f3ead9" }),
  } as CSSProperties;
  return (
    <div ref={root} className={"catalogo-publico view-reels reel-solo" + (tinteOscuro ? " tint-dark" : "") + (foto ? "" : " sin-foto")} style={estilo} data-reel-solo="">
      <main className="reels" id="reels" aria-label="Así lo verá tu cliente">
        <Reel
          p={producto.p} t={t} i={0} activo anterior={false} siguiente={false} cantidadPedido={0} seleccionado={() => false}
          elegir={avisar} eleccion={null} abrirPresentaciones={avisar} abrirFicha={avisar} registrarBurst={() => {}}
          perfil={avisar} opiniones={avisar} avisar={avisar} compartir={avisar} conVistaEnfocada={false}
        />
      </main>
      {!foto && (
        // Sin foto (un borrador): el marco lo dice en el centro, como el lienzo; el nombre y el precio siguen abajo.
        <div className="reel-solo-sin-foto" aria-hidden="true" data-reel-sin-foto="">
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1.5-2h6l1.5 2h2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z" />
            <circle cx="12" cy="13" r="3.5" />
          </svg>
          <span>Sin foto</span>
        </div>
      )}
      {toast && <div className="dztoast on" role="status">{toast}</div>}
    </div>
  );
}
