"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { registrarEvento } from "@/lib/medicion/registrar-evento";
import { CAPITULOS, CAPITULOS_NOMBRES, DEDO_LLEGA, burbujaLarga, lineaDelCapitulo, primerPasoDe, MENSAJE_LISTO, MENSAJE_PASO, MENSAJE_TOQUE, MENSAJE_VIAJE, PASOS, estadoPaso, indicePaso, type IdAncla, type IdTelefono, type MensajeDedo } from "@/lib/landing/pasos";

const REDUCIDO = "(prefers-reduced-motion: reduce)";
/** El ♥ mide esto sin escalar (landing.css .lt-hilo). */
const BASE_HILO = 100;
/**
 * Cuánto se queda el ♥ después del pulso: se va enseguida (el componente real reacciona entonces y en un like su burst es el
 * corazón: no se ven dos a la vez, ajustes-lewis-5.md). En «Despachar» se queda un momento, vuelto check.
 */
const QUEDA = 0;
const QUEDA_CHECK = 1300;
const VIAJE = 700;
/** En el cambio de lado, cuánto tarda el fondo de la landing en pasar de rosa a verde: la ola verde (cambio-lado.css) sube entre 1 y 2 s y ya lo tapa. */
const CAMBIO_LADO_MS = 1900;

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
    // (por índice de paso: `cambio-lado` no tiene burbuja)
    const burbujas = PASOS.map((_, i) => e.querySelector<HTMLElement>(`[data-burbuja="${i}"]`));
    const segmentos = [...e.querySelectorAll<HTMLElement>("[data-seg]")];
    const nombreCapitulo = e.querySelector<HTMLElement>("[data-capitulo-nombre]");
    let activo = -1;
    let muestraDesliza = 0;
    let yDesliza = 0;
    let raf = 0;
    let irse = 0;
    let cambio = 0;
    let posicion: Punto | null = null;

    // La barra de Safari y el rebote del scroll con el color del capítulo (ajustes-lewis-8.md §8): theme-color y el fondo de html y
    // body: arena en el dolor de antes, rosa en compras, verde en la tienda, y el del cierre al llegar a él. Al salir de la landing,
    // se devuelve lo que había.
    const tema = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const temaAntes = tema?.content ?? null;
    const fondosAntes = [raiz.style.background, document.body.style.background];
    const cierre = document.getElementById("cierre");
    let enCierre = false;
    const pintarFondo = () => {
      const lado = e.dataset.lado;
      const variable = lado === "tienda" || lado === "inicio" ? "--marca-bosque" : lado === "antes" ? "--color-arena" : "--marca-rosa-fija";
      const color = enCierre && cierre ? getComputedStyle(cierre).backgroundColor : getComputedStyle(e).getPropertyValue(variable).trim();
      if (!color || color === "rgba(0, 0, 0, 0)") return;
      if (tema) tema.content = color;
      raiz.style.background = color;
      document.body.style.background = color;
    };
    let finalVisto = false;
    const obsCierre = new IntersectionObserver(([en]) => {
      enCierre = Boolean(en?.isIntersecting);
      if (enCierre) e.dataset.deslizaOk = "no";
      // Medición (docs/18-medicion.md): llegó al final, una vez por visita.
      if (enCierre && !finalVisto) {
        finalVisto = true;
        registrarEvento("conoce_final");
      }
      pintarFondo();
    }, { threshold: 0.5 });
    if (cierre) obsCierre.observe(cierre);

    /**
     * La barra de historias de arriba (referencias/landing/conoce-narrativa/LEEME.md, «Cuándo deslizar»): un segmento por capítulo y un
     * deslizamiento por capítulo. Dentro de un capítulo, los pasos avanzan solos: cuando termina la animación de un paso y pasa el tiempo
     * de leer su burbuja (lineaDelCapitulo, lib/landing/pasos.ts), entra el siguiente. El segmento del capítulo se llena a lo largo de
     * todos sus pasos (CSS: --dur es lo que dura el capítulo y --off lo que ya llevaba al entrar) y, cuando termina el último, aparece
     * «Desliza ↑». Deslizar salta al primer paso del capítulo siguiente (hacia atrás, al inicio del capítulo); tocar la pantalla pausa o
     * reanuda el avance. Con movimiento reducido no hay avance solo: cada paso pide su deslizamiento.
     */
    const sinAuto = () => Boolean((window as unknown as { __dzSinAuto?: boolean }).__dzSinAuto);
    let linea = lineaDelCapitulo(PASOS[0]!.capitulo);
    let capActivo = 0;
    let base = 0; // ms de la línea ya corridos cuando empezó el último tramo
    let desdeT: number | null = null; // performance.now() de ese inicio (null: en pausa)
    let avanza = 0;
    let inicioCapEn = Date.now();
    /** Entra el siguiente paso de un avance solo (lo asigna más abajo, donde están `activar` y las secciones). */
    let mover: (i: number, forzar?: boolean, auto?: boolean) => void = () => {};
    const corrido = () => base + (desdeT === null ? 0 : performance.now() - desdeT);
    const posicionDesliza = () => {
      const b = burbujas[activo];
      const caja = e.getBoundingClientRect();
      const r = b && Number(getComputedStyle(b).opacity) > 0.05 ? b.getBoundingClientRect() : null;
      // A media altura de la burbuja del paso (o, sin burbuja, abajo): puede taparla, porque a esas alturas ya se leyó.
      const y = r ? r.top - caja.top + r.height / 2 : caja.height - 96;
      e.style.setProperty("--desliza-y", `${Math.round(y - 24)}px`);
    };
    const mostrarDesliza = () => {
      if (enCierre) return;
      posicionDesliza();
      yDesliza = window.scrollY;
      e.dataset.deslizaOk = "si";
    };
    const pintarSegmentos = (capitulo: number, desdeMs: number, anima: boolean, parcial = 1) => {
      e.dataset.pausa = "no";
      segmentos.forEach((g, j) => {
        g.dataset.estado = j + 1 === capitulo ? "vacio" : j + 1 < capitulo ? "lleno" : "vacio";
        if (j + 1 === capitulo) g.setAttribute("aria-current", "step");
        else g.removeAttribute("aria-current");
      });
      const g = segmentos[capitulo - 1];
      if (!g) return;
      g.style.setProperty("--dur", `${linea.total}ms`);
      g.style.setProperty("--off", `${Math.round(desdeMs)}ms`);
      g.style.setProperty("--p", String(parcial));
      void g.offsetWidth; // para que el llenado empiece de nuevo aunque ya estuviera llenándose
      g.dataset.estado = anima ? "llenando" : "parcial";
    };
    /** Programa lo que sigue al paso k del capítulo: el avance solo al siguiente paso y, en el último, «Desliza ↑». */
    const programar = (k: number) => {
      window.clearTimeout(avanza);
      window.clearTimeout(muestraDesliza);
      e.dataset.deslizaOk = "no";
      const ultimoDelCapitulo = k >= linea.pasos.length - 1;
      if (reducido.matches) {
        // Sin avance solo: cada paso pide su deslizamiento (y «Desliza» sale enseguida, sin rebote).
        muestraDesliza = window.setTimeout(mostrarDesliza, 250);
        return;
      }
      if (desdeT === null) return; // en pausa
      const ya = corrido();
      if (!ultimoDelCapitulo) {
        if (!sinAuto()) avanza = window.setTimeout(() => mover(linea.pasos[k + 1]!, false, true), Math.max(0, linea.inicios[k + 1]! - ya));
      } else {
        // Al terminar el último paso del capítulo: «Desliza ↑» (en el último capítulo, «Ver planes ↑»).
        muestraDesliza = window.setTimeout(mostrarDesliza, Math.max(0, linea.total - ya) + 150);
      }
    };
    /** Mantener pulsado pausa el avance (y el llenado del riel) y soltar lo reanuda, como en Reels; un toque corto enseña el gesto: «Desliza ↑»
     *  aparece (si aún no estaba) y da un salto. */
    const pausar = () => {
      const k = linea.pasos.indexOf(activo);
      if (k < 0 || desdeT === null || corrido() >= linea.total) return;
      base = corrido();
      desdeT = null;
      window.clearTimeout(avanza);
      window.clearTimeout(muestraDesliza);
      e.dataset.pausa = "si";
    };
    const reanudar = () => {
      if (e.dataset.pausa !== "si") return;
      desdeT = performance.now();
      e.dataset.pausa = "no";
      programar(linea.pasos.indexOf(activo));
    };
    let retener = 0;
    let sostenido = false;
    const sobreControl = (ev: Event) => Boolean((ev.target as Element | null)?.closest?.("a, button"));
    const alBajar = (ev: PointerEvent) => {
      if (reducido.matches || enCierre || sobreControl(ev)) return;
      sostenido = false;
      window.clearTimeout(retener);
      retener = window.setTimeout(() => {
        sostenido = true;
        pausar();
      }, 380);
    };
    const alSoltar = () => {
      window.clearTimeout(retener);
      if (sostenido) reanudar();
    };
    const alToque = (ev: MouseEvent) => {
      if (enCierre || sobreControl(ev)) return;
      // (el clic que cierra una pulsación larga no es un toque)
      if (sostenido) {
        sostenido = false;
        return;
      }
      if (e.dataset.deslizaOk !== "si") {
        posicionDesliza();
        yDesliza = window.scrollY;
        e.dataset.deslizaOk = "si";
      }
      e.classList.remove("lt-salta");
      void e.offsetWidth; // para que el salto empiece de nuevo en cada toque
      e.classList.add("lt-salta");
    };
    e.addEventListener("pointerdown", alBajar);
    e.addEventListener("pointerup", alSoltar);
    e.addEventListener("pointercancel", alSoltar);
    e.addEventListener("pointerleave", alSoltar);
    e.addEventListener("click", alToque);
    // «Desliza» se va en cuanto la persona desliza (antes de que cambie el paso).
    const alDeslizar = () => {
      if (e.dataset.deslizaOk === "si" && Math.abs(window.scrollY - yDesliza) > 10) e.dataset.deslizaOk = "no";
    };
    window.addEventListener("scroll", alDeslizar, { passive: true });
    /**
     * Las burbujas como un chat (ajustes-lewis-4.md y -8.md): la del paso arriba de su columna, con el borde bajo el teléfono; las
     * anteriores suben lo que ocupan (--sube) por detrás del teléfono y se van; las siguientes esperan pequeñas abajo a la derecha.
     */
    const apilar = (i: number) => {
      let y = 0;
      for (const b of burbujas.slice(i + 1)) {
        if (!b) continue;
        b.dataset.estado = "futura";
        b.style.removeProperty("--sube");
      }
      // La del paso, arriba de la columna (con el borde bajo el teléfono); las de antes suben por detrás del teléfono y se van.
      for (let j = i; j >= 0; j--) {
        const b = burbujas[j];
        if (!b) continue;
        if (j < i) y += b.offsetHeight + 6;
        b.style.setProperty("--sube", `${-y}px`);
        b.dataset.estado = j === i ? "actual" : "lejos";
      }
    };

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

    // Las animaciones de entrada de las pantallas nuevas (escenas.css, separadores.css) solo corren al deslizar hasta el paso: al abrir la
    // página, o con un enlace a un paso (el primer segundo y medio), el paso se ve completo al instante.
    const montado = Date.now();
    const pasosVistos = new Set<string>();
    const activar = (i: number, forzar = false, auto = false) => {
      if (i === activo && !forzar) return;
      const desde = activo;
      activo = i;
      // Medición: cada paso se cuenta una vez por visita, aunque se vuelva a él.
      if (PASOS[i] && !pasosVistos.has(PASOS[i].id)) {
        pasosVistos.add(PASOS[i].id);
        registrarEvento("conoce_paso", { paso: PASOS[i].id });
      }
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
        larga: burbujaLarga(paso) ? "si" : "no",
        fin: paso.capitulo === CAPITULOS ? "si" : "no",
      });
      // El cambio de lado: llega rosa («Pidió en segundos.»); el teléfono gira, una ola verde sube y todo pasa a verde (cambio-lado.css, con
      // data-anima="si"). Sin animación (al abrir, movimiento reducido), se ve el final.
      e.dataset.anima = reducido.matches ? "no" : desde < 0 || Date.now() - montado < 1500 ? "entrada" : "si";
      window.clearTimeout(cambio);
      delete e.dataset.cambio;
      if (paso.escena === "cambio-lado" && animar && e.dataset.anima === "si") {
        e.dataset.cambio = "antes";
        e.dataset.lado = "compras";
        cambio = window.setTimeout(() => {
          e.dataset.cambio = "despues";
          e.dataset.lado = "tienda";
          pintarFondo();
        }, CAMBIO_LADO_MS);
      }
      // La barra y el avance: al entrar a un capítulo (o a un paso por un enlace, o al reiniciar), el segmento empieza donde toca; con el
      // avance solo dentro del capítulo, sigue llenándose sin interrupción.
      const capitulo = paso.capitulo;
      const cambioDeCapitulo = capitulo !== capActivo;
      if (cambioDeCapitulo) {
        capActivo = capitulo;
        linea = lineaDelCapitulo(capitulo);
        if (nombreCapitulo) nombreCapitulo.textContent = CAPITULOS_NOMBRES[capitulo - 1] ?? "";
      }
      const k = linea.pasos.indexOf(i);
      if (cambioDeCapitulo || forzar) inicioCapEn = Date.now();
      if (!auto || cambioDeCapitulo) {
        base = reducido.matches ? 0 : linea.inicios[k] ?? 0;
        desdeT = reducido.matches ? null : performance.now();
        pintarSegmentos(capitulo, base, !reducido.matches, (k + 1) / linea.pasos.length);
      }
      programar(k);
      apilar(i);
      pintarFondo();
      if (i >= indicePaso("aaah")) cargarTienda();
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
    // Medición: los botones del final («Ver la demo otra vez», vender, catálogo de ejemplo y entrar).
    const EVENTO_CIERRE = { "otra-vez": "conoce_cta_otra_vez", vender: "conoce_cta_vender", catalogo: "conoce_cta_catalogo", entrar: "conoce_cta_entrar" } as const;
    const alClicCierre = (ev: MouseEvent) => {
      const cta = (ev.target as Element | null)?.closest?.<HTMLElement>("#cierre [data-cta]")?.dataset.cta;
      if (cta && cta in EVENTO_CIERRE) registrarEvento(EVENTO_CIERRE[cta as keyof typeof EVENTO_CIERRE]);
    };
    document.addEventListener("click", alClicCierre, true);
    mover = (i, forzar = false, auto = false) => {
      activar(i, forzar, auto);
      secciones[i]?.scrollIntoView({ behavior: "instant" });
    };
    // Los enlaces a un paso (#paso-…, también el de un segmento de la barra) activan ese paso.
    const alHash = () => {
      const i = PASOS.findIndex((p) => `#paso-${p.id}` === location.hash);
      if (i >= 0 && i !== activo) activar(i);
    };
    window.addEventListener("hashchange", alHash);
    const obs = new IntersectionObserver(
      (entradas) => {
        for (const en of entradas) {
          if (!en.isIntersecting) continue;
          const i = Number((en.target as HTMLElement).dataset.pasoSeccion);
          if (i === activo) continue;
          const enlace = Date.now() - saltando < 1500;
          if (activo < 0 || enlace) {
            activar(i);
          } else if (reducido.matches) {
            // Sin avance solo: un paso por deslizamiento (un deslizamiento fuerte no se salta pasos).
            if (Math.abs(i - activo) > 1 && Math.abs(i - activo) <= 3) {
              const siguiente = activo + Math.sign(i - activo);
              secciones[siguiente]?.scrollIntoView({ behavior: "instant" });
              activar(siguiente);
            } else activar(i);
          } else if (i > activo) {
            // Deslizar hacia delante: al primer paso del capítulo siguiente (o, en el último capítulo, al cierre).
            const siguiente = primerPasoDe(PASOS[activo]!.capitulo + 1);
            if (siguiente >= 0) mover(siguiente);
            else cierre?.scrollIntoView({ behavior: "instant" });
          } else {
            // Hacia atrás: al inicio del capítulo actual si ya va avanzado (o lleva un rato), y si no, al del anterior.
            const capitulo = PASOS[activo]!.capitulo;
            const inicio = primerPasoDe(capitulo);
            const llevaRato = activo > inicio || Date.now() - inicioCapEn > 2500;
            const destino = llevaRato || capitulo === 1 ? inicio : primerPasoDe(capitulo - 1);
            mover(destino, destino === activo);
          }
        }
      },
      { threshold: 0.55 },
    );
    secciones.forEach((x) => obs.observe(x));
    window.addEventListener("resize", esconder);
    return () => {
      obs.disconnect();
      window.clearTimeout(espera);
      window.clearTimeout(muestraDesliza);
      window.clearTimeout(avanza);
      window.clearTimeout(retener);
      e.removeEventListener("pointerdown", alBajar);
      e.removeEventListener("pointerup", alSoltar);
      e.removeEventListener("pointercancel", alSoltar);
      e.removeEventListener("pointerleave", alSoltar);
      e.removeEventListener("click", alToque);
      window.removeEventListener("hashchange", alHash);
      window.removeEventListener("scroll", alDeslizar);
      window.clearTimeout(cambio);
      obsCierre.disconnect();
      if (tema && temaAntes !== null) tema.content = temaAntes;
      [raiz.style.background, document.body.style.background] = fondosAntes;
      esconder();
      window.removeEventListener("message", alMensaje);
      window.removeEventListener("message", alDedo);
      window.removeEventListener("resize", esconder);
      document.removeEventListener("click", alClic, true);
      document.removeEventListener("click", alClicCierre, true);
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
        data-lado={PASOS[0]!.lado}
        data-telefono="compradora"
        data-bolsa="0"
        data-total="0"
        data-codigo="no"
        data-check="no"
        data-capitulo="1"
        data-larga="no"
        data-desliza-ok="no"
        data-fin="no"
        data-pausa="no"
        data-anima="entrada"
        data-toques="0"
        data-viajes="0"
      >
        {children}
      </div>
      {pasos}
    </section>
  );
}
