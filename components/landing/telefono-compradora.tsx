"use client";
// El teléfono de Ana en la demo de la landing (app/demo-landing/compradora, dentro de un iframe). Son los componentes REALES del
// catálogo con los datos de ejemplo (lib/landing/db-demo.ts): el Reel con su «Lo quiero» (aaah + burst), la bolsa (#bagDock) y su
// barra (#cartbar), la hoja «Tu pedido» y el enlace del pedido (PedidoComprador en modo ilustración). Solo WhatsApp se dibuja.
// Nada se guarda, nada sale a la red: el carrito vive en el estado de esta página.

import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { flushSync } from "react-dom";
import type { ProductoPublico } from "@/lib/types";
import { lineaDe, type LineaLocal } from "@/lib/tienda/carrito";
import { temaDeTienda } from "@/lib/tienda/tema";
import { transformarPedido, volarPedido } from "@/lib/tienda/movimiento";
import { NOMBRE_PRODUCTO } from "@/lib/rubros";
import { catalogoDemo, dbBase, vistaSolicitudDemo } from "@/lib/landing/db-demo";
import { indicePaso } from "@/lib/landing/pasos";
import { Reel } from "../tienda/reel";
import { Icono } from "../tienda/iconos";
import { BarraPedido, BotonPedido } from "../tienda/bolsa";
import { HojaPedido } from "../tienda/hojas-compra";
import { PedidoComprador } from "../tienda/pedido-comprador";
import { ChatWhatsApp } from "./whatsapp";
import { cajaDelTexto, esperar, porTexto, tocar, tocarYPulsar, useAnclas, usePasoDeLaLanding } from "./telefono-iframe";

type Pantalla = "catalogo" | "chat" | "pedido";

// Con scrollTo del iframe y no scrollIntoView: scrollIntoView también movería la página de la landing que lo contiene.
const irAlReel = (slug: string, suave: boolean) => {
  const reel = document.getElementById("r-" + slug);
  if (reel) window.scrollTo({ top: reel.getBoundingClientRect().top + window.scrollY, behavior: suave ? "smooth" : "auto" });
};
type Estado = { actual: string; carrito: string[]; hoja: boolean; pantalla: Pantalla; enviado: boolean };

const P = {
  pasa: indicePaso("pasa"),
  termo: indicePaso("aaah-termo"),
  tote: indicePaso("aaah-tote"),
  bolsa: indicePaso("bolsa"),
  whatsapp: indicePaso("whatsapp"),
  seguimiento: indicePaso("seguimiento"),
};

/** Cómo queda el teléfono de Ana al terminar un paso (para llegar sin animación: al abrir, al saltar o al volver). */
function estadoEn(paso: number): Estado {
  const actual = paso >= P.tote ? "tote" : paso >= P.pasa ? "termo" : "gorra";
  const carrito = paso >= P.tote ? ["termo", "tote"] : paso >= P.termo ? ["termo"] : [];
  const pantalla: Pantalla = paso >= P.seguimiento ? "pedido" : paso >= P.whatsapp ? "chat" : "catalogo";
  return { actual, carrito, hoja: paso === P.bolsa, pantalla, enviado: paso >= P.whatsapp };
}

