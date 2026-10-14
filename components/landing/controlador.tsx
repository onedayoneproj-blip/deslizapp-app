"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { DEDO_LLEGA, MENSAJE_LISTO, MENSAJE_PASO, MENSAJE_TOQUE, MENSAJE_VIAJE, PASOS, estadoPaso, type IdAncla, type IdTelefono, type MensajeDedo } from "@/lib/landing/pasos";

const REDUCIDO = "(prefers-reduced-motion: reduce)";
/** El ♥ mide esto sin escalar (landing.css .lt-hilo). */
const BASE_HILO = 100;
/** Cuánto se queda el ♥ después del pulso antes de irse (más en «Despachar», que se vuelve check). */
const QUEDA = 650;
const QUEDA_CHECK = 1300;
const VIAJE = 700;

type Punto = { x: number; y: number };

/**
 * La demo por pasos (referencias/landing/ajustes-lewis-2.md §3). Cada paso es una sección de la página con scroll-snap: al
 * llegar a una, este controlador la marca como activa (IntersectionObserver), le dice el paso a los dos teléfonos (iframes,
 * app/demo-landing) y mueve las burbujas, el fondo y el ♥. La animación de cada paso tiene su propio tiempo: siempre termina.
 * Al subir, lo mismo hacia atrás.
 */
