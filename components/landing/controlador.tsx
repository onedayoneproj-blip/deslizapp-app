"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { CAPITULOS, MENSAJE_LISTO, MENSAJE_PASO, PASOS, estadoPaso, type IdAncla, type IdTelefono } from "@/lib/landing/pasos";

const REDUCIDO = "(prefers-reduced-motion: reduce)";
/** El ♥ mide esto sin escalar (landing.css .lt-hilo); su escala sale del tamaño del ancla. */
const BASE_HILO = 100;
const VIAJE_HILO = 750;
const dos = (n: number) => String(n).padStart(2, "0");

type Punto = { x: number; y: number; w: number };

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
    const burbujas = [...e.querySelectorAll<HTMLElement>("[data-burbuja]")];
    const capitulo = e.querySelector<HTMLElement>("[data-capitulo]");
    let activo = -1;
    let raf = 0;
    let posicion: Punto | null = null;

    const mandar = (telefono: IdTelefono, paso: number, animar: boolean) => {
      marcos[telefono]?.contentWindow?.postMessage({ tipo: MENSAJE_PASO, paso, animar }, location.origin);
    };

    /** Dónde está un ancla del ♥, en px del escenario. */
    const ancla = (telefono: IdTelefono, id: IdAncla): Punto | null => {
      const marco = marcos[telefono];
      let r = null;
      try {
        r = marco?.contentWindow?.__dzAncla?.(id) ?? null;
      } catch {
        r = null;
      }
      if (!marco || !r) return null;
      const caja = marco.getBoundingClientRect();
      const base = e.getBoundingClientRect();
      const esc = caja.width / 393;
      return { x: caja.left - base.left + r.x * esc, y: caja.top - base.top + r.y * esc, w: r.w * esc };
    };
    const poner = (p: Punto) => {
      posicion = p;
      if (hilo) hilo.style.transform = `translate(${(p.x - BASE_HILO / 2).toFixed(1)}px, ${(p.y - BASE_HILO / 2).toFixed(1)}px) scale(${(p.w / BASE_HILO).toFixed(3)})`;
    };

    /** Lleva el ♥ al ancla del paso: espera, viaja en un arco y después la sigue mientras el teléfono termina de moverse. */
    const moverHilo = (i: number, desde: number, animar: boolean) => {
      cancelAnimationFrame(raf);
      const paso = PASOS[i]!;
      if (!hilo) return;
      hilo.dataset.visible = paso.ancla ? "si" : "no";
      if (!paso.ancla) return;
      const destino = () => ancla(paso.telefono, paso.ancla!);
      const nace = animar && i === desde + 1 && paso.naceEn;
      const inicio = performance.now();
      const espera = animar ? paso.esperaHilo : 0;
      const fin = inicio + (animar ? paso.duracion + 900 : 600);
      let origen: Punto | null = null;
      if (nace) hilo.dataset.visible = "no";
      const cuadro = (ahora: number) => {
        const b = destino();
        if (ahora < inicio + espera) {
          // Todavía no sale: si nace aquí, espera escondido sobre el «aaah» real.
          if (nace) {
            const n = ancla(paso.telefono, paso.naceEn!);
            if (n) poner(n);
          }
        } else if (b) {
          if (!origen) {
            if (nace) {
              hilo.dataset.visible = "si";
              origen = ancla(paso.telefono, paso.naceEn!) ?? posicion ?? b;
            } else origen = posicion ?? b;
          }
          const t = animar ? Math.min(1, (ahora - inicio - espera) / VIAJE_HILO) : 1;
          const k = t * t * (3 - 2 * t);
          const distancia = Math.hypot(b.x - origen.x, b.y - origen.y);
          const arco = Math.sin(Math.PI * k) * Math.min(120, distancia * 0.25);
          const recto = origen.w + (b.w - origen.w) * k;
          const grande = Math.min(e.clientWidth, e.clientHeight) * 0.2;
          poner({
            x: origen.x + (b.x - origen.x) * k,
            y: origen.y + (b.y - origen.y) * k - arco,
            w: distancia > 40 ? recto + Math.max(0, grande - recto) * Math.sin(Math.PI * k) : recto,
          });
        }
        if (ahora < fin) raf = requestAnimationFrame(cuadro);
      };
      raf = requestAnimationFrame(cuadro);
    };

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
        check: paso.id === "despachar" ? "si" : "no",
        suma: est.bolsa >= 2 ? "si" : "no",
      });
      if (capitulo) capitulo.textContent = `${dos(paso.capitulo)} / ${dos(CAPITULOS)}`;
      burbujas.forEach((b, j) => (b.dataset.estado = j === i ? "actual" : j === i - 1 ? "pasada" : j < i ? "lejos" : "futura"));
      if (i >= 4) cargarTienda();
      mandar("compradora", i, animar);
      mandar("tienda", i, animar);
      moverHilo(i, desde, animar);
    };
    const espera = window.setTimeout(cargarTienda, 2500);

    // Cuando un teléfono termina de cargar, se pone en el paso actual sin animación.
    const alMensaje = (ev: MessageEvent) => {
      if (ev.origin !== location.origin || ev.data?.tipo !== MENSAJE_LISTO) return;
      const telefono = (Object.keys(marcos) as IdTelefono[]).find((k) => marcos[k]?.contentWindow === ev.source);
      if (telefono && activo >= 0) {
        mandar(telefono, activo, false);
        moverHilo(activo, activo, false);
      }
    };
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
    const alCambiarTamano = () => activo >= 0 && moverHilo(activo, activo, false);
    window.addEventListener("resize", alCambiarTamano);
    return () => {
      obs.disconnect();
      window.clearTimeout(espera);
      cancelAnimationFrame(raf);
      window.removeEventListener("message", alMensaje);
      window.removeEventListener("resize", alCambiarTamano);
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
        data-suma="no"
      >
        {children}
      </div>
      {pasos}
    </section>
  );
}