export function TelefonoCompradora() {
  const [datos] = useState(() => {
    const db = dbBase();
    return { c: catalogoDemo(db), vista: vistaSolicitudDemo(db) };
  });
  const { c, vista } = datos;
  const t = c.tienda;
  const tema = temaDeTienda(t);
  const [estado, setEstado] = useState<Estado>(() => estadoEn(0));
  const [bar, setBar] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const paso = useRef(0);

  const lineas: LineaLocal[] = estado.carrito.map((slug) => lineaDe(c.productos.find((p) => p.slug === slug)!, null));
  const total = lineas.reduce((s, l) => s + l.precioUnitario * l.cantidad, 0);
  const nombres = NOMBRE_PRODUCTO[t.rubro];

  // El tamaño del reel, como en el catálogo y en «Así se ve» (components/tienda/vista-previa-reel.tsx).
  useLayoutEffect(() => {
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
        "--bagR": (vw - W) / 2 + 6 + "px",
        "--bagT": pt + H - 70 - 12 + "px",
        // (los mismos valores que el catálogo en un teléfono)
      };
      for (const [k, v] of Object.entries(vars)) el.style.setProperty(k, v);
      html.style.scrollPaddingTop = pt + "px";
      html.style.scrollPaddingBottom = pb + "px";
      irAlReel(estado.actual, false);
    };
    layout();
    window.addEventListener("resize", layout);
    return () => window.removeEventListener("resize", layout);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // El mismo «elegir» del catálogo (components/tienda/catalogo.tsx), sin guardar el carrito ni contar el aaah en la base.
  const elegir = (p: ProductoPublico, on?: boolean) => {
    const ya = estado.carrito.includes(p.slug);
    const agregar = on ?? !ya;
    if (agregar && !ya) setBar(true);
    setEstado((e) => ({ ...e, carrito: agregar ? (e.carrito.includes(p.slug) ? e.carrito : [...e.carrito, p.slug]) : e.carrito.filter((s) => s !== p.slug) }));
  };
  const like = (slug: string) => document.querySelector(`#r-${slug} [data-like]`);

  usePasoDeLaLanding(async (destino, animar, vigente) => {
    const desde = paso.current;
    paso.current = destino;
    const fijo = () => {
      const e = estadoEn(destino);
      setBar(false);
      flushSync(() => setEstado(e));
      irAlReel(e.actual, false);
    };
    if (!animar || Math.abs(destino - desde) !== 1) return fijo();
    if (destino > desde) {
      // Hacia delante: lo mismo que haría Ana, con los botones reales.
      if (destino === P.pasa) {
        setEstado((e) => ({ ...e, actual: "termo" }));
        irAlReel("termo", true);
      } else if (destino === P.termo) {
        await esperar(250);
        if (!vigente()) return;
        await tocarYPulsar(like("termo"));
        await esperar(1100);
        if (!vigente()) return;
        await volarPedido();
        if (vigente()) setBar(false);
      } else if (destino === P.tote) {
        setEstado((e) => ({ ...e, actual: "tote" }));
        irAlReel("tote", true);
        await esperar(650);
        if (!vigente()) return;
        await tocarYPulsar(like("tote"));
        await esperar(900);
        if (!vigente()) return;
        await volarPedido();
        if (vigente()) setBar(false);
      } else if (destino === P.bolsa) {
        await tocarYPulsar(document.querySelector("#bagDock button"), 280);
        if (!vigente()) return;
        flushSync(() => setEstado((e) => ({ ...e, hoja: true })));
        transformarPedido();
      } else if (destino === P.whatsapp) {
        tocar(porTexto("#orBg button", /Enviar por WhatsApp/));
        await esperar(380);
        if (!vigente()) return;
        setEstado((e) => ({ ...e, hoja: false, pantalla: "chat", enviado: false }));
        await esperar(520);
        if (!vigente()) return;
        tocar(document.querySelector("[data-enviar-wa]"));
        await esperar(260);
        if (vigente()) setEstado((e) => ({ ...e, enviado: true }));
      } else if (destino === P.seguimiento) {
        tocar(document.querySelector("[data-vista-previa]"));
        await esperar(320);
        if (vigente()) setEstado((e) => ({ ...e, pantalla: "pedido" }));
      } else fijo();
      return;
    }
    // Hacia atrás: se deshace lo último, también con los botones reales cuando se puede.
    if (desde === P.pasa) {
      setEstado((e) => ({ ...e, actual: "gorra" }));
      irAlReel("gorra", true);
    } else if (desde === P.termo) {
      await tocarYPulsar(like("termo"), 120);
      setBar(false);
    } else if (desde === P.tote) {
      await tocarYPulsar(like("tote"), 120);
      setBar(false);
      await esperar(250);
      if (!vigente()) return;
      setEstado((e) => ({ ...e, actual: "termo" }));
      irAlReel("termo", true);
    } else if (desde === P.bolsa) setEstado((e) => ({ ...e, hoja: false }));
    else fijo();
  });

  useAnclas((id) => {
    if (id === "burst-termo") return { el: document.querySelector("#r-termo .burst"), w: 130 };
    if (id === "bolsa") return { el: document.querySelector("#bagDock button .cnt") ?? document.querySelector("#bagDock button"), w: 30 };
    if (id === "tu-pedido") {
      const h = document.querySelector("#orBg .wawho h2");
      const caja = cajaDelTexto(h);
      return { el: h, caja, w: 26, dx: caja ? caja.width / 2 + 22 : 0 };
    }
    if (id === "chat") return { el: document.querySelector('[data-ancla="chat"]'), w: 34 };
    if (id === "seguimiento") {
      const h = document.querySelector("#pvest-titulo");
      const caja = cajaDelTexto(h);
      return { el: h, caja, w: 26, dx: caja ? caja.width / 2 + 20 : 0 };
    }
    return null;
  });

  const estilo = {
    ...Object.fromEntries(Object.entries(tema.colores).map(([k, v]) => ["--" + k, v])),
    "--display": `"${tema.fuentes.display === "Figtree" ? "DZ Figtree" : tema.fuentes.display === "Fredoka" ? "DZ Fredoka" : tema.fuentes.display}",Georgia,serif`,
    "--body": `"${tema.fuentes.body === "Figtree" ? "DZ Figtree" : tema.fuentes.body}",system-ui,sans-serif`,
    "--iso": `url("${t.fotoPerfilUrl ?? t.logoUrl ?? ""}")`,
  } as CSSProperties;
  const nada = () => {};

  return (
    <>
      <div className="catalogo-publico view-reels" ref={root} style={estilo} data-telefono="compradora" data-pantalla={estado.pantalla}>
        <header className="hdr">
          <button className="hback" aria-label="Volver" tabIndex={-1}>
            <Icono nombre="back" />
          </button>
          <button className="logo" aria-label={t.nombre} tabIndex={-1}>
            <span className="nombre-cabecera">{t.nombre}</span>
          </button>
          <button className="help" aria-label="Cómo usar la página" tabIndex={-1}>
            <Icono nombre="help" />
          </button>
          <button className="hsearch" aria-label="Buscar" tabIndex={-1}>
            <Icono nombre="search" />
          </button>
        </header>
        <main className="reels" id="reels" aria-label="Productos">
          {c.productos.map((p, i) => (
            <Reel
              key={p.id}
              p={p}
              t={t}
              i={i}
              activo={estado.actual === p.slug}
              anterior={c.productos[i + 1]?.slug === estado.actual}
              siguiente={c.productos[i - 1]?.slug === estado.actual}
              cantidadPedido={lineas.length}
              seleccionado={() => estado.carrito.includes(p.slug)}
              elegir={(_, on) => elegir(p, on)}
              eleccion={null}
              abrirPresentaciones={nada}
              abrirFicha={nada}
              registrarBurst={nada}
              conVistaEnfocada={false}
              perfil={nada}
              opiniones={nada}
              avisar={nada}
              compartir={nada}
              pausado
            />
          ))}
        </main>
        <BotonPedido cantidad={lineas.length} oculto={false} abrir={nada} />
        {bar && lineas.length > 0 && (
          <BarraPedido
            t={t}
            cantidad={lineas.length}
            total={total}
            nombre={{ singular: nombres.singular, lista: nombres.plural }}
            conChat
            enviando={false}
            abrir={nada}
            enviar={nada}
            cerrarChat={() => setBar(false)}
          />
        )}
        {estado.hoja && <HojaPedido t={t} lineas={lineas} cerrar={nada} quitar={nada} ver={nada} enviar={nada} enviando={false} />}
      </div>
      <div className="dz-pantalla" data-visible={estado.pantalla === "chat" ? "" : undefined}>
        <ChatWhatsApp sale enviado={estado.enviado} />
      </div>
      <div className="dz-pantalla" data-visible={estado.pantalla === "pedido" ? "" : undefined}>
        {estado.pantalla === "pedido" && <PedidoComprador codigo={vista.codigo} demo={false} inicial={vista} inicialCatalogo={c} ilustracion />}
      </div>
    </>
  );
}
