"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { DEDO_LLEGA, MENSAJE_LISTO, MENSAJE_PASO, MENSAJE_TOQUE, MENSAJE_VIAJE, PASOS, estadoPaso, type IdAncla, type IdTelefono, type MensajeDedo } from "@/lib/landing/pasos";

const REDUCIDO = "(prefers-reduced-motion: reduce)";
/** El ♥ mide esto sin escalar (landing.css .lt-hilo). */
const BASE_HILO = 100;
/**
 * Cuánto se queda el ♥ después del pulso: se va enseguida (el componente real reacciona entonces y en un like su burst es el
 * corazón: no se ven dos a la vez, ajustes-lewis-5.md). En «Despachar» se queda un momento, vuelto check.
 */
const QUEDA = 0;
const QUEDA_CHECK = 1300;
/** Si la primera vuelta del video no termina (no carga, no arranca…), a los 10 s entra la portada igual. */
const TOPE_PRIMERA_VUELTA = 10000;
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
    // (por índice de paso: la portada no tiene burbuja)
    const burbujas = PASOS.map((_, i) => e.querySelector<HTMLElement>(`[data-burbuja="${i}"]`));
    const gruesas = [...e.querySelectorAll<HTMLElement>("[data-raya-paso]")];
    const finas = [...e.querySelectorAll<HTMLElement>("[data-raya-fina]")];
    const reglaCaja = e.querySelector<HTMLElement>(".lt-indice");
    const regla = e.querySelector<HTMLElement>(".lt-indice-rayas");
    let activo = -1;
    let llenar = 0;
    let raf = 0;
    let irse = 0;
    let posicion: Punto | null = null;

    // El video de la portada (ajustes-lewis-7.md §2, -8.md §3 y docs/prompts/video-v2-y-entrar.md): sin sonido; la primera vuelta
    // se ve entera y luego sigue en bucle sin parar nunca (solo se pausa con la pestaña oculta); con movimiento reducido o ahorro de
    // datos, el póster. Safari en iOS lo reproduce solo si está silenciado desde antes de play() (el atributo `muted` ya viene en el
    // HTML: landing.tsx). Se intenta al cargar, en cuanto hay datos y, si el navegador no dejó, en el primer gesto.
    const video = e.querySelector<HTMLVideoElement>("[data-portada]");
    const ahorroDeDatos = () => Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData);
    const puedeCorrer = () => !document.hidden && !reducido.matches && !ahorroDeDatos();
    const reproducir = () => {
      if (!video || !puedeCorrer()) return;
      video.muted = true;
      video.defaultMuted = true;
      // Las fuentes no llevan src en el HTML: ni el precargador del navegador descarga video antes de leer las preferencias.
      const pendientes = video.querySelectorAll<HTMLSourceElement>("source[data-src]:not([src])");
      if (pendientes.length) {
        pendientes.forEach((fuente) => { fuente.src = fuente.dataset.src!; });
        video.load();
      }
      if (video.paused)
        void video.play().catch((err: unknown) => {
          // El navegador no deja reproducirlo solo (iOS en ahorro de energía…): queda el póster y todo entra ya.
          if (err instanceof DOMException && (err.name === "NotAllowedError" || err.name === "NotSupportedError")) entrar(true);
        });
    };
    const portada = () => {
      if (!video) return;
      if (puedeCorrer()) reproducir();
      else video.pause();
    };
    const gestos = ["pointerdown", "touchstart", "scroll"] as const;
    const alPrimerGesto = () => reproducir();
    document.addEventListener("visibilitychange", portada);

    // La barra de Safari y el rebote del scroll con el color del capítulo (ajustes-lewis-8.md §8): theme-color y el fondo de html y
    // body: verde en la portada (su degradado de arriba es Bosque) y en la tienda, rosa en compras, y el del cierre al llegar a él.
    // Al salir de la landing, se devuelve lo que había.
    const tema = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const temaAntes = tema?.content ?? null;
    const fondosAntes = [raiz.style.background, document.body.style.background];
    const cierre = document.getElementById("cierre");
    let enCierre = false;
    const pintarFondo = () => {
      const verde = activo <= 0 || PASOS[activo]?.lado === "tienda";
      const color = enCierre && cierre ? getComputedStyle(cierre).backgroundColor : getComputedStyle(e).getPropertyValue(verde ? "--marca-bosque" : "--marca-rosa-fija").trim();
      if (!color || color === "rgba(0, 0, 0, 0)") return;
      if (tema) tema.content = color;
      raiz.style.background = color;
      document.body.style.background = color;
    };
    const obsCierre = new IntersectionObserver(([en]) => {
      enCierre = Boolean(en?.isIntersecting);
      pintarFondo();
    }, { threshold: 0.5 });
    if (cierre) obsCierre.observe(cierre);

    // El desbloqueo sigue al dedo (ajustes-lewis-8.md §5): --u es lo que va del scroll entre la portada y el primer paso, de 0 a 1.
    // El scroll-snap de la página hace el resto: si se suelta antes de la mitad vuelve con su resorte, y si no, se completa.
    let rafU = 0;
    const medirU = () => {
      rafU = 0;
      const a = secciones[0]?.offsetTop ?? 0;
      const b = secciones[1]?.offsetTop ?? a + innerHeight;
      const u = Math.min(1, Math.max(0, (scrollY - a) / Math.max(1, b - a)));
      e.style.setProperty("--u", u.toFixed(4));
      e.dataset.arrastre = u > 0.001 && u < 0.999 ? "si" : "no";
    };
    const alDeslizar = () => {
      if (!rafU) rafU = requestAnimationFrame(medirU);
    };
    window.addEventListener("scroll", alDeslizar, { passive: true });
    video?.addEventListener("loadeddata", reproducir);
    video?.addEventListener("canplay", reproducir);
    gestos.forEach((g) => window.addEventListener(g, alPrimerGesto, { passive: true, once: true }));

    // La entrada de la portada (docs/prompts/video-v2-y-entrar.md): la primera vuelta del video se ve sola y limpia, solo con
    // «Saltar». Al terminarla entran el icono y el lema y enseguida el teléfono bloqueado y «Desliza y mira» (landing.css,
    // data-entrada), y el video sigue en bucle. Entra todo ya si la persona desliza o toca antes, si no hay video (movimiento
    // reducido, ahorro de datos, autoplay bloqueado) o si se abre más abajo; y, como tope, a los 10 s.
    const entrada: number[] = [];
    let entrado = false;
    const entrar = (ya: boolean) => {
      if (entrado) return;
      entrado = true;
      window.clearTimeout(tope);
      if (video) video.loop = true;
      if (ya) {
        e.dataset.entrada = "telefono";
        return;
      }
      e.dataset.entrada = "icono";
      entrada.push(window.setTimeout(() => (e.dataset.entrada = "telefono"), 250));
    };
    const tope = window.setTimeout(() => entrar(false), TOPE_PRIMERA_VUELTA);
    // Justo antes del final se pone en bucle, para que la vuelta siguiente empiece sin corte; si aun así llega `ended`, se sigue.
    const alAvanzar = () => {
      if (video && video.duration && video.currentTime >= video.duration - 0.3) entrar(false);
    };
    const alTerminar = () => {
      entrar(false);
      reproducir();
    };
    const alGestoEntrar = () => entrar(true);
    const gestosEntrar = ["pointerdown", "touchstart", "wheel", "keydown"] as const;
    const alDeslizarEntrar = () => {
      if (scrollY > 2) entrar(true);
    };
    if (!video || reducido.matches || ahorroDeDatos() || scrollY > 2 || location.hash) entrar(true);
    else {
      video.addEventListener("timeupdate", alAvanzar);
      video.addEventListener("ended", alTerminar);
      gestosEntrar.forEach((g) => window.addEventListener(g, alGestoEntrar, { passive: true }));
      window.addEventListener("scroll", alDeslizarEntrar, { passive: true });
    }

    /**
     * El indicador (ajustes-lewis-7.md §1): la gruesa del paso, marcada al llegar; sus finas se llenan una a una con cada toque o
     * viaje del paso (o al acabar su tiempo, si no tiene toques). Los pasos de antes, llenos; los de después, vacíos.
     */
    const finasDe = (i: number) => finas.filter((f) => f.dataset.rayaFina === String(i));
    const marcarIndice = (i: number, animar: boolean) => {
      window.clearTimeout(llenar);
      gruesas.forEach((g) => {
        const j = Number(g.dataset.rayaPaso);
        g.dataset.estado = j === i ? "actual" : j < i ? "visto" : "falta";
        if (j === i) g.setAttribute("aria-current", "step");
        else g.removeAttribute("aria-current");
      });
      // La regla se desplaza para dejar la raya del paso en su centro.
      const actual = gruesas.find((g) => Number(g.dataset.rayaPaso) === i);
      if (actual && reglaCaja && regla) regla.style.setProperty("--regla", `${(reglaCaja.clientHeight / 2 - (actual.offsetTop + actual.offsetHeight / 2)).toFixed(1)}px`);
      finas.forEach((f) => {
        const j = Number(f.dataset.rayaFina);
        f.dataset.llena = j < i || (j === i && !animar) ? "si" : "no";
      });
      // Por si algún toque no llegó (o el paso no tiene toques): al acabar su tiempo, el paso queda completo.
      if (animar) llenar = window.setTimeout(() => finasDe(i).forEach((f) => (f.dataset.llena = "si")), PASOS[i]!.duracion + 300);
    };
    const llenarUna = () => {
      const f = finasDe(activo).find((x) => x.dataset.llena === "no");
      if (f) f.dataset.llena = "si";
    };
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
        llenarUna();
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
        // (en un paso de viaje, el viaje es su fase; en uno de toques, sus rayas son los toques)
        if (PASOS[activo]?.dedo === "viaje") llenarUna();
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
      marcarIndice(i, animar);
      apilar(i);
      pintarFondo();
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
    // «Desliza y mira»: tocarlo hace lo mismo que deslizar (el desbloqueo sigue al scroll).
    const desliza = e.querySelector<HTMLElement>("[data-desliza]");
    const alDesliza = () => secciones[1]?.scrollIntoView({ behavior: reducido.matches ? "instant" : "smooth" });
    desliza?.addEventListener("click", alDesliza);
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
    medirU();
    portada();
    window.addEventListener("resize", esconder);
    return () => {
      obs.disconnect();
      window.clearTimeout(espera);
      window.clearTimeout(llenar);
      entrada.forEach((t) => window.clearTimeout(t));
      window.clearTimeout(tope);
      video?.removeEventListener("timeupdate", alAvanzar);
      video?.removeEventListener("ended", alTerminar);
      gestosEntrar.forEach((g) => window.removeEventListener(g, alGestoEntrar));
      window.removeEventListener("scroll", alDeslizarEntrar);
      video?.removeEventListener("loadeddata", reproducir);
      video?.removeEventListener("canplay", reproducir);
      gestos.forEach((g) => window.removeEventListener(g, alPrimerGesto));
      document.removeEventListener("visibilitychange", portada);
      window.removeEventListener("scroll", alDeslizar);
      cancelAnimationFrame(rafU);
      obsCierre.disconnect();
      if (tema && temaAntes !== null) tema.content = temaAntes;
      [raiz.style.background, document.body.style.background] = fondosAntes;
      esconder();
      window.removeEventListener("message", alMensaje);
      window.removeEventListener("message", alDedo);
      window.removeEventListener("resize", esconder);
      document.removeEventListener("click", alClic, true);
      desliza?.removeEventListener("click", alDesliza);
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
        data-entrada="no"
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