export function DemoPasos({ children, pasos }: { children: ReactNode; pasos: ReactNode }) {
  const seccion = useRef<HTMLElement>(null);
  const escenario = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const raiz = document.documentElement;
    raiz.setAttribute("data-landing-js", "");
    const s = seccion.current;
    const e = escenario.current;
    if (!s || !e) return;
    const reducido = window.matchMedia(REDUCIDO);
    const marcos: Record<IdTelefono, HTMLIFrameElement | null> = {
      compradora: e.querySelector<HTMLIFrameElement>('iframe[data-telefono="compradora"]'),
      tienda: e.querySelector<HTMLIFrameElement>('iframe[data-telefono="tienda"]'),
    };
    const hilo = e.querySelector<HTMLElement>("[data-hilo]");
    const pulso = e.querySelector<HTMLElement>("[data-hilo-pulso]");
    const burbujas = [...e.querySelectorAll<HTMLElement>("[data-burbuja]")];
    const capitulos = [...e.querySelectorAll<HTMLElement>("[data-indice-capitulo]")];
    let activo = -1;
    let raf = 0;
    let irse = 0;
    let posicion: Punto | null = null;

    const mandar = (telefono: IdTelefono, paso: number, animar: boolean) => {
      marcos[telefono]?.contentWindow?.postMessage({ tipo: MENSAJE_PASO, paso, animar }, location.origin);
    };

    /** Un punto de un teléfono (px de su página de 393 de ancho) en px del escenario. */
    const enEscenario = (telefono: IdTelefono, x: number, y: number): Punto | null => {
      const marco = marcos[telefono];
      if (!marco) return null;
      const caja = marco.getBoundingClientRect();
      const base = e.getBoundingClientRect();
      const esc = caja.width / 393;
      return { x: caja.left - base.left + x * esc, y: caja.top - base.top + y * esc };
    };
    /** Dónde está un ancla de un viaje, en px del escenario. */
    const ancla = (telefono: IdTelefono, id: IdAncla): Punto | null => {
      let r = null;
      try {
        r = marcos[telefono]?.contentWindow?.__dzAncla?.(id) ?? null;
      } catch {
        r = null;
      }
      return r ? enEscenario(telefono, r.x, r.y) : null;
    };
    const tamano = () => Math.min(58, Math.max(38, Math.min(e.clientWidth, e.clientHeight) * 0.07));
    const poner = (p: Punto, escala = 1) => {
      posicion = p;
      const t = tamano() * escala;
      if (hilo) hilo.style.transform = `translate(${(p.x - BASE_HILO / 2).toFixed(1)}px, ${(p.y - BASE_HILO / 2).toFixed(1)}px) scale(${(t / BASE_HILO).toFixed(3)})`;
    };
    const esconder = () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(irse);
      if (hilo) hilo.dataset.visible = "no";
      posicion = null;
    };

    /** Lleva el ♥ desde donde está (o desde un poco más abajo, si no estaba) hasta `destino`, en `ms`, con un arco suave. */
    const llevar = (destino: () => Punto | null, ms: number, alLlegar: () => void, desde?: Punto | null) => {
      cancelAnimationFrame(raf);
      window.clearTimeout(irse);
      const b0 = destino();
      if (!hilo || !b0) return;
      const t0 = tamano();
      const origen = desde ?? (hilo.dataset.visible === "si" && posicion ? posicion : { x: b0.x + t0 * 0.7, y: b0.y + t0 * 1.6 });
      hilo.dataset.visible = "si";
      const inicio = performance.now();
      const cuadro = (ahora: number) => {
        const b = destino() ?? b0;
        const t = Math.min(1, (ahora - inicio) / ms);
        const k = t * t * (3 - 2 * t);
        const arco = Math.sin(Math.PI * k) * Math.min(90, Math.hypot(b.x - origen.x, b.y - origen.y) * 0.2);
        poner({ x: origen.x + (b.x - origen.x) * k, y: origen.y + (b.y - origen.y) * k - arco }, 1 + 0.25 * Math.sin(Math.PI * k));
        if (t < 1) raf = requestAnimationFrame(cuadro);
        else alLlegar();
      };
      raf = requestAnimationFrame(cuadro);
    };

    /** Un toque: el ♥ llega, hace el pulso (un círculo que se abre) y se va. En «Despachar», se vuelve check. */
    const toque = (p: Punto) => {
      llevar(() => p, DEDO_LLEGA - 40, () => {
        e.dataset.toques = String(Number(e.dataset.toques ?? 0) + 1);
        const check = PASOS[activo]?.id === "despachar";
        if (check) e.dataset.check = "si";
        pulso?.animate([{ opacity: 0.9, transform: "scale(.6)" }, { opacity: 0, transform: "scale(2.4)" }], { duration: 560, easing: "cubic-bezier(.2,.8,.2,1)" });
        irse = window.setTimeout(esconder, check ? QUEDA_CHECK : QUEDA);
      });
    };
    /** Un viaje: el ♥ lleva el pedido hasta `destino` y se desvanece al llegar. */
    const viaje = (destino: () => Punto | null, desde?: Punto | null) =>
      llevar(destino, VIAJE, () => {
        e.dataset.viajes = String(Number(e.dataset.viajes ?? 0) + 1);
        esconder();
      }, desde);

    // El teléfono de la tienda se carga cuando hace falta (o un momento después de abrir), no al primer pintado.
    const cargarTienda = () => {
      const m = marcos.tienda;
      if (m && !m.getAttribute("src")) m.setAttribute("src", m.dataset.src ?? "");
    };

    const activar = (i: number) => {
      if (i === activo) return;
      const desde = activo;
      activo = i;
      const animar = !reducido.matches && desde >= 0;
      const paso = PASOS[i]!;
      const est = estadoPaso(i);
      Object.assign(e.dataset, {
        paso: paso.id,
        indice: String(i),
        lado: paso.lado,
        telefono: paso.telefono,
        bolsa: String(est.bolsa),
        total: String(est.total),
        codigo: est.codigoVisible ? "si" : "no",
        check: "no",
        capitulo: String(paso.capitulo),
      });
      capitulos.forEach((c) => {
        const n = Number(c.dataset.indiceCapitulo);
        c.dataset.estado = n === paso.capitulo ? "actual" : n < paso.capitulo ? "visto" : "falta";
        if (n === paso.capitulo) c.setAttribute("aria-current", "step");
        else c.removeAttribute("aria-current");
      });
      burbujas.forEach((b, j) => (b.dataset.estado = j === i ? "actual" : j === i - 1 ? "pasada" : j < i ? "lejos" : "futura"));
      if (i >= 4) cargarTienda();
      mandar("compradora", i, animar);
      mandar("tienda", i, animar);
      // El ♥ solo aparece cuando hace algo: con cada toque que avisa un teléfono, o en el viaje de un teléfono al otro.
      esconder();
      if (animar && paso.dedo === "viaje" && paso.viaje && i === desde + 1) {
        const { desde: [td, ad], hasta: [th, ah] } = paso.viaje;
        const salida = ancla(td, ad);
        irse = window.setTimeout(() => viaje(() => ancla(th, ah), salida), 450);
      }
    };
    const espera = window.setTimeout(cargarTienda, 2500);

    // Cuando un teléfono termina de cargar, se pone en el paso actual sin animación.
    const alMensaje = (ev: MessageEvent) => {
      if (ev.origin !== location.origin || ev.data?.tipo !== MENSAJE_LISTO) return;
      const telefono = (Object.keys(marcos) as IdTelefono[]).find((k) => marcos[k]?.contentWindow === ev.source);
      if (telefono && activo >= 0) mandar(telefono, activo, false);
    };
    // Un teléfono va a tocar algo, o lleva el pedido a un sitio: el ♥ va hasta ahí. Con movimiento reducido, no hay ♥.
    const alDedo = (ev: MessageEvent) => {
      const d = ev.data as MensajeDedo | undefined;
      if (ev.origin !== location.origin || (d?.tipo !== MENSAJE_TOQUE && d?.tipo !== MENSAJE_VIAJE) || reducido.matches) return;
      const telefono = (Object.keys(marcos) as IdTelefono[]).find((k) => marcos[k]?.contentWindow === ev.source);
      if (!telefono || telefono !== PASOS[activo]?.telefono) return;
      const p = enEscenario(telefono, d.x, d.y);
      if (!p) return;
      if (d.tipo === MENSAJE_TOQUE) toque(p);
      else viaje(() => p);
    };
    window.addEventListener("message", alDedo);
    window.addEventListener("message", alMensaje);

    // El paso activo: la sección que ocupa la pantalla. Un deslizamiento fuerte no se salta pasos: scroll-snap-stop lo frena
    // en el navegador y, si alguno lo deja pasar, aquí se vuelve al paso siguiente. Los enlaces («Saltar», «Ver la demo otra
    // vez») sí saltan.
    const secciones = [...s.querySelectorAll<HTMLElement>("[data-paso-seccion]")];
    let saltando = 0;
    const alClic = (ev: MouseEvent) => {
      if ((ev.target as Element | null)?.closest?.('a[href^="#"]')) saltando = Date.now();
    };
    document.addEventListener("click", alClic, true);
    const obs = new IntersectionObserver(
      (entradas) => {
        for (const en of entradas) {
          if (!en.isIntersecting) continue;
          const i = Number((en.target as HTMLElement).dataset.pasoSeccion);
          // Solo frena saltos cortos (2 o 3 pasos, lo que deja pasar un deslizamiento fuerte); los largos son a propósito (Inicio, Fin).
          if (activo >= 0 && Math.abs(i - activo) > 1 && Math.abs(i - activo) <= 3 && Date.now() - saltando > 1500) {
            const siguiente = activo + Math.sign(i - activo);
            secciones[siguiente]?.scrollIntoView({ behavior: "instant" });
            activar(siguiente);
          } else activar(i);
        }
      },
      { threshold: 0.55 },
    );
    secciones.forEach((x) => obs.observe(x));
    window.addEventListener("resize", esconder);
    return () => {
      obs.disconnect();
      window.clearTimeout(espera);
      esconder();
      window.removeEventListener("message", alMensaje);
      window.removeEventListener("message", alDedo);
      window.removeEventListener("resize", esconder);
      document.removeEventListener("click", alClic, true);
      raiz.removeAttribute("data-landing-js");
    };
  }, []);

  return (
    <section ref={seccion} id="demo" aria-label="Demo: un pedido de principio a fin" className="landing-demo">
      <div
        ref={escenario}
        className="lt-escenario"
        data-paso={PASOS[0]!.id}
        data-indice="0"
        data-lado="compras"
        data-telefono="compradora"
        data-bolsa="0"
        data-total="0"
        data-codigo="no"
        data-check="no"
        data-capitulo="1"
        data-toques="0"
        data-viajes="0"
      >
        {children}
      </div>
      {pasos}
    </section>
  );
}
